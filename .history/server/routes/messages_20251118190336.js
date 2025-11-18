const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    senderId: { type: String, required: true },
    receiverId: { type: String, default: null },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: false },
});

module.exports = mongoose.model('Message', MessageSchema);
