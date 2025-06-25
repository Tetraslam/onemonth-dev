import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Zap, Target, Sparkles } from 'lucide-react'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b-4 border-foreground bg-card neo-brutal-shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black">onemonth.dev</h1>
          <Button 
            onClick={() => navigate('/auth')} 
            className="font-black"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl lg:text-7xl font-black mb-6 leading-tight">
                The Cursor for{' '}
                <span className="text-primary underline decoration-8 decoration-foreground/20">AI-powered</span>{' '}
                learning
              </h2>
              <p className="text-xl font-bold mb-8 text-foreground/80">
                Generate personalized curricula from any learning goal. 
                Your AI tutor adapts to your pace, style, and schedule.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth')}
                  className="text-lg px-8 font-black"
                >
                  Start Learning
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/auth')}
                  className="text-lg px-8 font-black bg-card"
                >
                  See Demo
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-card rounded-lg border-4 border-foreground p-8 neo-brutal-shadow-lg transform rotate-2">
                <div className="bg-primary rounded-md p-4 mb-4 border-2 border-foreground neo-brutal-shadow-sm">
                  <h3 className="font-black text-xl text-primary-foreground">Learn Calculus in 30 Days</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-secondary/20 rounded p-3 border-2 border-foreground font-bold">
                    Day 1: Limits & Continuity
                  </div>
                  <div className="bg-accent/20 rounded p-3 border-2 border-foreground font-bold">
                    Day 2: Derivative Fundamentals
                  </div>
                  <div className="bg-primary/20 rounded p-3 border-2 border-foreground font-bold">
                    Day 3: Chain Rule Mastery
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-secondary rounded-full border-4 border-foreground neo-brutal-shadow-lg -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-4xl font-black text-center mb-12">
          Built for <span className="text-secondary underline decoration-4">serious learners</span>
        </h3>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card rounded-lg border-4 border-foreground p-6 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all">
            <div className="w-12 h-12 bg-primary rounded-md border-2 border-foreground flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h4 className="text-xl font-black mb-2">AI-Powered</h4>
            <p className="font-bold text-foreground/80">
              Cutting-edge AI researches, curates, and creates your perfect curriculum
            </p>
          </div>

          <div className="bg-card rounded-lg border-4 border-foreground p-6 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all">
            <div className="w-12 h-12 bg-secondary rounded-md border-2 border-foreground flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-secondary-foreground" />
            </div>
            <h4 className="text-xl font-black mb-2">Goal-Oriented</h4>
            <p className="font-bold text-foreground/80">
              From "learn React" to "ace AP Calculus" - we build the path
            </p>
          </div>

          <div className="bg-card rounded-lg border-4 border-foreground p-6 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all">
            <div className="w-12 h-12 bg-accent rounded-md border-2 border-foreground flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-accent-foreground" />
            </div>
            <h4 className="text-xl font-black mb-2">Personalized</h4>
            <p className="font-bold text-foreground/80">
              Adapts to your schedule, learning style, and progress in real-time
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-primary rounded-lg border-4 border-foreground p-12 neo-brutal-shadow-lg">
            <h3 className="text-4xl font-black mb-4 text-primary-foreground">
              Ready to level up?
            </h3>
            <p className="text-xl font-bold mb-8 text-primary-foreground/90">
              Join thousands crushing their learning goals with AI
            </p>
            <Button 
              size="lg"
              variant="secondary"
              onClick={() => navigate('/auth')}
              className="text-lg px-12 font-black border-2 border-foreground"
            >
              Start Free Today
              <BookOpen className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Decorative shapes */}
      <div className="fixed top-20 right-10 w-24 h-24 bg-accent rotate-12 rounded-lg border-4 border-foreground neo-brutal-shadow-lg -z-10" />
      <div className="fixed bottom-20 left-10 w-32 h-32 bg-secondary rounded-full border-4 border-foreground neo-brutal-shadow-lg -z-10" />
    </div>
  )
} 