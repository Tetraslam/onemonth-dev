import { useState, useEffect } from 'react';
import { Save, X, Plus, Calendar, Clock, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface LogbookEntry {
  id: string;
  title: string;
  content: any;
  content_text?: string;
  entry_type: 'reflection' | 'project_progress' | 'note' | 'achievement';
  mood?: 'excited' | 'confident' | 'neutral' | 'frustrated' | 'stuck';
  tags: string[];
  hours_spent?: number;
  curriculum_id?: string;
  day_id?: string;
}

interface Curriculum {
  id: string;
  title: string;
}

interface LogbookEditorProps {
  entry: LogbookEntry | null;
  curricula: Curriculum[];
  onSave: (entry: Partial<LogbookEntry>) => void;
  onCancel: () => void;
}

export function LogbookEditor({ entry, curricula, onSave, onCancel }: LogbookEditorProps) {
  const [title, setTitle] = useState('');
  const [contentText, setContentText] = useState('');
  const [entryType, setEntryType] = useState<LogbookEntry['entry_type']>('reflection');
  const [mood, setMood] = useState<LogbookEntry['mood']>('neutral');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [hoursSpent, setHoursSpent] = useState<string>('');
  const [curriculumId, setCurriculumId] = useState<string>('');

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContentText(entry.content_text || '');
      setEntryType(entry.entry_type);
      setMood(entry.mood || 'neutral');
      setTags(entry.tags);
      setHoursSpent(entry.hours_spent?.toString() || '');
      setCurriculumId(entry.curriculum_id || '');
    } else {
      // Reset for new entry
      setTitle('');
      setContentText('');
      setEntryType('reflection');
      setMood('neutral');
      setTags([]);
      setHoursSpent('');
      setCurriculumId('');
    }
  }, [entry]);

  const handleSave = () => {
    if (!title.trim()) {
      return;
    }

    // For now, we'll create a simple content structure
    // Later this will be replaced with Plate.js content
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: contentText
            }
          ]
        }
      ]
    };

    const entryData: Partial<LogbookEntry> = {
      title: title.trim(),
      content,
      content_text: contentText,
      entry_type: entryType,
      mood,
      tags,
      hours_spent: hoursSpent ? parseFloat(hoursSpent) : undefined,
      curriculum_id: curriculumId || undefined,
    };

    onSave(entryData);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const getMoodEmoji = (moodValue: string) => {
    switch (moodValue) {
      case 'excited': return '🎉';
      case 'confident': return '💪';
      case 'neutral': return '😐';
      case 'frustrated': return '😤';
      case 'stuck': return '😵';
      default: return '😐';
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[hsl(0_0%_15%)]">
          {entry ? 'Edit Entry' : 'New Entry'}
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={onCancel}
            variant="outline"
            className="border-2 border-[hsl(0_0%_15%)]"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim()}
            className="bg-[hsl(45_100%_50%)] text-[hsl(0_0%_15%)] hover:bg-[hsl(45_100%_40%)] border-2 border-[hsl(0_0%_15%)] shadow-[4px_4px_0px_0px_hsl(0_0%_15%)]"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Title */}
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for your entry..."
            className="mt-1 border-2 border-[hsl(0_0%_15%)] focus:ring-2 focus:ring-[hsl(45_100%_50%)]"
          />
        </div>

        {/* Entry Type */}
        <div>
          <Label>Entry Type</Label>
          <RadioGroup
            value={entryType}
            onValueChange={(value) => setEntryType(value as LogbookEntry['entry_type'])}
            className="mt-2 grid grid-cols-2 gap-3"
          >
            <label className={cn(
              "flex items-center space-x-2 p-3 border-2 border-[hsl(0_0%_15%)] rounded-lg cursor-pointer transition-all",
              entryType === 'reflection' && "bg-[hsl(45_100%_50%)] shadow-[2px_2px_0px_0px_hsl(0_0%_15%)]"
            )}>
              <RadioGroupItem value="reflection" />
              <span className="font-medium">Reflection</span>
            </label>
            <label className={cn(
              "flex items-center space-x-2 p-3 border-2 border-[hsl(0_0%_15%)] rounded-lg cursor-pointer transition-all",
              entryType === 'project_progress' && "bg-[hsl(45_100%_50%)] shadow-[2px_2px_0px_0px_hsl(0_0%_15%)]"
            )}>
              <RadioGroupItem value="project_progress" />
              <span className="font-medium">Project Progress</span>
            </label>
            <label className={cn(
              "flex items-center space-x-2 p-3 border-2 border-[hsl(0_0%_15%)] rounded-lg cursor-pointer transition-all",
              entryType === 'note' && "bg-[hsl(45_100%_50%)] shadow-[2px_2px_0px_0px_hsl(0_0%_15%)]"
            )}>
              <RadioGroupItem value="note" />
              <span className="font-medium">Note</span>
            </label>
            <label className={cn(
              "flex items-center space-x-2 p-3 border-2 border-[hsl(0_0%_15%)] rounded-lg cursor-pointer transition-all",
              entryType === 'achievement' && "bg-[hsl(45_100%_50%)] shadow-[2px_2px_0px_0px_hsl(0_0%_15%)]"
            )}>
              <RadioGroupItem value="achievement" />
              <span className="font-medium">Achievement</span>
            </label>
          </RadioGroup>
        </div>

        {/* Mood */}
        <div>
          <Label>How are you feeling?</Label>
          <RadioGroup
            value={mood}
            onValueChange={(value) => setMood(value as LogbookEntry['mood'])}
            className="mt-2 flex gap-3"
          >
            {(['excited', 'confident', 'neutral', 'frustrated', 'stuck'] as const).map((moodOption) => (
              <label
                key={moodOption}
                className={cn(
                  "flex flex-col items-center space-y-1 p-3 border-2 border-[hsl(0_0%_15%)] rounded-lg cursor-pointer transition-all",
                  mood === moodOption && "bg-[hsl(45_100%_50%)] shadow-[2px_2px_0px_0px_hsl(0_0%_15%)]"
                )}
              >
                <span className="text-2xl">{getMoodEmoji(moodOption)}</span>
                <RadioGroupItem value={moodOption} className="sr-only" />
                <span className="text-xs capitalize">{moodOption}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Content */}
        <div>
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder="Write your thoughts..."
            rows={8}
            className="mt-1 border-2 border-[hsl(0_0%_15%)] focus:ring-2 focus:ring-[hsl(45_100%_50%)] font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            Rich text editor with AI integration coming soon!
          </p>
        </div>

        {/* Additional Fields */}
        <div className="grid grid-cols-2 gap-4">
          {/* Hours Spent */}
          <div>
            <Label htmlFor="hours">
              <Clock className="inline h-4 w-4 mr-1" />
              Hours Spent
            </Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              value={hoursSpent}
              onChange={(e) => setHoursSpent(e.target.value)}
              placeholder="0"
              className="mt-1 border-2 border-[hsl(0_0%_15%)]"
            />
          </div>

          {/* Curriculum */}
          <div>
            <Label htmlFor="curriculum">
              <Calendar className="inline h-4 w-4 mr-1" />
              Related Curriculum
            </Label>
            <select
              id="curriculum"
              value={curriculumId}
              onChange={(e) => setCurriculumId(e.target.value)}
              className="mt-1 w-full px-3 py-2 border-2 border-[hsl(0_0%_15%)] rounded-md bg-white"
            >
              <option value="">None</option>
              {curricula.map(curriculum => (
                <option key={curriculum.id} value={curriculum.id}>
                  {curriculum.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <Label>
            <TagIcon className="inline h-4 w-4 mr-1" />
            Tags
          </Label>
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag..."
                className="flex-1 border-2 border-[hsl(0_0%_15%)]"
              />
              <Button
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className="bg-[hsl(210_100%_50%)] text-white hover:bg-[hsl(210_100%_40%)] border-2 border-[hsl(0_0%_15%)]"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[hsl(30_40%_96%)] border-2 border-[hsl(0_0%_15%)] rounded-lg text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-[hsl(0_0%_15%)] hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 