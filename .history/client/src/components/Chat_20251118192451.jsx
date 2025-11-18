import React, { useEffect, useState } from 'react';
import { socket } from '../socket/socket';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import axios from 'axios';

export default function Chat({ username, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [privateTo, setPrivateTo] = useState(null);

  useEffect(() => {
    // fetch recent messages from server
    axios.get('/api/messages').then(res => setMessages(res.data)).catch(()=>{});

    // event listeners
    const handleReceive = (msg) => setMessages(prev => [...prev, msg]);
    const handlePrivate = (msg) => setMessages(prev => [...prev, msg]);
    const handleUserList = (list) => setUsers(list.map(u => u.username || u));
    const handleUserJoined = (u) => setMessages(prev => [...prev, { id: Date.now(), system: true, message: `${u.username} joined the chat`, timestamp: new Date().toISOString() }]);
    const handleUserLeft = (u) => setMessages(prev => [...prev, { id: Date.now(), system: true, message: `${u.username} left the chat`, timestamp: new Date().toISOString() }]);
    const handleTyping = (list) => setTypingUsers(list);

    socket.on('receive_message', handleReceive);
    socket.on('private_message', handlePrivate);
    socket.on('user_list', handleUserList);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('typing_users', handleTyping);

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('private_message', handlePrivate);
      socket.off('user_list', handleUserList);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('typing_users', handleTyping);
    };
  }, []);

  return (
    <div className="app">
      <div className="sidebar">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3>Welcome</h3>
          <div>
            <button onClick={() => { socket.disconnect(); onLogout(); }}>Logout</button>
          </div>
        </div>

        <div style={{marginTop:12}}>
          <h4>Online Users</h4>
          {users.map(u => (
            <div className="user" key={u}>
              <div>{u}</div>
              <div>
                {u !== username && <button onClick={() => setPrivateTo(u)}>Private</button>}
              </div>
            </div>
          ))}
        </div>

        <div style={{marginTop:12}}>
          <h4>Typing</h4>
          <div className="typing">{typingUsers.join(', ') || '—'}</div>
        </div>
      </div>

      <div className="main">
        <div className="header">
          <strong>{privateTo ? `Private with ${privateTo}` : 'Global Chat'}</strong>
        </div>

        <MessageList messages={messages} currentUsername={username} />

        <ChatInput privateTo={privateTo ? users.find(u=>u===privateTo) ? privateTo : null : null} />
      </div>
    </div>
  );
}
