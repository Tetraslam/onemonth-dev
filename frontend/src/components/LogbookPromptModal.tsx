import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Sparkles, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface LogbookPromptModalProps {
  projectTitle: string
  projectData: {
    title: string
    description: string
    objectives: string[]
    requirements: string[]
    deliverables: string[]
    evaluation_criteria: string[]
  }
  onClose: () => void
  onSelectPrompt: (prompt: string) => void
}

interface Prompt {
  title: string
  template: string
}

export function LogbookPromptModal({ projectTitle, projectData, onClose, onSelectPrompt }: LogbookPromptModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const prompts: Prompt[] = [
    {
      title: "Project Overview & Planning",
      template: `## Project: ${projectData.title}

### What I'm Building
[Describe your project in your own words]

### My Approach
[How do you plan to tackle this project?]

### Key Features I Want to Include
- 
- 
- 

### Timeline
[Break down your work plan]`
    },
    {
      title: "Technical Implementation",
      template: `## ${projectData.title} - Technical Details

### Technologies/Tools Used
- 
- 

### Code Architecture
[Describe your project structure]

### Key Functions/Components
\`\`\`
[Share important code snippets]
\`\`\`

### Challenges Faced
1. 
2. 

### Solutions Found
1. 
2. `
    },
    {
      title: "Learning Reflection",
      template: `## Project Reflection: ${projectData.title}

### New Concepts I Applied
- 
- 

### Skills I Developed
- Technical: 
- Problem-solving: 
- Other: 

### What Went Well
- 
- 

### What I Would Do Differently
- 
- 

### Future Improvements
- 
- `
    },
    {
      title: "Project Showcase",
      template: `## ${projectData.title} - Project Showcase

### Final Result
[Describe what you built]

### Demo/Screenshots
[Add any visuals or links]

### How It Works
1. 
2. 
3. 

### Meeting the Requirements
${projectData.requirements.map((req, i) => `- ✓ ${req}: [How you met this]`).join('\n')}

### Deliverables Completed
${projectData.deliverables.map((del, i) => `- ✓ ${del}`).join('\n')}

### Self-Evaluation
${projectData.evaluation_criteria.map((crit, i) => `- ${crit}: [Your assessment]`).join('\n')}`
    },
    {
      title: "Debug & Problem-Solving Log",
      template: `## Debugging Session: ${projectData.title}

### Issue Encountered
[Describe the problem]

### Error Messages/Symptoms
\`\`\`
[Paste any error messages]
\`\`\`

### Debugging Steps Taken
1. 
2. 
3. 

### Solution Found
[What fixed it?]

### Lessons Learned
[What will you remember for next time?]`
    }
  ]

  const handleCopy = async (prompt: string, index: number) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedIndex(index)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      toast.error("Failed to copy")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg border-4 border-foreground shadow-[8px_8px_0_0_rgb(0,0,0)] max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b-2 border-foreground flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">Logbook Prompts for Your Project</h2>
            <p className="text-muted-foreground mt-1">Choose a template to document your {projectTitle} progress</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid gap-4">
            {prompts.map((prompt, index) => (
              <Card key={index} className="p-6 border-2 border-foreground hover:shadow-[4px_4px_0_0_rgb(0,0,0)] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    {prompt.title}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(prompt.template, index)}
                    >
                      {copiedIndex === index ? "Copied!" : <><Copy className="w-4 h-4 mr-1" /> Copy</>}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onSelectPrompt(prompt.template)}
                    >
                      Choose
                    </Button>
                  </div>
                </div>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted p-4 rounded-md max-h-40 overflow-y-auto">
                  {prompt.template}
                </pre>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 