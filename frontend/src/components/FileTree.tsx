import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { ChevronRight, FileText, CheckCircle2, Folder } from 'lucide-react'

interface FileTreeProps {
  days: any[]
  selectedDay: any
  onSelectDay: (day: any) => void
  curriculumTitle?: string
}

export function FileTree({ days, selectedDay, onSelectDay, curriculumTitle }: FileTreeProps) {
  const completedDays = days.filter(d => d.completed).length
  const totalDays = days.length
  const progressPercentage = totalDays > 0 ? (completedDays / totalDays) * 100 : 0

  return (
    <div className="h-full flex flex-col bg-card text-foreground">
      {/* Explorer header */}
      <div className="px-3 py-2.5 border-b-2 border-foreground flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-black uppercase tracking-wider">
          {curriculumTitle || 'Curriculum Explorer'}
        </h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="py-2 px-1">
          {/* Curriculum folder */}
          <div className="px-2 py-1 mb-1">
            <div className="flex items-center gap-1.5 text-sm font-bold mb-1 cursor-default">
              <ChevronRight className="w-5 h-5 stroke-[2.5]" /> 
              <Folder className="w-5 h-5 stroke-[2.5] text-primary"/> 
              <span className="font-black">Learning Path</span>
            </div>
            
            {/* Days list */}
            <div className="ml-3 space-y-0.5">
              {days.map((day) => (
                <button
                  key={day.id}
                  onClick={() => onSelectDay(day)}
                  title={`Day ${day.day_number}: ${day.title}`}
                  className={cn(
                    'w-full flex items-start gap-2 pl-3 pr-2 py-1.5 text-sm rounded-md border-2 border-transparent transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                    selectedDay?.id === day.id
                      ? 'bg-primary text-primary-foreground font-bold border-foreground neo-brutal-shadow-sm' 
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted hover:border-foreground/30 font-medium'
                  )}
                >
                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 stroke-[2.5]" />
                  <span className="flex-1 text-left whitespace-normal">
                    Day {day.day_number}: {day.title}
                  </span>
                  {day.completed && (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Progress section */}
          <div className="mt-auto px-3 pt-3 pb-2 border-t-2 border-foreground flex-shrink-0">
            <div className="flex items-center justify-between text-xs font-bold text-foreground/80 mb-1.5">
              <span>Progress</span>
              <span>{completedDays}/{totalDays} days</span>
            </div>
            <div className="w-full bg-muted rounded-md h-4 border-2 border-foreground neo-brutal-shadow-sm p-0.5">
              <div 
                className="bg-primary h-full rounded-sm transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
} 