const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// In-memory online map: userId -> { socketId, username }
const onlineUsers = new Map();

module.exports = function (io) {
    // Socket auth middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token || (socket.handshake.headers['authorization'] || '').replace('Bearer ', '');
        if (!token) return next(new Error('Authentication error: token required'));
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            // optional: fetch user from DB to ensure exists
            const user = await User.findById(payload.id).exec();
            if (!user) return next(new Error('Authentication error: user not found'));
            socket.user = { id: user._id.toString(), username: user.username };
            return next();
        } catch (err) {
            return next(new Error('Authentication error: invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const user = socket.user;
        console.log(`Socket connected: ${user.username} (${user.id}) -> ${socket.id}`);

        // mark online
        onlineUsers.set(user.id, { socketId: socket.id, username: user.username });

        // broadcast presence update with userId
        io.emit('presence:update', Array.from(onlineUsers.entries()).map(([id, v]) => ({ userId: id, username: v.username, socketId: v.socketId })));

        // auto-join global room
        socket.join('global');

        // send recent history for global
        sendRoomHistory(socket, 'global');

        // handlers

        socket.on('room:join', async ({ room }) => {
            socket.join(room);
            await sendRoomHistory(socket, room);
            io.to(room).emit('notification', { message: `${user.username} joined ${room}` });
        });

        socket.on('room:leave', ({ room }) => {
            socket.leave(room);
            io.to(room).emit('notification', { message: `${user.username} left ${room}` });
        });

        socket.on('room:message', async ({ room, text }) => {
            if (!text || !room) return;
            const msg = new Message({
                room,
                from: { id: user.id, username: user.username },
                text,
                readBy: [user.id] // sender has read it
            });
            await msg.save();
            io.to(room).emit('room:message', { room, message: toClientMessage(msg) });
        });

        // private message: toUserId is target user's Mongo _id (string)
        socket.on('private:message', async ({ toUserId, text }) => {
            if (!toUserId || !text) return;
            const toUser = await User.findById(toUserId).exec();
            if (!toUser) return socket.emit('error', { message: 'Recipient not found' });

            const msg = new Message({
                room: null,
                from: { id: user.id, username: user.username },
                to: { id: toUserId, username: toUser.username },
                text,
                readBy: [user.id] // sender
            });
            await msg.save();

            // deliver to recipient if online
            const online = onlineUsers.get(toUserId);
            if (online) io.to(online.socketId).emit('private:message', toClientMessage(msg));
            // and send back to sender
            socket.emit('private:message', toClientMessage(msg));
            // notification to recipient
            if (online) io.to(online.socketId).emit('notification', { message: `New private message from ${user.username}` });
        });

        // typing indicator
        socket.on('typing', ({ room, isTyping }) => {
            if (room) socket.to(room).emit('typing', { username: user.username, room, isTyping });
        });

        // read receipts
        socket.on('message:read', async ({ messageId }) => {
            if (!messageId) return;
            const msg = await Message.findById(messageId).exec();
            if (!msg) return;
            const userObjectId = msg.readBy.find(id => id.toString() === socket.user.id);
            if (!msg.readBy.some(id => id.toString() === socket.user.id)) {
                msg.readBy.push(socket.user.id);
                await msg.save();
                // If it's a room message broadcast to that room (if room exists) else to recipient if private
                if (msg.room) {
                    io.to(msg.room).emit('message:read', { messageId: msg._id.toString(), userId: socket.user.id });
                } else if (msg.to && msg.to.id) {
                    // private message: notify both parties
                    // notify recipient socket (if online)
                    const recipient = onlineUsers.get(msg.to.id.toString());
                    if (recipient) io.to(recipient.socketId).emit('message:read', { messageId: msg._id.toString(), userId: socket.user.id });
                    // notify sender (maybe this socket is the recipient)
                    const sender = onlineUsers.get(msg.from.id.toString());
                    if (sender) io.to(sender.socketId).emit('message:read', { messageId: msg._id.toString(), userId: socket.user.id });
                }
            }
        });

        socket.on('disconnect', () => {
            onlineUsers.delete(user.id);
            io.emit('presence:update', Array.from(onlineUsers.entries()).map(([id, v]) => ({ userId: id, username: v.username, socketId: v.socketId })));
            console.log(`Socket disconnected: ${user.username} (${user.id})`);
        });
    });

    // helper: fetch and send last 100 messages for a room
    async function sendRoomHistory(socket, room, limit = 100) {
        const docs = await Message.find({ room }).sort({ createdAt: 1 }).limit(limit).exec();
        const messages = docs.map(toClientMessage);
        socket.emit('room:history', { room, history: messages });
    }

    // convert Mongoose doc to client-friendly object
    function toClientMessage(doc) {
        return {
            id: doc._id.toString(),
            room: doc.room,
            from: { id: doc.from.id.toString(), username: doc.from.username },
            to: doc.to && doc.to.id ? { id: doc.to.id.toString(), username: doc.to.username } : null,
            text: doc.text,
            createdAt: doc.createdAt,
            readBy: (doc.readBy || []).map(id => id.toString())
        };
    }
};
