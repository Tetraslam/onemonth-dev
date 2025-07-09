import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { trackInternalNavigation, trackFunnelStep, trackReferral } from '@/lib/utils'
import { ArrowRight, CheckCircle, BookOpen, Zap, Target, Sparkles, Star, Rocket, Brain, Trophy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Typed from 'typed.js'

export function LandingPage() {
  const navigate = useNavigate()
  const el = useRef<HTMLSpanElement>(null)
  const typed = useRef<Typed | null>(null)
  const [currentExample, setCurrentExample] = useState({
    description: "You've bookmarked 47 tutorials. Bought 3 Udemy courses. Asked ChatGPT the same question 12 times.",
    stillHavent: "Still haven't built anything.",
    progress: {
      title: "From \"What's React?\" to Hired in 30 Days",
      weeks: [
        "Week 1: Built first component",
        "Week 2: Deployed full app", 
        "Week 3: Added to portfolio",
        "Week 4: Got job interviews"
      ],
      testimonial: "I tried learning NextJS 4 times before. This was the first time I actually built something real.",
      author: "Alex, now Frontend Dev at Instagram"
    }
  })
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [currentLearningCard, setCurrentLearningCard] = useState(0);

  const demographics = [
    { 
      title: "anything",
      watching: "Watching",
      shipping: "Shipping",
      cardTitle: "Full-Stack Development",
      cardDescription: "Build real apps that people actually use",
      cardIcon: "💻",
      cardBg: "bg-card"
    },
    { 
      title: "React", 
      watching: "Watching",
      shipping: "Shipping",
      cardTitle: "Full-Stack Development",
      cardDescription: "Build real apps that people actually use",
      cardIcon: "💻",
      cardBg: "bg-card"
    },
    { 
      title: "Calculus", 
      watching: "Cramming",
      shipping: "Acing Exams",
      cardTitle: "Academic Excellence", 
      cardDescription: "Master any subject with personalized lessons",
      cardIcon: "📚",
      cardBg: "bg-card"
    },
    { 
      title: "Spanish", 
      watching: "Struggling",
      shipping: "Speaking Fluently",
      cardTitle: "Language Mastery",
      cardDescription: "From beginner to conversational in weeks",
      cardIcon: "🌍",
      cardBg: "bg-card"
    },
    { 
      title: "Guitar", 
      watching: "Dreaming",
      shipping: "Playing",
      cardTitle: "Musical Skills",
      cardDescription: "From zero to performing your favorite songs",
      cardIcon: "🎸",
      cardBg: "bg-card"
    },
    {
      title: "Machine Learning",
      watching: "Reading Papers",
      shipping: "Building Models",
      cardTitle: "AI & Data Science",
      cardDescription: "From theory to deployed ML applications",
      cardIcon: "🤖",
      cardBg: "bg-card"
    }
  ];

  const learningCards = [
    {
      emoji: "👩‍💻",
      title: "Full-Stack Dev",
      description: "React, Node.js, databases, deployment",
      person: "Sarah, 24",
      color: "primary"
    },
    {
      emoji: "🧮",
      title: "AP Calculus",
      description: "Ace that exam with personalized tutoring",
      person: "Jake, 17",
      color: "secondary"
    },
    {
      emoji: "🍰",
      title: "French Pastries",
      description: "Master croissants, macarons, éclairs",
      person: "Maria, 45",
      color: "accent"
    },
    {
      emoji: "🎸",
      title: "Guitar Mastery",
      description: "From chords to shredding solos",
      person: "Alex, 31",
      color: "primary"
    },
    {
      emoji: "🏛️",
      title: "Ancient History",
      description: "Rome, Greece, Egypt - bring it to life",
      person: "Prof. Chen, 52",
      color: "secondary"
    },
    {
      emoji: "💃",
      title: "Salsa Dancing",
      description: "Step-by-step from basics to pro",
      person: "Isabella, 28",
      color: "accent"
    }
  ];

  useEffect(() => {
    // Track landing page visit
    trackFunnelStep('landing')
    // Track referral if present
    trackReferral()

    const examples = [
      {
        description: "You've bookmarked 47 tutorials. Bought 3 Udemy courses. Asked ChatGPT the same question 12 times.",
        stillHavent: "Still haven't built anything.",
        progress: {
          title: "From \"What's React?\" to Hired in 30 Days",
          weeks: [
            "Week 1: Built first component",
            "Week 2: Deployed full app", 
            "Week 3: Added to portfolio",
            "Week 4: Got job interviews"
          ],
          testimonial: "I tried learning NextJS 4 times before. This was the first time I actually built something real.",
          author: "Alex, now Frontend Dev at Instagram"
        }
      },
      {
        description: "You've watched 23 Khan Academy videos. Read the textbook twice. Still bombing practice tests.",
        stillHavent: "Still not ready for the AP exam.",
        progress: {
          title: "From \"Failing Calc\" to 5 on AP Exam",
          weeks: [
            "Week 1: Finally understood limits",
            "Week 2: Derivatives clicked", 
            "Week 3: Aced practice test",
            "Week 4: Confident for exam"
          ],
          testimonial: "I went from a C in calc BC to getting a 5 on the AP exam. The daily practice problems saved me.",
          author: "Sarah, now going to Cornell"
        }
      },
      {
        description: "You've downloaded 5 language apps. Tried Duolingo for 2 weeks. Can still only say 'hello'.",
        stillHavent: "Still can't hold a conversation.",
        progress: {
          title: "From \"Hola\" to Conversational in 30 Days",
          weeks: [
            "Week 1: Basic phrases down",
            "Week 2: Having simple chats", 
            "Week 3: Watching shows without subs",
            "Week 4: Video calling native speakers"
          ],
          testimonial: "Other apps teach you words. This taught me how to actually speak Spanish.",
          author: "James Park, Digital Nomad"
        }
      },
      {
        description: "You've saved 15 guitar tabs. Watched 20 YouTube tutorials. Your guitar is still collecting dust.",
        stillHavent: "Still can't play a full song.",
        progress: {
          title: "From \"Can't Hold a Pick\" to Playing Live",
          weeks: [
            "Week 1: Learned basic chords",
            "Week 2: First complete song", 
            "Week 3: Playing with backing tracks",
            "Week 4: Performed at open mic"
          ],
          testimonial: "Finally stopped watching and started playing. Best decision I ever made.",
          author: "Marcus Johnson, Weekend Musician"
        }
      },
      {
        description: "You've read 12 'Learn ML' articles. Copied 20 Kaggle notebooks. Still don't understand anything.",
        stillHavent: "Still can't build your own models.",
        progress: {
          title: "From \"What's a Tensor?\" to ML Engineer",
          weeks: [
            "Week 1: Built first neural network",
            "Week 2: Training custom models", 
            "Week 3: Deployed to production",
            "Week 4: Contributing to open source"
          ],
          testimonial: "Finally understood the math AND the code. Now I'm building ML systems at work.",
          author: "Priya, ML Engineer at Tesla"
        }
      }
    ]

    let currentIndex = 0

    if (el.current) {
      typed.current = new Typed(el.current, {
        strings: demographics.map(d => d.title),
        typeSpeed: 50,
        backSpeed: 30,
        backDelay: 2000,
        loop: true,
        showCursor: false,
        onStringTyped: (arrayPos: number) => {
          // Update the current demographic index
          setCurrentDemoIndex(arrayPos)
          // Update example based on the subject
          if (arrayPos === 1) { // React
            setCurrentExample(examples[0])
          } else if (arrayPos === 2) { // Calculus
            setCurrentExample(examples[1])
          } else if (arrayPos === 3) { // Spanish
            setCurrentExample(examples[2])
          } else if (arrayPos === 4) { // Guitar
            setCurrentExample(examples[3])
          } else if (arrayPos === 5) { // Machine Learning
            setCurrentExample(examples[4])
          } else { // anything (default)
            setCurrentExample(examples[0])
          }
        }
      })

      return () => {
        typed.current?.destroy()
      }
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLearningCard((prev) => (prev + 1) % learningCards.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b-4 border-foreground bg-card neo-brutal-shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black">onemonth.dev</h1>
          <Button 
            onClick={() => {
              navigate(trackInternalNavigation('landing-nav', '/auth', 'get-started'))
            }} 
            className="font-black"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl lg:text-6xl xl:text-7xl font-black mb-6 leading-[1.1]">
                Learn <span ref={el} className="text-primary"></span> in 30 Days
              </h2>
              <div className="transition-all duration-500 ease-in-out min-h-[4rem] lg:min-h-[3.5rem]">
                <p className="text-xl lg:text-2xl font-bold mb-8 text-foreground/80">
                  {currentExample.description} <span className="text-primary">{currentExample.stillHavent}</span>
                </p>
              </div>
              <p className="text-lg font-bold mb-8 text-foreground/70">
                Stop watching tutorials. Start building real projects with AI-powered daily lessons.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={() => {
                    navigate(trackInternalNavigation('landing-hero', '/auth', 'start-today'))
                  }}
                  className="text-lg px-8 py-6 font-black"
                >
                  Start Today - $19.99/mo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => {
                    navigate(trackInternalNavigation('landing-hero', '/auth', 'see-examples'))
                  }}
                  className="text-lg px-8 py-6 font-black bg-card"
                >
                  See Real Examples
                </Button>
              </div>
              <p className="mt-4 text-sm font-bold text-foreground/60">
                Join 23 people who finally stopped procrastinating this month
              </p>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-lg border-4 border-foreground p-6 neo-brutal-shadow-lg transition-all duration-500 transform rotate-3 hover:rotate-2">
                <div className="mb-4">
                  <span className="text-sm font-bold text-foreground/60 uppercase tracking-wider">Real Student Progress</span>
                  <h3 className="font-black text-2xl mt-1">{currentExample.progress.title}</h3>
                </div>
                <div className="space-y-3">
                  {currentExample.progress.weeks.map((week, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{week}</span>
                      </div>
                      <div className="relative">
                        <div className="h-4 bg-white border-2 border-foreground rounded-full overflow-hidden shadow-[2px_2px_0_0_rgb(0,0,0,0.9)]">
                          <div 
                            className={`h-full border-r-2 border-foreground/20 transition-all duration-1000 ease-out ${
                              index === 0 ? 'bg-primary' :
                              index === 1 ? 'bg-secondary' :
                              index === 2 ? 'bg-accent' :
                              'bg-green-500'
                            }`}
                            style={{ 
                              width: `${(index + 1) * 25}%`,
                              animation: `slideIn ${0.5 + index * 0.2}s ease-out`
                            }}
                          ></div>
                        </div>
                  </div>
                  </div>
                  ))}
                  </div>
                <div className="mt-6 p-4 bg-primary rounded-md border-2 border-foreground neo-brutal-shadow">
                  <p className="font-bold text-sm text-foreground">"{currentExample.progress.testimonial}"</p>
                  <p className="font-black text-sm mt-2 text-foreground">- {currentExample.progress.author}</p>
                </div>
              </div>
              {/* Background decorative cards for depth */}
              <div className="absolute -bottom-2 -right-2 w-full h-full bg-secondary rounded-lg border-4 border-foreground -z-10 transform rotate-6"></div>
              <div className="absolute -bottom-4 -right-4 w-full h-full bg-accent rounded-lg border-4 border-foreground -z-20 transform rotate-9"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes Section */}
      <section className="container mx-auto px-4 lg:px-8 py-16">
        <h3 className="text-4xl lg:text-5xl font-black text-center mb-4">
          In 30 Days, Watch Your Friends Ask
        </h3>
        <h3 className="text-3xl lg:text-4xl font-black text-center mb-12 text-primary-outlined">
          "How Did You Learn That So Fast?"
        </h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-card rounded-lg border-4 border-foreground p-8 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="text-5xl font-black text-primary/20">01</div>
              <div className="bg-primary rounded-full p-4 border-2 border-foreground">
                <Rocket className="h-8 w-8 text-foreground" />
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-foreground/10 rounded px-2 py-1 text-xs font-bold">BEFORE</div>
                <span className="text-sm font-bold text-foreground/60 line-through">Tutorial Hell</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-primary rounded px-2 py-1 text-xs font-bold text-foreground">AFTER</div>
                <span className="text-sm font-black">Just Shipped It</span>
              </div>
            </div>
            
            <h4 className="text-xl font-black mb-3">Ship Real Projects</h4>
            <p className="font-medium text-foreground/70 text-sm mb-4">
              That side project? Live. That feature? Done. Muscle memory: activated.
            </p>
            
            <div className="flex items-center gap-2 pt-4 border-t border-foreground/10">
              <img src="/sarah.png" alt="Sarah" className="w-8 h-8 rounded-full border-2 border-foreground" />
              <div className="flex-1">
                <div className="text-xs font-bold text-foreground/60 italic">
                  "Week 3: first app deployed!" - Sarah
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border-4 border-foreground p-8 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="text-5xl font-black text-secondary/20">02</div>
              <div className="bg-secondary rounded-full p-4 border-2 border-foreground">
                <Brain className="h-8 w-8 text-foreground" />
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-foreground/10 rounded px-2 py-1 text-xs font-bold">BEFORE</div>
                <span className="text-sm font-bold text-foreground/60 line-through">I Think I Know</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-secondary rounded px-2 py-1 text-xs font-bold text-foreground">AFTER</div>
                <span className="text-sm font-black">Let Me Explain</span>
              </div>
            </div>
            
            <h4 className="text-xl font-black mb-3">Master Concepts</h4>
            <p className="font-medium text-foreground/70 text-sm mb-4">
              Be the go-to person. Understand the why, not just the how.
            </p>
            
            <div className="flex items-center gap-2 pt-4 border-t border-foreground/10">
              <img src="/mike.png" alt="Mike" className="w-8 h-8 rounded-full border-2 border-foreground" />
              <div className="flex-1">
                <div className="text-xs font-bold text-foreground/60 italic">
                  "Coworkers think I'm a genius now" - Mike
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border-4 border-foreground p-8 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="text-5xl font-black text-accent/20">03</div>
              <div className="bg-accent rounded-full p-4 border-2 border-foreground">
                <Trophy className="h-8 w-8 text-foreground" />
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-foreground/10 rounded px-2 py-1 text-xs font-bold">BEFORE</div>
                <span className="text-sm font-bold text-foreground/60 line-through">Maybe Someday</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-accent rounded px-2 py-1 text-xs font-bold text-foreground">AFTER</div>
                <span className="text-sm font-black">Check My GitHub</span>
              </div>
            </div>
            
            <h4 className="text-xl font-black mb-3">Build Your Portfolio</h4>
            <p className="font-medium text-foreground/70 text-sm mb-4">
              Real skills. Real projects. Real opportunities coming your way.
            </p>
            
            <div className="flex items-center gap-2 pt-4 border-t border-foreground/10">
              <img src="/alex.png" alt="Alex" className="w-8 h-8 rounded-full border-2 border-foreground" />
              <div className="flex-1">
                <div className="text-xs font-bold text-foreground/60 italic">
                  "3 interviews from my projects!" - Alex
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="max-w-4xl mx-auto mt-16 mb-12">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-4 border-dashed border-foreground/20"></div>
            </div>
            <div className="relative flex justify-between">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-background border-4 border-foreground rounded-full flex items-center justify-center font-black">
                  0
                </div>
                <span className="text-xs font-bold mt-2">Today</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-primary border-4 border-foreground rounded-full flex items-center justify-center font-black">
                  7
                </div>
                <span className="text-xs font-bold mt-2">First Win</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-secondary border-4 border-foreground rounded-full flex items-center justify-center font-black">
                  14
                </div>
                <span className="text-xs font-bold mt-2">Momentum</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-accent border-4 border-foreground rounded-full flex items-center justify-center font-black">
                  30
                </div>
                <span className="text-xs font-bold mt-2">Transformed</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xl font-bold text-foreground/70 mb-6">
            Join <span className="text-primary font-black">23 learners</span> who said "this month is different"—and were actually right.
          </p>
          <Button 
            size="lg" 
            onClick={() => {
              navigate(trackInternalNavigation('landing-results', '/auth', 'start-transformation'))
            }} 
            className="text-xl px-10 py-7 font-black"
          >
            Start Your 30-Day Transformation
            <ArrowRight className="ml-3 h-6 w-6" />
          </Button>
        </div>
      </section>

      {/* What Can You Learn Section */}
      <section className="container mx-auto px-4 lg:px-8 py-16 border-y-4 border-foreground overflow-hidden">
        <h3 className="text-4xl lg:text-5xl font-black text-center mb-4">
          Learn{' '}
          <span className="relative inline-block">
            <span className="absolute inset-0 bg-primary/40 -skew-x-12 scale-x-110 scale-y-75 translate-y-1"></span>
            <span className="relative">Literally Anything</span>
          </span>
        </h3>
        <p className="text-xl font-bold text-center text-foreground/70 mb-12">
          From quantum physics to sourdough baking. If you can Google it, we can teach it.
        </p>

        {/* Grid of Learning Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Tech & Programming */}
          <div className="group relative">
            <div className="bg-white rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3">💻</div>
              <h4 className="font-black text-lg mb-1">Full-Stack Dev</h4>
              <p className="text-sm font-medium text-foreground/70">React, APIs, Databases</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary"></div>
                <span className="text-xs font-bold">Sarah, 24</span>
              </div>
            </div>
          </div>

          {/* Academic */}
          <div className="group relative">
            <div className="bg-white rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3">🧮</div>
              <h4 className="font-black text-lg mb-1">AP Calculus</h4>
              <p className="text-sm font-medium text-foreground/70">Ace that exam</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary"></div>
                <span className="text-xs font-bold">Jake, 17</span>
              </div>
            </div>
          </div>

          {/* Creative */}
          <div className="group relative">
            <div className="bg-white rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3">🎨</div>
              <h4 className="font-black text-lg mb-1">Digital Art</h4>
              <p className="text-sm font-medium text-foreground/70">Procreate mastery</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent"></div>
                <span className="text-xs font-bold">Luna, 26</span>
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="group relative">
            <div className="bg-white rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3">🌍</div>
              <h4 className="font-black text-lg mb-1">Spanish</h4>
              <p className="text-sm font-medium text-foreground/70">Fluent in 30 days</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary"></div>
                <span className="text-xs font-bold">David, 22</span>
              </div>
            </div>
          </div>

          {/* Music */}
          <div className="group relative">
            <div className="bg-white rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3">🎸</div>
              <h4 className="font-black text-lg mb-1">Guitar</h4>
              <p className="text-sm font-medium text-foreground/70">Zero to hero</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary"></div>
                <span className="text-xs font-bold">Alex, 31</span>
              </div>
            </div>
          </div>

          {/* Cooking */}
          <div className="group relative">
            <div className="bg-white rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3">🍰</div>
              <h4 className="font-black text-lg mb-1">Baking</h4>
              <p className="text-sm font-medium text-foreground/70">French pastries</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent"></div>
                <span className="text-xs font-bold">Maria, 45</span>
              </div>
            </div>
          </div>

          {/* Science */}
          <div className="group relative">
            <div className="bg-white rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3">🧬</div>
              <h4 className="font-black text-lg mb-1">Biology</h4>
              <p className="text-sm font-medium text-foreground/70">AP & beyond</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary"></div>
                <span className="text-xs font-bold">Dr. Kim, 34</span>
              </div>
            </div>
          </div>

          {/* Business */}
          <div className="group relative">
            <div className="bg-white rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3">📈</div>
              <h4 className="font-black text-lg mb-1">Marketing</h4>
              <p className="text-sm font-medium text-foreground/70">Growth hacking</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary"></div>
                <span className="text-xs font-bold">Raj, 28</span>
              </div>
            </div>
          </div>

          {/* Fitness */}
          <div className="group relative">
            <div className="bg-white rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3">🧘‍♀️</div>
              <h4 className="font-black text-lg mb-1">Yoga</h4>
              <p className="text-sm font-medium text-foreground/70">Mind & body</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent"></div>
                <span className="text-xs font-bold">Priya, 38</span>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="group relative">
            <div className="bg-white rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3">🏛️</div>
              <h4 className="font-black text-lg mb-1">History</h4>
              <p className="text-sm font-medium text-foreground/70">Ancient civilizations</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary"></div>
                <span className="text-xs font-bold">Prof. Chen, 52</span>
              </div>
            </div>
          </div>

          {/* Photography */}
          <div className="group relative">
            <div className="bg-white rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3">📸</div>
              <h4 className="font-black text-lg mb-1">Photography</h4>
              <p className="text-sm font-medium text-foreground/70">Pro techniques</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary"></div>
                <span className="text-xs font-bold">Maya, 29</span>
              </div>
            </div>
          </div>

          {/* More */}
          <div className="group relative">
            <div className="bg-foreground rounded-lg border-3 border-foreground p-6 h-full neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(0,0,0,0.9)] transition-all cursor-pointer">
              <div className="text-4xl mb-3 brightness-0 invert">✨</div>
              <h4 className="font-black text-lg mb-1 text-background">And More...</h4>
              <p className="text-sm font-medium text-background/80">Literally anything</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-background"></div>
                <span className="text-xs font-bold text-background">You!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex justify-center gap-8 mt-16">
          <div className="text-center">
            <div className="text-4xl font-black text-primary">∞</div>
            <div className="text-sm font-bold text-foreground/70">Topics</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-secondary">24/7</div>
            <div className="text-sm font-bold text-foreground/70">Available</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-accent">1-on-1</div>
            <div className="text-sm font-bold text-foreground/70">Personalized</div>
          </div>
        </div>
      </section>

      {/* Why Not Just Use ChatGPT? */}
      <section className="container mx-auto px-4 lg:px-8 py-16 bg-card border-y-4 border-foreground">
        <h3 className="text-4xl lg:text-5xl font-black text-center mb-12">
          "Why Not Just Use ChatGPT?"
        </h3>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-card rounded-lg border-4 border-foreground p-8 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all">
              <div className="text-center">
                <div className="text-6xl mb-4">😵</div>
                <h4 className="text-2xl font-black mb-3">
                  <span className="relative inline-block">
                    <span className="absolute inset-0 bg-red-400/40 -skew-x-12 scale-x-110 scale-y-75 translate-y-1"></span>
                    <span className="relative">ChatGPT Alone</span>
                  </span>
                </h4>
                <p className="font-bold text-foreground/80">
                  "Explain X" → Copy/Paste → Works! → Next day: "Wait, how did that work?" → 
                  <span className="text-accent font-black">Start Over</span>
                </p>
              </div>
            </div>
            
            <div className="bg-card rounded-lg border-4 border-foreground p-8 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all">
              <div className="text-center">
                <div className="text-6xl mb-4">🚀</div>
                <h4 className="text-2xl font-black mb-3">
                  <span className="relative inline-block">
                    <span className="absolute inset-0 bg-green-400/40 -skew-x-12 scale-x-110 scale-y-75 translate-y-1"></span>
                    <span className="relative">With Onemonth.dev</span> 
                  </span>
                </h4>
                <p className="font-bold text-foreground/80">
                  Day 1 → Day 2 → Build → Practice → Remember → 
                  <span className="text-primary font-black">Ship It!</span>
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-primary rounded-lg border-4 border-foreground p-8 neo-brutal-shadow-lg text-center">
            <p className="text-xl font-black text-primary-foreground mb-2">
              Powered by the most advanced AI models available
            </p>
            <p className="font-bold text-primary-foreground/90">
              We always use the latest models with the longest context windows and most 
              powerful reasoning capabilities. But AI is just the engine — the magic is in 
              the structure, accountability, and proven learning science we've built around it.
            </p>
          </div>
        </div>
      </section>
      {/* Social Proof Section
      <section className="container mx-auto px-4 lg:px-8 py-16 bg-secondary/10">
        <h3 className="text-4xl lg:text-5xl font-black text-center mb-12">
          Trusted by <span className="text-secondary underline decoration-4">Ambitious Learners</span>
        </h3>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          <div className="text-center">
            <div className="text-5xl lg:text-6xl font-black text-primary mb-2">10K+</div>
            <p className="text-xl font-bold text-foreground/80">Active Learners</p>
          </div>
          <div className="text-center">
            <div className="text-5xl lg:text-6xl font-black text-secondary mb-2">95%</div>
            <p className="text-xl font-bold text-foreground/80">Completion Rate</p>
          </div>
          <div className="text-center">
            <div className="text-5xl lg:text-6xl font-black text-accent mb-2">4.9★</div>
            <p className="text-xl font-bold text-foreground/80">User Rating</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="bg-card rounded-lg border-4 border-foreground p-6 neo-brutal-shadow">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-primary text-primary" />
              ))}
            </div>
            <p className="font-bold text-foreground/90 mb-4">
              "Finally learned calculus after struggling for years. The daily structure and AI explanations made everything click!"
            </p>
            <p className="font-black">- Sarah M., MIT Student</p>
          </div>

          <div className="bg-card rounded-lg border-4 border-foreground p-6 neo-brutal-shadow">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-primary text-primary" />
              ))}
            </div>
            <p className="font-bold text-foreground/90 mb-4">
              "Went from React newbie to building production apps in 30 days. The practice problems were game-changing."
            </p>
            <p className="font-black">- Alex K., Software Engineer</p>
          </div>

          <div className="bg-card rounded-lg border-4 border-foreground p-6 neo-brutal-shadow">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-primary text-primary" />
              ))}
            </div>
            <p className="font-bold text-foreground/90 mb-4">
              "The AI tutor is like having a personal teacher 24/7. Got a 5 on my AP exam thanks to this!"
            </p>
            <p className="font-black">- Jamie L., High School Senior</p>
          </div>
        </div>
      </section>
      */}

      {/* Pricing Section */}
      <section className="container mx-auto px-4 lg:px-8 py-16 bg-primary/5">
        <h3 className="text-4xl lg:text-5xl font-black text-center mb-4">
          One Simple Price, <span className="text-primary underline decoration-4">Everything Included</span>
        </h3>
        <p className="text-xl lg:text-2xl font-bold text-center mb-12 text-foreground/80">
          No hidden fees, no upsells, just learning
        </p>
        
        <div className="max-w-lg mx-auto">
          <div className="bg-primary rounded-lg border-4 border-foreground p-8 lg:p-10 neo-brutal-shadow-lg">
            <div className="text-center mb-8">
              <p className="text-6xl font-black text-primary-foreground">$19.99</p>
              <p className="text-xl font-bold text-primary-foreground/80">per month</p>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="font-bold flex items-start gap-3 text-primary-foreground">
                <CheckCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <span>Unlimited AI-generated curricula for any subject</span>
              </li>
              <li className="font-bold flex items-start gap-3 text-primary-foreground">
                <CheckCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <span>24/7 AI tutor powered by Gemini 2.5 Pro for instant help</span>
              </li>
              <li className="font-bold flex items-start gap-3 text-primary-foreground">
                <CheckCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <span>Daily lessons with curated resources & explanations</span>
              </li>
              <li className="font-bold flex items-start gap-3 text-primary-foreground">
                <CheckCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <span>AI-generated practice problems with solutions</span>
              </li>
              <li className="font-bold flex items-start gap-3 text-primary-foreground">
                <CheckCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <span>Weekly progress recaps & spaced repetition</span>
              </li>
              <li className="font-bold flex items-start gap-3 text-primary-foreground">
                <CheckCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <span>Learning journal to track your journey</span>
              </li>
            </ul>
            
            <Button 
              size="lg"
              variant="secondary"
              onClick={() => {
                navigate(trackInternalNavigation('landing-pricing', '/auth', 'start-journey'))
              }}
              className="w-full text-lg lg:text-xl py-6 font-black border-2 border-foreground text-white"
            >
              Start Your Learning Journey
            </Button>
            
            <div className="mt-6 text-center">
              <p className="font-bold text-primary-foreground/90 text-sm">
                🔒 Secure payment • Cancel anytime
              </p>
              <p className="font-bold text-primary-foreground/90 text-sm mt-2">
                💰 30-day money-back guarantee
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 lg:px-8 py-16">
        <h3 className="text-4xl lg:text-5xl font-black text-center mb-12">
          Real Questions, Straight Answers
        </h3>
        
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-card rounded-lg border-4 border-foreground p-6 neo-brutal-shadow">
            <h4 className="text-xl font-black mb-3">What if it doesn't work for me?</h4>
            <p className="font-bold text-foreground/80">
              30-day money-back guarantee. If you follow the curriculum and don't see progress, 
              full refund. We only make money when you succeed.
            </p>
          </div>

          <div className="bg-card rounded-lg border-4 border-foreground p-6 neo-brutal-shadow">
            <h4 className="text-xl font-black mb-3">Is this actually personalized or just templates?</h4>
            <p className="font-bold text-foreground/80">
              100% personalized. Tell us "Learn React to build a SaaS" vs "Learn React for job interviews" 
              and you'll get completely different curricula. The AI researches YOUR specific goal.
            </p>
          </div>

          <div className="bg-card rounded-lg border-4 border-foreground p-6 neo-brutal-shadow">
            <h4 className="text-xl font-black mb-3">What happens after 30 days?</h4>
            <p className="font-bold text-foreground/80">
              Keep going. Most skills take longer than 30 days to master. The structure gives you 
              momentum, but your curriculum and AI tutor stay with you as long as you need.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 lg:px-8 py-16 pb-24">
        <div className="max-w-5xl mx-auto text-center">
          <div className="bg-primary rounded-lg border-4 border-foreground p-12 lg:p-16 neo-brutal-shadow-lg">
            <h3 className="text-4xl lg:text-5xl font-black mb-6 text-primary-foreground">
              Ready to level up?
            </h3>
            <p className="text-xl lg:text-2xl font-bold mb-10 text-primary-foreground/90">
              Join others crushing their learning goals with AI
            </p>
            <Button 
              size="lg"
              variant="secondary"
              onClick={() => {
                navigate(trackInternalNavigation('landing-cta', '/auth', 'start-learning'))
              }}
              className="text-lg lg:text-xl px-12 py-6 font-black border-2 border-foreground text-white"
            >
              Start Learning Today
              <BookOpen className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 mt-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h5 className="text-2xl font-black mb-4">onemonth.dev</h5>
              <p className="font-bold opacity-80">
                Master any subject in 30 days with AI-powered personalized learning.
              </p>
            </div>
            {/*
            <div>
              <h6 className="text-lg font-black mb-4">Product</h6>
              <ul className="space-y-2">
                <li><a href="#" className="font-bold opacity-80 hover:opacity-100">How it Works</a></li>
                <li><a href="#" className="font-bold opacity-80 hover:opacity-100">Pricing</a></li>
                <li><a href="#" className="font-bold opacity-80 hover:opacity-100">Examples</a></li>
                <li><a href="#" className="font-bold opacity-80 hover:opacity-100">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h6 className="text-lg font-black mb-4">Company</h6>
              <ul className="space-y-2">
                <li><a href="#" className="font-bold opacity-80 hover:opacity-100">About</a></li>
                <li><a href="#" className="font-bold opacity-80 hover:opacity-100">Blog</a></li>
                <li><a href="#" className="font-bold opacity-80 hover:opacity-100">Careers</a></li>
                <li><a href="#" className="font-bold opacity-80 hover:opacity-100">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h6 className="text-lg font-black mb-4">Legal</h6>
              <ul className="space-y-2">
                <li><a href="#" className="font-bold opacity-80 hover:opacity-100">Privacy Policy</a></li>
                <li><a href="#" className="font-bold opacity-80 hover:opacity-100">Terms of Service</a></li>
                <li><a href="#" className="font-bold opacity-80 hover:opacity-100">Cookie Policy</a></li>
              </ul>
            </div>
            */}
          </div>
          
          
          <div className="border-t border-background/20 pt-8 text-center">
            <p className="font-bold opacity-80">
              © 2025 onemonth.dev. All rights reserved. Built with ❤️ by learners, for learners.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
} 