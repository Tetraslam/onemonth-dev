# **onemonth.dev**

*The Cursor for AI-powered learning.*

---

Login → create a **new project** (you enter a learning goal prompt + prefs) → it auto-generates a full curriculum.

Each **"file"** = a day in the curriculum.
Each **"folder"** = a full learning track.
The interface:

* Left: file tree (days)
* Center: content view (rich text learning modules)
* Right: AI chat (context-aware agent)

The AI agent has access to:

* The full curriculum
* The user's logbook (progress + reflections)
* User prefs (goal, time, difficulty, etc.)
* Toolchain (search, scrape, solve, generate)

---

## 🎯 **Initial ICP**

* High schoolers prepping for standardized tests (SAT, ACT, AP)

  * They're stressed, time-poor, and already paying for tutors.

## 🔮 **Future ICPs**

* Developers learning tech stacks or prepping for interviews
* College students cramming high-signal topics
* Career switchers leveling up fast
* Language learners sick of Duolingo tier hell
* Hobbyists wanting a structured path to mastery

---

## ✨ **Core Features**

* User auth (sign up/login)
* Curriculum creation from prompt + preferences
* Curriculum CRUD (create, read, update, delete)
* AI chat with full access to curriculum, logbook, and prefs
* Weekly project tracking + journaling in the **Logbook** (Search fixed ✅)
* Email reminders (via Resend) with progress recaps and next steps (Recap email implemented ✅, scheduling next)
* Progress tracking: per-day completion checkmarks (DONE ✅), visual timeline (Dashboard progress bars ✅), and robust streak reminders (Current & Longest streaks implemented ✅)
* AI-generated **explanatory videos** using Remotion
* Search across logbook entries (Typesense)
* Resource quality filters: upvote/downvote AI picks, manual edit mode, summary blurbs
* Prebuilt high-quality curricula for standardized tests and key ICPs (SAT, AP Calc, etc.)
* Modular curriculum: reorder days, insert custom content, skip irrelevant topics
* Low-friction onboarding: instant guest mode, default example track, click-to-pick goals
* Natural AI chat UX: preloaded system prompts ("explain simply", "give practice question", etc.)
* Shareable curriculum and logbook: public pages + one-click exports for virality
* AI chat powered by Vercel AI SDK + LangGraph agent runtime
* Tangent mode: keep a curriculum going forever past the original goal; the AI chat gets a bunch of tools to manage this

---

## 🔥 **Things to get right at any cost**

- Onboarding (guest mode tutorial, default example track, click-to-pick goals)
- AI chat
- Resources
- Retention loops (email reminders, etc.)
- Virality (shareable curriculum and logbook)
- Natural UX (preloaded system prompts, etc.)
- Modular curriculum (reorder days, insert custom content, skip irrelevant topics)
- Prebuilt high-quality curricula for standardized tests and key ICPs (SAT, ACT, AP Calc AB/BC, Physics 1 & C, Biology, US History, CS A, Statistics, Chemistry)
- Low-friction onboarding (instant guest mode, default example track, click-to-pick goals)
- Natural AI chat UX (preloaded system prompts, etc.)
- Payments need to be robust
- Launch video and distribution
- Landing page

---

## 🧱 **Deployment**

* **Railway** – all-in-one app hosting

---

## 🖼 **Frontend**

* **Stack**: TypeScript, Vite, React, PNPM
* **UI**: shadcn/ui, Zustand
* **Analytics**: PostHog
* **Text Editor**: Plate (rich text with Vercel AI SDK integration for the logbook)
* **AI Chat Interface**: Vercel AI SDK with access to LangGraph agent running on MCP
* **Search**: Typesense for instant, semantic logbook search
* **Validation**: Zod

---

## 🧠 **Backend**

* **Frameworks**: FastAPI, UVicorn, Pydantic
* **Database/Auth**: Supabase (cloud-hosted; RLS, auth, file storage)
* **Graph/Agent Runtime**: LangGraph
* **Transactional Emails**: Resend (Integrated & Sending ✅)
* **Vector Search**: Qdrant (cloud-hosted)
* **AI Provider**: Gemini 2.5 Pro via OpenRouter (OpenAI-compatible endpoint)
* **Linting**: Ruff
* **Monitoring**: Sentry
* **AI Chat**: Vercel AI SDK

### 🧰 **Agent Tools**

The AI agent can call:

* **Firecrawl** – deep web scraping
* **Perplexity** – live search-based QA
* **Exa** – document search + retrieval
* **ArXiv, GitHub, YouTube** – knowledge source scrapers
* **Wolfram Alpha** – math/logic queries
* **Wikipedia** – general reference
* **Code interpreter** – Python REPL
* **Scheduled emails** – weekly reminders, follow-ups (via Resend) (Recap email implemented ✅, scheduling next)

---

## 💳 **Payments**

* **Platform**: Polar (for monthly plans + one-time drops)

---