import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Mic, User, MessageCircle, Download } from 'lucide-react';
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

  const suggestedPrompts = [
    "Show me today's batch overview",
    "What are the key performance indicators?", 
    "Generate a weekly report",
    "Check batch completion status"
  ];

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex-shrink-0 text-center py-4 px-6 border-b">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Hatchery Assistant</h1>
          <p className="text-base text-muted-foreground">Your intelligent hatchery data companion</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">How can I help you today?</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  I can help you analyze your hatchery data, generate reports, and provide insights about your operations.
                </p>
              </div>
              
              <div className="grid gap-4 max-w-2xl mx-auto">
                <p className="text-base font-medium text-muted-foreground">Popular questions:</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="text-left h-auto p-5 text-base hover:bg-accent/50 border-2"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-5 w-5" />
                    ) : (
                      <MessageCircle className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className={`flex-1 space-y-3 max-w-3xl ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}>
                    <div className={`inline-block p-6 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 border'
                    }`}>
                      <p className="text-base leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    
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
                      <div className="flex gap-3 mt-4">
                        {message.actions.map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleActionClick(action, message)}
                            className="text-sm"
                          >
                            {action.type === 'download_csv' && <Download className="h-4 w-4 mr-2" />}
                            {action.name}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block p-6 rounded-2xl bg-muted/50 border">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/40 animate-pulse" />
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/40 animate-pulse delay-100" />
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/40 animate-pulse delay-200" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Input Bar */}
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto p-6">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-4 items-end">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about your hatchery data..."
                  className="min-h-[56px] text-base px-4 py-4 pr-14 rounded-xl border-2 focus:border-primary"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={startListening}
                  disabled={isLoading}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 ${
                    isListening ? 'text-red-500' : ''
                  }`}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="h-14 px-8 rounded-xl text-base"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};