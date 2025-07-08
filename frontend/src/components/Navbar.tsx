import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Book, CreditCard, CheckCircle, RefreshCw, LogOut, LayoutDashboard, GraduationCap, Trophy, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'

interface NavbarProps {
  showSubscriptionStatus?: boolean
  showNavigation?: boolean
  showSignOut?: boolean
}

// Define navigation items - easy to add more in the future
const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/logbook', label: 'Logbook', icon: Book },
  // Future pages can be added here:
  // { path: '/practice', label: 'Practice', icon: Trophy },
  // { path: '/community', label: 'Community', icon: Users },
  // { path: '/achievements', label: 'Achievements', icon: GraduationCap },
]

export function Navbar({ 
  showSubscriptionStatus = true, 
  showNavigation = true,
  showSignOut = true 
}: NavbarProps = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, isSubscribed, checkSubscription } = useSubscriptionStore()

  async function handleSignOut() {
    // Add confirmation dialog
    const confirmed = window.confirm('Are you sure you want to sign out?')
    if (!confirmed) return
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error(error.message)
      } else {
        // Clear subscription status
        useSubscriptionStore.getState().clearSubscription()
        navigate('/auth')
      }
    } catch (error: any) {
      toast.error('Failed to sign out')
    }
  }

  const isActiveRoute = (path: string) => {
    return location.pathname === path
  }

  return (
    <header className="border-b-4 border-foreground bg-card neo-brutal-shadow">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 
          className="text-2xl font-black cursor-pointer" 
          onClick={() => navigate('/dashboard')}
        >
          onemonth.dev
        </h1>
        <div className="flex items-center gap-4">
          {/* Navigation items */}
          {showNavigation && (
            <nav className="flex items-center gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = isActiveRoute(item.path)
                
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "default" : "outline"}
                    onClick={() => navigate(item.path)}
                    className={`font-black ${
                      isActive 
                        ? 'bg-primary text-primary-foreground border-2 border-foreground' 
                        : 'bg-card hover:bg-background'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                )
              })}
            </nav>
          )}

          {/* Subscription status badge */}
          {showSubscriptionStatus && status && (
            <>
              <div className="h-8 w-px bg-foreground/20" />
              <div className={`flex items-center gap-2 px-4 py-2 rounded-md border-2 border-foreground font-black ${
                isSubscribed() 
                  ? 'bg-green-100 text-green-800 shadow-[4px_4px_0_0_rgb(0,0,0,0.9)]' 
                  : 'bg-background text-foreground'
              }`}>
                {isSubscribed() ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">PREMIUM</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">FREE</span>
                  </>
                )}
              </div>
            </>
          )}
          
          {/* Sign out button */}
          {showSignOut && (
            <>
              <div className="h-8 w-px bg-foreground/20" />
              <Button 
                variant="outline" 
                onClick={handleSignOut} 
                className="font-black bg-red-50 hover:bg-red-100 border-red-300 text-red-700 hover:text-red-800 hover:border-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
} 