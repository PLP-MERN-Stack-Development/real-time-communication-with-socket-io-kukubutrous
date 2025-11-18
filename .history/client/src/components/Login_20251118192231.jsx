import React, { useState } from 'react';

export default function Login({ onJoin }) {
    const [name, setName] = useState('');

    return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                <h2>Join Chat</h2>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Username" style={{ padding: 8, width: 240 }} />
                <div style={{ marginTop: 12 }}>
                    <button onClick={() => name.trim() && onJoin(name.trim())} style={{ padding: '8px 12px' }}>Join</button>
                </div>
            </div>
        </div>
    );
}
