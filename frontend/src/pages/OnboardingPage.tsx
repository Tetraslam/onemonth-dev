import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Brain, Zap, Sparkles, CheckCircle, ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const { checkSubscription, isSubscribed } = useSubscriptionStore()
  
  useEffect(() => {
    // Check if already subscribed
    const checkStatus = async () => {
      await checkSubscription()
      if (isSubscribed()) {
        navigate('/dashboard')
      }
    }
    checkStatus()
  }, [checkSubscription, isSubscribed, navigate])
  
  useEffect(() => {
    // Create checkout session on mount
    const createCheckout = async () => {
      try {
        const response = await api.post('/api/checkout/session', {
          success_url: `${window.location.origin}/payment-success`,
          cancel_url: `${window.location.origin}/onboarding`
        })
        
        if (response.data.checkout_url) {
          setCheckoutUrl(response.data.checkout_url)
        }
      } catch (error) {
        console.error('Failed to create checkout:', error)
      }
    }
    createCheckout()
  }, [])
  
  const handleStartCheckout = async () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl
    } else {
      // Fallback: create a new checkout session
      setIsLoading(true)
      try {
        const response = await api.post('/api/checkout/session')
        if (response.data.checkout_url) {
          window.location.href = response.data.checkout_url
        }
      } catch (error) {
        toast.error('Failed to start checkout. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
  }
  
  const handleSkip = () => {
    navigate('/dashboard')
  }
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4">Welcome to onemonth.dev!</h1>
          <p className="text-xl text-foreground/80">
            Your AI-powered learning journey starts here
          </p>
        </div>
        
        <Card className="p-8 bg-card border-4 border-foreground neo-brutal-shadow-xl mb-8">
          <h2 className="text-3xl font-black mb-6 text-center">What You'll Get</h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full border-4 border-foreground mb-4">
                <Brain className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">Personalized Curricula</h3>
              <p className="text-foreground/70">AI creates custom learning paths tailored to your goals and experience</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full border-4 border-foreground mb-4">
                <Zap className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">Smart Practice</h3>
              <p className="text-foreground/70">Adaptive problems that challenge you at the right level</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full border-4 border-foreground mb-4">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">24/7 AI Tutor</h3>
              <p className="text-foreground/70">Get instant help and explanations whenever you need them</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="font-bold">Unlimited AI-generated curricula</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="font-bold">Interactive practice problems</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="font-bold">Progress tracking & insights</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="font-bold">Cancel anytime</span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="mb-4">
              <span className="text-4xl font-black">$20</span>
              <span className="text-xl font-bold text-foreground/70">/month</span>
            </div>
            
            <Button 
              size="lg" 
              onClick={handleStartCheckout}
              disabled={isLoading}
              className="font-black text-lg mb-3"
            >
              {isLoading ? 'Loading...' : 'Start Learning Now'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-sm text-foreground/60 mb-4">
              Secure payment powered by Polar
            </p>
            
            <button
              onClick={handleSkip}
              className="text-sm text-foreground/60 hover:text-foreground underline"
            >
              Maybe later, take me to dashboard
            </button>
          </div>
        </Card>
        
        <div className="text-center text-sm text-foreground/60">
          <p>Questions? Email us at support@onemonth.dev</p>
        </div>
      </div>
    </div>
  )
} 