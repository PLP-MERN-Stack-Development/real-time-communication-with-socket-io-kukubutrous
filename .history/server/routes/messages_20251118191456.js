const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// GET /api/messages  -> last 100 messages (public + private mixed, filterable)
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
        const msgs = await Message.find()
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean()
            .exec();
        // return in chronological order
        res.json(msgs.reverse());
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/messages/private/:socketA/:socketB -> messages between two socket ids
router.get('/private/:a/:b', async (req, res) => {
    try {
        const { a, b } = req.params;
        const docs = await Message.find({
            isPrivate: true,
            $or: [
                { senderId: a, receiverId: b },
                { senderId: b, receiverId: a }
            ]
        }).sort({ timestamp: 1 }).lean().exec();
        res.json(docs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
