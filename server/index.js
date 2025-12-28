const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());

// In-memory storage for MVP
const users = [];

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        console.log(`User ${userId} joined room ${roomId}`);
        socket.to(roomId).emit('user-connected', userId);

        socket.on('send-message', (message, userName) => {
            io.to(roomId).emit('create-message', message, userName);
        });

        socket.on('canvas-data', (data) => {
            socket.broadcast.to(roomId).emit('canvas-data', data);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

// Auth Routes (Inline for MVP)
app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;

    // Check if user exists
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // "Hash" password (mock) and save
    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password
    };
    users.push(newUser);

    console.log('New user registered:', newUser);
    res.status(201).json({ message: 'User created successfully', user: { id: newUser.id, name, email } });
});

// Room Routes
app.post('/api/room', (req, res) => {
    const roomId = Math.random().toString(36).substring(2, 9); // Simple random ID
    res.json({ roomId });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Mock token
    const token = 'mock_jwt_token_' + user.id;

    res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, name: user.name, email: user.email }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
