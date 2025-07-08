import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Clock, ExternalLink, BookmarkPlus, BookOpenText, Sparkles, Loader2, Copy, Edit, Save, X, RefreshCw, ArrowLeft, Brain, NotebookPen } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { PracticeProblems } from '@/components/PracticeProblems'
import { PracticeHistory } from '@/components/PracticeHistory'
import { LogbookPromptModal } from '@/components/LogbookPromptModal'
import { PaywallGate } from '@/components/PaywallGate'
import { useSubscribeModal } from '@/stores/useSubscribeModal'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import SubscribeDialog from '@/components/SubscribeDialog'

interface Day {
  id: string;
  day_number: number;
  title: string;
  content: any; 
  resources: any[];
  estimated_hours?: number;
  completed?: boolean;
  is_project_day?: boolean;
  project_data?: {
    title: string;
    description: string;
    objectives: string[];
    requirements: string[];
    deliverables: string[];
    evaluation_criteria: string[];
  };
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
  onDayUpdate?: (dayId: string, updates: Partial<Day>) => void;
}

const CodeBlock: React.FC<{ language?: string; children: React.ReactNode }> = ({ language, children }) => {
  const [isCopied, setIsCopied] = useState(false)
  const textToCopy = React.Children.toArray(children).join('')

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setIsCopied(false), 2000)
    }).catch(err => {
      console.error('Failed to copy text: ', err)
      toast.error("Failed to copy.")
    });
  };

  return (
    <div className="relative my-4 rounded-md border-2 border-foreground bg-muted font-mono text-sm neo-brutal-shadow-sm">
      <div className="flex items-center justify-between px-4 py-1 border-b-2 border-foreground/10">
        <span className="text-xs font-bold text-muted-foreground">{language || 'code'}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopy}
          title="Copy code"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto"><code>{children}</code></pre>
    </div>
  )
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
      return <ul key={key} className="list-disc list-inside space-y-2 mb-4 pl-6 text-foreground/90">{children}</ul>;

    case 'orderedList':
      return <ol key={key} className="list-decimal list-inside space-y-2 mb-4 pl-6 text-foreground/90">{children}</ol>;

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
                className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
              >
                {textElement}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            );
          }
          if (mark.type === 'code') {
            textElement = <code className="bg-muted text-foreground font-mono font-bold px-1.5 py-0.5 rounded-md border border-border">{textElement}</code>
          }
          // Add more marks like underline, etc. if needed
        });
      }
      return <React.Fragment key={key}>{textElement}</React.Fragment>; // Use Fragment for text nodes

    case 'codeBlock':
      return <CodeBlock key={key} language={node.attrs?.language}>{children}</CodeBlock>;
      
    case 'blockquote':
      return <blockquote key={key} className="pl-4 border-l-4 border-primary bg-muted text-muted-foreground italic my-4">{children}</blockquote>

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

// Convert TipTap JSON to Markdown for editing
const jsonToMarkdown = (content: any): string => {
  if (typeof content === 'string') return content;
  if (!content || !content.content) return '';
  
  let markdown = '';
  
  const processNode = (node: any, depth = 0, orderNumber?: number): string => {
    let result = '';
    
    switch (node.type) {
      case 'doc':
        if (node.content) {
          result = node.content.map((n: any) => processNode(n, depth)).join('');
        }
        break;
      case 'paragraph':
        if (node.content) {
          result = node.content.map((n: any) => processNode(n, depth)).join('') + '\n\n';
        } else {
          result = '\n\n';
        }
        break;
      case 'heading':
        const level = node.attrs?.level || 1;
        const prefix = '#'.repeat(level) + ' ';
        if (node.content) {
          result = prefix + node.content.map((n: any) => processNode(n, depth)).join('') + '\n\n';
        }
        break;
      case 'bulletList':
        if (node.content) {
          result = node.content.map((n: any) => processNode(n, depth)).join('') + '\n';
        }
        break;
      case 'orderedList':
        if (node.content) {
          result = node.content.map((n: any, i: number) => processNode(n, depth, i + 1)).join('') + '\n';
        }
        break;
      case 'listItem':
        const bullet = orderNumber ? `${orderNumber}. ` : '- ';
        if (node.content) {
          result = bullet + node.content.map((n: any) => processNode(n, 0)).join('').trim() + '\n';
        }
        break;
      case 'text':
        result = node.text || '';
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            if (mark.type === 'bold') result = `**${result}**`;
            if (mark.type === 'italic') result = `*${result}*`;
            if (mark.type === 'code') result = `\`${result}\``;
            if (mark.type === 'link') result = `[${result}](${mark.attrs.href})`;
          });
        }
        break;
      case 'codeBlock':
        const lang = node.attrs?.language || '';
        const code = node.content?.map((n: any) => n.text).join('') || '';
        result = `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
        break;
      default:
        if (node.content) {
          result = node.content.map((n: any) => processNode(n, depth)).join('');
        }
    }
    
    return result;
  };
  
  return processNode(content).trim();
};

// Convert Markdown back to TipTap JSON
const markdownToJson = (markdown: string): any => {
  const lines = markdown.split('\n');
  const content: any[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Headings
    if (line.startsWith('#')) {
      const match = line.match(/^(#+)\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        content.push({
          type: 'heading',
          attrs: { level },
          content: [{ type: 'text', text }]
        });
        i++;
        continue;
      }
    }
    
    // Code blocks
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      content.push({
        type: 'codeBlock',
        attrs: { language: lang || null },
        content: [{ type: 'text', text: codeLines.join('\n') }]
      });
      i++;
      continue;
    }
    
    // Bullet lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: any[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        const itemText = lines[i].slice(2);
        listItems.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineMarks(itemText)
          }]
        });
        i++;
      }
      content.push({
        type: 'bulletList',
        content: listItems
      });
      continue;
    }
    
    // Ordered lists
    if (/^\d+\.\s/.test(line)) {
      const listItems: any[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s/, '');
        listItems.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineMarks(itemText)
          }]
        });
        i++;
      }
      content.push({
        type: 'orderedList',
        content: listItems
      });
      continue;
    }
    
    // Horizontal rule
    if (line === '---' || line === '***' || line === '___') {
      content.push({ type: 'horizontalRule' });
      i++;
      continue;
    }
    
    // Regular paragraphs
    if (line.trim()) {
      content.push({
        type: 'paragraph',
        content: parseInlineMarks(line)
      });
    }
    
    i++;
  }
  
  // Helper function to parse inline marks
  function parseInlineMarks(text: string): any[] {
    const nodes: any[] = [];
    let remaining = text;
    
    while (remaining) {
      // Bold
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      if (boldMatch) {
        const before = remaining.slice(0, boldMatch.index);
        if (before) nodes.push({ type: 'text', text: before });
        nodes.push({
          type: 'text',
          text: boldMatch[1],
          marks: [{ type: 'bold' }]
        });
        remaining = remaining.slice(boldMatch.index! + boldMatch[0].length);
        continue;
      }
      
      // Italic
      const italicMatch = remaining.match(/\*([^*]+)\*/);
      if (italicMatch) {
        const before = remaining.slice(0, italicMatch.index);
        if (before) nodes.push({ type: 'text', text: before });
        nodes.push({
          type: 'text',
          text: italicMatch[1],
          marks: [{ type: 'italic' }]
        });
        remaining = remaining.slice(italicMatch.index! + italicMatch[0].length);
        continue;
      }
      
      // Code
      const codeMatch = remaining.match(/`([^`]+)`/);
      if (codeMatch) {
        const before = remaining.slice(0, codeMatch.index);
        if (before) nodes.push({ type: 'text', text: before });
        nodes.push({
          type: 'text',
          text: codeMatch[1],
          marks: [{ type: 'code' }]
        });
        remaining = remaining.slice(codeMatch.index! + codeMatch[0].length);
        continue;
      }
      
      // Link
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const before = remaining.slice(0, linkMatch.index);
        if (before) nodes.push({ type: 'text', text: before });
        nodes.push({
          type: 'text',
          text: linkMatch[1],
          marks: [{ type: 'link', attrs: { href: linkMatch[2] } }]
        });
        remaining = remaining.slice(linkMatch.index! + linkMatch[0].length);
        continue;
      }
      
      // No more marks, add remaining text
      nodes.push({ type: 'text', text: remaining });
      break;
    }
    
    return nodes.length > 0 ? nodes : [{ type: 'text', text: '' }];
  }
  
  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }]
  };
};

export function ContentView({ day, curriculum, onDayCompletionUpdate, onDayUpdate }: ContentViewProps) {
  const navigate = useNavigate();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegeneratePrompt, setShowRegeneratePrompt] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');
  const [showPractice, setShowPractice] = useState(false);
  const [showLogbookPrompts, setShowLogbookPrompts] = useState(false);
  const { open } = useSubscribeModal()
  const { isSubscribed } = useSubscriptionStore()

  // Initialize edit content when day changes or edit mode starts
  useEffect(() => {
    if (day && isEditing) {
      setEditedContent(jsonToMarkdown(day.content));
      setEditedTitle(day.title);
    }
  }, [day, isEditing]);

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
      
      await api.post(apiUrl, {}, {
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

  const handleSave = async () => {
    if (!day || !curriculum || !editedContent.trim()) return;

    setIsSaving(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      // Convert markdown back to TipTap JSON
      const contentUpdate = {
        content: markdownToJson(editedContent),
        title: editedTitle
      };

      await api.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/curricula/${curriculum.id}/days/${day.id}`,
        contentUpdate,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (onDayUpdate) {
        onDayUpdate(day.id, contentUpdate);
      }

      toast.success("Day updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving day:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!day || !curriculum || !regeneratePrompt.trim()) return;

    setIsRegenerating(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await api.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/curricula/${curriculum.id}/days/${day.id}/regenerate`,
        { improvement_prompt: regeneratePrompt },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (onDayUpdate && response.data.data) {
        onDayUpdate(day.id, response.data.data);
      }

      toast.success("Day regenerated successfully!");
      setShowRegeneratePrompt(false);
      setRegeneratePrompt('');
    } catch (error) {
      console.error("Error regenerating day:", error);
      toast.error("Failed to regenerate day");
    } finally {
      setIsRegenerating(false);
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
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-4xl font-black text-foreground leading-tight bg-transparent border-b-2 border-primary focus:outline-none w-full"
                />
              ) : (
                <h1 className="text-4xl font-black text-foreground leading-tight">
                  Day {day.day_number}: {day.title}
                </h1>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-shrink-0">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedContent('');
                      setEditedTitle('');
                    }}
                    disabled={isSaving}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
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
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-foreground/70 font-bold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 stroke-[2.5]" />
              {day.estimated_hours || 1} hour{day.estimated_hours === 1 ? '' : 's'}
            </span>
            <span className="text-foreground/30">•</span>
            <span className="font-black capitalize">{curriculum?.difficulty_level || 'Intermediate'}</span>
            {!isEditing && (
              <>
                <span className="text-foreground/30">•</span>
                <button
                  onClick={() => setShowRegeneratePrompt(true)}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate with AI
                </button>
              </>
            )}
          </div>
        </div>

        {/* Project Day Special Display */}
        {day.is_project_day && day.project_data && !isEditing && (
          <div className="bg-primary/10 rounded-lg border-4 border-primary neo-brutal-shadow-lg p-8 mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary text-primary-foreground p-3 rounded-lg border-2 border-foreground">
                <Brain className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">Project Day</h2>
                <p className="text-lg font-bold text-primary">{day.project_data.title}</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">Description</h3>
                <p className="text-foreground/80">{day.project_data.description}</p>
              </div>
              
              {day.project_data.objectives && day.project_data.objectives.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Learning Objectives</h3>
                  <ul className="list-disc list-inside space-y-1 text-foreground/80">
                    {day.project_data.objectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {day.project_data.requirements && day.project_data.requirements.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Requirements</h3>
                  <ul className="list-disc list-inside space-y-1 text-foreground/80">
                    {day.project_data.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {day.project_data.deliverables && day.project_data.deliverables.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Deliverables</h3>
                  <ul className="list-disc list-inside space-y-1 text-foreground/80">
                    {day.project_data.deliverables.map((del, i) => (
                      <li key={i}>{del}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {day.project_data.evaluation_criteria && day.project_data.evaluation_criteria.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Evaluation Criteria</h3>
                  <ul className="list-disc list-inside space-y-1 text-foreground/80">
                    {day.project_data.evaluation_criteria.map((crit, i) => (
                      <li key={i}>{crit}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t-2 border-primary/20">
              <Button
                onClick={() => setShowLogbookPrompts(true)}
                className="w-full"
              >
                <NotebookPen className="w-5 h-5 mr-2" />
                Get Logbook Prompts for This Project
              </Button>
            </div>
          </div>
        )}

        {/* Main content card */}
        <div className="bg-card rounded-lg border-4 border-foreground neo-brutal-shadow-lg p-8 mb-10 min-h-[300px]">
          {isEditing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm resize-none"
              placeholder="Enter your content in Markdown format..."
            />
          ) : (
            <>
              {renderRichText(day.content)}
              {(typeof day.content === 'string' && day.content.trim() !== '') && 
                ! (day.content.startsWith('{') && day.content.endsWith('}')) && 
                <p className="text-foreground/90 leading-relaxed mb-4">{day.content}</p>}
            </>
          )}
        </div>

        {/* Regenerate prompt modal */}
        {showRegeneratePrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg border-4 border-foreground shadow-[8px_8px_0_0_rgb(0,0,0)] p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Regenerate Day Content</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tell the AI how you'd like to improve this day's content:
              </p>
              <Textarea
                value={regeneratePrompt}
                onChange={(e) => setRegeneratePrompt(e.target.value)}
                placeholder="e.g., Make it more practical with real-world examples, add more exercises, explain concepts more clearly..."
                className="min-h-[100px] mb-4"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRegeneratePrompt(false);
                    setRegeneratePrompt('');
                  }}
                  disabled={isRegenerating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerate}
                  disabled={!regeneratePrompt.trim() || isRegenerating}
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Resources section card */}
        {!isEditing && day.resources && day.resources.length > 0 && (
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
        {!isEditing && (
          <div className="space-y-6">
            <div className="bg-primary rounded-lg border-4 border-foreground neo-brutal-shadow-lg p-8 text-center">
              <Sparkles className="w-12 h-12 text-primary-foreground mx-auto mb-4" strokeWidth={1.5}/>
              <h2 className="text-3xl font-black text-primary-foreground mb-3">Ready to Practice?</h2>
              <p className="text-lg font-bold text-primary-foreground/80 mb-6">
                Test your understanding with AI-generated practice problems tailored to today's content.
              </p>
              <Button 
                variant="secondary" 
                size="lg" 
                className="font-black text-lg px-10 border-2 border-foreground"
                onClick={() => isSubscribed() ? setShowPractice(true) : open()}
              >
                <Brain className="w-5 h-5 mr-2" />
                Start Practice Session
              </Button>
            </div>
            
            {/* Practice History - Only show if there are sessions for this day */}
            <PracticeHistory curriculumId={curriculum?.id} dayId={day.id} />
          </div>
        )}

        {/* Practice Problems Modal */}
        {showPractice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg border-4 border-foreground neo-brutal-shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b-2 border-foreground flex items-center justify-between">
                <h2 className="text-2xl font-black">Practice Problems</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPractice(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                <PaywallGate feature="practice problems">
                  <PracticeProblems 
                    curriculum={curriculum}
                    currentDay={day}
                    onClose={() => setShowPractice(false)}
                  />
                </PaywallGate>
              </div>
            </div>
          </div>
        )}

        {/* Logbook Prompts Modal */}
        {showLogbookPrompts && day.is_project_day && day.project_data && (
          <LogbookPromptModal
            projectTitle={day.title}
            projectData={day.project_data}
            onClose={() => setShowLogbookPrompts(false)}
            onSelectPrompt={(prompt) => {
              // Navigate to logbook page with the prompt
              navigate('/logbook', { state: { newEntryPrompt: prompt } })
            }}
          />
        )}
      </div>
    </ScrollArea>
  )
} 