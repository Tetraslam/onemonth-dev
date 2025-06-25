import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { FileTree } from '@/components/FileTree'
import { ContentView } from '@/components/ContentView'
import { ChatPanel } from '@/components/ChatPanel'
import { CurriculumCreationForm } from '@/components/CurriculumCreationForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export function CurriculumPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [curriculum, setCurriculum] = useState<any>(null)
  const [days, setDays] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id && id !== 'new') {
      fetchCurriculum()
    } else if (id === 'new') {
      setLoading(false)
    }
  }, [id])

  const fetchCurriculum = async () => {
    setLoading(true) // Ensure loading is true at the start
    try {
      const { data: curriculumData, error: curriculumError } = await supabase
        .from('curricula')
        .select('*')
        .eq('id', id)
        .single()

      if (curriculumError) throw curriculumError
      setCurriculum(curriculumData)

      const { data: daysData, error: daysError } = await supabase
        .from('curriculum_days')
        .select('*')
        .eq('curriculum_id', id)
        .order('day_number')

      if (daysError) throw daysError
      setDays(daysData || [])
      
      if (daysData && daysData.length > 0) {
        setSelectedDay(daysData[0])
      }
    } catch (error: any) {
      toast.error('Failed to fetch curriculum details.')
      console.error("Fetch curriculum error:", error)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (id === 'new') {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b-4 border-foreground neo-brutal-shadow">
          <div className="container mx-auto px-4 py-3 flex items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="mr-4 h-9 w-9 bg-card"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-black text-foreground">Create New Curriculum</h1>
          </div>
        </header>
        <main className="py-8 container mx-auto px-4">
          <CurriculumCreationForm />
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="bg-card border-b-4 border-foreground neo-brutal-shadow h-[50px] flex items-center px-4 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/dashboard')}
            className="h-8 w-8 p-0 bg-card"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-black text-foreground truncate">
            {curriculum?.title || 'Loading Curriculum...'}
          </span>
        </div>
        {/* Placeholder for potential header actions */}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[280px] bg-card border-r-4 border-foreground flex-shrink-0 overflow-y-auto">
          <FileTree 
            days={days} 
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            curriculumTitle={curriculum?.title}
          />
        </div>

        <div className="flex-1 bg-background overflow-y-auto min-w-0">
          <ContentView 
            day={selectedDay}
            curriculum={curriculum}
          />
        </div>

        <div className="w-[380px] bg-card border-l-4 border-foreground flex-shrink-0 flex flex-col overflow-hidden">
          <ChatPanel 
            curriculum={curriculum}
            currentDay={selectedDay}
          />
        </div>
      </div>
    </div>
  )
} 