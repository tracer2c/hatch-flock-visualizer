import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, Mic, MicOff, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BatchOverviewDisplay } from './BatchOverviewDisplay';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: any[];
  payload?: any;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: text,
          history: messages.slice(-10) // Send last 10 messages for context
        }
      });

      if (error) {
        console.error('Function invoke error:', error);
        throw error;
      }

      if (data?.error) {
        // Show user-friendly error from the edge function
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || "I'm having trouble connecting. Please try again in a moment.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        actions: data.actions,
        payload: data.payload
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // More specific error handling
      let errorDescription = "Failed to get response. Please try again.";
      
      if (error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
        errorDescription = "Network connection error. Please check your internet connection.";
      } else if (error.message?.includes('unauthorized')) {
        errorDescription = "Authentication error. Please refresh the page.";
      }
      
      // Show error as AI message for better UX
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: "I'm experiencing technical difficulties. Please try your question again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Connection Error",
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const downloadCSV = (payload: any) => {
    if (!payload?.items) return;
    
    const headers = [
      'Batch Number', 'Set Date', 'Expected Hatch Date', 'Days Since Set', 
      'Days to Hatch', 'Status', 'Machine Number', 'Machine Type', 
      'Flock Name', 'Breed', 'Total Eggs Set', 'Chicks Hatched', 'Hatch Rate %'
    ];
    
    const csvContent = [
      headers.join(','),
      ...payload.items.map((item: any) => [
        item.batch_number,
        item.set_date,
        item.expected_hatch_date || '',
        item.days_since_set,
        item.days_to_hatch || '',
        item.status,
        item.machine_number,
        item.machine_type,
        item.flock_name,
        item.breed,
        item.total_eggs_set,
        item.chicks_hatched,
        item.hatch_rate
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batches_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleActionClick = (action: any, message: Message) => {
    if (action.type === 'download_csv' && message.payload) {
      downloadCSV(message.payload);
    } else if (action.type === 'show_more') {
      sendMessage("Show me all batches with full details");
    }
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      // Voice input implementation would go here
      toast({
        title: "Voice Input",
        description: "Voice input not yet implemented"
      });
    } catch (error) {
      console.error('Voice input error:', error);
    } finally {
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full max-w-5xl mx-auto bg-background">
      {/* Header */}
      <div className="flex-shrink-0 bg-card border border-border rounded-t-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Your intelligent hatchery operations companion
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-card border-x border-border overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/5 mb-4">
                  <Bot className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Welcome to your AI Assistant
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Ask me anything about your hatchery operations. I can help with batch tracking, 
                  fertility analysis, and operational insights.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => sendMessage("Show me batch overview")}
                    className="px-3 py-1.5 text-xs bg-primary/5 hover:bg-primary/10 text-primary rounded-full transition-colors"
                  >
                    Show batch overview
                  </button>
                  <button
                    onClick={() => sendMessage("What batches are overdue?")}
                    className="px-3 py-1.5 text-xs bg-primary/5 hover:bg-primary/10 text-primary rounded-full transition-colors"
                  >
                    Check overdue batches
                  </button>
                  <button
                    onClick={() => sendMessage("Show fertility rates")}
                    className="px-3 py-1.5 text-xs bg-primary/5 hover:bg-primary/10 text-primary rounded-full transition-colors"
                  >
                    Fertility analysis
                  </button>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div
                  className={`max-w-[85%] ${
                    message.role === 'user'
                      ? 'order-first'
                      : ''
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted/50 border border-border'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Render structured batch data */}
                    {message.payload?.type === 'batches_overview' && (
                      <div className="mt-4">
                        <BatchOverviewDisplay 
                          payload={message.payload}
                          onShowMore={() => handleActionClick({ type: 'show_more' }, message)}
                          onDownloadCSV={() => handleActionClick({ type: 'download_csv' }, message)}
                        />
                      </div>
                    )}
                    
                    {message.actions && message.actions.length > 0 && !message.payload && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.actions.map((action, index) => (
                          <Button
                            key={index}
                            variant="secondary"
                            size="sm"
                            onClick={() => handleActionClick(action, message)}
                            className="text-xs"
                          >
                            {action.name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1 px-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                
                {message.role === 'user' && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary flex-shrink-0">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted/50 border border-border rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-card border border-border rounded-b-xl p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your hatchery operations..."
              disabled={isLoading}
              className="pr-20 h-11 border-border bg-background focus:ring-2 focus:ring-primary/20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startListening}
                disabled={isLoading}
                className={`h-7 w-7 p-0 ${isListening ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'}`}
              >
                {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="h-11 px-4"
            size="default"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};