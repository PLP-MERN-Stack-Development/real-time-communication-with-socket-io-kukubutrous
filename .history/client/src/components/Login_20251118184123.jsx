import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
    const { login } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState('login'); // or 'register'
    const [error, setError] = useState('');

    async function submit(e) {
        e.preventDefault();
        setError('');
        const res = await fetch(`/api/auth/${mode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.message || 'Something went wrong');
            return;
        }
        login(data.token, data.user);
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
            <form onSubmit={submit}>
                <div>
                    <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div>
                    <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div style={{ marginTop: 8 }}>
                    <button type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
                    <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ marginLeft: 8 }}>
                        {mode === 'login' ? 'Switch to Register' : 'Switch to Login'}
                    </button>
                </div>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <p style={{ marginTop: 12, color: '#666' }}>Demo: any username/password – registration saves to in-memory server store.</p>
        </div>
    );
}
