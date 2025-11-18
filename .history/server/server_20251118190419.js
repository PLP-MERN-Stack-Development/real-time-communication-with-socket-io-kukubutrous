// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
dotenv.config();

// Import models
const User = require('./models/User');
const Message = require('./models/Message');

// Initialize Express app
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// -------------------------------
// Connect to MongoDB
// -------------------------------
mongoose.connect(process.env.MONGO_URI, {
  dbName: "socketio_chat",
})
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.error("MongoDB Error:", err));

// =====================================================================
// IN-MEMORY PRESENCE DATA
// =====================================================================
const typingUsers = {}; // typing indicators only
const onlineUsers = {}; // track connected sockets only

// =====================================================================
// SOCKET.IO EVENTS
// =====================================================================
io.on("connection", (socket) => {
  console.log(`🔵 User Connected: ${socket.id}`);

  // -------------------------------
  // USER JOINS CHAT
  // -------------------------------
  socket.on("user_join", async (username) => {
    onlineUsers[socket.id] = username;

    // Create user if not exists
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({ username });
    }

    io.emit("user_list", Object.values(onlineUsers));
    io.emit("user_joined", { username, id: socket.id });

    console.log(`👤 ${username} joined`);
  });

  // -------------------------------
  // SEND MESSAGE
  // -------------------------------
  socket.on("send_message", async (data) => {
    const message = await Message.create({
      sender: onlineUsers[socket.id],
      senderId: socket.id,
      text: data.text,
      timestamp: new Date(),
      isPrivate: false,
    });

    io.emit("receive_message", message);
  });

  // -------------------------------
  // PRIVATE MESSAGE
  // -------------------------------
  socket.on("private_message", async ({ to, message }) => {
    const msg = await Message.create({
      sender: onlineUsers[socket.id],
      senderId: socket.id,
      text: message,
      timestamp: new Date(),
      isPrivate: true,
      receiverId: to,
    });

    // send to receiver
    socket.to(to).emit("private_message", msg);

    // send back to sender
    socket.emit("private_message", msg);
  });

  // -------------------------------
  // TYPING INDICATOR
  // -------------------------------
  socket.on("typing", (isTyping) => {
    const username = onlineUsers[socket.id];
    if (!username) return;

    if (isTyping) typingUsers[socket.id] = username;
    else delete typingUsers[socket.id];

    io.emit("typing_users", Object.values(typingUsers));
  });

  // -------------------------------
  // DISCONNECT
  // -------------------------------
  socket.on("disconnect", () => {
    const username = onlineUsers[socket.id];

    delete typingUsers[socket.id];
    delete onlineUsers[socket.id];

    io.emit("user_list", Object.values(onlineUsers));
    io.emit("typing_users", Object.values(typingUsers));

    if (username) {
      io.emit("user_left", { username, id: socket.id });
      console.log(`🔴 ${username} disconnected`);
    }
  });
});

// =====================================================================
// API ROUTES
// =====================================================================

// Fetch last 50 messages
app.get("/api/messages", async (req, res) => {
  const msgs = await Message.find().sort({ timestamp: -1 }).limit(50);
  res.json(msgs.reverse()); // send in chronological order
});

// Debug: all users
app.get("/api/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.get("/", (req, res) => {
  res.send("Socket.io Chat Server is running");
});

// =====================================================================
// START SERVER
// =====================================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { app, server, io };
