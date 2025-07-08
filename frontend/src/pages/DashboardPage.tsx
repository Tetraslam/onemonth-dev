import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, BookOpen, Clock, ArrowRight, Book, CreditCard, CheckCircle } from 'lucide-react'
import api from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { useSubscribeModal } from '@/stores/useSubscribeModal'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [curricula, setCurricula] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { status, isSubscribed, checkSubscription } = useSubscriptionStore()
  const { open: openSubscribeModal } = useSubscribeModal()
  
  useEffect(() => {
    const checkAuthAndFetchCurricula = async () => {
      setLoading(true)
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          navigate('/auth')
          return
        }
        
        // Check subscription status
        await checkSubscription()
        
        // Fetch curricula if authenticated
        const { data } = await api.get('/api/curricula/')
        setCurricula(data || [])
      } catch (error) {
        console.error("Failed to fetch curricula", error)
      } finally {
        setLoading(false)
      }
    }
    checkAuthAndFetchCurricula()
  }, [navigate, checkSubscription])

  async function handleSignOut() {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-foreground bg-card neo-brutal-shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black">onemonth.dev</h1>
          <div className="flex items-center gap-4">
            {/* Subscription status badge */}
            {status && (
              <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-md border-2 border-foreground">
                {isSubscribed() ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-bold">Premium</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm font-bold">Free</span>
                  </>
                )}
              </div>
            )}
            
            <Button variant="outline" onClick={() => navigate('/logbook')} className="font-black bg-card">
              <Book className="mr-2 h-4 w-4" />
              Logbook
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="font-black bg-card">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-4xl font-black mb-2">Your Learning Journey</h2>
            <p className="text-xl font-bold text-foreground/80">
              Pick up where you left off or start something new
            </p>
          </div>

          {/* Show upgrade prompt for free users */}
          {status === 'none' && (
            <Card className="mb-8 p-6 bg-primary/10 border-4 border-primary neo-brutal-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black mb-1">Unlock Premium Features</h3>
                  <p className="text-foreground/70">Get unlimited curricula, AI chat, and practice problems</p>
                </div>
                <Button onClick={openSubscribeModal} className="font-black">
                  Upgrade Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          <div className="mb-8">
            <Button 
              size="lg" 
              onClick={() => isSubscribed() ? navigate('/curriculum/new') : openSubscribeModal()} 
              className="text-lg px-8 font-black"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create New Curriculum
            </Button>
          </div>

          {loading ? (
            <div className="bg-card rounded-lg border-4 border-foreground p-12 neo-brutal-shadow-lg text-center">
              <div className="w-20 h-20 bg-primary rounded-full border-4 border-foreground mx-auto mb-6 flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-black mb-4">Loading...</h3>
            </div>
          ) : curricula.length === 0 ? (
            <div className="bg-card rounded-lg border-4 border-foreground p-12 neo-brutal-shadow-lg text-center">
              <div className="w-20 h-20 bg-primary rounded-full border-4 border-foreground mx-auto mb-6 flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-black mb-4">Your dashboard is empty!</h3>
              <p className="text-lg font-bold text-foreground/80 mb-6">
                Create your first AI-powered curriculum to get started.
              </p>
              <Button onClick={() => navigate('/curriculum/new')} className="font-black">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {curricula.map((curriculum) => (
                <Card
                  key={curriculum.id}
                  className="bg-card border-4 border-foreground p-6 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer"
                  onClick={() => navigate(`/curriculum/${curriculum.id}`)}
                >
                  <h3 className="text-xl font-black mb-2">{curriculum.title}</h3>
                  <p className="text-sm font-bold text-foreground/70 mb-4 line-clamp-2">
                    {curriculum.description}
                  </p>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <div className="flex items-center gap-2 text-foreground/60">
                      <Clock className="h-4 w-4" />
                      <span>{curriculum.total_days} days</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 