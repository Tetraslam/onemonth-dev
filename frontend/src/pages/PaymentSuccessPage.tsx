import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'

export default function PaymentSuccessPage() {
  const navigate = useNavigate()
  const { clearSubscription, checkSubscription } = useSubscriptionStore()

  useEffect(() => {
    const handleSuccess = async () => {
      // Clear cached subscription status to force a fresh check
      clearSubscription()
      
      // Wait a moment for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check subscription status
      await checkSubscription()
      
      // Redirect to dashboard
      navigate('/dashboard', { replace: true })
    }
    
    handleSuccess()
  }, [navigate, clearSubscription, checkSubscription])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
      <h1 className="text-3xl font-black mb-2">Payment Successful!</h1>
      <p className="text-lg font-bold text-foreground/70 mb-2">Welcome to onemonth.dev Premium!</p>
      <p className="text-sm text-foreground/60 mb-6">Setting up your account...</p>
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )
} 