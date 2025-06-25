import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card } from '@/components/ui/card'
import { ArrowRight, ArrowLeft, Loader2, Sparkles, Clock, Target, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import axios from 'axios'

interface CurriculumFormData {
  title: string
  description: string
  learningGoal: string
  duration: string
  difficulty: string
  priorKnowledge: string
  timePerDay: string
  learningStyle: string
}

export function CurriculumCreationForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('')
  
  const [formData, setFormData] = useState<CurriculumFormData>({
    title: '',
    description: '',
    learningGoal: '',
    duration: '30',
    difficulty: 'intermediate',
    priorKnowledge: '',
    timePerDay: '60',
    learningStyle: 'balanced'
  })

  const totalSteps = 4

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
          is_public: false,
          is_prebuilt: false
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            // Update progress
            setGenerationProgress('Creating curriculum structure...')
          }
        }
      )

      if (response.data.id) {
        toast.success('Curriculum created successfully!')
        navigate(`/curriculum/${response.data.id}`)
      }
    } catch (error) {
      console.error('Error creating curriculum:', error)
      toast.error('Failed to create curriculum')
    } finally {
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
    }
  }

  return (
    <Card className="max-w-2xl mx-auto p-8">
      {!loading ? (
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

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {step < totalSteps ? (
              <Button onClick={nextStep} disabled={!formData.learningGoal}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!formData.learningGoal}>
                Generate Curriculum
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Creating your curriculum...</h3>
          <p className="text-muted-foreground">{generationProgress}</p>
        </div>
      )}
    </Card>
  )
} 