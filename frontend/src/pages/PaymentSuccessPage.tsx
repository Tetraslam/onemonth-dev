import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function PaymentSuccessPage(){
  const navigate = useNavigate()
  const [params]=useSearchParams()
  useEffect(()=>{
    let redirected=false
    const timer=setTimeout(()=>{ if(!redirected){navigate('/dashboard',{replace:true}); redirected=true}},3000)
    supabase.auth.refreshSession().finally(()=>{
      if(!redirected){navigate('/dashboard',{replace:true}); redirected=true}
      clearTimeout(timer)
    })
  },[navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <CheckCircle2 className="w-16 h-16 text-green-600 mb-4"/>
      <h1 className="text-3xl font-black mb-2">Payment Successful</h1>
      <p className="text-lg font-bold text-foreground/70 mb-6">Thank you! Refreshing your subscription...</p>
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>)
} 