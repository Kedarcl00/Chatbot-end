const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Root route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Chat page route
app.get('/chat.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'chat.html'));
});

// Store active rooms and participants
const rooms = new Map();

// Room class to manage chat state
class ChatRoom {
    constructor(roomId, token) {
        this.roomId = roomId;
        this.token = token;
        this.participants = new Map();
        this.createdAt = Date.now();
    }

    addParticipant(socketId, userData) {
        this.participants.set(socketId, {
            socketId,
            ...userData,
            joinedAt: Date.now()
        });
    }

    removeParticipant(socketId) {
        this.participants.delete(socketId);
    }

    getParticipantCount() {
        return this.participants.size;
    }

    isEmpty() {
        return this.participants.size === 0;
    }
}

// REST API endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

app.get('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const room = rooms.get(roomId);
    
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
        roomId,
        participantCount: room.getParticipantCount(),
        createdAt: room.createdAt
    });
});

// Socket.IO event handlers
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    // User joins a chat room
    socket.on('join-room', (data) => {
        const { roomId, token } = data;

        // Validate room and token
        let room = rooms.get(roomId);
        
        if (!room) {
            // Create new room if it doesn't exist
            room = new ChatRoom(roomId, token);
            rooms.set(roomId, room);
        }

        // Verify token matches
        if (room.token !== token) {
            socket.emit('error', { message: 'Invalid token for this room' });
            return;
        }

        // Check room capacity (max 2 users)
        if (room.getParticipantCount() >= 2 && !room.participants.has(socket.id)) {
            socket.emit('error', { message: 'Room is full. Max 2 participants allowed.' });
            return;
        }

        // Join the socket to room
        socket.join(roomId);
        room.addParticipant(socket.id, { userId: socket.id });

        // Notify room that user joined
        io.to(roomId).emit('user-joined', {
            participantCount: room.getParticipantCount(),
            timestamp: Date.now()
        });

        // Send confirmation to joining user
        socket.emit('room-joined', {
            roomId,
            participantCount: room.getParticipantCount(),
            message: 'Successfully joined the room'
        });

        console.log(`User ${socket.id} joined room ${roomId}. Participants: ${room.getParticipantCount()}`);
    });

    // Handle encrypted messages
    socket.on('send-message', (data) => {
        const { roomId, message } = data;
        const room = rooms.get(roomId);

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        if (!room.participants.has(socket.id)) {
            socket.emit('error', { message: 'You are not in this room' });
            return;
        }

        // Validate message structure (encrypted)
        if (!message || !message.iv || !message.data) {
            socket.emit('error', { message: 'Invalid message format' });
            return;
        }

        // Broadcast message to all users in room except sender
        socket.to(roomId).emit('receive-message', {
            senderId: socket.id,
            message: {
                iv: message.iv,
                data: message.data
            },
            timestamp: Date.now()
        });

        console.log(`Message sent in room ${roomId} by ${socket.id}`);
    });

    // Handle typing indicator
    socket.on('user-typing', (data) => {
        const { roomId } = data;
        const room = rooms.get(roomId);

        if (room && room.participants.has(socket.id)) {
            socket.to(roomId).emit('user-typing', {
                userId: socket.id,
                timestamp: Date.now()
            });
        }
    });

    // Handle stopped typing
    socket.on('user-stopped-typing', (data) => {
        const { roomId } = data;
        const room = rooms.get(roomId);

        if (room && room.participants.has(socket.id)) {
            socket.to(roomId).emit('user-stopped-typing', {
                userId: socket.id
            });
        }
    });

    // User leaves room
    socket.on('leave-room', (data) => {
        const { roomId } = data;
        const room = rooms.get(roomId);

        if (room) {
            room.removeParticipant(socket.id);
            socket.leave(roomId);

            if (room.isEmpty()) {
                // Delete room if empty
                rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (empty)`);
            } else {
                // Notify remaining users
                io.to(roomId).emit('user-left', {
                    participantCount: room.getParticipantCount(),
                    timestamp: Date.now()
                });
            }
        }

        console.log(`User ${socket.id} left room ${roomId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        // Find and remove user from all rooms
        for (const [roomId, room] of rooms.entries()) {
            if (room.participants.has(socket.id)) {
                room.removeParticipant(socket.id);

                if (room.isEmpty()) {
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} deleted (empty)`);
                } else {
                    // Notify remaining users
                    io.to(roomId).emit('user-left', {
                        participantCount: room.getParticipantCount(),
                        timestamp: Date.now()
                    });
                }
            }
        }

        console.log(`User ${socket.id} disconnected`);
    });

    // Error handling
    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
    });
});

// Cleanup old rooms periodically (optional)
setInterval(() => {
    const now = Date.now();
    const maxRoomAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [roomId, room] of rooms.entries()) {
        if (now - room.createdAt > maxRoomAge && room.isEmpty()) {
            rooms.delete(roomId);
            console.log(`Cleanup: Deleted old empty room ${roomId}`);
        }
    }
}, 60 * 60 * 1000); // Run every hour

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
