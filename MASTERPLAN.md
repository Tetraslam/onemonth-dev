# onemonth.dev Master Plan - Post-Launch Feature Roadmap

## 📊 Launch Metrics Recap
- **Twitter**: 51 likes, 2.1k views, 9 comments, 6 retweets, 8 bookmarks (F Inc retweet)
- **Reddit (r/sideproject)**: 55 upvotes, 13 comments with valuable feedback
- **Key Insight**: "$20/month IS insane value - just need to make it undeniably obvious"

## 🎯 Immediate High-Impact Features (Next 2 Weeks)

### 1. **Progressive Generation with Planning Interface** ⭐⭐ CRITICAL PRIORITY
**The Problem**: 10-minute wait time for curriculum generation is killing conversions
**The Solution**: Show progress in real-time while generating content progressively

#### Implementation Plan:

**Phase 1: Instant Outline (0-30 seconds)**
- Generate curriculum structure only:
  - Title, description, learning path
  - All 30 day titles with brief objectives
  - Estimated time commitments
  - Resource categories (not URLs yet)
- User sees their complete learning journey immediately

**Phase 2: Priority Content (30 seconds - 2 minutes)**
- Generate Days 1-3 with full detail:
  - Complete TipTap JSON content
  - Researched and verified resources
  - Practice problems
- Users can start learning while rest generates

**Phase 3: Background Completion (2-10 minutes)**
- Generate remaining days in batches of 3-5
- Update UI as each batch completes
- Maintain context across batches

#### Planning Interface Visualization:
Show a live feed of the agent's process:
```
🔍 Researching "React Hooks" best practices...
   ├─ Searching documentation...
   ├─ Finding video tutorials...
   └─ Analyzing learning paths...
   
📋 Creating curriculum outline...
   ├─ Structuring 30-day journey...
   └─ Balancing theory and practice...
   
✍️ Writing Day 1: Introduction to React...
   ├─ Crafting lesson content...
   ├─ Adding code examples...
   └─ Selecting resources...
   
✅ Day 1 ready! (Days 2-3 generating...)
```

**Technical Changes**:
- Add `content_status` field to track generation state per day
- Modify agent to support "outline" vs "detailed" generation modes
- Create WebSocket or SSE endpoint for real-time updates
- Update frontend to show generation progress

**Success Metrics**:
- Time to first meaningful content < 30 seconds
- User engagement during generation > 80%
- Reduced drop-off rate by 50%

### 2. **Code Playground** ⭐ HIGH PRIORITY
**Why**: This is your biggest differentiator from ChatGPT/Khan Academy
- **MVP**: JavaScript/Python execution in the browser
- **Implementation**: Use Pyodide for Python, native JS eval for JavaScript
- **UI**: Split pane - code editor left, output right
- **Integration**: Embed directly in curriculum days, auto-populate with examples
- **Success Metric**: Users running code within first 3 minutes of landing on a curriculum

### 2. **AI Text Highlighting + TTS (Text-to-Speech)**
**Why**: Creates an "AI tutor" experience that feels alive
- **Feature Set**:
  - Highlight key concepts as TTS reads
  - Click any highlighted term for instant AI explanation
  - Adjustable reading speed
  - Pause/resume functionality
- **Implementation**: Web Speech API for TTS, custom highlighting logic
- **Success Metric**: 50% of users engage with TTS feature

### 3. **Verify Resources + Fetch Live Data**
**Why**: Addresses trust and content freshness concerns
- **Visual Indicators**:
  - "✓ Resource verified 2 hours ago"
  - "📊 Live data from official docs"
  - "🔄 Content updated when source changed"
- **Backend**: Scheduled verification jobs, resource health monitoring
- **Success Metric**: Reduced "are these resources current?" support questions

## 💡 The "Holy Shit" Feature (1 Month Timeline)

### **AI Video Generation** 🎬
**The Vision**: Every curriculum day gets an auto-generated 5-10 min video summary
- **Tech Stack**: 
  - Remotion for programmatic video generation
  - ElevenLabs for voice synthesis
  - Your existing curriculum content as script
- **Format**:
  - Professional intro/outro
  - Code snippets animated in
  - Key concepts visualized
  - Consistent branding
- **Value Prop**: "Learn React Day 7" becomes a polished video lesson
- **Success Metric**: 80% watch completion rate

## 🏢 B2B/Bulk Sales Strategy

### **"Team Learning Tracks"**
**Target Markets**:
- Companies onboarding junior developers
- Schools teaching AP Computer Science/Math
- Coding bootcamps needing structured curricula
- Tech teams upskilling together

**Features**:
- Admin dashboard with team progress overview
- Bulk seat management
- Custom branding options
- Progress reports for managers/teachers
- Slack/Teams integration for notifications

**Pricing**: $15/user/month for 10+ seats, $12 for 50+

## 🚀 Quick Wins to Show Value Immediately

### 1. **Free Preview Mode**
- Show Days 1-3 of ANY curriculum without signup
- Watermark or limit some features
- Clear "Unlock Full Curriculum" CTAs

### 2. **"See What You Get" Page**
- Actual curriculum samples (not just promises)
- Interactive demos of key features
- Side-by-side comparison with alternatives

### 3. **Time-to-Value Optimization**
- Track and display: "Start learning in 47 seconds"
- Streamline onboarding flow
- Pre-generate popular curricula for instant access

### 4. **Social Proof Integration**
- "327 people completed this curriculum"
- Success stories/testimonials
- Public project showcases from logbooks

## 🔻 Deprioritize for Now

These features, while cool, won't drive immediate conversions:
- Anki/Flashcard export
- Knowledge graph visualizations
- Multi-language curriculum support
- Calendar integrations
- Obsidian export
- Complex scheduling features

## 🎮 The Real Game-Changer Vision

**Your product becomes undeniably worth $20/month when users can:**

1. **Generate a curriculum in 2 minutes** ✓ (Already done!)
2. **See an interactive code example on Day 1** (Code Playground)
3. **Watch an AI-generated video summary** (Video Gen)
4. **Practice with live coding challenges** (Enhanced practice problems)
5. **Get context-aware AI assistance** ✓ (Already done!)

**The Core Promise**: You're not competing on price - you're competing on **learning velocity**. Make it crystal clear that with onemonth.dev, they'll actually BUILD something in 30 days, not just consume content.

## 📈 Success Metrics to Track

1. **Activation Rate**: % of signups who complete Day 1
2. **Day 7 Retention**: % still active after a week
3. **Completion Rate**: % who finish a full curriculum
4. **Time to First Code Run**: How quickly users execute code
5. **Upgrade Rate**: Free preview → paid conversion

## 🚨 Critical Risks & Mitigation Strategies

### **Identified Challenges & Solutions**:

1. **Quality at Scale Risk**
   - **Risk**: AI hallucinations, wrong information spreading
   - **Mitigation**: Heavy research-based generation using Perplexity/Exa/Firecrawl
   - **Reality Check**: "onemonth.dev taught me wrong" posts are inevitable - ship it anyway

2. **LLM Dependency Risk**
   - **Risk**: Gemini 2.5 Pro pricing/availability changes
   - **Mitigation**: Qwen 32B (open source, 2M context) as backup
   - **Insight**: Every AI company is financially incentivized to increase context windows

3. **The "Actually Learning" Problem**
   - **Challenge**: Measuring real learning outcomes vs content consumption
   - **Solution**: GitHub integration with code playground for real project building
   - **Opportunity**: Mosaic.ai integration to pull relevant YouTube clips into lessons

4. **Support Automation**
   - **Traditional Problem**: Dead links, broken code, inconsistent content
   - **Agent Solution**: Everything becomes agent-iterable
     - Dead link? Agent finds replacement
     - Code doesn't work? Agent debugs and fixes
     - Content outdated? Agent refreshes with Perplexity
   - **Policy**: Zero human support, infinite agent iteration

5. **The UI Moat**
   - **Reality**: Technology isn't the differentiator - UI/UX is
   - **Validation**: Users consistently praise the interface
   - **Competition**: OpenAI/Google are surprisingly bad at educational UI
   - **Strategy**: Double down on interface polish over feature bloat

6. **Churn & Retention**
   - **Challenge**: One-and-done usage pattern
   - **Solution**: Focus on power users who learn multiple topics
   - **Future**: Build community features once core product is solid

### **Non-Issues (Ship It Anyway)**:
- Legal/copyright concerns - disclaimer and move on
- Enterprise B2B - consumer focus for now
- Competition from free platforms - they're optimizing for engagement, not learning

### **Key Insight from Reddit**:
"$20/month IS insane value - you just have to make that clear and improve the product to the point where it's really obvious how insanely high value it is."

## 🎬 Next Steps

1. **Week 1**: Ship Code Playground MVP (JS only)
2. **Week 2**: Add Python support + AI highlighting
3. **Week 3**: Resource verification system
4. **Week 4**: Begin video generation prototype
5. **Ongoing**: A/B test pricing, onboarding flows, value props

**Remember**: The traffic is there (100+ visitors from launch). Now make the product so compelling that NOT subscribing feels like missing out on a superpower.
