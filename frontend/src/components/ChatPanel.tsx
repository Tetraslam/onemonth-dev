import { useChat } from '@ai-sdk/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useEffect, useRef, useState } from 'react'

interface ChatPanelProps {
  curriculum: any
  currentDay: any
}

export function ChatPanel({ curriculum, currentDay }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat/stream`,
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
    onFinish: () => {
      setShowSuggestions(false)
    },
    onError: (error) => {
      console.error('Chat error:', error)
    },
  })

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

          {showSuggestions && (
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
                >
                  Explain this concept
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleSuggestionClick('Give me an example of this')}
                  className="font-black w-full max-w-sm"
                >
                  Give me an example
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleSuggestionClick('Create a practice problem for me')}
                  className="font-black w-full max-w-sm"
                >
                  Practice problem
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t-2 border-foreground flex gap-2 items-center flex-shrink-0">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask a question..."
          className="flex-1 h-10 bg-card text-foreground placeholder:text-foreground/60 focus-visible:ring-primary"
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={isLoading || !input.trim()}
          className="h-10 w-10 shrink-0"
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