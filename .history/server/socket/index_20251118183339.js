const jwt = require('jsonwebtoken');
const { findUserById } = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// In-memory stores (demo)
const onlineUsers = new Map(); // userId -> socketId
const rooms = {}; // roomName -> messages array (simple chat history)
const privateMessages = {}; // `${userA}-${userB}` -> messages

module.exports = function(io) {
  // authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication error: token required'));
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = payload; // {id, username}
      return next();
    } catch (err) {
      return next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log('socket connected for', user.username, socket.id);

    // Track online users
    onlineUsers.set(user.id, { socketId: socket.id, username: user.username });
    // Broadcast updated presence
    io.emit('presence:update', Array.from(onlineUsers.values()).map(u => ({ username: u.username, socketId: u.socketId })));

    // Join a default room for demonstration
    socket.join('global');

    // send last messages for room if exist
    if (!rooms['global']) rooms['global'] = [];
    socket.emit('room:history', { room: 'global', history: rooms['global'] });

    // Handle joining a room
    socket.on('room:join', ({ room }) => {
      socket.join(room);
      if (!rooms[room]) rooms[room] = [];
      socket.emit('room:history', { room, history: rooms[room] });
      io.to(room).emit('notification', { message: `${user.username} joined ${room}` });
    });

    // Handle leaving a room
    socket.on('room:leave', ({ room }) => {
      socket.leave(room);
      io.to(room).emit('notification', { message: `${user.username} left ${room}` });
    });

    // Handle room messages
    socket.on('room:message', ({ room, text }) => {
      const message = {
        id: Date.now(),
        from: { id: user.id, username: user.username },
        text,
        createdAt: new Date().toISOString(),
        readBy: []
      };
      rooms[room] = rooms[room] || [];
      rooms[room].push(message);
      io.to(room).emit('room:message', { room, message });
    });

    // Handle private messages
    socket.on('private:message', ({ toUserId, text }) => {
      const to = onlineUsers.get(toUserId);
      const msg = {
        id: Date.now(),
        from: { id: user.id, username: user.username },
        to: { id: toUserId },
        text,
        createdAt: new Date().toISOString(),
        read: false
      };
      // store
      const key = [user.id, toUserId].sort().join('-');
      privateMessages[key] = privateMessages[key] || [];
      privateMessages[key].push(msg);

      // send to the recipient if online
      if (to) io.to(to.socketId).emit('private:message', msg);
      // send to sender as acknowledgement
      socket.emit('private:message', msg);
      // notify the recipient
      if (to) io.to(to.socketId).emit('notification', { message: `New private message from ${user.username}` });
    });

    // Typing indicator
    socket.on('typing', ({ room, isTyping }) => {
      socket.to(room).emit('typing', { username: user.username, room, isTyping });
    });

    // Read receipts for room messages
    socket.on('message:read', ({ room, messageId }) => {
      const msgs = rooms[room] || [];
      const msg = msgs.find(m => m.id === messageId);
      if (msg && !msg.readBy.includes(user.id)) {
        msg.readBy.push(user.id);
        io.to(room).emit('message:read', { room, messageId, userId: user.id });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      onlineUsers.delete(user.id);
      io.emit('presence:update', Array.from(onlineUsers.values()).map(u => ({ username: u.username, socketId: u.socketId })));
      console.log('socket disconnected for', user.username);
    });
  });
};
