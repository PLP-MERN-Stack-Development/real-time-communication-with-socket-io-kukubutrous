require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const socketSetup = require('./socket');
const messagesRoutes = require('./routes/messages');


const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/socketio-chat';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const port = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

// Socket setup (registers handlers)
socketSetup(io);

// Start server
server.listen(port, () => console.log(`Server listening on port ${port}`));
