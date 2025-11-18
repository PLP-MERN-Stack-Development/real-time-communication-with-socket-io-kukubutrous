const mongoose = require('mongoose');
const { Schema } = mongoose;

/*
 Message model supports:
  - room: string (if room message)
  - from: { id, username }
  - to: { id, username } optional (if private message)
  - text
  - readBy: array of user ids
  - createdAt
*/
const MessageSchema = new Schema({
  room: { type: String, default: null },
  from: {
    id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    username: { type: String, required: true }
  },
  to: {
    id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, default: null }
  },
  text: { type: String, required: true },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
