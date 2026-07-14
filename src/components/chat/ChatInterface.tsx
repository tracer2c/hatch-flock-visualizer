import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Mic, User, MessageCircle, Download, AlertTriangle, Sparkles, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BatchOverviewDisplay } from './BatchOverviewDisplay';
import { EnhancedMessageFormatter } from './EnhancedMessageFormatter';
import { AnalyticsMessage } from './AnalyticsMessage';
import { ChartMessage } from './ChartMessage';
import { SummaryCard } from './SummaryCard';
import { cn } from '@/lib/utils';

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
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keep composer focused on mount and after stream completion
  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);


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

      console.log('[ChatInterface] Raw AI response:', data);
      
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
    { text: "Show me today's house overview with charts", icon: BarChart3, color: "text-blue-500" },
    { text: "Compare fertility rates between houses", icon: TrendingUp, color: "text-emerald-500" },
    { text: "Generate performance trends for the last month", icon: Activity, color: "text-violet-500" },
    { text: "Show machine utilization analytics", icon: Sparkles, color: "text-amber-500" },
    { text: "Create a fertility vs hatch rate comparison", icon: TrendingUp, color: "text-rose-500" },
    { text: "Display house status breakdown", icon: BarChart3, color: "text-cyan-500" },
  ];

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleQuestionClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-3rem)] bg-background overflow-hidden">


      {/* Main Content Area (scrolls under floating composer) */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-40">

          {/* Config warning: only when the health check explicitly reports the key is missing */}
          {openaiConfigured === false && (
            <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <p className="text-sm font-medium text-foreground">AI assistant is not configured</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ask an administrator to add the AI provider key in project settings.
              </p>
            </div>
          )}
          
          
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
              {/* Welcome Section */}
              <div className="text-center mb-6 animate-fade-in">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-1.5">What can I help you analyze?</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask about hatchery data, generate reports, or explore insights on your operations.
                </p>
              </div>

              
              {/* Prompt Grid */}
              <div className="w-full max-w-3xl">
                <p className="text-xs font-medium text-muted-foreground mb-3 text-center uppercase tracking-wider">
                  Popular questions
                </p>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {suggestedPrompts.map((prompt, index) => {
                    const Icon = prompt.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => handleSuggestedPrompt(prompt.text)}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className={cn(
                          "group flex items-center gap-3 p-3 rounded-xl border bg-card/50 backdrop-blur-sm",
                          "text-left text-sm text-foreground/90",
                          "opacity-0 animate-fade-in [animation-fill-mode:forwards]",
                          "transition-all duration-200 ease-out",
                          "hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 hover:bg-card",
                          "active:scale-[0.98]"
                        )}
                      >
                        <div className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                          "bg-muted/50 transition-colors duration-200",
                          "group-hover:bg-primary/10"
                        )}>
                          <Icon className={cn("h-4 w-4 transition-transform duration-200 group-hover:scale-110", prompt.color)} />
                        </div>
                        <span className="flex-1 line-clamp-1">{prompt.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, msgIndex) => (
                <div
                  key={message.id}
                  style={{ animationDelay: `${msgIndex * 30}ms` }}
                  className={cn(
                    "flex gap-3 animate-fade-in",
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-105",
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  )}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className={cn(
                    "flex-1 space-y-2 max-w-3xl",
                    message.role === 'user' ? 'text-right' : ''
                  )}>
                    {message.role === 'assistant' && message.summary && (
                      <div className="mb-3">
                        <SummaryCard summary={message.summary} />
                      </div>
                    )}

                    <div className="inline-block">
                      {message.role === 'user' ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground bg-primary/5 rounded-xl px-4 py-2">
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
                    
                    {message.payload?.type === 'batches_overview' && (
                      <div className="mt-3">
                        <BatchOverviewDisplay 
                          payload={message.payload}
                          onShowMore={() => handleActionClick({ type: 'show_more' }, message)}
                          onDownloadCSV={() => handleActionClick({ type: 'download_csv' }, message)}
                        />
                      </div>
                    )}
                    
                    {message.actions && message.actions.length > 0 && !message.payload && (
                      <div className="flex gap-2 mt-2">
                        {message.actions.map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleActionClick(action, message)}
                            className="text-xs h-7 transition-all duration-200 hover:scale-105 active:scale-95"
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
                <div className="flex gap-3 animate-fade-in">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-1.5 py-2 px-3 bg-muted/50 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating fade + composer */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/85 to-transparent" />
      <div className="absolute inset-x-0 bottom-6 px-4 sm:px-6 flex justify-center">
        <form onSubmit={handleSubmit} className="w-full max-w-3xl pointer-events-auto">
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl border bg-background/95 backdrop-blur-md",
              "pl-4 pr-2 py-2 transition-all duration-200",
              "shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.25)]",
              isFocused
                ? "border-primary/50 ring-4 ring-primary/10"
                : "border-border/70 hover:border-border"
            )}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask me anything about your hatchery data…"
              className={cn(
                "flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm h-10",
                "placeholder:text-muted-foreground/60"
              )}
              disabled={isLoading}
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={startListening}
              disabled={isLoading}
              className={cn(
                "h-9 w-9 rounded-xl transition-all duration-200",
                isListening ? "text-destructive bg-destructive/10" : "hover:bg-muted"
              )}
            >
              <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className={cn(
                "h-9 w-9 rounded-xl transition-all duration-200",
                "hover:scale-105 active:scale-95",
                !input.trim() && "opacity-50"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
            Smart Analytics · AI-generated results may need verification.
          </p>
        </form>
      </div>

    </div>
  );
};