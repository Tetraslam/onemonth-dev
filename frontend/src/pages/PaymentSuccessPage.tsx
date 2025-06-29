import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/subscription'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function PaymentSuccessPage(){
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { refresh } = useSubscription()
  
  useEffect(() => {
    let redirected = false
    
    // Refresh subscription status after a short delay (give Polar time to process)
    const refreshAndRedirect = async () => {
      // Wait a bit for Polar to process the payment
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Refresh auth session and subscription status
      await supabase.auth.refreshSession()
      await refresh()
      
      if (!redirected) {
        redirected = true
        navigate('/dashboard', { replace: true })
      }
    }
    
    refreshAndRedirect()
    
    // Fallback redirect after 5 seconds
    const timer = setTimeout(() => {
      if (!redirected) {
        redirected = true
        navigate('/dashboard', { replace: true })
      }
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [navigate, refresh])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <CheckCircle2 className="w-16 h-16 text-green-600 mb-4"/>
      <h1 className="text-3xl font-black mb-2">Payment Successful!</h1>
      <p className="text-lg font-bold text-foreground/70 mb-6">Setting up your subscription...</p>
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )
} 