import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../socket/socket';

export default function Chat() {
    const { user, logout } = useContext(AuthContext);
    const socket = getSocket();
    const [rooms, setRooms] = useState(['global', 'room1', 'room2']);
    const [currentRoom, setCurrentRoom] = useState('global');
    const [messages, setMessages] = useState([]); // messages for current room
    const [input, setInput] = useState('');
    const [online, setOnline] = useState([]);
    const [typing, setTyping] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [privateChatUser, setPrivateChatUser] = useState(null);
    const [privateMessages, setPrivateMessages] = useState([]); // simple local list

    useEffect(() => {
        if (!socket) return;

        socket.on('room:history', ({ room, history }) => {
            if (room === currentRoom) setMessages(history);
        });

        socket.on('room:message', ({ room, message }) => {
            if (room === currentRoom) setMessages(prev => [...prev, message]);
        });

        socket.on('presence:update', (list) => setOnline(list));
        socket.on('typing', (data) => {
            setTyping(prev => ({ ...prev, [data.username]: data.isTyping }));
            setTimeout(() => setTyping(prev => ({ ...prev, [data.username]: false })), 3000);
        });
        socket.on('notification', (n) => setNotifications(prev => [n, ...prev]));
        socket.on('message:read', ({ messageId, userId }) => {
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, readBy: (m.readBy || []).concat([userId]) } : m));
            setPrivateMessages(prev => prev.map(m => m.id === messageId ? { ...m, readBy: (m.readBy || []).concat([userId]) } : m));
        });

        socket.on('private:message', (msg) => {
            setPrivateMessages(prev => [...prev, msg]);
            setNotifications(prev => [{ message: `Private from ${msg.from.username}` }, ...prev]);
        });

        // join default room
        socket.emit('room:join', { room: currentRoom });

        return () => {
            socket.off('room:history');
            socket.off('room:message');
            socket.off('presence:update');
            socket.off('typing');
            socket.off('notification');
            socket.off('message:read');
            socket.off('private:message');
        };
    }, [socket, currentRoom]);

    function switchRoom(room) {
        if (!socket) return;
        socket.emit('room:leave', { room: currentRoom });
        setCurrentRoom(room);
        setMessages([]);
        socket.emit('room:join', { room });
    }

    function sendMessage() {
        if (!input.trim()) return;
        socket.emit('room:message', { room: currentRoom, text: input });
        setInput('');
    }

    function startPrivateChat(targetUser) {
        setPrivateChatUser(targetUser);
        // optionally fetch history via a /api/messages endpoint (not implemented here)
        setPrivateMessages([]);
    }

    function sendPrivate(text) {
        if (!privateChatUser || !text.trim()) return;
        socket.emit('private:message', { toUserId: privateChatUser.userId, text });
    }

    function handleTyping(e) {
        setInput(e.target.value);
        if (!socket) return;
        socket.emit('typing', { room: currentRoom, isTyping: true });
    }

    function markRead(messageId) {
        if (!socket) return;
        socket.emit('message:read', { messageId });
    }

    return (
        <div style={{ display: 'flex', height: '100vh', gap: 20 }}>
            <div style={{ width: 260, padding: 12, borderRight: '1px solid #ddd' }}>
                <h3>Welcome, {user.username}</h3>
                <button onClick={logout}>Logout</button>

                <h4 style={{ marginTop: 12 }}>Rooms</h4>
                {rooms.map(r => (
                    <div key={r} style={{ margin: '6px 0' }}>
                        <button onClick={() => switchRoom(r)} style={{ fontWeight: r === currentRoom ? 'bold' : 'normal' }}>{r}</button>
                    </div>
                ))}

                <h4 style={{ marginTop: 12 }}>Online</h4>
                <ul>
                    {online.filter(o => o.userId !== user.id).map(o => (
                        <li key={o.socketId} style={{ marginBottom: 6 }}>
                            <span>{o.username}</span>
                            <button onClick={() => startPrivateChat(o)} style={{ marginLeft: 8 }}>Private</button>
                        </li>
                    ))}
                </ul>

                <h4 style={{ marginTop: 12 }}>Notifications</h4>
                <ul>
                    {notifications.map((n, i) => <li key={i}>{n.message}</li>)}
                </ul>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: 12, borderBottom: '1px solid #ddd' }}>
                    <strong>Room: {currentRoom}</strong>
                    <div style={{ fontSize: 12, color: '#666' }}>
                        Typing: {Object.entries(typing).filter(([k, v]) => v).map(([k]) => k).join(', ') || '—'}
                    </div>
                </div>

                <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
                    {messages.map(m => (
                        <div key={m.id} style={{ marginBottom: 10, padding: 8, border: '1px solid #eee', borderRadius: 6 }}>
                            <div style={{ fontSize: 12, color: '#555' }}>
                                <strong>{m.from.username}</strong> <span style={{ color: '#999' }}>{new Date(m.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <div style={{ marginTop: 6 }}>{m.text}</div>
                            <div style={{ marginTop: 6, fontSize: 12 }}>
                                Read by: {(m.readBy || []).length}
                                <button onClick={() => markRead(m.id)} style={{ marginLeft: 8 }}>Mark read</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ padding: 12, borderTop: '1px solid #ddd' }}>
                    <input
                        value={input}
                        onChange={handleTyping}
                        placeholder="Type a message..."
                        style={{ width: '60%', padding: '8px 10px' }}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                    />
                    <button onClick={sendMessage} style={{ marginLeft: 8 }}>Send</button>

                    {privateChatUser && (
                        <div style={{ marginTop: 12 }}>
                            <h4>Private chat with {privateChatUser.username}</h4>
                            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', padding: 8 }}>
                                {privateMessages.map(pm => (
                                    <div key={pm.id} style={{ marginBottom: 8 }}>
                                        <div><strong>{pm.from.username}</strong> <small>{new Date(pm.createdAt).toLocaleTimeString()}</small></div>
                                        <div>{pm.text}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <input placeholder="Private message..." id="privateInput" style={{ width: '60%', padding: 6 }} />
                                <button onClick={() => {
                                    const el = document.getElementById('privateInput');
                                    if (el) { sendPrivate(el.value); el.value = ''; }
                                }} style={{ marginLeft: 8 }}>Send Private</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
