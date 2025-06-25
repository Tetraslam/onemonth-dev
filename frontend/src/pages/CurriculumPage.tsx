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

// Define interfaces for better type safety
interface Day {
  id: string;
  day_number: number;
  title: string;
  content: any; // Or a more specific type for rich text JSON
  resources: any[];
  estimated_hours?: number;
  completed?: boolean; // Added for progress tracking
  // curriculum_id is implicitly known by its association
}

interface Curriculum {
  id: string;
  title: string;
  difficulty_level?: string;
  learning_goal?: string; // Added from backend model
  // Add other curriculum fields as needed from your Pydantic model
}

export function CurriculumPage() {
  const { id } = useParams<{ id: string }>() // Typed useParams
  const navigate = useNavigate()
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [days, setDays] = useState<Day[]>([])
  const [selectedDay, setSelectedDay] = useState<Day | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id && id !== 'new') {
      fetchCurriculumAndProgress()
    } else if (id === 'new') {
      setLoading(false)
    }
  }, [id])

  const fetchCurriculumAndProgress = async () => {
    setLoading(true)
    if (!id) return; // Should not happen if id !== 'new'

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated.");
        navigate("/auth");
        return;
      }

      // Fetch curriculum details
      const { data: curriculumData, error: curriculumError } = await supabase
        .from('curricula')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user owns this curriculum
        .single()

      if (curriculumError) throw curriculumError;
      if (!curriculumData) throw new Error("Curriculum not found or not authorized.");
      setCurriculum(curriculumData);

      // Fetch days for the curriculum
      const { data: daysData, error: daysError } = await supabase
        .from('curriculum_days')
        .select('*')
        .eq('curriculum_id', id)
        .order('day_number');

      if (daysError) throw daysError;
      if (!daysData) throw new Error("No days found for this curriculum.");

      // Fetch progress for these days for the current user
      const dayIds = daysData.map(d => d.id);
      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('day_id, completed_at')
        .eq('user_id', user.id)
        .eq('curriculum_id', id)
        .in('day_id', dayIds);
      
      if (progressError) throw progressError;

      const completedDayIds = new Set(progressData?.map(p => p.day_id) || []);

      const daysWithProgress = daysData.map(day => ({
        ...day,
        completed: completedDayIds.has(day.id)
      }));

      setDays(daysWithProgress);
      
      if (daysWithProgress.length > 0) {
        setSelectedDay(daysWithProgress[0]);
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch curriculum details.');
      console.error("Fetch curriculum error:", error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Callback function to update a day's completion status
  const handleDayCompletionUpdate = (dayId: string, isCompleted: boolean) => {
    setDays(prevDays => prevDays.map(day => 
      day.id === dayId ? { ...day, completed: isCompleted } : day
    ));
    if (selectedDay && selectedDay.id === dayId) {
      setSelectedDay(prev => prev ? { ...prev, completed: isCompleted } : null);
    }
  };

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
            days={days} // Now days include 'completed' status
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            curriculumTitle={curriculum?.title}
          />
        </div>

        <div className="flex-1 bg-background overflow-y-auto min-w-0">
          <ContentView 
            day={selectedDay} // selectedDay now includes 'completed' status
            curriculum={curriculum}
            onDayCompletionUpdate={handleDayCompletionUpdate} // Pass callback
          />
        </div>

        <div className="w-[380px] min-w-[380px] bg-card border-l-4 border-foreground flex-shrink-0 flex flex-col overflow-hidden">
          <ChatPanel 
            curriculum={curriculum}
            currentDay={selectedDay}
          />
        </div>
      </div>
    </div>
  )
} 