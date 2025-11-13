import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Mic, User, MessageCircle, Download, ArrowLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BatchOverviewDisplay } from './BatchOverviewDisplay';
import { EnhancedMessageFormatter } from './EnhancedMessageFormatter';
import { AnalyticsMessage } from './AnalyticsMessage';
import { ChartMessage } from './ChartMessage';
import { SummaryCard } from './SummaryCard';
import { Link } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | any;
  timestamp: Date;
  actions?: any[];
  payload?: any;
  summary?: {
    overview: string;
    keyPoints: string[];
    isExecutive?: boolean;
  };
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check OpenAI configuration on mount
  useEffect(() => {
    const checkOpenAIConfig = async () => {
      try {
        const { data } = await supabase.functions.invoke('ai-chat', {
          body: { message: '__health_check__' }
        });
        console.log('[ChatInterface] Health check response:', data);
        setOpenaiConfigured(data?.openai_configured === true);
      } catch (error) {
        console.error('[ChatInterface] Health check failed:', error);
        setOpenaiConfigured(false);
      }
    };
    checkOpenAIConfig();
  }, []);

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
          history: messages.slice(-10).map(msg => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          }))
        }
      });

      if (error) {
        throw error;
      }

      // Log the raw response for debugging
      console.log('[ChatInterface] Raw AI response:', data);
      
      // Handle empty response with summary/payload fallback
      let response = data?.response || data?.message || '';
      if (!response && (data?.summary || data?.payload)) {
        if (data?.summary?.isExecutive) {
          response = 'Executive summary generated based on current operational data.';
        } else if (data?.summary) {
          response = 'Analysis complete. See summary below for key insights.';
        } else if (data?.payload) {
          response = 'Data retrieved successfully. See details below.';
        }
      }
      if (!response) {
        response = data?.error ? `Error: ${data.error}` : 'Sorry, I could not process your request.';
      }
      
      const responseActions = data?.actions || [];
      const responsePayload = data?.payload || null;
      const responseSummary = data?.summary || null;

      const assistantMessage: Message = {
        id: Date.now() + '-assistant',
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        actions: responseActions,
        payload: responsePayload,
        summary: responseSummary
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
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
      'House Number', 'Set Date', 'Expected Hatch Date', 'Days Since Set', 
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
      sendMessage("Show me all houses with full details");
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
    "Show me today's house overview with charts",
    "Compare fertility rates between houses",
    "Generate performance trends for the last month",
    "Show machine utilization analytics",
    "Create a fertility vs hatch rate comparison",
    "Display house status breakdown",
    "Analyze recent performance patterns",
    "Compare current vs historical data"
  ];

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleQuestionClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Smart Analytics</h1>
                  <p className="text-sm text-muted-foreground">AI-powered insights & reports</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* OpenAI Configuration Warning */}
          {openaiConfigured === false && (
            <div className="mb-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2 text-warning-foreground">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <p className="font-medium">OpenAI Configuration Required</p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                OpenAI API key is not configured. Some AI features may not work properly. Please configure your API key in the project settings.
              </p>
            </div>
          )}
          
          {messages.length === 0 ? (
            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <h2 className="text-lg font-semibold text-foreground">How can I help you today?</h2>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                  I can help you analyze your hatchery data, generate reports, and provide insights about your operations.
                </p>
              </div>
              
              <div className="max-w-4xl mx-auto">
                <p className="text-xs font-medium text-muted-foreground mb-4 text-center">Popular questions:</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="text-left h-auto p-3 text-sm hover:bg-accent/50 justify-start transition-all duration-200"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                  </div>
                  
                   <div className={`flex-1 space-y-2 max-w-4xl ${
                     message.role === 'user' ? 'text-right' : ''
                   }`}>
                     {/* Summary Card for assistant messages */}
                     {message.role === 'assistant' && message.summary && (
                       <div className="mb-3">
                         <SummaryCard summary={message.summary} />
                       </div>
                     )}

                     <div className="inline-block">
                      {message.role === 'user' ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                          {message.content}
                        </p>
                      ) : typeof message.content === 'object' && message.content?.type === 'analytics' ? (
                        <AnalyticsMessage data={message.content} />
                      ) : typeof message.content === 'object' && message.content?.type === 'chart' ? (
                        <ChartMessage
                          type={message.content.type}
                          title={message.content.title || 'Chart'}
                          description={message.content.description || ''}
                          data={message.content.data || []}
                          config={message.content.config || {}}
                          insights={message.content.insights || []}
                          chartId={`message-chart-${message.id}`}
                        />
                      ) : (
                        <EnhancedMessageFormatter 
                          content={message.content}
                          onQuestionClick={handleQuestionClick}
                          className="text-sm"
                        />
                      )}
                     </div>
                    
                    {/* Render structured house data */}
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
                      <div className="flex gap-2 mt-3">
                        {message.actions.map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleActionClick(action, message)}
                            className="text-xs h-8"
                          >
                            {action.type === 'download_csv' && <Download className="h-3 w-3 mr-1.5" />}
                            {action.name}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block py-2">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse delay-100" />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse delay-200" />
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
        <div className="max-w-6xl mx-auto p-6">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-4 items-end">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about your hatchery data..."
                  className="min-h-[48px] text-sm px-4 py-3 pr-14 rounded-xl border-2 focus:border-primary"
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
                className="h-12 px-6 rounded-xl text-sm"
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