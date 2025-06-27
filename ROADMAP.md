# onemonth.dev Development Roadmap

## 🚀 Phase 1: Core Functionality & AI Agent V1 (Nearing Completion)

### ✅ Completed
- [x] Database schema with Supabase
- [x] Backend structure with FastAPI & `uv`
- [x] Frontend scaffolding with Vite + React + PNPM
- [x] Authentication flow (Supabase GoTrue)
- [x] Landing page (Basic)
- [x] Core UI/UX with [Light Mode Neobrutalist Theme][[memory:6579218890028626079]] (HSL variables, Space Grotesk, borders, shadows)
- [x] **Curriculum Generation Flow (Backend)**: LLM (Gemini 2.5 Pro) generates structured JSON for curriculum & days; robust JSON parsing and DB saving logic in `curricula.py`. Now with enhanced depth for daily content.
- [x] **AI Chat - Core Architecture & Functionality**:
    - [x] Pivot from Vercel AI SDK to Custom Frontend (`fetch`-based streaming) + Python LangChain Backend.
    - [x] Backend Agent (`chat.py`): LangChain `AgentExecutor` with `create_tool_calling_agent` (Gemini 2.5 Pro), `ConversationBufferWindowMemory`, context injection (curriculum & day content).
    - [x] Integrated Tools: Exa Search, Perplexity Search, Firecrawl Scrape (markdown) wrapped as LangChain tools in `our_langchain_tools.py`.
    - [x] Streaming: Backend yields plain text chunks (`\n` terminated) & custom signals (`__TOOL_START__!`, `__TOOL_END__!`, `__END_OF_AI_STREAM__`).
    - [x] Frontend (`ChatPanel.tsx`): Manages all chat state, parses stream signals, displays tool status indicators, and renders AI messages with `react-markdown` (GFM).
    - [x] Chat History: Loading from and saving to Supabase `chat_sessions` table.
- [x] **Logbook - Core & Fixes**:
    - [x] Basic ILIKE search for entries.
    - [x] Critical bug fix for saving `curriculum_id` on logbook entry edits.
- [x] **Email System (Resend)**:
    - [x] Resend integration complete, test email functional.
    - [x] Weekly Progress Recap Email: Data aggregation (`RecapService`), HTML template, and manual trigger endpoint (`/api/notifications/weekly-recap/{cid}`) working.
    - [x] Master Endpoint for All Recaps (`/trigger-all-weekly-recaps`) with cron secret protection, user fetching logic (Supabase Admin API), and email dispatch loop.
- [x] **Progress Tracking - Basics**:
    - [x] Visual progress bars on `DashboardPage.tsx`.
    - [x] Robust `current_streak` and `longest_streak` calculation (backend) and display (`LogbookStats.tsx`).
- [x] **Core Learning Loop - Content & Interaction**:
    - [x] Rich Text Content Rendering in `ContentView.tsx` (Handles TipTap/ProseMirror JSON including headings, lists, blockquotes, and code blocks with copy functionality).
    - [x] "Mark Complete" Button & Progress UI (Full frontend integration for the `POST /api/curricula/{cid}/days/{did}/complete` endpoint, with dynamic updates in `FileTree.tsx`).

### 🔄 In Progress
- [ ] Streaming responses from backend
- [ ] MCP server integration

### 📋 Next Up / Immediate Polish & Phase 2 Kick-off

1.  **AI Chat - Polish & Enhancements (Backend & Frontend)**:
    *   [ ] **Tool Status UI**: Resolve any "unknown_tool" display issues (deeper backend logging of `event["data"]["name"]` if needed) and ensure consistent styling.
    *   [ ] **Agent Output Streaming**: Verify token-by-token streaming for *all* responses (tool & non-tool). If final agent outputs (especially after tools) are single blocks, refine `AgentExecutor` interaction or LLM streaming config in `chat.py`.
    *   [ ] **Tool I/O Handling (Backend)**: Implement summarization/truncation for very long tool outputs in `our_langchain_tools.py` before they're fed back to the LLM.
    *   [ ] **Tool Error Handling (Backend & Frontend)**: Improve agent resilience to tool errors. Backend to send specific `__TOOL_ERROR__!` signals; frontend to display them gracefully.

2.  **Automated Weekly Recap Emails (User Task)**:
    *   [ ] User to configure Supabase cron job (`pg_cron`) for the `/api/notifications/trigger-all-weekly-recaps` endpoint. (📋 User Action Pending)

3.  **Integrate More Tools (Backend `our_langchain_tools.py` & `chat.py`)**:
    *   [ ] Wrap and integrate Wolfram Alpha (for math/computation).
    *   [ ] Wrap and integrate Wikipedia (for general factual lookups).
    *   [ ] Consider ArXiv, YouTube content extraction (potentially using Firecrawl or specialized parsers).

## 📊 Phase 2: Content & Learning Features (Revised)

1.  **Curriculum Content & Interaction (Continued from Phase 1 Next Up)**
    *   [ ] **Rich Text Content Editor (Admin/Instructor View)**: Integrate Plate.js for creating/editing curriculum content (TipTap JSON).
    *   [ ] Markdown support with preview for editor.
    *   [ ] Embedded resources (videos, images, code blocks) in editor.
    *   [ ] Curriculum content import/export functionality.

2.  **Learning Features (Continued)**
    *   [ ] Time estimation accuracy refinement for days/curricula.
    *   [ ] More sophisticated progress analytics.

3.  **Logbook Enhancements**
    *   [ ] Rich text editor for logbook entries (e.g., Plate.js).
    *   [ ] Daily reflection prompts (possibly AI-generated based on progress/topic).
    *   [ ] Project tracking features within logbook.
    *   [ ] Advanced search with Typesense for logbook entries.
    *   [ ] Export journal entries.

4.  **Resource Management (Agent & UI)**
    *   [ ] Agent ability to evaluate and rank resources found by tools.
    *   [ ] UI for upvote/downvote on AI-suggested resources.
    *   [ ] Manual resource addition/editing within `ContentView.tsx`.
    *   [ ] Resource categorization and tagging.

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
   - Progress reminders (Weekly recap email implemented, cron endpoint ready ✅, Supabase cron job setup next 📋)
   - Weekly summaries (Weekly recap email implemented, cron endpoint ready ✅, Supabase cron job setup next 📋)
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

- **Phase 1**: (Mostly complete) ~2-3 weeks elapsed.
- **Phase 2**: ~3-4 weeks (factoring in content rendering, editor, deeper tool/agent work).
- **Phase 3**: ~3-4 weeks.
- **Phase 4**: ~2-3 weeks.
- **Phase 5**: ~1-2 weeks.

Total: ~3-4 months to a very feature-rich V1.

## 🎯 Success Metrics

- User retention: 40% week-over-week
- Completion rate: 30% finish curricula
- NPS score: 50+
- Viral coefficient: 1.2+
- MRR: $10k within 3 months 