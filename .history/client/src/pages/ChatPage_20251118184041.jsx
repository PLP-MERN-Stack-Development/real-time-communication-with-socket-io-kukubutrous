import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Login from '../components/Login';
import Chat from '../components/Chat';
import { createSocket, disconnectSocket, getSocket } from '../socket/socket';

export default function ChatPage() {
    const { token, user } = useContext(AuthContext);
    const [socketReady, setSocketReady] = useState(false);

    useEffect(() => {
        if (token) {
            const s = createSocket(token);
            s.on('connect', () => setSocketReady(true));
            s.on('disconnect', () => setSocketReady(false));
        } else {
            disconnectSocket();
            setSocketReady(false);
        }

        return () => {
            const s = getSocket();
            if (s) s.off(); // clean listeners
        };
    }, [token]);

    if (!token) return <Login />;
    return <Chat />;
}
