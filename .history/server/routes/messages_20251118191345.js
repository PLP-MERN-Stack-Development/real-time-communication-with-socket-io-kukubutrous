const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },      // username
  senderId: { type: String, required: true },    // socket id at time of send
  receiverId: { type: String, default: null },   // socket id for private or null
  text: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
