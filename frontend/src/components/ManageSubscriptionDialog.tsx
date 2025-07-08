import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import { CreditCard, ExternalLink, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface ManageSubscriptionDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ManageSubscriptionDialog({ isOpen, onClose }: ManageSubscriptionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleManageSubscription = async () => {
    setIsLoading(true)
    
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No active session')
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/webhooks/polar/customer-portal`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.status === 404) {
        toast.error('Unable to access subscription management. Please contact support for assistance.')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to get customer portal URL')
      }

      const data = await response.json()
      
      if (data.customer_portal_url) {
        // Open the Polar customer portal in a new tab
        window.open(data.customer_portal_url, '_blank')
        onClose()
      } else {
        throw new Error('No portal URL received')
      }
    } catch (error) {
      console.error('Error accessing customer portal:', error)
      toast.error('Failed to access subscription management. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" />
      <div className="bg-background rounded-lg border-4 border-foreground neo-brutal-shadow-xl max-w-md w-full p-6 relative z-50">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-foreground/10 transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>
        <Dialog.Title className="text-2xl font-black flex items-center gap-2 mb-2 pr-8">
          <CreditCard className="h-6 w-6" />
          Manage Subscription
        </Dialog.Title>
        <Dialog.Description className="text-base font-bold text-foreground/70 mb-6">
          Access your Polar customer portal to manage your subscription, update payment methods, or download invoices.
        </Dialog.Description>
        
        <div className="space-y-4">
          <div className="bg-green-100 border-2 border-green-800 rounded-lg p-4">
            <p className="font-bold text-green-800">
              ✓ You're currently on the Premium plan
            </p>
            <p className="text-sm font-medium text-green-700 mt-1">
              Thank you for supporting onemonth.dev!
            </p>
          </div>

          <Button
            onClick={handleManageSubscription}
            disabled={isLoading}
            className="w-full font-black text-lg py-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Opening Portal...
              </>
            ) : (
              <>
                Open Customer Portal
                <ExternalLink className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          <p className="text-sm text-center font-medium text-foreground/60">
            You'll be redirected to Polar's secure customer portal
          </p>
        </div>
      </div>
    </Dialog>
  )
} 