import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import SubscribeDialog from '@/components/SubscribeDialog'
import { useSubscribeModal } from '@/stores/useSubscribeModal'
import { trackGoal } from '@/lib/utils'

interface ChatPanelProps {
  curriculum: any
  currentDay: any
}

// Define a local Message type
interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
}

export function ChatPanel({ curriculum, currentDay }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [chatApiUrl, setChatApiUrl] = useState<string | undefined>(undefined)
  const [isChatReady, setIsChatReady] = useState(false)
  
  // Local state for messages, input, and loading status
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [draft, setDraft] = useState<string>('') // User's current input
  const [isLoading, setIsLoading] = useState(false) // For AI response loading
  const [toolStatusMessage, setToolStatusMessage] = useState<string | null>(null) // New state for tool status

  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const prevCurriculumIdRef = useRef<string | null | undefined>(null)
  const historyLoadedForCurriculumIdRef = useRef<string | null>(null);

  const [showSubscribe, setShowSubscribe] = useState(false)
  const { open } = useSubscribeModal()

  useEffect(() => {
    const currentCurriculumId = curriculum?.id
    if (prevCurriculumIdRef.current !== currentCurriculumId && currentCurriculumId) {
      console.log("ChatPanel: Curriculum ID changed. Resetting history loaded flag and messages.")
      historyLoadedForCurriculumIdRef.current = null;
      setMessages([]); 
      setIsLoadingHistory(false);
    }
    prevCurriculumIdRef.current = currentCurriculumId

    const initializeChat = async () => {
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        if (token) {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          // Ensure this points to the LangChain stream endpoint
          setChatApiUrl(`${baseUrl}/api/chat/lc_stream?token=${encodeURIComponent(token)}`)
          setIsChatReady(true)
          console.log("ChatPanel: Stream API URL configured for LANGCHAIN endpoint (/lc_stream).")
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
  }, [curriculum?.id]);
  
  useEffect(() => {
    const fetchChatHistory = async () => {
      console.log("ChatPanel: fetchChatHistory effect running", {
        isChatReady,
        curriculumId: curriculum?.id,
        isLoadingHistory,
        historyLoadedFor: historyLoadedForCurriculumIdRef.current,
        shouldLoad: isChatReady && curriculum?.id && !isLoadingHistory && historyLoadedForCurriculumIdRef.current !== curriculum.id
      });
      
      if (!isChatReady || !curriculum?.id || isLoadingHistory || historyLoadedForCurriculumIdRef.current === curriculum.id) {
        return;
      }

      setIsLoadingHistory(true);
      console.log(`ChatPanel: Fetching history for curriculum ${curriculum.id}`);
      try {
        const session = await supabase.auth.getSession();
        console.log("ChatPanel: Auth session status:", { hasSession: !!session.data.session, hasToken: !!session.data.session?.access_token });
        const token = session.data.session?.access_token;
        if (!token) {
          console.error("ChatPanel: No auth token in session");
          toast.error("Auth error fetching chat history.");
          setIsLoadingHistory(false);
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
        
        const mappedMessages: LocalMessage[] = (historyData.messages || []).map((msg: any, index: number) => ({
          id: `hist-${curriculum.id}-${index}-${new Date().getTime()}`,
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
          createdAt: msg.created_at ? new Date(msg.created_at) : new Date() // Assuming created_at from DB
        }));
        
        setMessages(mappedMessages); // Use local setMessages
        historyLoadedForCurriculumIdRef.current = curriculum.id;
        console.log(`ChatPanel: Fetched and set ${mappedMessages.length} messages from history for ${curriculum.id}.`);

      } catch (error: any) {
        console.error("ChatPanel: Error fetching chat history:", error);
        toast.error(`Could not load chat history: ${error.message}`);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchChatHistory();
  }, [isChatReady, curriculum?.id]); // Removed setMessages - it's stable and shouldn't be a dependency

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const formatTime = (timestamp?: Date) => { // Updated to accept Date
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (!isChatReady || isLoading) return;
    setDraft(suggestion); 
  }

  useEffect(() => {
    if (messages.length === 0 || messages.every(m => m.role !== 'user')) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [messages])

  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!draft.trim() || isLoading || !isChatReady || !chatApiUrl) return;

    const userMessage: LocalMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: draft,
        createdAt: new Date(),
    };
    
    // Track chat usage goals
    trackGoal('chat_message_sent')
    
    // Track first chat message
    if (messages.filter(m => m.role === 'user').length === 0) {
      trackGoal('first_chat_message')
    }
    
    // Track chat usage for specific day
    if (currentDay?.day_number) {
      trackGoal(`chat_day_${currentDay.day_number}`)
    }

    // Add user message to UI immediately
    setMessages(prevMessages => [...prevMessages, userMessage]);
    const currentDraftForApi = draft; // Capture draft before clearing for this request
    setDraft(''); 
    setIsLoading(true);
    setToolStatusMessage(null); // Reset tool status at the beginning of a new submission
    setShowSuggestions(false);

    let assistantResponseContent = "";
    const assistantIdForThisStream = `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let tempAssistantMessageAdded = false;
    
    // let fullRawStreamedTextDebug = ""; // Keep for targeted debugging if needed

    try {
        const response = await fetch(chatApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                curriculum_id: curriculum?.id,
                current_day_title: currentDay?.title,
                current_day_number: currentDay?.day_number,
                curriculum_title: curriculum?.title,
                learning_goal: curriculum?.learning_goal,
                difficulty_level: curriculum?.difficulty_level,
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Chat API request failed with no JSON body" }));
            throw new Error(errorData.detail || `HTTP error ${response.status}`);
        }
        if (!response.body) {
            throw new Error("Response body is null");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = '';
        let logicalStreamEnd = false;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log("[ChatPanel Stream] Reader done.");
                if (accumulatedData.trim().length > 0 && !accumulatedData.includes("__END_OF_AI_STREAM__")) {
                    console.warn("[ChatPanel Stream] Ended with unprocessed data:", JSON.stringify(accumulatedData));
                    assistantResponseContent += accumulatedData.trim(); 
                    setToolStatusMessage(null);
                }
                break; 
            }

            accumulatedData += decoder.decode(value, { stream: true });
            // fullRawStreamedTextDebug += decoder.decode(value, {stream: false}); 
            
            const linesFromChunk = accumulatedData.split('\n');
            if (linesFromChunk.length > 0) {
                accumulatedData = linesFromChunk.pop() || ''; 
            }

            for (const line of linesFromChunk) { 
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;

                console.log("[ChatPanel STREAM PROCESSED LINE]:", JSON.stringify(trimmedLine));

                if (trimmedLine.startsWith("__TOOL_START__!")) {
                    try {
                        const payload = JSON.parse(trimmedLine.substring("__TOOL_START__!".length));
                        const inputSummary = typeof payload.input === 'string' ? payload.input : JSON.stringify(payload.input);
                        setToolStatusMessage(`Using ${payload.name} for: '${inputSummary.substring(0, 40)}...'`);
                        console.log("[ChatPanel Tool Start]:", payload.name, payload.input);
                        assistantResponseContent = ""; // Clear any intermediate LLM thoughts if tool starts
                        if (tempAssistantMessageAdded) {
                            setMessages(prev => prev.map(m => m.id === assistantIdForThisStream ? { ...m, content: "" } : m));
                        }
                    } catch (e) { console.error("Error parsing TOOL_START JSON", e); setToolStatusMessage("Processing tool..."); }
                } else if (trimmedLine.startsWith("__TOOL_END__!")) {
                    try {
                        const payload = JSON.parse(trimmedLine.substring("__TOOL_END__!".length));
                        setToolStatusMessage(`${payload.name} finished. Synthesizing answer...`);
                        console.log("[ChatPanel Tool End]:", payload.name);
                    } catch (e) { console.error("Error parsing TOOL_END JSON", e); setToolStatusMessage("Tool finished...");}
                } else if (trimmedLine === "__END_OF_AI_STREAM__") {
                    console.log("[ChatPanel PlainText Stream] Exact End signal __END_OF_AI_STREAM__ received.");
                    setToolStatusMessage(null); 
                    logicalStreamEnd = true;
                    break; 
                } else {
                    setToolStatusMessage(null); // AI is generating text, clear tool status
                    assistantResponseContent += trimmedLine + "\n"; 
                    
                    // console.log("[ChatPanel DEBUG] Accumulating content: ", JSON.stringify(assistantResponseContent.substring(0,100)));

                    if (!tempAssistantMessageAdded) {
                        setMessages(prev => [...prev, { id: assistantIdForThisStream, role: 'assistant', content: assistantResponseContent.trimEnd(), createdAt: new Date() }]);
                        tempAssistantMessageAdded = true;
                    } else {
                        setMessages(prev => prev.map(m => 
                            m.id === assistantIdForThisStream ? { ...m, content: assistantResponseContent.trimEnd() } : m
                        ));
                    }
                }
            }
            if (logicalStreamEnd) break; 
        }
        // --- End of stream reading loop ---
        if (assistantResponseContent.includes("__END_OF_AI_STREAM__")) {
             assistantResponseContent = assistantResponseContent.replace(/__END_OF_AI_STREAM__/g, "").trim();
        }
        if (tempAssistantMessageAdded) {
            setMessages(prev => prev.map(m => m.id === assistantIdForThisStream ? { ...m, content: assistantResponseContent.trim() } : m));
        } else if (assistantResponseContent.trim() !== "") {
             setMessages(prev => [...prev, { id: assistantIdForThisStream, role: 'assistant', content: assistantResponseContent.trim(), createdAt: new Date() }]);
        }
        // console.log("[ChatPanel ACCUMULATED RAW FOR DEBUG]:", JSON.stringify(fullRawStreamedTextDebug));
        console.log("[ChatPanel FINAL assistantResponseContent FOR SAVE]:", JSON.stringify(assistantResponseContent.trim()));
        
        // Save the turn 
        if (curriculum?.id && assistantResponseContent.trim()) {
            try {
                const session = await supabase.auth.getSession();
                const token = session.data.session?.access_token;
                if (!token) throw new Error("Auth token not found for saving turn.");

                const appendTurnApiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat/append_turn`;
                const saveResponse = await fetch(appendTurnApiUrl, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        curriculum_id: curriculum.id,
                        user_message: { role: 'user', content: userMessage.content }, 
                        assistant_message: { role: 'assistant', content: assistantResponseContent.trim() }, 
                    }),
                });
                if (!saveResponse.ok) {
                    const errorData = await saveResponse.json().catch(() => ({ detail: "Failed to save chat turn" }));
                    throw new Error(errorData.detail || `HTTP error ${saveResponse.status}`);
                }
                console.log("[ChatPanel Save Turn] Chat turn saved successfully.");
            } catch (saveError: any) {
                console.error("[ChatPanel Save Turn] Error saving chat turn:", saveError);
                toast.error(`Could not save chat: ${saveError.message}`);
            }
        } else if (curriculum?.id) {
            console.log("[ChatPanel Save Turn] No assistant content to save for turn.");
        }

    } catch (error) {
        console.error("Chat error:", error)
    } finally {
        setIsLoading(false);
        setToolStatusMessage(null); // Ensure tool status is cleared on finish/error
    }
  }

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
              message.role === 'user' ? "justify-end" : "justify-start"
            )}>
              {message.role !== 'user' && (
                <div className="w-8 h-8 rounded-md border-2 border-foreground bg-secondary flex items-center justify-center flex-shrink-0 neo-brutal-shadow-sm">
                  <Bot className="w-4 h-4 text-secondary-foreground" strokeWidth={2.5}/>
                </div>
              )}
              <div className={cn(
                "max-w-[80%] min-w-0 p-3 rounded-lg border-2 border-foreground neo-brutal-shadow-sm overflow-hidden",
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
                {message.role === 'user' ? (
                  <div className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
                    {message.content}
                  </div>
                ) : (
                  <div className="text-sm prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5 [&_*]:overflow-wrap-anywhere [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-normal">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                 <div className="w-8 h-8 rounded-md border-2 border-foreground bg-accent flex items-center justify-center flex-shrink-0 neo-brutal-shadow-sm">
                  <User className="w-4 h-4 text-accent-foreground" strokeWidth={2.5}/>
                </div>
              )}
            </div>
          ))}
          
          {/* Display Tool Status */} 
          {toolStatusMessage && (
              <div className="flex items-start gap-3 px-4 py-1 justify-start">
                   <div className="w-8 h-8 rounded-md border-2 border-foreground bg-secondary flex items-center justify-center flex-shrink-0 neo-brutal-shadow-sm">
                      <Bot className="w-4 h-4 text-secondary-foreground" strokeWidth={2.5}/>
                  </div>
                  <div className="max-w-[80%] min-w-0 p-2.5 rounded-lg border-2 border-foreground/30 bg-card text-foreground/80 neo-brutal-shadow-sm italic flex items-center gap-2 text-xs overflow-hidden">
                      <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> 
                      <span className="truncate">{toolStatusMessage}</span>
                  </div>
              </div>
          )}

          {/* Main loading indicator (dots for AI "typing" final answer) */} 
          {isLoading && !toolStatusMessage && messages.length > 0 && messages[messages.length -1]?.role === 'user' && (
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

          {showSuggestions && !isLoading && !toolStatusMessage && (messages.length === 0 || messages.every(m => m.role !== 'user')) && (
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
                  className="font-black text-white w-full max-w-sm"
                  disabled={!isChatReady || isLoading} 
                >
                  Explain this concept
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleSuggestionClick('Give me an example of this')}
                  className="font-black text-white w-full max-w-sm"
                  disabled={!isChatReady || isLoading}
                >
                  Give me an example
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleSuggestionClick('Create a practice problem for me')}
                  className="font-black text-white w-full max-w-sm"
                  disabled={!isChatReady || isLoading}
                >
                  Practice problem
                </Button>
              </div>
            </div>
          )}
          {!isChatReady && !isLoading && !toolStatusMessage && (
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
          value={draft}
          onChange={handleDraftChange}
          placeholder={isChatReady ? "Ask a question..." : "Connecting to AI..."}
          className="flex-1 h-10 bg-card text-foreground placeholder:text-foreground/60 focus-visible:ring-primary"
          disabled={!isChatReady || isLoading}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!isChatReady || isLoading || !draft.trim()}
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

      {showSubscribe && <SubscribeDialog open={showSubscribe} onClose={() => setShowSubscribe(false)} />}
    </div>
  )
} 