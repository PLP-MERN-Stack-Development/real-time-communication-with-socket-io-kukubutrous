import React, { useState } from 'react';
import { socket } from '../socket/socket';

export default function ChatInput({ privateTo }) {
    const [text, setText] = useState('');

    const send = () => {
        if (!text.trim()) return;
        if (privateTo) socket.emit('private_message', { to: privateTo, message: text });
        else socket.emit('send_message', { message: text });
        setText('');
        socket.emit('typing', false);
    };

    return (
        <div className="input-bar">
            <input
                value={text}
                onChange={(e) => {
                    setText(e.target.value);
                    socket.emit('typing', e.target.value.length > 0);
                }}
                placeholder={privateTo ? `Private to ${privateTo}` : 'Type a message...'}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            />
            <button onClick={send}>Send</button>
        </div>
    );
}
