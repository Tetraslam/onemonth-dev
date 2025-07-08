import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SubscribeDialog({ open, onClose }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      const response = await api.post('/api/checkout/session', {
        success_url: `${window.location.origin}/payment-success`,
        cancel_url: window.location.href,
      })

      if (response.data.url) {
        window.location.href = response.data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" />
      <div className="bg-background rounded-lg border-4 border-foreground neo-brutal-shadow-xl max-w-md w-full p-6 relative z-50">
        <Dialog.Title className="text-2xl font-black mb-2">Subscribe to unlock AI features</Dialog.Title>
        <Dialog.Description className="text-foreground/70 mb-6">
          Your personalised curricula, AI chat, practice problems, and project regeneration are available with an active subscription.
        </Dialog.Description>
        <Button 
          className="w-full font-black text-lg mb-3" 
          onClick={handleSubscribe}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Subscribe – $20 / month'}
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>Maybe later</Button>
      </div>
    </Dialog>
  )
} 