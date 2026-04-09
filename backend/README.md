# Encrypted Chat Application - Backend Setup

## Overview
This is a Node.js/Express backend for a real-time encrypted chat application using Socket.IO WebSocket communication.

## Features
- **Real-time messaging** via WebSocket (Socket.IO)
- **End-to-end encryption** - All messages encrypted on client before sending
- **Room-based chat** - Users join rooms with a room ID and secret token
- **Max 2 users per room** - Each room supports only 2 participants
- **Automatic cleanup** - Empty rooms are automatically deleted
- **User presence** - Track participant count and join/leave events
- **Typing indicators** - Notify partner when typing

## Project Structure
```
backend/
├── server.js          # Main Express + Socket.IO server
├── package.json       # Dependencies and scripts
├── .env              # Environment variables
├── .gitignore        # Git ignore rules
└── README.md         # This file

../frontend/          # Frontend application files
├── index.html
├── chat.html
├── styles.css
└── js/
    ├── index.js
    └── chat.js
```

## Prerequisites
- Node.js (v14+)
- npm or yarn

## Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Edit `.env` file:
   ```env
   NODE_ENV=development
   PORT=3000
   CORS_ORIGIN=http://localhost:3000
   ```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or the PORT specified in .env)

## API Endpoints

### Health Check
- **GET** `/api/health`
  - Returns server status

### Room Info
- **GET** `/api/rooms/:roomId`
  - Returns room information and participant count
  - Returns 404 if room not found

## Socket.IO Events

### Client → Server
- **join-room** - Join a chat room
  ```javascript
  socket.emit('join-room', { roomId, token })
  ```

- **send-message** - Send encrypted message
  ```javascript
  socket.emit('send-message', { roomId, message: { iv, data } })
  ```

- **user-typing** - Notify partner of typing
  ```javascript
  socket.emit('user-typing', { roomId })
  ```

- **user-stopped-typing** - Notify partner stopped typing
  ```javascript
  socket.emit('user-stopped-typing', { roomId })
  ```

- **leave-room** - Leave a room
  ```javascript
  socket.emit('leave-room', { roomId })
  ```

### Server → Client
- **room-joined** - Successfully joined room
  ```javascript
  { roomId, participantCount, message }
  ```

- **user-joined** - Another user joined room
  ```javascript
  { participantCount, timestamp }
  ```

- **user-left** - Another user left room
  ```javascript
  { participantCount, timestamp }
  ```

- **receive-message** - Receive encrypted message
  ```javascript
  { senderId, message: { iv, data }, timestamp }
  ```

- **user-typing** - Partner is typing
  ```javascript
  { userId, timestamp }
  ```

- **user-stopped-typing** - Partner stopped typing
  ```javascript
  { userId }
  ```

- **error** - Error occurred
  ```javascript
  { message }
  ```

## How It Works

1. **Room Creation:** When the first user joins with a roomId and token, a room is created
2. **Participant Limit:** Maximum 2 users allowed per room
3. **Encryption:** All messages are encrypted client-side using AES-GCM
4. **Key Derivation:** Encryption key derived from the secret token using SHA-256
5. **Server Transparency:** Server relays encrypted messages without decryption (end-to-end encryption)
6. **Cleanup:** Empty rooms are deleted after 24 hours of inactivity

## Security Considerations

- All messages are encrypted with AES-GCM before transmission
- Server never has access to decryption keys (client-side only)
- Token is used only for key derivation on client, not stored on server
- CORS configured to allow frontend origin
- Socket connections validate room access before allowing communication

## Frontend Configuration

Update the `serverUrl` in `js/chat.js` if backend is on different host:

```javascript
this.serverUrl = 'https://your-backend-domain.com';
```

## Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Update `CORS_ORIGIN` to your frontend domain
3. Use HTTPS/WSS in production (not HTTP)
4. Add SSL certificates
5. Deploy to hosting (Heroku, AWS, DigitalOcean, etc.)

### Example Heroku Deployment
```bash
heroku create your-app-name
git push heroku main
```

## Monitoring

Server logs will show:
- Connection events
- Room creation/deletion
- Message transmission
- User join/leave events
- Errors and disconnections

## Troubleshooting

### Connection Failed
- Check if backend server is running
- Verify `serverUrl` in frontend matches actual backend URL
- Check CORS configuration

### Message Not Received
- Verify both users have same roomId and token
- Check browser console for encryption/decryption errors
- Ensure WebSocket connection is active

### Room Not Found
- Ensure at least one user has joined the room first
- Check that roomId matches exactly

## Dependencies

- **express** - Web framework
- **socket.io** - WebSocket library
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **nodemon** - Auto-reload in development

## License
ISC
