# onemonth.dev Development Roadmap

## 🚀 Phase 1: Core Functionality (Current)

### ✅ Completed
- [x] Database schema with Supabase
- [x] Backend structure with FastAPI
- [x] Frontend scaffolding with Vite + React
- [x] Authentication flow
- [x] Basic UI/UX with dark theme
- [x] Landing page

### 🔄 In Progress
- [ ] Vercel AI SDK integration for chat
- [ ] Streaming responses from backend
- [ ] MCP server integration

### 📋 Next Up
1. **AI Chat Refactor** (Today)
   - Replace axios chat with Vercel AI SDK
   - Implement streaming responses
   - Connect to backend LangGraph agent
   - Add MCP server support

2. **Curriculum Creation Flow** (Priority 1)
   - Create curriculum from prompt form
   - Preferences collection (duration, difficulty, style)
   - Progress through multi-step agent generation
   - Real-time generation status updates

3. **LangGraph Agent Implementation** (Priority 1)
   - Complete tool implementations (Firecrawl, Perplexity, etc.)
   - Curriculum generation state machine
   - Context-aware chat responses
   - Tool execution and result formatting

## 📊 Phase 2: Content & Learning Features

1. **Rich Text Content Editor**
   - Integrate Plate for curriculum content
   - Markdown support with preview
   - Embedded resources (videos, images, code)
   - Export/import functionality

2. **Learning Features**
   - Progress tracking per day (✅ Dashboard progress bars, FileTree progress)
   - Completion checkmarks (✅)
   - Streak tracking (✅ Robust current & longest streaks implemented)
   - Time estimation accuracy

3. **Logbook Implementation**
   - Daily reflection prompts
   - Project tracking
   - Search functionality with Typesense (Basic ILIKE search working ✅, edit save bug fixed ✅)
   - Export journal entries

4. **Resource Management**
   - Upvote/downvote system
   - Manual resource addition
   - Resource categorization
   - Quality scoring algorithm

## 🎯 Phase 3: Advanced Features

1. **Prebuilt Curricula**
   - SAT prep curriculum
   - ACT prep curriculum
   - AP exam curricula (Calc, Physics, etc.)
   - Template system for variations

2. **Practice & Assessment**
   - AI-generated practice problems
   - Solution explanations
   - Progress analytics
   - Adaptive difficulty

3. **Video Generation**
   - Remotion integration
   - Auto-generate explanatory videos
   - Custom visual styles
   - Export capabilities

4. **Social Features**
   - Public curriculum sharing
   - Curriculum discovery
   - User profiles
   - Success stories

## 💰 Phase 4: Monetization & Growth

1. **Payments Integration**
   - Polar integration
   - Subscription tiers
   - One-time purchases
   - Student discounts

2. **Email System**
   - Resend integration (✅)
   - Progress reminders (Weekly recap email implemented, scheduling next 🔄)
   - Weekly summaries (Weekly recap email implemented, scheduling next 🔄)
   - Re-engagement campaigns

3. **Analytics & Monitoring**
   - PostHog integration
   - User behavior tracking
   - Sentry error monitoring
   - Performance optimization

4. **Onboarding Optimization**
   - Guest mode
   - Example curricula
   - Interactive tutorial
   - Quick-start templates

## 🚢 Phase 5: Production & Scale

1. **Deployment**
   - Railway setup
   - Environment configuration
   - CI/CD pipeline
   - Database migrations

2. **Performance**
   - Caching with Redis
   - Vector search optimization
   - CDN integration
   - API rate limiting

3. **Launch**
   - Landing page polish
   - Launch video
   - Marketing site
   - Documentation

## 🔧 Technical Debt & Refactoring

### Backend
- [ ] Proper error handling
- [ ] Request validation
- [ ] API versioning
- [ ] Test coverage
- [ ] Documentation

### Frontend
- [ ] Component library documentation
- [ ] Storybook setup
- [ ] E2E tests with Playwright
- [ ] Performance optimization
- [ ] Accessibility audit

### Infrastructure
- [ ] Backup strategy
- [ ] Monitoring alerts
- [ ] Security audit
- [ ] Load testing
- [ ] Disaster recovery

## 📅 Timeline Estimates

- **Phase 1**: 1-2 weeks
- **Phase 2**: 2-3 weeks
- **Phase 3**: 3-4 weeks
- **Phase 4**: 2-3 weeks
- **Phase 5**: 1-2 weeks

Total: ~3 months to full production launch

## 🎯 Success Metrics

- User retention: 40% week-over-week
- Completion rate: 30% finish curricula
- NPS score: 50+
- Viral coefficient: 1.2+
- MRR: $10k within 3 months 