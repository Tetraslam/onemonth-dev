import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface SubscriptionContextType {
  status: 'active' | 'cancelled' | 'none'
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType>({ status: 'none', refresh: async () => {} })

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'active' | 'cancelled' | 'none'>('none')

  const loadStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const meta = session?.user.user_metadata as any
    const s = meta?.subscription_status as string | undefined
    setStatus(s === 'active' ? 'active' : s === 'cancelled' ? 'cancelled' : 'none')
  }

  useEffect(() => {
    loadStatus()
    const { data: listener } = supabase.auth.onAuthStateChange(() => loadStatus())
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <SubscriptionContext.Provider value={{ status, refresh: loadStatus }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext) 