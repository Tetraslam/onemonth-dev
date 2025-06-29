import { Dialog } from '@headlessui/react'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SubscribeDialog({ open, onClose }: Props) {
  const link = import.meta.env.VITE_POLAR_PAYMENT_LINK as string

  return (
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Dialog.Overlay className="fixed inset-0 bg-black/50" />
      <div className="bg-background rounded-lg border-4 border-foreground neo-brutal-shadow-xl max-w-md w-full p-6 relative z-50">
        <Dialog.Title className="text-2xl font-black mb-2">Subscribe to unlock AI features</Dialog.Title>
        <Dialog.Description className="text-foreground/70 mb-6">
          Your personalised curricula, AI chat, practice problems, and project regeneration are available with an active subscription.
        </Dialog.Description>
        <Button asChild className="w-full font-black text-lg mb-3">
          <a href={link} target="_blank" rel="noopener noreferrer">Subscribe – $10 / month</a>
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>Maybe later</Button>
      </div>
    </Dialog>
  )
} 