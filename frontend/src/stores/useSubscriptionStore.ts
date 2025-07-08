import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

interface SubscriptionState {
  status: 'active' | 'cancelled' | 'none' | null
  customerId: string | null
  isLoading: boolean
  lastChecked: Date | null
  
  // Actions
  checkSubscription: () => Promise<void>
  clearSubscription: () => void
  isSubscribed: () => boolean
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      status: null,
      customerId: null,
      isLoading: false,
      lastChecked: null,
      
      checkSubscription: async () => {
        // Don't check if we checked recently (within 5 minutes)
        const state = get()
        if (state.lastChecked) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
          if (state.lastChecked > fiveMinutesAgo && state.status !== null) {
            return
          }
        }
        
        set({ isLoading: true })
        
        try {
          const response = await api.get('/api/users/subscription-status')
          set({
            status: response.data.status,
            customerId: response.data.customer_id,
            lastChecked: new Date(),
            isLoading: false
          })
        } catch (error) {
          console.error('Failed to check subscription:', error)
          set({ 
            status: 'none',
            isLoading: false,
            lastChecked: new Date()
          })
        }
      },
      
      clearSubscription: () => {
        set({
          status: null,
          customerId: null,
          lastChecked: null
        })
      },
      
      isSubscribed: () => {
        const state = get()
        return state.status === 'active'
      }
    }),
    {
      name: 'subscription-storage',
      partialize: (state) => ({ 
        status: state.status,
        customerId: state.customerId,
        lastChecked: state.lastChecked
      })
    }
  )
) 