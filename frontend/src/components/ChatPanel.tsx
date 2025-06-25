import { useChat, type Message } from '@ai-sdk/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

interface ChatPanelProps {
  curriculum: any
  currentDay: any
}

export function ChatPanel({ curriculum, currentDay }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [chatApiUrl, setChatApiUrl] = useState<string | undefined>(undefined)
  const [isChatReady, setIsChatReady] = useState(false)
  const [fetchedMessages, setFetchedMessages] = useState<Message[] | undefined>(undefined)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const prevCurriculumIdRef = useRef<string | null | undefined>(null)
  const messagesRef = useRef<Message[]>([])

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, error } = useChat({
    api: chatApiUrl,
    initialMessages: fetchedMessages,
    headers: async () => {
      const session = await supabase.auth.getSession()
      return {
        Authorization: `Bearer ${session.data.session?.access_token || ''}`,
      }
    },
    body: {
      curriculum_id: curriculum?.id,
      current_day_title: currentDay?.title,
      current_day_number: currentDay?.day_number,
      curriculum_title: curriculum?.title,
      learning_goal: curriculum?.learning_goal,
      difficulty_level: curriculum?.difficulty_level
    },
    onFinish: async (assistantMessage) => {
      setShowSuggestions(false)

      const currentMessages = messagesRef.current; 
      console.log("[ChatPanel onFinish] Triggered. Assistant message (from arg) ID:", assistantMessage.id, "Content:", assistantMessage.content.substring(0,50)+"...");
      console.log("[ChatPanel onFinish] messagesRef.current at time of onFinish (length " + currentMessages.length + ") Last 2:", JSON.stringify(currentMessages.slice(-2)));

      if (!curriculum?.id) {
        console.warn("[ChatPanel onFinish] No curriculum ID, cannot save chat turn.");
        return;
      }
      
      const assistantMessageInStateIndex = currentMessages.findIndex(m => m.id === assistantMessage.id);
      console.log("[ChatPanel onFinish] Index of assistantMessage (from arg) in messagesRef.current:", assistantMessageInStateIndex);

      if (assistantMessageInStateIndex === -1) {
        console.warn("[ChatPanel onFinish] Assistant message (from arg) not found in current messagesRef. Cannot reliably save turn.");
        return;
      }

      let userMessageForThisTurn: Message | null = null;
      // Search backwards from the position *before* the assistant message in the state
      for (let i = assistantMessageInStateIndex - 1; i >= 0; i--) {
        if (currentMessages[i]?.role === 'user') {
          userMessageForThisTurn = currentMessages[i];
          break;
        }
      }
      
      // The assistant message from state should be the one we found by index
      const assistantMessageFromState = currentMessages[assistantMessageInStateIndex];

      if (userMessageForThisTurn && assistantMessageFromState) {
        console.log("[ChatPanel onFinish] Found User Message (searching backwards):", JSON.stringify(userMessageForThisTurn));
        console.log("[ChatPanel onFinish] Pairing with Assistant Message (from state at index):", JSON.stringify(assistantMessageFromState));
        
        // Final check: ensure the assistant message from state (at the found index) matches the one from onFinish argument
        if (assistantMessageFromState.id !== assistantMessage.id) {
            console.error("[ChatPanel onFinish] CRITICAL: Mismatch between assistantMessage from arg and from state after findIndex. This should not happen.",
                { argId: assistantMessage.id, stateId: assistantMessageFromState.id });
            return; // Don't save if there's a critical mismatch
        }

        try {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          if (!token) {
            toast.error("Auth error saving chat turn.");
            return;
          }

          const appendTurnApiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat/append_turn`;
          
          const response = await fetch(appendTurnApiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              curriculum_id: curriculum.id,
              user_message: { role: 'user', content: userMessageForThisTurn.content },
              // Use the content from assistantMessage (arg) as it's the definitive one for this onFinish event
              assistant_message: { role: 'assistant', content: assistantMessage.content }, 
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Failed to save chat turn" }));
            throw new Error(errorData.detail || `HTTP error ${response.status}`);
          }
          const saveData = await response.json();
          console.log("[ChatPanel onFinish] Chat turn saved successfully.", saveData);
        } catch (error: any) {
          console.error("[ChatPanel onFinish] Error saving chat turn:", error);
          toast.error(`Could not save chat: ${error.message}`);
        }
      } else {
        console.warn("[ChatPanel onFinish] Could not find a preceding user message for the assistant response, or assistant message anomaly.", {
          foundUserMsg: !!userMessageForThisTurn,
          assistantMessageFromStateExists: !!assistantMessageFromState
        });
      }
    },
    onError: (error) => {
      console.error('Chat error:', error)
      toast.error(`Chat error: ${error.message}`)
    },
  })

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const currentCurriculumId = curriculum?.id
    if (prevCurriculumIdRef.current !== currentCurriculumId) {
      console.log("ChatPanel: Curriculum ID changed. Resetting fetchedMessages.")
      setFetchedMessages(undefined)
      setIsLoadingHistory(false)
    }
    prevCurriculumIdRef.current = currentCurriculumId

    const initializeChat = async () => {
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        if (token) {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          setChatApiUrl(`${baseUrl}/api/chat/stream?token=${encodeURIComponent(token)}`)
          setIsChatReady(true)
          console.log("ChatPanel: Stream API URL with token configured.")
        } else {
          console.error("ChatPanel: No auth token found for chat stream. Chat will be disabled.")
          setIsChatReady(false)
        }
      } catch (error) {
        console.error("ChatPanel: Error initializing chat session:", error)
        setIsChatReady(false)
      }
    }
    initializeChat()
  }, [curriculum?.id])
  
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!isChatReady || !curriculum?.id || isLoadingHistory || fetchedMessages !== undefined) {
        return;
      }

      setIsLoadingHistory(true);
      console.log(`ChatPanel: Fetching history for curriculum ${curriculum.id}`);
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) {
          toast.error("Auth error fetching chat history.");
          setIsLoadingHistory(false);
          setFetchedMessages([]);
          return;
        }

        const historyApiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat/history/${curriculum.id}`;
        const response = await fetch(historyApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: "Failed to fetch chat history" }));
          throw new Error(errorData.detail || `HTTP error ${response.status}`);
        }

        const historyData = await response.json();
        
        const mappedMessages: Message[] = (historyData.messages || []).map((msg: any, index: number) => ({
          id: `hist-${curriculum.id}-${index}-${new Date().getTime()}`,
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));
        
        setFetchedMessages(mappedMessages);
        console.log(`ChatPanel: Fetched ${mappedMessages.length} messages from history.`);

      } catch (error: any) {
        console.error("ChatPanel: Error fetching chat history:", error);
        toast.error(`Could not load chat history: ${error.message}`);
        setFetchedMessages([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchChatHistory();
  }, [isChatReady, curriculum?.id, fetchedMessages, isLoadingHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const formatTime = (timestamp?: number | Date) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (!isChatReady) return;
    setInput(suggestion)
  }

  useEffect(() => {
    if (messages.length === 0 || messages.every(m => m.role !== 'user')) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [messages])

  return (
    <div className="h-full w-full min-w-0 flex flex-col bg-card text-foreground overflow-hidden">
      {/* Chat header */}
      <div className="px-4 py-2.5 border-b-2 border-foreground flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-md border-2 border-foreground bg-primary flex items-center justify-center neo-brutal-shadow-sm">
          <Bot className="w-5 h-5 text-primary-foreground" strokeWidth={2.5}/>
        </div>
        <div>
          <h2 className="text-base font-black">AI Learning Assistant</h2>
          <p className="text-xs text-foreground/70 font-bold">Always here to help</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 w-full min-h-0" ref={scrollRef}>
        <div className="p-4 space-y-5 w-full">
          {messages.map((message) => (
            <div key={message.id} className={cn(
              "flex items-start gap-3",
              message.role === 'user' ? "justify-end" : ""
            )}>
              {message.role !== 'user' && (
                <div className="w-8 h-8 rounded-md border-2 border-foreground bg-secondary flex items-center justify-center flex-shrink-0 neo-brutal-shadow-sm">
                  <Bot className="w-4 h-4 text-secondary-foreground" strokeWidth={2.5}/>
                </div>
              )}
              <div className={cn(
                "max-w-[80%] p-3 rounded-lg border-2 border-foreground neo-brutal-shadow-sm",
                message.role === 'user' 
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground"
              )}>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-black">
                    {message.role === 'user' ? 'You' : 'AI Tutor'}
                  </span>
                  <span className="text-xs text-current/70 font-medium">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
              {message.role === 'user' && (
                 <div className="w-8 h-8 rounded-md border-2 border-foreground bg-accent flex items-center justify-center flex-shrink-0 neo-brutal-shadow-sm">
                  <User className="w-4 h-4 text-accent-foreground" strokeWidth={2.5}/>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && messages[messages.length -1]?.role === 'user' && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md border-2 border-foreground bg-secondary flex items-center justify-center flex-shrink-0 neo-brutal-shadow-sm">
                <Bot className="w-4 h-4 text-secondary-foreground" strokeWidth={2.5} />
              </div>
              <div className="bg-card text-foreground p-3 rounded-lg border-2 border-foreground neo-brutal-shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {showSuggestions && isChatReady && (
            <div className="pt-4 text-center">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary" strokeWidth={1.5}/>
              <p className="text-sm font-bold text-foreground/80 mb-3">
                Ask me anything about your lesson or try these:
              </p>
              <div className="flex flex-col gap-2 items-center px-4">
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSuggestionClick('Explain this concept in simple terms')}
                  className="font-black w-full max-w-sm"
                  disabled={!isChatReady || isLoading} 
                >
                  Explain this concept
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleSuggestionClick('Give me an example of this')}
                  className="font-black w-full max-w-sm"
                  disabled={!isChatReady || isLoading}
                >
                  Give me an example
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleSuggestionClick('Create a practice problem for me')}
                  className="font-black w-full max-w-sm"
                  disabled={!isChatReady || isLoading}
                >
                  Practice problem
                </Button>
              </div>
            </div>
          )}
          {!isChatReady && (
            <div className="pt-4 text-center">
                <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin"/>
                <p className="text-sm font-bold text-foreground/80 mb-3">
                    Connecting to AI Assistant...
                </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t-2 border-foreground flex gap-2 items-center flex-shrink-0">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={isChatReady ? "Ask a question..." : "Connecting to AI..."}
          className="flex-1 h-10 bg-card text-foreground placeholder:text-foreground/60 focus-visible:ring-primary"
          disabled={!isChatReady || isLoading}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!isChatReady || isLoading || !input.trim()}
          className="h-10 w-10 shrink-0"
          title={!isChatReady ? "Chat is not ready" : "Send message"}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </form>
    </div>
  )
} 