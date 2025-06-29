import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Filter, Calendar, Tag, TrendingUp, Book, Lightbulb, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { LogbookEditor } from '../components/LogbookEditor';
import { LogbookEntryCard } from '../components/LogbookEntryCard';
import { LogbookStats } from '../components/LogbookStats';
import { toast } from 'sonner';
import SubscriptionBanner from '@/components/SubscriptionBanner'

interface LogbookEntry {
  id: string;
  user_id: string;
  curriculum_id?: string;
  day_id?: string;
  title: string;
  content: any;
  content_text?: string;
  entry_type: 'reflection' | 'project_progress' | 'note' | 'achievement';
  mood?: 'excited' | 'confident' | 'neutral' | 'frustrated' | 'stuck';
  tags: string[];
  hours_spent?: number;
  created_at: string;
  updated_at: string;
}

interface Curriculum {
  id: string;
  title: string;
}

export function LogbookPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('');
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newEntryPrompt, setNewEntryPrompt] = useState<string>('');

  // Effect for initial auth check and curricula fetching
  useEffect(() => {
    const initialLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      } else {
        setIsAuthenticated(true);
        fetchCurricula(session.access_token);
      }
    };
    initialLoad();
  }, [navigate]);

  // Effect to handle incoming prompt from navigation state
  useEffect(() => {
    if (location.state?.newEntryPrompt) {
      setNewEntryPrompt(location.state.newEntryPrompt);
      setIsCreating(true);
      setSelectedEntry(null);
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Effect for fetching entries and stats based on filters and auth
  useEffect(() => {
    console.log('[LogbookPage] Effect triggered - searchQuery:', searchQuery, 'isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      fetchEntries();
      fetchStats();
    }
  }, [isAuthenticated, searchQuery, selectedType, selectedMood, selectedTags, selectedCurriculumId]);

  const fetchCurricula = async (token: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/curricula`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[LogbookPage] Raw data from /api/curricula:', JSON.stringify(data));
        setCurricula(data || []);
        console.log('[LogbookPage] Curricula state after setCurricula:', JSON.stringify(data || []));
      } else {
        console.error('Failed to fetch curricula, status:', response.status);
        toast.error('Failed to load your curricula.');
      }
    } catch (error) {
      console.error('Error fetching curricula:', error);
      toast.error('Could not fetch curricula.');
    }
  };

  const fetchEntries = async () => {
    try {
      setIsLoadingEntries(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedType) params.append('entry_type', selectedType);
      if (selectedMood) params.append('mood', selectedMood);
      if (selectedCurriculumId) params.append('curriculum_id', selectedCurriculumId);
      selectedTags.forEach(tag => params.append('tags', tag));
      // Add pagination params if needed in future
      // params.append('page', '1');
      // params.append('page_size', '20');

      console.log('[LogbookPage] Fetching entries with params:', params.toString());

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/logbook/entries?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('[LogbookPage] Raw entries response:', data);
        // The backend returns { entries: [...], total_count, page, page_size }
        setEntries(data.entries || []);
      } else {
        console.error('Failed to fetch entries, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        toast.error('Failed to load logbook entries.');
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Could not fetch logbook entries.');
    } finally {
      setIsLoadingEntries(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (selectedCurriculumId) params.append('curriculum_id', selectedCurriculumId);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/logbook/stats?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch stats, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateNew = () => {
    setSelectedEntry(null);
    setIsCreating(true);
  };

  const handleSelectEntry = (entry: LogbookEntry) => {
    setSelectedEntry(entry);
    setIsCreating(false);
  };

  const handleSaveEntry = async (entryDataToSave: Partial<LogbookEntry>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = selectedEntry
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/logbook/entries/${selectedEntry.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/logbook/entries`;

      const method = selectedEntry ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryDataToSave),
      });

      if (response.ok) {
        toast.success(selectedEntry ? 'Entry updated!' : 'Entry created!');
        fetchEntries(); // Refetch entries to update the list
        fetchStats(); // Refetch stats
        setIsCreating(false);
        setNewEntryPrompt(''); // Clear the prompt
        if (!selectedEntry) { // If it was a new entry, clear selection
            setSelectedEntry(null);
        } else { // If updating, re-select to show updated data (or clear if preferred)
            const updatedEntry = await response.json();
            setSelectedEntry(updatedEntry.entry);
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save entry. Please try again.'}));
        console.error('Failed to save entry:', errorData);
        toast.error(errorData.detail || 'Failed to save entry.');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('An unexpected error occurred while saving.');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/logbook/entries/${entryId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Entry deleted');
        fetchEntries(); // Refetch entries
        fetchStats(); // Refetch stats
        if (selectedEntry?.id === entryId) {
          setSelectedEntry(null);
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to delete entry. Please try again.'}));
        console.error('Failed to delete entry:', errorData);
        toast.error(errorData.detail || 'Failed to delete entry.');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('An unexpected error occurred while deleting.');
    }
  };

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'reflection':
        return <Book className="h-4 w-4" />;
      case 'project_progress':
        return <TrendingUp className="h-4 w-4" />;
      case 'note':
        return <Lightbulb className="h-4 w-4" />;
      case 'achievement':
        return <Target className="h-4 w-4" />;
      default:
        return <Book className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[hsl(30_40%_96%)]">
      {/* Header */}
      <div className="border-b-4 border-[hsl(0_0%_15%)] bg-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[hsl(0_0%_15%)]">Logbook</h1>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-2 border-[hsl(0_0%_15%)] hover:bg-[hsl(30_40%_96%)]"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      <SubscriptionBanner />
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Entry List */}
        <div className="w-1/3 border-r-4 border-[hsl(0_0%_15%)] bg-white flex flex-col">
          {/* Stats Card */}
          {stats && (
            <div className="p-4 border-b-2 border-[hsl(0_0%_15%)]">
              <LogbookStats stats={stats} />
            </div>
          )}

          {/* Filters */}
          <div className="p-4 space-y-3 border-b-2 border-[hsl(0_0%_15%)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => {
                  console.log('[LogbookPage] Search input changed:', e.target.value);
                  setSearchQuery(e.target.value);
                }}
                className="pl-10 border-2 border-[hsl(0_0%_15%)] focus:ring-2 focus:ring-[hsl(45_100%_50%)]"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-[hsl(0_0%_15%)] rounded-md bg-white"
              >
                <option value="">All Types</option>
                <option value="reflection">Reflection</option>
                <option value="project_progress">Project Progress</option>
                <option value="note">Note</option>
                <option value="achievement">Achievement</option>
              </select>

              <select
                value={selectedCurriculumId}
                onChange={(e) => setSelectedCurriculumId(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-[hsl(0_0%_15%)] rounded-md bg-white"
              >
                <option value="">All Curricula</option>
                {curricula.map(curriculum => (
                  <option key={curriculum.id} value={curriculum.id}>
                    {curriculum.title}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleCreateNew}
              className="w-full bg-[hsl(45_100%_50%)] text-[hsl(0_0%_15%)] hover:bg-[hsl(45_100%_40%)] border-2 border-[hsl(0_0%_15%)] shadow-[4px_4px_0px_0px_hsl(0_0%_15%)]"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </div>

          {/* Entry List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {isLoadingEntries ? (
                <div className="text-center py-8 text-gray-500">Loading entries...</div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No entries found. Create your first entry!
                </div>
              ) : (
                entries.map(entry => (
                  <LogbookEntryCard
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedEntry?.id === entry.id}
                    onClick={() => handleSelectEntry(entry)}
                    onDelete={() => handleDeleteEntry(entry.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Editor */}
        <div className="flex-1 bg-white">
          {selectedEntry || isCreating ? (
            <LogbookEditor
              entry={selectedEntry}
              curricula={curricula}
              onSave={handleSaveEntry}
              onCancel={() => {
                setSelectedEntry(null);
                setIsCreating(false);
                setNewEntryPrompt('');
              }}
              initialContent={newEntryPrompt}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select an entry to view or edit</p>
                <p className="text-sm mt-2">or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 