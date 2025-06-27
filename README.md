# **onemonth.dev**

*Master any subject in 30 days.*

---

Login → create a **new project** (you enter a learning goal prompt + prefs) → it auto-generates a full curriculum.

Each **"file"** = a day in the curriculum.
Each **"folder"** = a full learning track.
The interface:

* Left: file tree (days)
* Center: content view (rich text learning modules)
* Right: AI chat (context-aware agent)

The AI agent has access to:

* The full curriculum (including specific content of the current day).
* The user's logbook (progress + reflections) (Planned).
* User prefs (goal, time, difficulty, etc.).
* A robust toolchain (Web Search via Exa & Perplexity, Web Scraping via Firecrawl integrated ✅; others pending full agent integration).

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

* User auth (sign up/login) (✅)
* Curriculum creation from prompt + preferences (✅ Backend logic with LLM, robust JSON parsing, DB saving)
* Curriculum CRUD (create, read, update, delete) (Create & Read implemented ✅)
* **AI Chat**:
    *   Context-aware: Access to curriculum overview and specific day content (✅).
    *   Tool-Enabled: Can use web search (Exa, Perplexity) and web scraping (Firecrawl) to answer questions beyond its immediate knowledge (✅).
    *   Streaming Responses: AI responses stream in for a real-time feel (✅).
    *   Tool Usage Indicators: UI shows when the AI is using a tool (✅).
    *   Markdown Rendering: AI responses are rendered with markdown for better readability (✅).
* Weekly project tracking + journaling in the **Logbook** (Search fixed ✅, Edit/Save bug fixed ✅)
* Email reminders (via Resend) with progress recaps and next steps (Weekly recap email implemented, cron trigger endpoint ready ✅, Supabase cron job setup pending by user)
* Progress tracking: per-day completion checkmarks (Backend endpoint ✅, UI integration ✅), visual timeline (Dashboard progress bars ✅), and robust streak reminders (Current & Longest streaks implemented ✅)
* AI-generated **explanatory videos** using Remotion (Planned)
* Search across logbook entries (Typesense for advanced search planned; basic ILIKE search working ✅)
* Resource quality filters: upvote/downvote AI picks, manual edit mode, summary blurbs (Planned)
* Prebuilt high-quality curricula for standardized tests and key ICPs (SAT, AP Calc, etc.) (Planned)
* Modular curriculum: reorder days, insert custom content, skip irrelevant topics (Planned)
* Low-friction onboarding: instant guest mode, default example track, click-to-pick goals (Planned)
* Natural AI chat UX: preloaded system prompts ("explain simply", "give practice question", etc.) (Basic system prompt in place, can be expanded)
* Shareable curriculum and logbook: public pages + one-click exports for virality (Planned)
* Tangent mode: keep a curriculum going forever past the original goal; the AI chat gets a bunch of tools to manage this (Planned)

---

## 🔥 **Things to get right at any cost**

(Section remains largely relevant, will be checked off as implemented)
- Onboarding (guest mode tutorial, default example track, click-to-pick goals)
- AI chat (✅ Core functionality, context, tools, streaming, markdown, status indicators)
- Resources (AI can find them ✅, quality filters planned)
- Retention loops (email reminders ✅, more planned)
- Virality (shareable curriculum and logbook)
- Natural UX (preloaded system prompts, etc.)
- Modular curriculum (reorder days, insert custom content, skip irrelevant topics)
- Prebuilt high-quality curricula for standardized tests and key ICPs (SAT, ACT, AP Calc AB/BC, Physics 1 & C, Biology, US History, CS A, Statistics, Chemistry)
- Payments need to be robust
- Launch video and distribution
- Landing page

---

## 🧱 **Deployment**

* **Railway** – all-in-one app hosting (Current plan)

---

## 🖼 **Frontend**

* **Stack**: TypeScript, Vite, React, PNPM.
* **UI**: Tailwind CSS v3, shadcn/ui components.
    *   **Styling Approach**: Neobrutalist, strict light mode. Key colors: warm off-white background (`hsl(30 40% 96%)`), dark gray text (`hsl(0 0% 15%)`), primary (rich yellow `hsl(45 100% 51%)`), secondary (rich blue `hsl(251 91% 67%)`), accent (rich pink `hsl(340 82% 59%)`). Borders `border-2` or `border-4 border-foreground`. Shadows `neo-brutal-shadow`. Font: Space Grotesk.
* **State Management**: Primarily `useState` and prop drilling; Zustand considered for future scaling.
* **Routing**: `react-router-dom`.
* **API Calls**: Native `fetch` API for chat streaming; Axios for other calls (or transitioning to fetch).
* **Notifications**: `react-hot-toast`.
* **Icons**: Lucide React.
* **AI Chat Interface (`ChatPanel.tsx`)**:
    *   **Custom `fetch`-based streaming solution**: Directly consumes plain text streams from the backend AI agent.
    *   Manages its own message, input, loading, and tool status states (`useState`).
    *   Parses custom SSE-like signals from the backend for tool usage (`__TOOL_START__!`, `__TOOL_END__!`) and end-of-stream (`__END_OF_AI_STREAM__`).
    *   Renders AI responses using `react-markdown` with `remark-gfm` for GitHub Flavored Markdown.
* **Text Editor (Logbook - Planned)**: Plate.js.
* **Search (Logbook - Planned)**: Typesense.
* **Validation**: Zod (Planned for forms).
* **Key Libraries**: `react-markdown`, `remark-gfm`.

---

## 🧠 **Backend**

* **Frameworks**: FastAPI, Uvicorn, Pydantic.
* **Package Manager**: `uv`.
* **Database/Auth**: Supabase (PostgreSQL). RLS enabled. Auth via Supabase GoTrue (JWTs).
* **AI Agent Framework**: LangChain (Python).
    *   **Core Logic**: LCEL (LangChain Expression Language) for chain & agent construction.
    *   **LLM Integration**: `ChatGoogleGenerativeAI` with Gemini 2.5 Pro (via `langchain-google-genai`).
    *   **Memory**: `ConversationBufferWindowMemory` for chat history.
    *   **Agent Type**: `create_tool_calling_agent` with an `AgentExecutor` to enable tool usage.
* **Transactional Emails**: Resend (Integrated & Sending weekly recaps ✅).
* **Vector Search (Planned)**: Qdrant.
* **AI Provider**: Direct Google Generative AI API for Gemini 2.5 Pro.
* **Linting**: Ruff.
* **Monitoring**: Sentry (Setup in `main.py`, full integration pending).
* **AI Chat Endpoint (`/api/chat/lc_stream`)**:
    *   FastAPI `StreamingResponse`.
    *   Serves plain text chunks from the LangChain agent.
    *   Intersperses custom tool status signals (`__TOOL_START__!{json}
`, `__TOOL_END__!{json}
`).
    *   Uses a final `__END_OF_AI_STREAM__
` delimiter.

### 🧰 **Agent Tools**

The LangChain agent can currently call:

*   **Exa Search**: Neural web search. (`exa_search_lc_tool` in `our_langchain_tools.py`) (✅ Integrated & Working)
*   **Perplexity Search**: Conversational AI search. (`perplexity_search_lc_tool` in `our_langchain_tools.py`) (✅ Integrated & Working)
*   **Firecrawl Scrape**: Scrapes webpage content into markdown. (`firecrawl_scrape_url_lc_tool` in `our_langchain_tools.py`) (✅ Integrated & Working)

The following tools are implemented as raw async functions in `backend/app/tools/` and are candidates for future LangChain Tool wrapping and agent integration:
*   Firecrawl (Deeper features: `firecrawl_search`, `firecrawl_crawl`)
*   YouTube Search (`youtube_search`)
*   ArXiv (`arxiv_search`)
*   Wikipedia (`wikipedia_search`)
*   GitHub (`github_search`)
*   Wolfram Alpha (`wolfram_alpha_query`)
*   Code interpreter (Python REPL) (Planned)
*   Scheduled emails (Partially addressed by recap cron job logic, direct agent tool for scheduling pending)

---

## 💳 **Payments**

* **Platform**: Polar (for monthly plans + one-time drops) (Planned)

---

## 🔑 **Key Architectural Decisions & AI Chat Status**

*   **AI Chat Architecture Pivot**: Initially explored Vercel AI SDK (`useChat`) for the frontend chat interface. Pivoted to a custom frontend `fetch`-based streaming solution connected to a Python LangChain agent backend.
    *   **Reasoning**: Greater flexibility, direct control over agent logic, better compatibility with Python/FastAPI backend and Vite/React frontend, and to overcome difficulties encountered with `useChat` outside a Next.js environment for complex agent interactions.
*   **Streaming Protocol**:
    *   Backend (`/api/chat/lc_stream`) now yields:
        1.  Plain text chunks from LLM for conversational content, each terminated by `
`.
        2.  Special signals for tool usage: `__TOOL_START__!{json_payload}
` and `__TOOL_END__!{json_payload}
`.
        3.  A final delimiter: `__END_OF_AI_STREAM__
`.
    *   Frontend (`ChatPanel.tsx`) accumulates raw text from the stream, parses these custom signals to update UI tool status, and displays the concatenated plain text content with markdown rendering.
*   **Current AI Chat Status**:
    *   Successfully streams responses from Gemini 2.5 Pro via LangChain agent.
    *   Integrates curriculum day content into prompts for contextual answers.
    *   Can use Exa, Perplexity, and Firecrawl tools.
    *   Frontend displays AI messages with markdown and shows status indicators during tool calls.
    *   Chat history is loaded and saved to Supabase.

---