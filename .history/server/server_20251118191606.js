require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const User = require('./models/User');
const Message = require('./models/Message');
const messagesRoutes = require('./routes/messages');
const usersRoutes = require('./routes/users');

const app = express();
app.use(cors());
app.use(express.json());

// connect to mongo
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/socketio_chat';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'], credentials: true },
});

// In-memory presence maps (socketId -> username) and typing
const onlineUsers = new Map();   // socketId => username
const typingUsers = new Map();   // socketId => username

// Socket handlers
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // When client sends username to join
  socket.on('user_join', async (username) => {
    if (!username) return;
    onlineUsers.set(socket.id, username);

    // persist user (create if not exists)
    try {
      await User.findOneAndUpdate({ username }, { username }, { upsert: true, setDefaultsOnInsert: true });
    } catch (err) {
      console.error('User persist error:', err);
    }

    // broadcast updated user list (usernames)
    io.emit('user_list', Array.from(onlineUsers.values()).map(u => ({ username: u })));
    io.emit('user_joined', { username, id: socket.id });

    console.log(`${username} joined (socket ${socket.id})`);
  });

  // Public message: client emits { message } (per your socket.js)
  socket.on('send_message', async (payload) => {
    try {
      const text = (payload && (payload.message ?? payload.text)) || '';
      if (!text) return;

      const msg = await Message.create({
        sender: onlineUsers.get(socket.id) || 'Anonymous',
        senderId: socket.id,
        text,
        isPrivate: false,
        timestamp: new Date()
      });

      io.emit('receive_message', msg);
    } catch (err) {
      console.error('send_message error:', err);
    }
  });

  // Private message: payload { to, message }
  socket.on('private_message', async ({ to, message }) => {
    try {
      if (!to || !message) return;
      const msg = await Message.create({
        sender: onlineUsers.get(socket.id) || 'Anonymous',
        senderId: socket.id,
        receiverId: to,
        text: message,
        isPrivate: true,
        timestamp: new Date()
      });

      // send to recipient socket id if connected
      socket.to(to).emit('private_message', msg);
      // echo to sender
      socket.emit('private_message', msg);
    } catch (err) {
      console.error('private_message error:', err);
    }
  });

  // Typing indicator: client sends boolean
  socket.on('typing', (isTyping) => {
    const username = onlineUsers.get(socket.id);
    if (!username) return;

    if (isTyping) typingUsers.set(socket.id, username);
    else typingUsers.delete(socket.id);

    io.emit('typing_users', Array.from(typingUsers.values()));
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const username = onlineUsers.get(socket.id);
    if (username) {
      io.emit('user_left', { username, id: socket.id });
      console.log(`${username} disconnected (socket ${socket.id})`);
    }
    onlineUsers.delete(socket.id);
    typingUsers.delete(socket.id);
    io.emit('user_list', Array.from(onlineUsers.values()).map(u => ({ username: u })));
    io.emit('typing_users', Array.from(typingUsers.values()));
  });
});

// API routes
app.use('/api/messages', messagesRoutes);
app.use('/api/users', usersRoutes);

// serve a small status at root
app.get('/', (req, res) => res.send('Socket.io Chat Server (MongoDB) running'));

// static public (optional) - leave available if you want to host a static client
app.use(express.static(path.join(__dirname, 'public')));

// start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));

module.exports = { app, server, io };
