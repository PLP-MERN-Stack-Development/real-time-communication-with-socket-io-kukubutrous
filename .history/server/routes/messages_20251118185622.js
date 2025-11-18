const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// GET /api/messages/room/:room?limit=100
router.get('/room/:room', async (req, res) => {
    const { room } = req.params;
    const limit = parseInt(req.query.limit || '100', 10);
    const docs = await Message.find({ room }).sort({ createdAt: 1 }).limit(limit).exec();
    res.json(docs.map(d => ({
        id: d._id, from: d.from, to: d.to, text: d.text, createdAt: d.createdAt, readBy: d.readBy
    })));
});

// GET /api/messages/private/:userA/:userB
router.get('/private/:userA/:userB', async (req, res) => {
    const { userA, userB } = req.params; // user ids
    const docs = await Message.find({
        $or: [
            { 'from.id': userA, 'to.id': userB },
            { 'from.id': userB, 'to.id': userA }
        ]
    }).sort({ createdAt: 1 }).exec();
    res.json(docs.map(d => ({ id: d._id, from: d.from, to: d.to, text: d.text, createdAt: d.createdAt, readBy: d.readBy })));
});

module.exports = router;
