import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, Clock, ExternalLink, BookmarkPlus, BookOpenText, Sparkles, Loader2 } from 'lucide-react'
import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import axios from 'axios'
import toast from 'react-hot-toast'

interface Day {
  id: string;
  day_number: number;
  title: string;
  content: any; 
  resources: any[];
  estimated_hours?: number;
  completed?: boolean; 
}

interface Curriculum {
  id: string;
  title: string;
  difficulty_level?: string;
}

interface ContentViewProps {
  day: Day | null;
  curriculum: Curriculum | null;
  onDayCompletionUpdate: (dayId: string, isCompleted: boolean) => void;
}

// Enhanced Rich Text Renderer
const renderNode = (node: any, key: string | number): React.ReactNode => {
  if (!node) return null;

  const children = node.content ? node.content.map((childNode: any, index: number) => renderNode(childNode, `${key}-${index}`)) : [];

  switch (node.type) {
    case 'doc':
      return <>{children}</>; // Document itself doesn't render, its children do
    
    case 'paragraph':
      return <p key={key} className="text-foreground/90 leading-relaxed mb-4">{children.length > 0 ? children : <br />}</p>; // Handle empty paragraphs

    case 'heading':
      const level = node.attrs?.level;
      if (level === 1) return <h1 key={key} className="text-3xl font-black text-foreground mt-8 mb-4 pb-2 border-b-2 border-foreground/10">{children}</h1>;
      if (level === 2) return <h2 key={key} className="text-2xl font-black text-foreground mt-6 mb-3 pb-1 border-b border-foreground/10">{children}</h2>;
      if (level === 3) return <h3 key={key} className="text-xl font-bold text-foreground mt-4 mb-2">{children}</h3>;
      if (level === 4) return <h4 key={key} className="text-lg font-bold text-foreground mt-3 mb-1">{children}</h4>;
      return <p key={key} className="font-bold">{children}</p>; // Fallback for other levels

    case 'bulletList':
      return <ul key={key} className="list-disc list-inside space-y-2 mb-4 pl-5 text-foreground/90">{children}</ul>;

    case 'orderedList':
      return <ol key={key} className="list-decimal list-inside space-y-2 mb-4 pl-5 text-foreground/90">{children}</ol>;

    case 'listItem':
      // listItem's children are usually block nodes (e.g., a paragraph)
      return <li key={key}>{children}</li>;
    
    case 'horizontalRule':
        return <hr key={key} className="my-6 border-foreground/20" />

    case 'text':
      let textElement: React.ReactNode = node.text;
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          if (mark.type === 'bold') {
            textElement = <strong>{textElement}</strong>;
          }
          if (mark.type === 'italic') {
            textElement = <em>{textElement}</em>;
          }
          if (mark.type === 'link' && mark.attrs?.href) {
            textElement = (
              <a 
                href={mark.attrs.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline font-semibold"
              >
                {textElement}
              </a>
            );
          }
          // Add more marks like code, underline, etc. if needed
        });
      }
      return <React.Fragment key={key}>{textElement}</React.Fragment>; // Use Fragment for text nodes

    default:
      console.warn("Unsupported rich text node type:", node.type);
      return null;
  }
};

const renderRichText = (contentJson: any): React.ReactNode => {
  if (!contentJson || typeof contentJson !== 'object') {
    if (typeof contentJson === 'string' && contentJson.trim() !== ''){
        // Fallback for plain string content
        return <p className="text-foreground/90 leading-relaxed mb-4">{contentJson}</p>;
    }
    return <p className="text-foreground/80 leading-relaxed">No detailed content available for this day. The AI tutor can help elaborate!</p>;
  }
  // Assuming contentJson is the root 'doc' node
  return renderNode(contentJson, 'doc-root'); 
};

export function ContentView({ day, curriculum, onDayCompletionUpdate }: ContentViewProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleMarkComplete = async () => {
    if (!day || !curriculum || day.completed || isCompleting) return;

    setIsCompleting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        toast.error("Authentication error. Please sign in again.");
        setIsCompleting(false);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/curricula/${curriculum.id}/days/${day.id}/complete`;
      
      await axios.post(apiUrl, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onDayCompletionUpdate(day.id, true);
      toast.success("Day marked as complete!");
    } catch (error: any) {
      console.error("Error marking day complete:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to mark day as complete.";
      toast.error(errorMessage);
    } finally {
      setIsCompleting(false);
    }
  };

  if (!day) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background p-8 text-center">
        <BookOpenText className="w-20 h-20 text-primary mb-6" strokeWidth={1.5}/>
        <h2 className="text-2xl font-black text-foreground mb-2">Select a Day</h2>
        <p className="text-lg text-foreground/70 font-medium">
          Choose a day from the Curriculum Explorer to view its content.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Day header */}
        <div className="mb-10 pb-6 border-b-2 border-foreground/10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-4xl font-black text-foreground leading-tight">
                Day {day.day_number}: {day.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-shrink-0">
              <Button size="sm" variant="outline" className="bg-card font-black">
                <BookmarkPlus className="mr-2" />
                Save
              </Button>
              <Button 
                size="sm" 
                className="font-black"
                onClick={handleMarkComplete}
                disabled={day.completed || isCompleting}
              >
                {isCompleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : day.completed ? (
                  <CheckCircle2 className="mr-2" />
                ) : (
                  <CheckCircle2 className="mr-2" />
                )}
                {isCompleting ? "Completing..." : day.completed ? "Completed" : "Mark Complete"}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-foreground/70 font-bold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 stroke-[2.5]" />
              {day.estimated_hours || 1} hour{day.estimated_hours === 1 ? '' : 's'}
            </span>
            <span className="text-foreground/30">•</span>
            <span className="font-black capitalize">{curriculum?.difficulty_level || 'Intermediate'}</span>
          </div>
        </div>

        {/* Main content card */}
        <div className="bg-card rounded-lg border-4 border-foreground neo-brutal-shadow-lg p-8 mb-10 min-h-[300px]">
          {renderRichText(day.content)}
          {/* Fallback for when day.content might be a simple string (old data) or truly undefined */}
          {(typeof day.content === 'string' && day.content.trim() !== '') && 
            ! (day.content.startsWith('{') && day.content.endsWith('}')) && /* Crude check if it's not JSON-like */
            <p className="text-foreground/90 leading-relaxed mb-4">{day.content}</p>}
        </div>

        {/* Resources section card */}
        {day.resources && day.resources.length > 0 && (
          <div className="bg-card rounded-lg border-4 border-foreground neo-brutal-shadow-lg p-8 mb-10">
            <h2 className="text-2xl font-black text-foreground mb-6 border-b-2 border-foreground/10 pb-3">Additional Resources</h2>
            <div className="space-y-4">
              {day.resources.map((resource: any, index: number) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-background rounded-md border-2 border-foreground neo-brutal-shadow-sm p-4 group transition-all hover:neo-brutal-shadow hover:-translate-x-1 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-primary group-hover:underline">
                      {resource.title}
                    </h3>
                    <ExternalLink className="w-5 h-5 text-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                  {resource.description && (
                    <p className="text-sm text-foreground/70 mt-1 font-medium">{resource.description}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Practice section card */}
        <div className="bg-primary rounded-lg border-4 border-foreground neo-brutal-shadow-lg p-8 text-center">
          <Sparkles className="w-12 h-12 text-primary-foreground mx-auto mb-4" strokeWidth={1.5}/>
          <h2 className="text-3xl font-black text-primary-foreground mb-3">Ready to Practice?</h2>
          <p className="text-lg font-bold text-primary-foreground/80 mb-6">
            Test your understanding with AI-generated practice problems tailored to today's content.
          </p>
          <Button variant="secondary" size="lg" className="font-black text-lg px-10 border-2 border-foreground">
            Start Practice Session
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
} 