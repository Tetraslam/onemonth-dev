import { useSubscription } from '@/lib/subscription'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function SubscriptionBanner() {
  const { status } = useSubscription()
  if (status === 'active') return null
  const link = import.meta.env.VITE_POLAR_PAYMENT_LINK as string
  return (
    <div className="bg-yellow-200 border-2 border-foreground p-4 flex items-center justify-between neo-brutal-shadow-sm mb-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-foreground" />
        <span className="font-bold text-foreground">You need an active subscription to use AI features.</span>
      </div>
      <Button size="sm" className="font-black" onClick={()=>window.open(link,'_blank')}>Subscribe</Button>
    </div>
  )
} 