import { Calendar, Clock, TrendingUp, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface LogbookStatsProps {
  stats: {
    total_entries: number;
    total_hours: number;
    entry_types: Record<string, number>;
    moods: Record<string, number>;
    current_streak: number;
    longest_streak: number;
    last_entry_date: string | null;
  };
}

export function LogbookStats({ stats }: LogbookStatsProps) {
  const getMostFrequentMood = () => {
    if (!stats.moods || Object.keys(stats.moods).length === 0) return null;
    
    return Object.entries(stats.moods).reduce((a, b) => 
      stats.moods[a[0]] > stats.moods[b[0]] ? a : b
    )[0];
  };

  const formatMood = (mood: string) => {
    return mood.charAt(0).toUpperCase() + mood.slice(1);
  };

  return (
    <Card className="p-4 border-2 border-[hsl(0_0%_15%)] bg-[hsl(45_100%_50%)] shadow-[4px_4px_0px_0px_hsl(0_0%_15%)]">
      <h3 className="font-bold text-[hsl(0_0%_15%)] mb-3">Your Progress</h3>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white rounded border-2 border-[hsl(0_0%_15%)]">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">{stats.total_entries}</p>
            <p className="text-xs text-[hsl(0_0%_40%)]">Total Entries</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 bg-white rounded border-2 border-[hsl(0_0%_15%)]">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">{stats.total_hours.toFixed(1)}h</p>
            <p className="text-xs text-[hsl(0_0%_40%)]">Total Hours</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 bg-white rounded border-2 border-[hsl(0_0%_15%)]">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">{stats.current_streak} days</p>
            <p className="text-xs text-[hsl(0_0%_40%)]">Current Streak</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 bg-white rounded border-2 border-[hsl(0_0%_15%)]">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">{stats.longest_streak} days</p>
            <p className="text-xs text-[hsl(0_0%_40%)]">Longest Streak</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
          <div className="p-2 bg-white rounded border-2 border-[hsl(0_0%_15%)]">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">{getMostFrequentMood() ? formatMood(getMostFrequentMood()!) : 'N/A'}</p>
            <p className="text-xs text-[hsl(0_0%_40%)]">Top Mood</p>
          </div>
        </div>
      </div>

      {stats.entry_types && Object.keys(stats.entry_types).length > 0 && (
        <div className="mt-4 pt-3 border-t-2 border-[hsl(0_0%_15%)]">
          <p className="text-xs font-semibold mb-2">Entry Types</p>
          <div className="space-y-1">
            {Object.entries(stats.entry_types).map(([type, count]) => (
              <div key={type} className="flex justify-between text-xs">
                <span>{type.replace('_', ' ').split(' ').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
} 