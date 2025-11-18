import { io } from 'socket.io-client';

let socket = null;

export function createSocket(token) {
    if (socket) return socket;
    socket = io('http://localhost:5000', {
        auth: { token }
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connect_error', err.message);
    });

    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function getSocket() {
    return socket;
}
