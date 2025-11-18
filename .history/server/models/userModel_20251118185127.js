const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true } // NOTE: hash in production
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
