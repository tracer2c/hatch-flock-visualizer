import React from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';

const ChatPage = () => {
  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="container mx-auto h-full">
        <ChatInterface />
      </div>
    </div>
  );
};

export default ChatPage;