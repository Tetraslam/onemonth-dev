import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Brain, ChevronRight, RotateCcw, CheckCircle, XCircle, Lightbulb, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn, trackGoal } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface PracticeProblem {
  question: string
  type: 'multiple_choice' | 'short_answer' | 'code' | 'explanation'
  choices?: string[]
  answer: string
  explanation: string
  concept: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface PracticeSession {
  session_id: string
  problems: PracticeProblem[]
}

interface PracticeProblemsProps {
  curriculum: any
  currentDay: any
  onClose?: () => void
}

export function PracticeProblems({ curriculum, currentDay, onClose }: PracticeProblemsProps) {
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [showExplanations, setShowExplanations] = useState<Record<number, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null)
  const [selfGradedAnswers, setSelfGradedAnswers] = useState<Record<number, boolean>>({})

  const generateProblems = async () => {
    setLoading(true)
    try {
      const sessionAuth = await supabase.auth.getSession()
      const token = sessionAuth.data.session?.access_token
      if (!token) {
        toast.error('Authentication error. Please sign in again.')
        setLoading(false)
        return
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/practice/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          curriculum_id: curriculum.id,
          day_id: currentDay.id,
          day_title: currentDay.title,
          day_content: JSON.stringify(currentDay.content), // Convert to string if needed
          learning_goal: curriculum.learning_goal || curriculum.topic || curriculum.goal || curriculum.title,
          difficulty_level: curriculum.difficulty_level || 'intermediate',
          num_problems: 5
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate practice problems')
      }

      const data = await response.json()
      setSession(data)
      setCurrentProblemIndex(0)
      setUserAnswers({})
      setShowExplanations({})
      setSubmitted(false)
      setScore(null)
    } catch (error: any) {
      toast.error('Failed to generate practice problems')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const submitAnswers = async () => {
    if (!session) return

    const sessionAuth = await supabase.auth.getSession()
    const token = sessionAuth.data.session?.access_token
    if (!token) {
      console.error('Authentication error submitting practice results')
      return
    }

    // Self-grading logic
    let correct = 0
    const feedback: any[] = []

    session.problems.forEach((problem, index) => {
      const userAnswer = userAnswers[index] || ''
      let isCorrect = false

      if (problem.type === 'multiple_choice') {
        isCorrect = userAnswer.toLowerCase() === problem.answer.toLowerCase()
      } else {
        // For non-MCQ, use self-graded value or default to false
        isCorrect = selfGradedAnswers[index] || false
      }

      if (isCorrect) correct++
      
      feedback.push({
        problem_index: index,
        correct: isCorrect,
        user_answer: userAnswer,
        correct_answer: problem.answer
      })
    })

    setScore({ correct, total: session.problems.length })
    setSubmitted(true)
    
    // Track practice completion goals
    trackGoal('practice_session_completed')
    
    // Track performance-based goals
    const percentage = (correct / session.problems.length) * 100
    if (percentage === 100) {
      trackGoal('practice_perfect_score')
    } else if (percentage >= 80) {
      trackGoal('practice_high_score')
    }
    
    // Track practice for specific day
    trackGoal(`practice_day_${currentDay.day_number}`)

    // Save the session results
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/practice/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session.session_id,
          responses: Object.entries(userAnswers).map(([index, answer]) => ({
            problem_index: parseInt(index),
            answer
          }))
        })
      })
      toast.success('Practice session saved!')
    } catch (error) {
      console.error('Failed to save practice results:', error)
    }
  }

  const renderQuestionWithCode = (text: string) => {
    // Simple code block detection and rendering
    const parts = text.split(/```(\w*)\n?/);
    const elements: React.ReactNode[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Regular text
        if (parts[i]) {
          elements.push(
            <span key={i}>{parts[i]}</span>
          );
        }
      } else {
        // Code block
        const language = parts[i];
        const code = parts[i + 1];
        if (code) {
          elements.push(
            <pre key={i} className="bg-muted p-3 rounded-md my-2 overflow-x-auto">
              <code className="text-sm font-mono">{code}</code>
            </pre>
          );
          i++; // Skip the code content as we've already used it
        }
      }
    }
    
    return <div className="whitespace-pre-wrap">{elements}</div>;
  };

  const handleSelfGrade = (index: number, correct: boolean) => {
    setSelfGradedAnswers({ ...selfGradedAnswers, [index]: correct });
  };

  const canProceed = () => {
    const currentProblem = session?.problems[currentProblemIndex];
    if (!currentProblem) return false;
    
    // Must have an answer
    if (!userAnswers[currentProblemIndex]) return false;
    
    // For non-MCQ, must have self-graded after showing explanation
    if (currentProblem.type !== 'multiple_choice' && showExplanations[currentProblemIndex]) {
      return selfGradedAnswers[currentProblemIndex] !== undefined;
    }
    
    return true;
  };

  const currentProblem = session?.problems[currentProblemIndex]
  const isLastProblem = session && currentProblemIndex === session.problems.length - 1

  if (!session && !loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Brain className="w-16 h-16 text-primary mb-4" />
        <h2 className="text-2xl font-black mb-2">Practice Time!</h2>
        <p className="text-foreground/70 mb-6 max-w-md">
          Test your understanding of "{currentDay?.title}" with interactive practice problems
        </p>
        <Button 
          onClick={generateProblems} 
          disabled={loading}
          size="lg"
          className="font-black"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating Problems...
            </>
          ) : (
            <>
              <Brain className="w-5 h-5 mr-2" />
              Start Practice
            </>
          )}
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (submitted && score) {
    const percentage = Math.round((score.correct / score.total) * 100)
    return (
      <div className="p-6">
        <div className="text-center mb-8">
          <div className={cn(
            "inline-flex items-center justify-center w-24 h-24 rounded-full mb-4",
            percentage >= 80 ? "bg-green-100 text-green-600" : 
            percentage >= 60 ? "bg-yellow-100 text-yellow-600" : 
            "bg-red-100 text-red-600"
          )}>
            <span className="text-3xl font-black">{percentage}%</span>
          </div>
          <h2 className="text-2xl font-black mb-2">Practice Complete!</h2>
          <p className="text-foreground/70">
            You got {score.correct} out of {score.total} problems correct
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {session?.problems.map((problem, index) => {
            const userAnswer = userAnswers[index] || ''
            const isCorrect = problem.type === 'multiple_choice' 
              ? userAnswer.toLowerCase() === problem.answer.toLowerCase()
              : (selfGradedAnswers[index] || false)

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

        <div className="flex gap-2 justify-center">
          <Button 
            onClick={() => {
              setSession(null)
              generateProblems()
            }}
            variant="secondary"
            className="font-black"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          {onClose && (
            <Button onClick={onClose} className="font-black">
              Continue Learning
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!currentProblem) return null

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-foreground/70">
            Problem {currentProblemIndex + 1} of {session.problems.length}
          </span>
          <span className={cn(
            "text-xs font-black px-2 py-1 rounded-md",
            currentProblem.difficulty === 'easy' ? "bg-green-100 text-green-700" :
            currentProblem.difficulty === 'medium' ? "bg-yellow-100 text-yellow-700" :
            "bg-red-100 text-red-700"
          )}>
            {currentProblem.difficulty.toUpperCase()}
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${((currentProblemIndex + 1) / session.problems.length) * 100}%` }}
          />
        </div>
      </div>

      <Card className="p-6 border-2 border-foreground neo-brutal-shadow mb-6">
        <h3 className="text-lg font-black mb-4">{renderQuestionWithCode(currentProblem.question)}</h3>

        {currentProblem.type === 'multiple_choice' && currentProblem.choices && (
          <RadioGroup
            value={userAnswers[currentProblemIndex] || ''}
            onValueChange={(value) => setUserAnswers({ ...userAnswers, [currentProblemIndex]: value })}
          >
            <div className="space-y-2">
              {currentProblem.choices.map((choice, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={choice} id={`choice-${index}`} />
                  <Label htmlFor={`choice-${index}`} className="font-medium cursor-pointer">
                    {choice}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        )}

        {(currentProblem.type === 'short_answer' || currentProblem.type === 'explanation') && (
          <Textarea
            value={userAnswers[currentProblemIndex] || ''}
            onChange={(e) => setUserAnswers({ ...userAnswers, [currentProblemIndex]: e.target.value })}
            placeholder="Type your answer here..."
            rows={4}
            className="w-full"
          />
        )}

        {currentProblem.type === 'code' && (
          <Textarea
            value={userAnswers[currentProblemIndex] || ''}
            onChange={(e) => setUserAnswers({ ...userAnswers, [currentProblemIndex]: e.target.value })}
            placeholder="Write your code here..."
            rows={8}
            className="w-full font-mono text-sm"
          />
        )}

        {showExplanations[currentProblemIndex] && (
          <div className="mt-4 p-4 bg-secondary/50 rounded-lg border-2 border-foreground/20">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold mb-1">Answer: {currentProblem.answer}</p>
                <p className="text-sm">{currentProblem.explanation}</p>
                <p className="text-xs text-foreground/60 mt-2">
                  Concept: {currentProblem.concept}
                </p>
                
                {currentProblem.type !== 'multiple_choice' && (
                  <div className="mt-4 pt-4 border-t border-foreground/20">
                    <p className="text-sm font-bold mb-2">Did you get it right?</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={selfGradedAnswers[currentProblemIndex] === true ? "default" : "outline"}
                        onClick={() => handleSelfGrade(currentProblemIndex, true)}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Yes
                      </Button>
                      <Button
                        size="sm"
                        variant={selfGradedAnswers[currentProblemIndex] === false ? "default" : "outline"}
                        onClick={() => handleSelfGrade(currentProblemIndex, false)}
                      >
                        <ThumbsDown className="w-4 h-4 mr-1" />
                        No
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setShowExplanations({ 
            ...showExplanations, 
            [currentProblemIndex]: !showExplanations[currentProblemIndex] 
          })}
          className="font-black"
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          {showExplanations[currentProblemIndex] ? 'Hide' : 'Show'} Explanation
        </Button>

        <div className="flex gap-2">
          {currentProblemIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentProblemIndex(currentProblemIndex - 1)}
            >
              Previous
            </Button>
          )}
          
          {!isLastProblem ? (
            <Button
              onClick={() => setCurrentProblemIndex(currentProblemIndex + 1)}
              disabled={!canProceed()}
              className="font-black"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={submitAnswers}
              disabled={!canProceed() || Object.keys(userAnswers).length < session.problems.length}
              className="font-black"
            >
              Submit All
              <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 