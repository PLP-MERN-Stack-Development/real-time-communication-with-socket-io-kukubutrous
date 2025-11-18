import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../socket/socket';

export default function Chat() {
    const { user, logout } = useContext(AuthContext);
    const socket = getSocket();
    const [rooms, setRooms] = useState(['global', 'room1', 'room2']);
    const [currentRoom, setCurrentRoom] = useState('global');
    const [messages, setMessages] = useState([]); // for current room
    const [input, setInput] = useState('');
    const [online, setOnline] = useState([]);
    const [typing, setTyping] = useState({});
    const [notifications, setNotifications] = useState([]);

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
        socket.on('message:read', ({ room, messageId, userId }) => {
            // update messages readBy locally (simple)
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, readBy: (m.readBy || []).concat([userId]) } : m));
        });

        // ask to join default room(s)
        socket.emit('room:join', { room: currentRoom });

        return () => {
            socket.off('room:history');
            socket.off('room:message');
            socket.off('presence:update');
            socket.off('typing');
            socket.off('notification');
            socket.off('message:read');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, currentRoom]);

    function switchRoom(room) {
        if (!socket) return;
        socket.emit('room:leave', { room: currentRoom });
        setCurrentRoom(room);
        socket.emit('room:join', { room });
        setMessages([]);
    }

    function sendMessage() {
        if (!input.trim()) return;
        socket.emit('room:message', { room: currentRoom, text: input });
        setInput('');
    }

    function sendPrivate(toSocketId) {
        const to = online.find(o => o.socketId === toSocketId);
        if (!to) return;
        const toUserId = to.socketId && Object.keys(online).length ? to.socketId : null;
        // Note: demo server expects user id, but presence list earlier only had socketId & username.
        // For demo, we will ask user to click a username in the online list to initiate a private conversation. 
        // (Advanced: store userId in presence on the server - it's straightforward to add).
        alert('Private messaging demo: server uses numeric user IDs to route. In this demo use rooms or extend presence to include user id.');
    }

    function handleTyping(e) {
        setInput(e.target.value);
        if (!socket) return;
        socket.emit('typing', { room: currentRoom, isTyping: true });
    }

    function markRead(messageId) {
        if (!socket) return;
        socket.emit('message:read', { room: currentRoom, messageId });
    }

    return (
        <div style={{ display: 'flex', height: '100vh', gap: 20 }}>
            <div style={{ width: 220, padding: 12, borderRight: '1px solid #ddd' }}>
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
                    {online.map(o => <li key={o.socketId}>{o.username}</li>)}
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
                        style={{ width: '80%', padding: '8px 10px' }}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                    />
                    <button onClick={sendMessage} style={{ marginLeft: 8 }}>Send</button>
                </div>
            </div>
        </div>
    );
}
