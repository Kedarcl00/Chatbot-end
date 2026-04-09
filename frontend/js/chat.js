// Chat page logic with Socket.IO for real-time communication
class EncryptedChat {
    constructor() {
        // Get room and token from URL
        const params = new URLSearchParams(window.location.search);
        this.roomId = params.get('room') || '';
        this.token = params.get('token') || '';
        
        // Generate unique sender ID
        this.senderId = crypto.randomUUID 
            ? crypto.randomUUID() 
            : Math.random().toString(36).slice(2);
        
        // Initialize Socket.IO
        this.socket = null;
        this.cryptoKey = null;
        this.isConnected = false;
        
        // Backend server URL (configure based on environment)
        this.serverUrl = this.getServerUrl();
        
        // DOM elements
        this.joinPanel = document.getElementById('joinPanel');
        this.chatPanel = document.getElementById('chatPanel');
        this.roomInfo = document.getElementById('roomInfo');
        this.statusMessage = document.getElementById('statusMessage');
        this.chatLog = document.getElementById('chatLog');
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.joinButton = document.getElementById('joinButton');
        
        // Initialize
        this.init();
    }

    // Get server URL based on environment
    getServerUrl() {
        // In development: http://localhost:3000
        // In production: adjust based on your deployment
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        return window.location.origin;
    }

    // Encode text to UTF-8
    encodeUTF8(text) {
        return new TextEncoder().encode(text);
    }

    // Encode buffer to Base64
    base64Encode(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (const b of bytes) {
            binary += String.fromCharCode(b);
        }
        return btoa(binary);
    }

    // Decode Base64 to buffer
    base64Decode(text) {
        const binary = atob(text);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    // Derive encryption key from secret token
    async deriveKey(secret) {
        try {
            const hash = await crypto.subtle.digest('SHA-256', this.encodeUTF8(secret));
            return crypto.subtle.importKey(
                'raw',
                hash,
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            console.error('Key derivation failed:', error);
            throw error;
        }
    }

    // Encrypt message with AES-GCM
    async encryptText(text) {
        try {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoded = this.encodeUTF8(text);
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                this.cryptoKey,
                encoded
            );
            return {
                iv: this.base64Encode(iv),
                data: this.base64Encode(encrypted)
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }

    // Decrypt message with AES-GCM
    async decryptText(ivBase64, dataBase64) {
        try {
            const iv = this.base64Decode(ivBase64);
            const encrypted = this.base64Decode(dataBase64);
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                this.cryptoKey,
                encrypted
            );
            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }

    // Set status message
    setStatus(text) {
        this.statusMessage.textContent = text;
    }

    // Add user-sent message to chat
    addMessage(text, type) {
        const wrapper = document.createElement('div');
        wrapper.className = `chat-message ${type}`;
        
        const label = document.createElement('span');
        label.className = 'message-label';
        label.textContent = type === 'self' ? 'You' : 'Partner';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = text;
        
        wrapper.appendChild(label);
        wrapper.appendChild(textDiv);
        this.chatLog.appendChild(wrapper);
        this.chatLog.scrollTop = this.chatLog.scrollHeight;
    }

    // Add system message to chat
    addSystemMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-message system';
        wrapper.textContent = text;
        this.chatLog.appendChild(wrapper);
        this.chatLog.scrollTop = this.chatLog.scrollHeight;
    }

    // Initialize Socket.IO connection
    async initializeSocket() {
        try {
            // Derive encryption key
            this.cryptoKey = await this.deriveKey(this.token);
        } catch (error) {
            this.setStatus('Unable to derive encryption key. Verify the secret token.');
            return;
        }

        // Connect to server
        this.socket = io(this.serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        // Connection established
        this.socket.on('connect', () => {
            console.log('Connected to server:', this.socket.id);
            this.isConnected = true;
            this.setStatus('Connecting to room...');
            
            // Join the room
            this.socket.emit('join-room', {
                roomId: this.roomId,
                token: this.token
            });
        });

        // Successfully joined room
        this.socket.on('room-joined', (data) => {
            console.log('Joined room:', data);
            this.setStatus('Room ready. Messages are encrypted end-to-end.');
            this.addSystemMessage('Chat is private and erased when this tab closes.');
            this.chatPanel.classList.remove('hidden');
            this.joinPanel.classList.add('hidden');
            this.messageInput.focus();
        });

        // User joined (participant count changed)
        this.socket.on('user-joined', (data) => {
            if (data.participantCount === 2) {
                this.addSystemMessage('Partner joined the room');
            }
        });

        // User left room
        this.socket.on('user-left', (data) => {
            if (data.participantCount === 1) {
                this.addSystemMessage('Partner left the room');
            }
        });

        // Receive encrypted message
        this.socket.on('receive-message', async (data) => {
            try {
                const text = await this.decryptText(data.message.iv, data.message.data);
                this.addMessage(text, 'partner');
            } catch (err) {
                console.warn('Failed to decrypt message:', err);
                this.addSystemMessage('Failed to decrypt message');
            }
        });

        // Partner is typing
        this.socket.on('user-typing', (data) => {
            console.log('Partner is typing...');
        });

        // Partner stopped typing
        this.socket.on('user-stopped-typing', (data) => {
            console.log('Partner stopped typing');
        });

        // Error from server
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.setStatus(`Error: ${error.message}`);
        });

        // Disconnected from server
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.setStatus('Disconnected. Attempting to reconnect...');
        });

        // Reconnection failed
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.setStatus('Connection failed. Please check the server status.');
        });
    }

    // Send encrypted message
    async sendMessage(text) {
        if (!text.trim()) return;
        if (!this.isConnected) {
            this.setStatus('Not connected to server');
            return;
        }

        try {
            const payload = await this.encryptText(text);
            this.socket.emit('send-message', {
                roomId: this.roomId,
                message: payload
            });
            this.addMessage(text, 'self');
        } catch (error) {
            console.error('Failed to send message:', error);
            this.setStatus('Error sending message. Please try again.');
        }
    }

    // Send typing indicator
    sendTypingIndicator() {
        if (this.isConnected) {
            this.socket.emit('user-typing', {
                roomId: this.roomId
            });
        }
    }

    // Initialize chat page
    async init() {
        if (!this.roomId || !this.token) {
            this.joinPanel.classList.remove('hidden');
            this.chatPanel.classList.add('hidden');
            this.roomInfo.textContent = 'Enter a room and secret token to join.';
            
            // Join button handler
            this.joinButton.addEventListener('click', () => {
                const inputRoom = document.getElementById('joinRoomId').value.trim();
                const inputToken = document.getElementById('joinToken').value.trim();
                if (!inputRoom || !inputToken) {
                    alert('Please enter both room ID and secret token.');
                    return;
                }
                window.location.href = `chat.html?room=${encodeURIComponent(inputRoom)}&token=${encodeURIComponent(inputToken)}`;
            });
            return;
        }

        // Set room info
        this.roomInfo.textContent = `Room ID: ${this.roomId}`;
        this.setStatus('Connecting to server...');

        // Initialize Socket.IO
        await this.initializeSocket();

        // Message form handler
        this.messageForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const text = this.messageInput.value.trim();
            if (!text) return;
            
            await this.sendMessage(text);
            this.messageInput.value = '';
            this.messageInput.focus();
        });

        // Typing indicator
        this.messageInput.addEventListener('input', () => {
            this.sendTypingIndicator();
        });

        // Clean up on tab close
        window.addEventListener('beforeunload', () => {
            if (this.socket && this.isConnected) {
                this.socket.emit('leave-room', {
                    roomId: this.roomId
                });
                this.socket.disconnect();
            }
        });
    }
}

// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EncryptedChat();
});
