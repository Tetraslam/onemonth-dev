import { useEffect } from 'react'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { useSubscribeModal } from '@/stores/useSubscribeModal'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Sparkles, Zap, Brain } from 'lucide-react'

interface PaywallGateProps {
  children: React.ReactNode
  feature?: string
  showInline?: boolean
  onUpgrade?: () => void
}

export function PaywallGate({ children, feature = 'this feature', showInline = false, onUpgrade }: PaywallGateProps) {
  const { status, isLoading, checkSubscription, isSubscribed } = useSubscriptionStore()
  const { open: openSubscribeModal } = useSubscribeModal()
  
  useEffect(() => {
    checkSubscription()
  }, [checkSubscription])
  
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      openSubscribeModal()
    }
  }
  
  // Loading state
  if (isLoading && status === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  // Subscribed - show content
  if (isSubscribed()) {
    return <>{children}</>
  }
  
  // Not subscribed - show paywall
  if (showInline) {
    // Inline paywall for specific features
    return (
      <Card className="p-6 bg-card border-4 border-foreground neo-brutal-shadow text-center">
        <Lock className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-black mb-2">Premium Feature</h3>
        <p className="text-foreground/70 mb-4">
          Unlock {feature} with a subscription
        </p>
        <Button onClick={handleUpgrade} className="font-black">
          <Sparkles className="mr-2 h-4 w-4" />
          Upgrade to Premium
        </Button>
      </Card>
    )
  }
  
  // Full-screen paywall for major features
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8 bg-card border-4 border-foreground neo-brutal-shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full border-4 border-foreground mb-6">
            <Lock className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-black mb-4">Unlock Your Learning Potential</h2>
          <p className="text-xl text-foreground/80">
            Get unlimited access to all premium features
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4">
            <Brain className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h4 className="font-bold mb-1">AI-Powered Learning</h4>
            <p className="text-sm text-foreground/70">Personalized curricula tailored to your goals</p>
          </div>
          <div className="text-center p-4">
            <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h4 className="font-bold mb-1">Smart Practice</h4>
            <p className="text-sm text-foreground/70">AI-generated problems that adapt to you</p>
          </div>
          <div className="text-center p-4">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h4 className="font-bold mb-1">Expert Guidance</h4>
            <p className="text-sm text-foreground/70">24/7 AI tutor to answer your questions</p>
          </div>
        </div>
        
        <div className="text-center">
          <Button size="lg" onClick={handleUpgrade} className="font-black text-lg">
            Start Learning Today - $20/month
          </Button>
          <p className="text-sm text-foreground/60 mt-4">
            Cancel anytime • Instant access • 100% satisfaction guaranteed
          </p>
        </div>
      </Card>
    </div>
  )
} 