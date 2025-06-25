import { formatDistanceToNow } from 'date-fns';
import { Book, TrendingUp, Lightbulb, Target, Trash2, Clock, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface LogbookEntry {
  id: string;
  title: string;
  entry_type: 'reflection' | 'project_progress' | 'note' | 'achievement';
  mood?: 'excited' | 'confident' | 'neutral' | 'frustrated' | 'stuck';
  tags: string[];
  hours_spent?: number;
  created_at: string;
  updated_at: string;
}

interface LogbookEntryCardProps {
  entry: LogbookEntry;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function LogbookEntryCard({ entry, isSelected, onClick, onDelete }: LogbookEntryCardProps) {
  const getEntryIcon = () => {
    switch (entry.entry_type) {
      case 'reflection':
        return <Book className="h-4 w-4" />;
      case 'project_progress':
        return <TrendingUp className="h-4 w-4" />;
      case 'note':
        return <Lightbulb className="h-4 w-4" />;
      case 'achievement':
        return <Target className="h-4 w-4" />;
    }
  };

  const getMoodColor = () => {
    switch (entry.mood) {
      case 'excited':
        return 'bg-green-500';
      case 'confident':
        return 'bg-blue-500';
      case 'neutral':
        return 'bg-gray-400';
      case 'frustrated':
        return 'bg-orange-500';
      case 'stuck':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getTypeLabel = () => {
    switch (entry.entry_type) {
      case 'reflection':
        return 'Reflection';
      case 'project_progress':
        return 'Project Progress';
      case 'note':
        return 'Note';
      case 'achievement':
        return 'Achievement';
    }
  };

  return (
    <div
      className={cn(
        "p-4 border-2 border-[hsl(0_0%_15%)] rounded-lg cursor-pointer transition-all",
        "hover:shadow-[4px_4px_0px_0px_hsl(0_0%_15%)]",
        isSelected && "bg-[hsl(45_100%_50%)] shadow-[4px_4px_0px_0px_hsl(0_0%_15%)]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getEntryIcon()}
            <h3 className="font-semibold text-[hsl(0_0%_15%)] truncate">
              {entry.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", getMoodColor())} />
              {entry.mood || 'No mood'}
            </span>
            <span>{getTypeLabel()}</span>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
            {entry.hours_spent && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {entry.hours_spent}h
              </span>
            )}
          </div>

          {entry.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <Tag className="h-3 w-3 text-gray-400" />
              {entry.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 bg-[hsl(30_40%_96%)] rounded border border-[hsl(0_0%_15%)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="hover:bg-red-100 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 