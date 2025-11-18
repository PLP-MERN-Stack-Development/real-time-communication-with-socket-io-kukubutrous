import React, { useState } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';
import { socket } from './socket/socket';

export default function App() {
  const [username, setUsername] = useState('');

  return (
    <>
      {!username ? (
        <Login onJoin={(name) => {
          setUsername(name);
          // use provided socket helper to connect + emit user_join
          socket.connect();
          if (name) socket.emit('user_join', name);
        }} />
      ) : (
        <Chat username={username} onLogout={() => {
          socket.disconnect();
          setUsername('');
        }} />
      )}
    </>
  );
}
