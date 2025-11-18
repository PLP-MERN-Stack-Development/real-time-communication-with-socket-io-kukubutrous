import React from 'react';

export default function MessageList({ messages, currentUsername }) {
  return (
    <div className="messages">
      {messages.map((m) => {
        if (m.system) {
          return <div key={m.id} className="system">{m.message}</div>;
        }

        const mine = m.sender === currentUsername;
        return (
          <div key={m._id || m.timestamp || m.id} className={`msg ${mine ? 'mine' : ''}`}>
            <div style={{fontSize:12, color:'#555'}}><strong>{m.sender}</strong> <span style={{color:'#888', marginLeft:8}}>{new Date(m.timestamp).toLocaleTimeString()}</span></div>
            <div style={{marginTop:6}}>{m.text}</div>
            {m.isPrivate && <div style={{fontSize:11,color:'#9ca3af'}}>Private</div>}
          </div>
        );
      })}
    </div>
  );
}
