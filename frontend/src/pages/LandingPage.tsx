import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle, BookOpen, Zap, Target, Sparkles, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Typed from 'typed.js'

export function LandingPage() {
  const navigate = useNavigate()
  const watchingRef = useRef<HTMLSpanElement>(null)
  const shippingRef = useRef<HTMLSpanElement>(null)
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
      testimonial: "I tried learning React 4 times before. This was the first time I actually built something real.",
      author: "Alex Chen, now Frontend Dev at Stripe"
    }
  })

  useEffect(() => {
    const watchingOptions = [
      'Watching',
      'Cramming',
      'Struggling',
      'Googling',
      'Hoarding'
    ]
    
    const shippingOptions = [
      'Shipping',
      'Passing',
      'Working',
      'Creating',
      'Winning'
    ]

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
          testimonial: "I tried learning React 4 times before. This was the first time I actually built something real.",
          author: "Alex Chen, now Frontend Dev at Stripe"
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
          testimonial: "I went from a D in calc to getting a 5 on the AP exam. The daily practice problems saved me.",
          author: "Sarah Martinez, now at MIT"
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
          author: "Priya Patel, ML Engineer at Tesla"
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
        description: "You've saved 30 design tutorials. Bought expensive tools. Still using templates for everything.",
        stillHavent: "Still can't design from scratch.",
        progress: {
          title: "From Templates to Design Pro",
          weeks: [
            "Week 1: Understood design principles",
            "Week 2: Created first original design", 
            "Week 3: Built complete design system",
            "Week 4: Clients loving my work"
          ],
          testimonial: "Stopped copying, started creating. Now I charge 5x more for original designs.",
          author: "Maya Chen, Freelance Designer"
        }
      }
    ]

    let currentIndex = 0

    if (watchingRef.current && shippingRef.current) {
      const watchingTyped = new Typed(watchingRef.current, {
        strings: watchingOptions,
        typeSpeed: 50,
        backSpeed: 30,
        backDelay: 2000,
        loop: true,
        showCursor: false,
        onStringTyped: () => {
          // Update example when watching changes
          currentIndex = (currentIndex + 1) % examples.length
          setCurrentExample(examples[currentIndex])
        }
      })

      const shippingTyped = new Typed(shippingRef.current, {
        strings: shippingOptions,
        typeSpeed: 50,
        backSpeed: 30,
        backDelay: 2000,
        loop: true,
        showCursor: false,
        startDelay: 300
      })

      return () => {
        watchingTyped.destroy()
        shippingTyped.destroy()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b-4 border-foreground bg-card neo-brutal-shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black">onemonth.dev</h1>
          <Button 
            onClick={() => navigate('/auth')} 
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
                <div>
                  <span className="block">
                    Stop <span ref={watchingRef} className="text-primary"></span>
                  </span>
                  <span className="block">
                    <span className="text-primary">Start</span> <span ref={shippingRef} className="text-foreground"></span>
                  </span>
                </div>
              </h2>
              <div className="transition-all duration-500 ease-in-out min-h-[4rem] lg:min-h-[3.5rem]">
                <p className="text-xl lg:text-2xl font-bold mb-8 text-foreground/80">
                  {currentExample.description} <span className="text-primary">{currentExample.stillHavent}</span>
                </p>
              </div>
              <p className="text-lg font-bold mb-8 text-foreground/70">
                Get a structured 30-day roadmap that actually gets you from 
                "I want to learn this" to "I can do this" — powered by the most advanced AI 
                models with the longest context windows and deepest reasoning capabilities.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth')}
                  className="text-lg px-8 py-6 font-black"
                >
                  Start Today - $19.99/mo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/auth')}
                  className="text-lg px-8 py-6 font-black bg-card"
                >
                  See Real Examples
                </Button>
              </div>
              <p className="mt-4 text-sm font-bold text-foreground/60">
                Join 2,847 people who finally stopped procrastinating this month
              </p>
            </div>
            
            <div className="relative">
              <div className="bg-card rounded-lg border-4 border-foreground p-6 neo-brutal-shadow-lg transition-all duration-500">
                <div className="mb-4">
                  <span className="text-sm font-bold text-foreground/60">REAL STUDENT PROGRESS</span>
                  <h3 className="font-black text-2xl mt-1">{currentExample.progress.title}</h3>
                </div>
                <div className="space-y-3">
                  {currentExample.progress.weeks.map((week, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div 
                        className="h-1 bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${(index + 1) * 36}px` }}
                      ></div>
                      <span className="font-bold text-sm">{week}</span>
                  </div>
                  ))}
                  </div>
                <div className="mt-6 p-4 bg-primary/10 rounded-md border-2 border-primary">
                  <p className="font-bold text-sm">"{currentExample.progress.testimonial}"</p>
                  <p className="font-black text-sm mt-2">- {currentExample.progress.author}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes Section */}
      <section className="container mx-auto px-4 lg:px-8 py-16">
        <h3 className="text-4xl lg:text-5xl font-black text-center mb-12">
          30 Days From Now, You'll Be...
        </h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-card rounded-lg border-4 border-foreground p-8 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all">
            <h4 className="text-2xl font-black mb-3 text-primary">Actually Building Things</h4>
            <p className="font-bold text-foreground/80 text-lg">
              Not watching another "complete guide" — you'll have real projects in your portfolio that prove you know your stuff.
            </p>
          </div>

          <div className="bg-card rounded-lg border-4 border-foreground p-8 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all">
            <h4 className="text-2xl font-black mb-3 text-secondary">Answering Questions Confidently</h4>
            <p className="font-bold text-foreground/80 text-lg">
              No more imposter syndrome. You'll understand the why behind the what, ready for any interview or challenge.
            </p>
          </div>

          <div className="bg-card rounded-lg border-4 border-foreground p-8 neo-brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgb(0,0,0,0.9)] transition-all">
            <h4 className="text-2xl font-black mb-3 text-accent">Ready for What's Next</h4>
            <p className="font-bold text-foreground/80 text-lg">
              With a solid foundation and learning system that works, you'll tackle advanced topics without the fear.
            </p>
          </div>
        </div>
      </section>

      {/* The Difference Section */}
      <section className="container mx-auto px-4 lg:px-8 py-16 bg-card border-y-4 border-foreground">
        <h3 className="text-4xl lg:text-5xl font-black text-center mb-12">
          "Why Not Just Use ChatGPT?"
        </h3>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="text-center">
              <div className="text-6xl mb-4">😵‍💫</div>
              <h4 className="text-2xl font-black mb-3">ChatGPT Alone</h4>
              <p className="font-bold text-foreground/80">
                Ask → Get answer → Forget → Ask again → Different answer → 
                Give up → "Maybe I'm not cut out for this"
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h4 className="text-2xl font-black mb-3">With Structure</h4>
              <p className="font-bold text-foreground/80">
                Day 1 → Day 2 → Build → Practice → Remember → 
                Day 30 → "Holy shit, I actually know this"
              </p>
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

      {/* Social Proof Section */}
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
              onClick={() => navigate('/auth')}
              className="w-full text-lg lg:text-xl py-6 font-black border-2 border-foreground"
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
              Join thousands crushing their learning goals with AI
            </p>
            <Button 
              size="lg"
              variant="secondary"
              onClick={() => navigate('/auth')}
              className="text-lg lg:text-xl px-12 py-6 font-black border-2 border-foreground"
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