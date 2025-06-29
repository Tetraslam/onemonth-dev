import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface SubscriptionContextType {
  status: 'active' | 'cancelled' | 'none'
  loading: boolean
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType>({ 
  status: 'none', 
  loading: true,
  refresh: async () => {} 
})

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'active' | 'cancelled' | 'none'>('none')
  const [loading, setLoading] = useState(true)

  const loadStatus = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setStatus('none')
        return
      }

      // Check Polar directly via our API
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/users/me/subscription`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data.status === 'active' ? 'active' : 'none')
      } else {
        // Fallback to user metadata if API fails
        const meta = session.user.user_metadata as any
        const s = meta?.subscription_status as string | undefined
        setStatus(s === 'active' ? 'active' : s === 'cancelled' ? 'cancelled' : 'none')
      }
    } catch (error) {
      console.error('Failed to check subscription:', error)
      setStatus('none')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    const { data: listener } = supabase.auth.onAuthStateChange(() => loadStatus())
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <SubscriptionContext.Provider value={{ status, loading, refresh: loadStatus }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext) 