import React from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';

const ChatPage = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">AI Assistant</h1>
          <p className="text-muted-foreground">
            Chat with your hatchery AI assistant for insights and operations
          </p>
        </div>
        
        <ChatInterface />
      </div>
    </div>
  );
};

export default ChatPage;