import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card } from '@/components/ui/card'
import { ArrowRight, ArrowLeft, Loader2, Sparkles, Clock, Target, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import axios from 'axios'
import { useSubscription } from '@/lib/subscription'
import SubscribeDialog from '@/components/SubscribeDialog'

interface CurriculumFormData {
  title: string
  description: string
  learningGoal: string
  duration: string
  difficulty: string
  priorKnowledge: string
  timePerDay: string
  learningStyle: string
  numProjects: number
}

interface PreviewModalProps {
  formData: any
  onGenerate: () => void
  onBack: () => void
  loading: boolean
}

function PreviewModal({ formData, onGenerate, onBack, loading }: PreviewModalProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Review Your Curriculum</h2>
        <p className="text-muted-foreground">You're about to generate a personalized learning plan</p>
      </div>

      <Card className="p-6 border-4 border-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] space-y-4">
        <div>
          <h3 className="font-bold text-lg mb-2">Learning Goal</h3>
          <p className="text-foreground">{formData.learning_goal}</p>
        </div>
        
        {formData.title && (
          <div>
            <h3 className="font-bold text-lg mb-2">Title</h3>
            <p className="text-foreground">{formData.title}</p>
          </div>
        )}
        
        <div>
          <h3 className="font-bold text-lg mb-2">Difficulty</h3>
          <p className="text-foreground capitalize">{formData.difficulty_level}</p>
        </div>
        
        <div>
          <h3 className="font-bold text-lg mb-2">Duration</h3>
          <p className="text-foreground">{formData.estimated_duration_days} days</p>
        </div>

        {formData.daily_time_commitment_minutes && (
          <div>
            <h3 className="font-bold text-lg mb-2">Daily Time Commitment</h3>
            <p className="text-foreground">{formData.daily_time_commitment_minutes} minutes per day</p>
          </div>
        )}

        {formData.learning_style && (
          <div>
            <h3 className="font-bold text-lg mb-2">Learning Style</h3>
            <p className="text-foreground capitalize">{formData.learning_style}</p>
          </div>
        )}
        
        {formData.num_projects !== undefined && (
          <div>
            <h3 className="font-bold text-lg mb-2">Projects</h3>
            <p className="text-foreground">{formData.num_projects} {formData.num_projects === 1 ? 'project' : 'projects'}</p>
          </div>
        )}
      </Card>

      <Card className="p-4 border-2 border-yellow-500 bg-yellow-50">
        <p className="text-sm font-medium">
          <Clock className="inline-block w-4 h-4 mr-2" />
          Generation typically takes 3-5 minutes
        </p>
      </Card>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="flex-1 border-2 border-foreground shadow-[2px_2px_0_0_rgb(0,0,0)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_rgb(0,0,0)]"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onGenerate}
          disabled={loading}
          className="flex-1 bg-primary text-primary-foreground border-2 border-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_rgb(0,0,0)]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Curriculum
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function CurriculumCreationForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [generatingCurriculumId, setGeneratingCurriculumId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState('')
  
  const [formData, setFormData] = useState<CurriculumFormData>({
    title: '',
    description: '',
    learningGoal: '',
    duration: '30',
    difficulty: 'intermediate',
    priorKnowledge: '',
    timePerDay: '60',
    learningStyle: 'balanced',
    numProjects: 1
  })

  const totalSteps = 5

  const { status } = useSubscription()
  const [showSubscribe, setShowSubscribe] = useState(false)

  // Poll for generation status
  useEffect(() => {
    if (!generatingCurriculumId) return

    const pollStatus = async () => {
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/curricula/${generatingCurriculumId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const curriculum = response.data
        
        if (curriculum.generation_status === 'completed') {
          toast.success('Curriculum created successfully!')
          navigate(`/curriculum/${generatingCurriculumId}`)
        } else if (curriculum.generation_status === 'failed') {
          toast.error('Failed to generate curriculum')
          setLoading(false)
          setGeneratingCurriculumId(null)
        } else {
          // Update progress message
          setGenerationProgress(curriculum.generation_progress || 'Generating curriculum...')
        }
      } catch (error) {
        console.error('Error polling status:', error)
      }
    }

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000)
    
    // Initial poll
    pollStatus()

    return () => clearInterval(interval)
  }, [generatingCurriculumId, navigate])

  const updateFormData = (field: keyof CurriculumFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (status !== 'active') { setShowSubscribe(true); setLoading(false); return }

    setLoading(true)
    setGenerationProgress('Initializing curriculum generation...')

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      // Create curriculum via API
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/curricula`,
        {
          title: formData.title || `Learning ${formData.learningGoal}`,
          description: formData.description || formData.learningGoal,
          learning_goal: formData.learningGoal,
          estimated_duration_days: parseInt(formData.duration),
          difficulty_level: formData.difficulty,
          prerequisites: formData.priorKnowledge,
          daily_time_commitment_minutes: parseInt(formData.timePerDay),
          learning_style: formData.learningStyle,
          num_projects: formData.numProjects,
          is_public: false,
          is_prebuilt: false
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (response.data.id) {
        // Start polling for generation status
        setGeneratingCurriculumId(response.data.id)
      }
    } catch (error: any) {
      console.error('Error creating curriculum:', error)
      if (error.response?.status === 403) {
        toast.error('Please subscribe to generate curricula')
        // TODO: Redirect to payment page
      } else {
        toast.error('Failed to create curriculum')
      }
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Target className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold text-foreground mb-2">What do you want to learn?</h2>
              <p className="text-muted-foreground">Be specific about your learning goals</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="learningGoal">Learning Goal</Label>
                <Textarea
                  id="learningGoal"
                  value={formData.learningGoal}
                  onChange={(e) => updateFormData('learningGoal', e.target.value)}
                  placeholder="e.g., Master AP Calculus BC, Learn React and Next.js, Prepare for SAT Math..."
                  className="min-h-[100px]"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="title">Curriculum Title (optional)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="Give your curriculum a memorable name"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Add any additional context or specific areas to focus on"
                />
              </div>
            </div>
          </div>
        )
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Clock className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold text-foreground mb-2">How much time do you have?</h2>
              <p className="text-muted-foreground">We'll create a schedule that fits your life</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <Label>Total Duration</Label>
                <RadioGroup value={formData.duration} onValueChange={(value) => updateFormData('duration', value)}>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="7" />
                      <span>1 week (intensive)</span>
                    </label>
                    <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="14" />
                      <span>2 weeks</span>
                    </label>
                    <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="30" />
                      <span>1 month (recommended)</span>
                    </label>
                    <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="60" />
                      <span>2 months</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label>Time per Day</Label>
                <RadioGroup value={formData.timePerDay} onValueChange={(value) => updateFormData('timePerDay', value)}>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="30" />
                      <span>30 minutes</span>
                    </label>
                    <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="60" />
                      <span>1 hour</span>
                    </label>
                    <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="120" />
                      <span>2 hours</span>
                    </label>
                    <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="180" />
                      <span>3+ hours</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label htmlFor="numProjects">Number of Projects</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {formData.numProjects} {formData.numProjects === 1 ? 'project' : 'projects'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Max: {Math.floor(parseInt(formData.duration) / 7)} projects
                    </span>
                  </div>
                  <Input
                    id="numProjects"
                    type="range"
                    min="0"
                    max={Math.floor(parseInt(formData.duration) / 7)}
                    value={formData.numProjects}
                    onChange={(e) => setFormData(prev => ({ ...prev, numProjects: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Projects will be evenly distributed throughout your curriculum
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Tell us about yourself</h2>
              <p className="text-muted-foreground">This helps us personalize your learning</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <Label>Experience Level</Label>
                <RadioGroup value={formData.difficulty} onValueChange={(value) => updateFormData('difficulty', value)}>
                  <div className="space-y-3 mt-2">
                    <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="beginner" />
                      <div>
                        <p className="font-medium">Beginner</p>
                        <p className="text-sm text-muted-foreground">I'm new to this topic</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="intermediate" />
                      <div>
                        <p className="font-medium">Intermediate</p>
                        <p className="text-sm text-muted-foreground">I have some basic knowledge</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="advanced" />
                      <div>
                        <p className="font-medium">Advanced</p>
                        <p className="text-sm text-muted-foreground">I want to master advanced concepts</p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label htmlFor="priorKnowledge">Prior Knowledge (optional)</Label>
                <Textarea
                  id="priorKnowledge"
                  value={formData.priorKnowledge}
                  onChange={(e) => updateFormData('priorKnowledge', e.target.value)}
                  placeholder="What do you already know about this topic?"
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>
        )
        
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Learning Style</h2>
              <p className="text-muted-foreground">How do you prefer to learn?</p>
            </div>
            
            <div>
              <RadioGroup value={formData.learningStyle} onValueChange={(value) => updateFormData('learningStyle', value)}>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="visual" />
                    <div>
                      <p className="font-medium">Visual</p>
                      <p className="text-sm text-muted-foreground">Diagrams, videos, and infographics</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="practical" />
                    <div>
                      <p className="font-medium">Hands-on</p>
                      <p className="text-sm text-muted-foreground">Practice problems and projects</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="theoretical" />
                    <div>
                      <p className="font-medium">Conceptual</p>
                      <p className="text-sm text-muted-foreground">Deep dives and theory</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="balanced" />
                    <div>
                      <p className="font-medium">Balanced</p>
                      <p className="text-sm text-muted-foreground">Mix of all approaches</p>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )

      case 5:
        // Map formData to the format expected by PreviewModal
        const previewData = {
          learning_goal: formData.learningGoal,
          title: formData.title,
          difficulty_level: formData.difficulty,
          estimated_duration_days: formData.duration,
          daily_time_commitment_minutes: formData.timePerDay,
          learning_style: formData.learningStyle,
          num_projects: formData.numProjects
        }
        
        return (
          <PreviewModal
            formData={previewData}
            onGenerate={handleSubmit}
            onBack={prevStep}
            loading={loading}
          />
        )
    }
  }

  return (
    <Card className="max-w-2xl mx-auto p-8">
      {!loading || step < 5 ? (
        <>
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              {[...Array(totalSteps)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 mx-1 rounded-full transition-colors ${
                    i < step ? 'bg-primary' : 'bg-secondary'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Step {step} of {totalSteps}
            </p>
          </div>

          {/* Form content */}
          {renderStep()}

          {/* Navigation buttons - only show if not on preview step */}
          {step < 5 && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={step === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <Button onClick={nextStep} disabled={!formData.learningGoal}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Creating your curriculum...</h3>
          <p className="text-muted-foreground">{generationProgress}</p>
        </div>
      )}

      {showSubscribe && <SubscribeDialog open={showSubscribe} onClose={()=>setShowSubscribe(false)} /> }
    </Card>
  )
} 