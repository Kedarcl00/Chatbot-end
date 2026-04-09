# Encrypted Chat Application

A simple, secure, and anonymous two-person chat application with end-to-end encryption.

## Features

✅ **End-to-End Encrypted** - All messages encrypted with AES-GCM  
✅ **Anonymous** - No user names or identities shared  
✅ **Real-time** - WebSocket-based communication with Socket.IO  
✅ **Ephemeral** - Chat deleted when tab is closed  
✅ **Link-based** - Share invitation link for easy access  
✅ **Two-person only** - Designed for 1-on-1 conversations  

## Project Structure

```
.
├── frontend/           # Frontend application
│   ├── index.html      # Home page - Generate/share invites
│   ├── chat.html       # Chat page - Real-time encrypted messaging
│   ├── styles.css      # Styling for both pages
│   └── js/
│       ├── index.js    # Frontend logic for home page
│       └── chat.js     # Frontend logic with Socket.IO integration
├── backend/            # Node.js Express server
│   ├── server.js       # Socket.IO server with room management
│   ├── package.json    # Backend dependencies
│   ├── .env           # Environment configuration
│   ├── .gitignore     # Git ignore rules
│   └── README.md      # Backend setup guide
└── README.md          # This file (project overview)
```

## Quick Start

### Frontend (No setup required)
1. Open `index.html` in a browser
2. Click "Generate invitation link"
3. Copy and share the link with your partner
4. Chat happens automatically when both open the link

### Backend (Required for real-time communication)
1. Navigate to `backend/` directory
2. Run `npm install`
3. Run `npm run dev` (development) or `npm start` (production)
4. Server runs on `http://localhost:3000` by default

See [backend/README.md](./backend/README.md) for detailed setup instructions.

## How It Works

### Generating an Invitation
1. Click "Generate invitation link" on home page
2. A unique room ID and secret token are created
3. A full URL is generated and displayed
4. Copy the link and share with your partner

### Joining a Chat
1. Partner opens the invitation link
2. Both users' browsers connect to the backend server
3. A room is created on the server (server-side only tracking)
4. Both users derive the same encryption key from the secret token
5. Messages are encrypted client-side before sending to server
6. Server relays encrypted messages to the other user
7. Messages are decrypted client-side using the shared key

### Encryption Details
- **Algorithm:** AES-GCM (Authenticated Encryption)
- **Key Derivation:** SHA-256 hash of the secret token
- **IV:** Random 12-byte nonce per message
- **Server Role:** Message relay only (cannot decrypt)

### Privacy & Security
- Server never knows the shared secret token
- Server cannot decrypt any messages
- Each message has unique encryption key material (IV)
- Room automatically deleted when both users leave
- Browser session isolated - no persistent storage

## Configuration

### Frontend
Edit `js/chat.js` to change backend server URL:
```javascript
this.serverUrl = 'http://localhost:3000';  // Development
this.serverUrl = 'https://api.example.com'; // Production
```

### Backend
Edit `backend/.env`:
```env
PORT=3000
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Opera 67+

Requires Web Crypto API and WebSocket support.

## API Reference

### REST Endpoints
- `GET /api/health` - Server status
- `GET /api/rooms/:roomId` - Room info

### Socket Events
See [backend/README.md](./backend/README.md) for complete Socket.IO event documentation.

## Development

### Debugging
- Open browser DevTools → Console to see encryption/socket logs
- Backend logs connection and room events

### Testing
1. Open two browser windows/tabs
2. Generate invitation on first window
3. Copy link to second window
4. Both should connect and messages should be encrypted

## Common Issues

**Cannot connect to server**
- Ensure backend is running on port 3000
- Check CORS origin matches frontend URL

**Messages not decrypting**
- Verify both users have same invitation link
- Clear browser cache and try again

**Room not found**
- At least one user must join first
- Check room ID in URL matches exactly

## License
ISC
