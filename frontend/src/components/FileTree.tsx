import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { ChevronRight, FileText, CheckCircle2, Folder, GripVertical, X, Brain } from 'lucide-react'

interface FileTreeProps {
  days: any[]
  selectedDay: any
  onSelectDay: (day: any) => void
  onMoveDay?: (dayId: string, dir: 'up' | 'down') => void
  onDeleteDay?: (dayId: string) => void
  onAddDay?: () => void
  onReorder?: (newOrder: any[]) => void
  curriculumTitle?: string
}

export function FileTree({ days, selectedDay, onSelectDay, onMoveDay, onDeleteDay, onAddDay, onReorder, curriculumTitle }: FileTreeProps) {
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
        {onAddDay && (
          <button
            onClick={onAddDay}
            className="ml-auto bg-primary text-primary-foreground rounded-md font-bold w-6 h-6 neo-brutal-shadow-sm"
            title="Add Day"
          >+
          </button>
        )}
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
              {days.map((day, idx) => (
                <div
                  key={day.id}
                  role="button"
                  onClick={() => onSelectDay(day)}
                  tabIndex={0}
                  draggable={!!onReorder}
                  onDragStart={(e)=>{
                    if(!onReorder) return;
                    e.dataTransfer.setData('text/plain', day.id);
                  }}
                  onDragOver={(e)=>{if(onReorder){e.preventDefault();}}}
                  onDrop={(e)=>{
                    if(!onReorder) return;
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if(draggedId===day.id) return;
                    const draggedIdx = days.findIndex((d:any)=>d.id===draggedId);
                    const targetIdx = idx;
                    if(draggedIdx===-1) return;
                    const newArr = [...days];
                    const [draggedItem] = newArr.splice(draggedIdx,1);
                    newArr.splice(targetIdx,0,draggedItem);
                    onReorder(newArr.map((d,i)=>({...d, day_number:i+1})));
                  }}
                  title={`Day ${day.day_number}: ${day.title}`}
                  className={cn(
                    'w-full flex items-start gap-2 pl-2 pr-2 py-1.5 text-sm rounded-md border-2 border-transparent transition-all cursor-pointer',
                    selectedDay?.id === day.id
                      ? 'bg-primary text-primary-foreground font-bold border-foreground neo-brutal-shadow-sm' 
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted hover:border-foreground/30 font-medium'
                  )}
                >
                  <GripVertical className="w-4 h-4 mt-0.5 flex-shrink-0 text-foreground/60" />
                  {day.is_project_day ? (
                    <Brain className="w-4 h-4 mt-0.5 flex-shrink-0 stroke-[2.5] text-primary" />
                  ) : (
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 stroke-[2.5]" />
                  )}
                  <span className="flex-1 text-left whitespace-normal">
                    Day {day.day_number}: {day.title}
                  </span>
                  {day.completed && (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  )}
                  {onDeleteDay && (
                    <X onClick={(e)=>{e.stopPropagation();onDeleteDay(day.id)}} className="w-4 h-4 text-red-600 flex-shrink-0 hover:text-red-700" />
                  )}
                </div>
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