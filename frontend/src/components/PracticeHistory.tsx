import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Clock, CheckCircle, X, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface PracticeProblem {
  question: string
  type: string
  choices?: string[]
  answer: string
  explanation: string
  concept: string
  difficulty: string
}

interface PracticeSession {
  id: string
  score: number
  problems: PracticeProblem[]
  responses: any[]
  completed_at: string
  created_at: string
}

interface PracticeHistoryProps {
  curriculumId?: string
  dayId: string
}

export function PracticeHistory({ curriculumId, dayId }: PracticeHistoryProps) {
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<PracticeSession | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      if (!curriculumId) return
      
      try {
        const sessionAuth = await supabase.auth.getSession()
        const token = sessionAuth.data.session?.access_token
        if (!token) return

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/practice/history/${curriculumId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          // Filter sessions for this specific day
          const daySessions = (data.sessions || []).filter((s: any) => s.day_id === dayId && s.completed_at)
          setSessions(daySessions)
        }
      } catch (error) {
        console.error('Failed to fetch practice history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [curriculumId, dayId])

  const renderQuestionWithCode = (text: string) => {
    const parts = text.split(/```(\w*)\n?/);
    const elements: React.ReactNode[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        if (parts[i]) {
          elements.push(<span key={i}>{parts[i]}</span>);
        }
      } else {
        const language = parts[i];
        const code = parts[i + 1];
        if (code) {
          elements.push(
            <pre key={i} className="bg-muted p-3 rounded-md my-2 overflow-x-auto">
              <code className="text-sm font-mono">{code}</code>
            </pre>
          );
          i++;
        }
      }
    }
    
    return <div className="whitespace-pre-wrap">{elements}</div>;
  };

  if (loading || sessions.length === 0) return null

  return (
    <>
      <div className="bg-card rounded-lg border-4 border-foreground neo-brutal-shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-foreground/10">
          <div className="w-10 h-10 rounded-md border-2 border-foreground bg-primary flex items-center justify-center neo-brutal-shadow-sm">
            <Brain className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-black text-foreground">Practice History</h3>
        </div>
        
        <div className="space-y-4">
          {sessions.map((session) => {
            const percentage = Math.round((session.score / session.problems.length) * 100)
            return (
              <div 
                key={session.id} 
                className="bg-background rounded-md border-2 border-foreground neo-brutal-shadow-sm p-4 transition-all hover:neo-brutal-shadow hover:-translate-x-1 hover:-translate-y-1 cursor-pointer"
                onClick={() => setSelectedSession(session)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-md border-2 border-foreground flex items-center justify-center font-black text-lg neo-brutal-shadow-sm ${
                      percentage >= 80 ? 'bg-green-100 text-green-700' :
                      percentage >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {percentage}%
                    </div>
                    <div>
                      <p className="font-black text-lg text-foreground">
                        {session.score} / {session.problems.length} correct
                      </p>
                      <p className="text-sm font-bold text-foreground/70 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-4 h-4" strokeWidth={2.5} />
                        {format(new Date(session.completed_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" strokeWidth={2.5} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg border-4 border-foreground neo-brutal-shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b-2 border-foreground flex items-center justify-between">
              <h2 className="text-2xl font-black">Practice Session Review</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedSession(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
              <div className="text-center mb-8">
                <div className={cn(
                  "inline-flex items-center justify-center w-24 h-24 rounded-full mb-4",
                  Math.round((selectedSession.score / selectedSession.problems.length) * 100) >= 80 ? "bg-green-100 text-green-600" : 
                  Math.round((selectedSession.score / selectedSession.problems.length) * 100) >= 60 ? "bg-yellow-100 text-yellow-600" : 
                  "bg-red-100 text-red-600"
                )}>
                  <span className="text-3xl font-black">{Math.round((selectedSession.score / selectedSession.problems.length) * 100)}%</span>
                </div>
                <h2 className="text-2xl font-black mb-2">Practice Results</h2>
                <p className="text-foreground/70">
                  You got {selectedSession.score} out of {selectedSession.problems.length} problems correct
                </p>
              </div>

              <div className="space-y-4">
                {selectedSession.problems.map((problem, index) => {
                  const userResponse = selectedSession.responses?.[index]
                  const userAnswer = userResponse?.answer || ''
                  const isCorrect = userResponse?.is_correct !== undefined
                    ? userResponse.is_correct
                    : (problem.type === 'multiple_choice' 
                      ? userAnswer.toLowerCase() === problem.answer.toLowerCase()
                      : false)

                  return (
                    <Card key={index} className="p-4 border-2 border-foreground">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          isCorrect ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                          {isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold mb-2">{renderQuestionWithCode(problem.question)}</p>
                          {userAnswer && (
                            <p className="text-sm mb-2">
                              <span className="font-medium">Your answer:</span> {userAnswer}
                            </p>
                          )}
                          <p className="text-sm mb-2">
                            <span className="font-medium">Correct answer:</span> {problem.answer}
                          </p>
                          <div className="bg-secondary/50 p-3 rounded-md">
                            <p className="text-sm">{problem.explanation}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 