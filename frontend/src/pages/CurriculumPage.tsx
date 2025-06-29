import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { FileTree } from '@/components/FileTree'
import { ContentView } from '@/components/ContentView'
import { ChatPanel } from '@/components/ChatPanel'
import { CurriculumCreationForm } from '@/components/CurriculumCreationForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'

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

export default function CurriculumPage() {
  const { id } = useParams<{ id: string }>()
  const [curriculum, setCurriculum] = useState<any>(null)
  const [days, setDays] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [progress, setProgress] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (id && id !== 'new') {
      fetchCurriculum()
    } else if (id === 'new') {
      setLoading(false)
    }
  }, [id])

  const fetchCurriculum = async () => {
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

  const loadProgress = async () => {
    // Implementation of loadProgress function
  };

  const checkUser = async () => {
    // Implementation of checkUser function
  };

  // Callback function to update a day's completion status
  const handleDayCompletionUpdate = (dayId: string, isCompleted: boolean) => {
    setDays((prev: any) => prev.map((d: any) => d.id === dayId ? { ...d, completed: isCompleted } : d))
  };

  // Callback function to update a day's content
  const handleDayUpdate = (dayId: string, updates: Partial<Day>) => {
    setDays((prev: any) => prev.map((d: any) => d.id === dayId ? { ...d, ...updates } : d))
  };

  // Move day up or down
  const handleMoveDay = async (dayId: string, dir: 'up' | 'down') => {
    setDays(prev => {
      const idx = prev.findIndex(d => d.id === dayId);
      if (idx === -1) return prev;
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const newArr = [...prev];
      const [moved] = newArr.splice(idx, 1);
      newArr.splice(newIdx, 0, moved);
      // Reassign day_numbers locally
      return newArr.map((d, i) => ({ ...d, day_number: i + 1 }));
    });

    // Prepare payload
    const dayOrder = days.map((d, i) => ({ id: d.id, day_number: i + 1 }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/curricula/${id}/days/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(dayOrder)
      });
    } catch (err) {
      console.error('Reorder error', err);
      toast.error('Failed to reorder');
    }
  };

  // Persist new order from drag/drop
  const handleReorder = async (newDays: any[]) => {
    setDays(newDays);
    const dayOrder = newDays.map(d=>({id:d.id, day_number:d.day_number}));
    try{
      const { data:{session} } = await supabase.auth.getSession();
      const token=session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:8000'}/api/curricula/${id}/days/reorder`,{
        method:'PUT',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify(dayOrder)
      });
      if(!res.ok){
        throw new Error('Server error');
      }
    }catch(err){console.error(err);toast.error('Failed to save order');}
  };

  // Delete day
  const handleDeleteDay = async (dayId: string) => {
    if (!confirm('Delete this day?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/curricula/${id}/days/${dayId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setDays(prev => prev.filter(d => d.id !== dayId).map((d,i)=>({...d, day_number:i+1})));
      if (selectedDay?.id === dayId) {
        setSelectedDay(null);
      }
    } catch (err) {
      console.error('Delete error', err);
      toast.error('Delete failed');
    }
  };

  // Add new day at end
  const handleAddDay = async () => {
    const title = prompt('Title for new day');
    if (title === null) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const body = {
        title: title || `Day ${days.length + 1}`,
        content: { type: 'doc', content: [] },
        day_number: days.length + 1,
        resources: []
      };
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/curricula/${id}/days`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (res.ok) {
        setDays(prev => [...prev, json]);
        toast.success('Day added');
      } else {
        throw new Error(json.detail || 'Error');
      }
    } catch (err) {
      console.error('Add day error', err);
      toast.error('Failed to add day');
    }
  };

  if (id === 'new') {
    return <CurriculumCreationForm />
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading curriculum...</p>
        </div>
      </div>
    )
  }

  if (!curriculum) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Curriculum Not Found</h2>
          <p className="text-muted-foreground">This curriculum doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Curriculum Explorer (File tree) */}
      <div className="w-[320px] bg-card border-r-4 border-foreground flex flex-col">
        <div className="px-6 py-8 border-b-4 border-foreground bg-primary">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="w-full font-black bg-card mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-black text-primary-foreground leading-tight mb-2">
            {curriculum.title}
          </h1>
          <p className="text-sm font-bold text-primary-foreground/80">
            {curriculum.estimated_duration_days || 30} Day Journey
          </p>
        </div>
        <ScrollArea className="flex-1">
          <FileTree 
            days={days} 
            selectedDay={selectedDay} 
            onSelectDay={setSelectedDay}
            onMoveDay={handleMoveDay}
            onDeleteDay={handleDeleteDay}
            onAddDay={handleAddDay}
            onReorder={handleReorder}
            curriculumTitle={curriculum.title}
          />
        </ScrollArea>
      </div>

      {/* Content View */}
      <div className="flex-1 flex flex-col">
        <ContentView 
          day={selectedDay} 
          curriculum={curriculum}
          onDayCompletionUpdate={handleDayCompletionUpdate}
          onDayUpdate={handleDayUpdate}
        />
      </div>

      {/* Chat Panel */}
      <div className="w-[400px] bg-card border-l-4 border-foreground">
        <ChatPanel 
          curriculum={curriculum} 
          currentDay={selectedDay}
        />
      </div>
    </div>
  )
} 