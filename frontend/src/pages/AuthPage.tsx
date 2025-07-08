import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 border-4 border-foreground shadow-[8px_8px_0_0_rgb(0,0,0)]">
        <h1 className="text-3xl font-bold mb-6 text-foreground">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-2 border-foreground focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-2 border-foreground focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground border-2 border-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_rgb(0,0,0)] transition-all"
          >
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </Card>
      
      {/* Decorative shapes with gradient backgrounds */}
      <div className="fixed top-10 left-10 w-32 h-32 neo-gradient-blue rounded-full border-4 border-foreground neo-brutal-shadow-lg" />
      <div className="fixed bottom-10 right-10 w-24 h-24 neo-gradient-pink rotate-45 border-4 border-foreground neo-brutal-shadow-lg" />
    </div>
  )
} 