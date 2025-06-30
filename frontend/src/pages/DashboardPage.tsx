import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Plus, BookOpen, Clock, Zap, ArrowRight, Book } from 'lucide-react'
import { toast } from 'sonner'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import { useSubscription } from '@/lib/subscription'

interface Curriculum {
  id: string
  title: string
  description: string
  is_public: boolean
  is_prebuilt: boolean
  created_at: string
  total_days: number
  progress?: {
    completed_days: number
    last_accessed: string
  }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCurricula: 0,
    activeCurricula: 0,
    completedDays: 0,
    currentStreak: 0
  })

  useEffect(() => {
    checkUser()
    fetchStats()
  }, [])

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/auth')
        return
      }
      setUser(user)
      // Fetch curricula only after user is confirmed
      fetchCurricula(user)
    } catch (error) {
      console.error('Error checking user:', error)
      toast.error('Failed to check user')
    }
  }

  async function fetchCurricula(userObj: any) {
    try {
      // Load user's curricula
      const { data: curriculaData, error: curriculaError } = await supabase
        .from('curricula')
        .select('*') 
        .eq('user_id', userObj.id)
        .order('created_at', { ascending: false })

      if (curriculaError) {
        console.error('Supabase curricula error', curriculaError)
        toast.error('Failed to load curricula')
        setLoading(false)
        return
      }
      if (!curriculaData || curriculaData.length === 0) {
        // No curricula yet – just show the empty-state card (no onboarding redirect)
      }

      // Fetch progress for each curriculum
      const curriculaWithProgress = await Promise.all(
        curriculaData.map(async (curriculum) => {
          // Fetch days for the curriculum
          const { data: daysData, error: daysError } = await supabase
            .from('curriculum_days')
            .select('id, curriculum_id') // Only need id and curriculum_id
            .eq('curriculum_id', curriculum.id);

          if (daysError) {
            console.error(`Error fetching days for curriculum ${curriculum.id}:`, daysError);
            return { ...curriculum, progress: { completed_days: 0 } }; // Default to 0 progress on error
          }
          if (!daysData || daysData.length === 0) {
             // If a curriculum has no days, its total_days should be 0 or reflect that
            return { ...curriculum, total_days: 0, progress: { completed_days: 0 } };
          }
          
          const dayIds = daysData.map(d => d.id);

          // Fetch progress for these days
          const { data: progressData, error: progressError } = await supabase
            .from('progress')
            .select('day_id, completed_at')
            .eq('user_id', userObj.id)
            .eq('curriculum_id', curriculum.id)
            .in('day_id', dayIds);

          if (progressError) {
            console.error(`Error fetching progress for curriculum ${curriculum.id}:`, progressError);
            return { ...curriculum, total_days: daysData.length, progress: { completed_days: 0 } };
          }

          const completed_days = progressData?.length || 0;
          
          return {
            ...curriculum,
            total_days: daysData.length, // Ensure total_days is accurate based on actual days
            progress: {
              completed_days: completed_days,
              // last_accessed could be added later if needed
            }
          };
        })
      );
      
      setCurricula(curriculaWithProgress);
      setLoading(false);
    } catch (error) {
      console.error('Error loading curricula:', error)
      toast.error('Failed to load curricula')
      setLoading(false);
    }
  }

  async function fetchStats() {
    // Implementation of fetchStats function
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl font-black animate-pulse">Loading your curricula...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-foreground bg-card neo-brutal-shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black">onemonth.dev</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/logbook')}
              className="font-black bg-card"
            >
              <Book className="mr-2 h-4 w-4" />
              Logbook
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="font-black bg-card"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <SubscriptionBanner />
          <div className="mb-8">
            <h2 className="text-4xl font-black mb-2">Your Learning Journey</h2>
            <p className="text-xl font-bold text-foreground/80">
              Pick up where you left off or start something new
            </p>
          </div>

          {/* Create New Button */}
          <div className="mb-8">
            <Button
              size="lg"
              onClick={() => navigate('/curriculum/new')}
              className="text-lg px-8 font-black"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create New Curriculum
            </Button>
          </div>

          {/* Curricula Grid */}
          {curricula.length === 0 ? (
            <div className="bg-card rounded-lg border-4 border-foreground p-12 neo-brutal-shadow-lg text-center">
              <div className="w-20 h-20 bg-primary rounded-full border-4 border-foreground mx-auto mb-6 flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-black mb-4">No curricula yet!</h3>
              <p className="text-lg font-bold text-foreground/80 mb-6">
                Create your first AI-powered curriculum and start learning today
              </p>
              <Button
                onClick={() => navigate('/curriculum/new')}
                className="font-black"
              >
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
                  {curriculum.is_prebuilt && (
                    <div className="inline-block bg-secondary text-secondary-foreground text-xs font-black px-3 py-1 rounded-full border-2 border-foreground mb-3">
                      PREBUILT
                    </div>
                  )}
                  
                  <h3 className="text-xl font-black mb-2">{curriculum.title}</h3>
                  <p className="text-sm font-bold text-foreground/70 mb-4 line-clamp-2">
                    {curriculum.description}
                  </p>
                  
                  {/* Progress Bar */}
                  {curriculum.total_days > 0 && curriculum.progress && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-bold text-foreground/70 mb-1">
                        <span>Progress</span>
                        <span>{curriculum.progress.completed_days} / {curriculum.total_days} days</span>
                      </div>
                      <div className="w-full bg-muted rounded-sm h-4 border-2 border-foreground neo-brutal-shadow-sm p-0.5">
                        <div 
                          className="bg-primary h-full rounded-sm transition-all duration-500 ease-out"
                          style={{ width: `${(curriculum.progress.completed_days / curriculum.total_days) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {curriculum.total_days === 0 && (
                     <div className="mb-4 text-xs font-bold text-foreground/70">
                        No days defined for this curriculum yet.
                     </div>
                  )}

                  <div className="flex items-center justify-between text-sm font-bold">
                    <div className="flex items-center gap-2 text-foreground/60">
                      <Clock className="h-4 w-4" />
                      <span>{curriculum.total_days} days</span>
                    </div>
                    
                    {/* Remove direct progress display for now */}
                    {/* {curriculum.progress && (
                      <div className="flex items-center gap-2 text-primary">
                        <Zap className="w-4 h-4" />
                        <span>{curriculum.progress.completed_days}/{curriculum.total_days}</span>
                      </div>
                    )} */}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Decorative shapes */}
      <div className="fixed top-20 right-10 w-20 h-20 neo-gradient-pink rotate-45 rounded-lg border-4 border-foreground neo-brutal-shadow -z-10" />
      <div className="fixed bottom-20 left-10 w-28 h-28 neo-gradient-blue rounded-full border-4 border-foreground neo-brutal-shadow -z-10" />
    </div>
  )
} 