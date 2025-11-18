import React from 'react';
import { AuthProvider } from './context/AuthContext';
import ChatPage from './pages/ChatPage';

export default function App() {
  return (
    <AuthProvider>
      <ChatPage />
    </AuthProvider>
  );
}
