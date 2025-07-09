import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Sparkles, Zap, Star } from 'lucide-react'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check viewport width for UI display
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Listen for auth state changes (e.g., after email confirmation)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check if this is a new user (no subscription status yet)
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/users/subscription-status`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            // If user has never had a subscription, redirect to onboarding
            if (data.status === 'none' && !data.customer_id) {
              navigate('/onboarding')
            } else {
              navigate('/dashboard')
            }
          } else {
            navigate('/dashboard')
          }
        } catch (error) {
          console.error('Error checking subscription status:', error)
          navigate('/dashboard')
        }
      }
    })
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      subscription.unsubscribe()
    }
  }, [navigate])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        
        // If signup successful and user is confirmed, sign them in and redirect to onboarding
        if (data.user && !data.user.email_confirmed_at) {
        toast.success('Check your email to confirm your account!')
        } else if (data.user) {
          // Auto sign in after signup if email is already confirmed (e.g., for some providers)
          navigate('/onboarding')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        navigate('/dashboard')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Mobile blocker
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 border-4 border-foreground shadow-[8px_8px_0_0_rgb(0,0,0)]">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Desktop Only</h1>
            <p className="text-lg text-muted-foreground">
              onemonth.dev is a desktop-only experience designed for focused learning.
            </p>
            <p className="text-base text-muted-foreground">
              Please visit us on a wider screen (1024px+) to access the full platform.
            </p>
            <div className="pt-4">
              <div className="inline-block p-4 bg-yellow-400 rounded-lg border-2 border-foreground shadow-[4px_4px_0_0_rgb(0,0,0)]">
                <svg className="w-16 h-16 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Back to home button */}
      <Link 
        to="/" 
        className="absolute top-8 left-8 z-10 inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-foreground rounded-lg shadow-[4px_4px_0_0_rgb(0,0,0)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_rgb(0,0,0)] transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium">Back to Home</span>
      </Link>

      {/* Main content */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="relative">
          {/* Decorative cards behind main card */}
          <div className="absolute -top-4 -left-4 w-full h-full bg-secondary rounded-xl transform rotate-3" />
          <div className="absolute -top-2 -left-2 w-full h-full bg-accent rounded-xl transform -rotate-3" />
          
          {/* Main auth card */}
          <Card className="relative max-w-md w-full p-8 bg-white border-4 border-foreground shadow-[8px_8px_0_0_rgb(0,0,0)]">
            {/* Decorative icon */}
            <div className="absolute -top-6 -right-6 p-3 bg-primary rounded-full border-4 border-foreground shadow-[4px_4px_0_0_rgb(0,0,0)]">
              <Sparkles className="w-6 h-6" />
            </div>
            
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2 text-foreground">
                {isSignUp ? 'Join the Club' : 'Welcome Back'}
              </h1>
              <p className="text-muted-foreground">
                {isSignUp ? 'Start your 30-day journey' : 'Continue your learning adventure'}
              </p>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-2 border-foreground rounded-lg focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="you@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-bold uppercase tracking-wider">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-2 border-foreground rounded-lg focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="••••••••"
                />
              </div>
              
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-lg font-bold bg-primary text-primary-foreground border-4 border-foreground shadow-[6px_6px_0_0_rgb(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_rgb(0,0,0)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>
            </form>
            
            <div className="mt-8 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>

            {/* Fun fact */}
            <div className="mt-8 p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
              <p className="text-sm text-center">
                <span className="font-bold">Fun fact:</span> The average person can learn a new skill in just 20 hours of deliberate practice!
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Decorative floating elements */}
      <div className="absolute top-20 right-20 animate-float">
        <div className="w-16 h-16 bg-primary rounded-lg border-4 border-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] flex items-center justify-center transform rotate-12">
          <Zap className="w-8 h-8" />
        </div>
      </div>
      
      <div className="absolute bottom-20 left-20 animate-float-delayed">
        <div className="w-20 h-20 bg-secondary rounded-full border-4 border-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] flex items-center justify-center transform -rotate-12">
          <Star className="w-10 h-10" />
        </div>
      </div>

      <div className="absolute top-1/2 right-10 animate-float">
        <div className="w-12 h-12 bg-accent rounded-lg border-4 border-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] transform rotate-45" />
      </div>

      <div className="absolute bottom-40 right-40 animate-float-delayed">
        <div className="w-8 h-8 bg-primary rounded-full border-2 border-foreground shadow-[2px_2px_0_0_rgb(0,0,0)]" />
      </div>
    </div>
  )
} 