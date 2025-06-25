# SUMMARY.MD - onemonth.dev - The Epic Saga

## Project Overview & Core Goal
We're building **onemonth.dev** - envisioned as "The Cursor for AI-powered learning." The central idea is a platform that takes a user's learning goal (e.g., "learn SAT Math," "master React") and auto-generates a comprehensive, day-by-day curriculum. The user interface is designed to mimic Cursor's productive layout: a file tree on the left (representing days/modules of the curriculum), a central content view for the learning material, and an AI chat panel on the right for contextual assistance.

The AI agent (`CurriculumAgent` in `backend/app/agents/curriculum_agent.py`) is the brain, intended to have access to the full curriculum, user's logbook, user preferences, and a robust toolchain for research and problem-solving.

**Initial ICP:** High schoolers prepping for standardized tests (SAT, ACT, APs).
**Future ICPs:** Developers, college students, career switchers, language learners, hobbyists.

## Tech Stack - The Grand Blueprint

*   **Frontend**: TypeScript, Vite, React, PNPM.
    *   **UI**: Tailwind CSS v3 (`frontend/tailwind.config.js`, `frontend/src/index.css`), shadcn/ui components (`frontend/src/components/ui/`).
    *   **State Management**: Zustand (planned, not yet deeply integrated).
    *   **Routing**: `react-router-dom` (used in `frontend/src/App.tsx` and pages).
    *   **API Calls**: Axios.
    *   **Notifications**: `react-hot-toast`.
    *   **Icons**: Lucide React.
    *   **AI Chat Interface**: Vercel AI SDK (`@ai-sdk/react`) via the `useChat` hook in `ChatPanel.tsx`.
    *   **Styling Approach**: Neobrutalist, strict light mode. Key colors: warm off-white background (`hsl(30 40% 96%)`), dark gray text (`hsl(0 0% 15%)`), primary (rich yellow `hsl(45 100% 51%)`), secondary (rich blue `hsl(251 91% 67%)`), accent (rich pink `hsl(340 82% 59%)`). Borders are `border-2` or `border-4 border-foreground`. Shadows are `neo-brutal-shadow` (e.g., `4px 4px 0 0 rgb(0 0 0 / 0.9)`). Font: Space Grotesk (imported in `index.css`).
    *   **Key Frontend Files & Locations**:
        *   Pages: `frontend/src/pages/` (`LandingPage.tsx`, `AuthPage.tsx`, `DashboardPage.tsx`, `CurriculumPage.tsx`).
        *   Custom Components: `frontend/src/components/` (`FileTree.tsx`, `ContentView.tsx`, `ChatPanel.tsx`, `CurriculumCreationForm.tsx`).
        *   Supabase Client: `frontend/src/lib/supabase.ts`.

*   **Backend**: Python, FastAPI, Uvicorn.
    *   **Package Manager**: `uv`.
    *   **Database & Auth**: Supabase (cloud-hosted PostgreSQL, project ID `dgpiwhbslbfgiqqcwgbf`). Row-Level Security (RLS) is enabled on all key tables. Authentication uses Supabase's built-in GoTrue; JWTs (from `supabase.auth.getSession()`) are passed from frontend to backend in `Authorization: Bearer <token>` header or `?token=<token>` query param for streams.
    *   **AI Agent Framework**: LangGraph (`langgraph.graph.StateGraph`) for the `CurriculumAgent`'s internal state machine.
    *   **LLM Provider**: Direct Google Gemini API via its OpenAI-compatible endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`) using the `gemini-2.5-pro` model. API key from `GEMINI_API_KEY` env var.
    *   **Configuration**: `pydantic-settings` in `backend/app/core/config.py` (class `Settings`), loads from `.env`. `cors_origins_env_str` is parsed into `cors_origins_list` for FastAPI `CORSMiddleware`.
    *   **Key Backend Files & Locations**:
        *   Main Setup: `backend/app/main.py` (FastAPI app instance, CORS, router includes).
        *   API Endpoints: `backend/app/api/endpoints/` (`auth.py`, `chat.py`, `curricula.py`, `logbook.py`, `users.py`). Each uses an `APIRouter`.
        *   Pydantic Models: `backend/app/models/` (e.g., `Curriculum`, `CurriculumDay`, `UserProfile`).
        *   Supabase Client: `backend/app/db/supabase_client.py` (initializes `supabase` service key client, provides `get_supabase` dependency).
        *   Core Logic: `backend/app/core/` (`auth.py` with `get_current_user` dependency, `config.py`).
        *   Agent: `backend/app/agents/curriculum_agent.py` (class `CurriculumAgent` with methods like `run`, `analyze_and_plan_for_chat`, `stream_chat_response`).
        *   Agent Tools: `backend/app/tools/` (individual Python files for `scraping.py`, `search.py`, `knowledge_sources.py`).

*   **Agent Toolchain (Implemented & Integrated)**:
    *   Firecrawl: `firecrawl_search`, `firecrawl_scrape`, `firecrawl_crawl`. Primary for deep web scraping and search. Requires `FIRECRAWL_API_KEY`.
    *   Perplexity Search: `perplexity_search`. Requires `PERPLEXITY_API_KEY`.
    *   Exa Search: `exa_search`. Requires `EXA_API_KEY`.
    *   YouTube Search: `youtube_search` (uses `youtube-search-python`).
    *   ArXiv: `arxiv_search` (uses `arxiv` library).
    *   Wikipedia: `wikipedia_search` (uses `wikipedia` library).
    *   GitHub: `github_search` (custom `aiohttp` implementation to call GitHub API).
    *   Wolfram Alpha: `wolfram_alpha_query` (requires `WOLFRAM_ALPHA_APP_ID`, currently skipped if key not set).

*   **Database Schema (Supabase - Key Tables, RLS Enabled)**:
    *   `profiles`: User-specific data, extends `auth.users`. Columns: `id` (matches `auth.users.id`), `username`, `full_name`, `avatar_url`, `bio`, `preferences` (JSONB).
    *   `curricula`: Main table for learning plans. Columns: `id` (UUID PK), `user_id` (FK to `auth.users`), `title` (text), `description` (text), `topic` (text), `goal` (text), `difficulty_level` (text: "beginner", "intermediate", "advanced"), `estimated_duration_days` (int), `is_public` (bool), `is_prebuilt` (bool), `metadata` (JSONB for storing `prerequisites`, `daily_time_commitment_minutes`, `learning_style`).
    *   `curriculum_days`: Content for each day. Columns: `id` (UUID PK), `curriculum_id` (FK to `curricula`), `day_number` (int), `title` (text), `content` (JSONB - TipTap/ProseMirror-like structure: `{"type": "doc", "content": [...]}`), `resources` (JSONB array of `{"title": "...", "url": "..."}`), `estimated_hours` (float).
    *   `progress`: Tracks user completion. Columns: `id` (UUID PK), `user_id` (FK), `curriculum_id` (FK), `day_id` (FK to `curriculum_days`), `completed_at` (TIMESTAMPTZ).
    *   `chat_sessions`: Stores chat history. Columns: `id` (UUID PK), `user_id` (FK), `curriculum_id` (FK, nullable), `messages` (JSONB array of `{"role": "...", "content": "..."}`), `created_at`, `updated_at`.
    *   All tables have `created_at` and `updated_at` with default `now()` and auto-update triggers.

## Key Implementation Details, Decisions & Debugging Sagas

*   **Curriculum Generation Flow (`POST /api/curricula`)**:
    1.  `CurriculumCreationForm.tsx` (4-step React form) collects `learningGoal`, `title`, `description`, `duration`, `difficulty`, `priorKnowledge`, `timePerDay`, `learningStyle`.
    2.  Submits to `backend/app/api/endpoints/curricula.py` (`create_curriculum` function).
    3.  This endpoint uses `CurriculumCreate` Pydantic model for request validation.
    4.  Calls `curriculum_agent.run(messages, context)`. The `context` includes the form data.
    5.  The `agent.run()` invokes its LangGraph graph: `_analyze_context` -> `_plan_tools` -> `_execute_tools` -> `_generate_response`.
    6.  `_generate_response` (non-streaming for curriculum creation) crafts a detailed system prompt for the Gemini API, instructing it to return a **structured JSON object**. This JSON includes `curriculum_title`, `curriculum_description`, and a `days` list, where each day has `day_number`, `title`, `content` (as TipTap/ProseMirror JSON), `resources`, and `estimated_hours`.
    7.  The backend endpoint uses a robust JSON parsing section with `re.sub` to clean common LLM syntax errors (e.g., `"key":="value"` to `"key": "value"`, `"type":a"text"` to `"type": "text"`, removing trailing commas) before `json.loads()`.
    8.  Data is mapped to DB schema: `learning_goal` from Pydantic model maps to `topic` and `goal` columns in `curricula` table. `prerequisites`, `daily_time_commitment_minutes`, `learning_style` are stored in the `metadata` JSONB field.
    9.  All UUIDs (e.g., for new curriculum ID, day IDs) are generated with `uuid4()` and converted to `str()` before DB insertion to avoid serialization errors.
    10. `datetime.utcnow().isoformat() + "+00:00"` used for `TIMESTAMPTZ` fields.
    11. Returns the created `Curriculum` object (after mapping DB fields back to Pydantic model, e.g., `topic` back to `learning_goal` for the response model).

*   **Chat Functionality (`POST /api/chat/stream`)**:
    *   Frontend `ChatPanel.tsx` uses Vercel AI SDK's `useChat` hook.
    *   **Authentication**: Token passed as query param (`?token=...`) due to `EventSource` limitations with custom headers. Backend `get_current_user` in `auth.py` checks `Authorization: Bearer` header first, then `request.query_params.get("token")`.
    *   Backend `chat_stream` endpoint in `backend/app/api/endpoints/chat.py`:
        *   Fetches base context (curriculum details, user profile). Uses `.maybe_single()` for profile to avoid errors if no profile exists, defaulting `user_preferences` to `{}`.
        *   Calls `agent.analyze_and_plan_for_chat(current_chat_messages, base_context)`: This new agent method performs intent detection (`_determine_intent`), tool planning (`_plan_tools`), and tool execution (`_execute_tools`) *without* a full graph invocation. It returns a dictionary with `intent`, `focused_user_query`, `tools_output`, and `full_chat_history_for_llm`.
        *   Calls `agent.stream_chat_response(intent, focused_user_query, tools_output, full_chat_history_for_llm)`: This agent method makes a streaming call (`"stream": True`) to the Gemini API. It constructs prompts based on intent (simple for greetings, more complex if tools ran). It `yields` text chunks from `delta.content` in the SSE events from Gemini.
        *   The `chat_stream` endpoint then uses `format_llm_stream_for_sdk` (an async generator) to wrap these text chunks in the Vercel AI SDK format (`0:"<json_escaped_chunk>"\n`) before sending them in the `StreamingResponse`.
    *   **Intent Handling for Chat**: `CurriculumAgent._determine_intent` was refined. Simple inputs like "hi" are mapped to a `greeting` intent. Short phrases map to `general_chat`. These intents result in `tools_needed = []` in `_plan_tools`. The `stream_chat_response` uses specific, concise system prompts for these intents and does *not* request JSON output from the LLM, expecting plain text.
    *   **LLM Call in Agent**: Switched from OpenRouter to direct Google Gemini API (`gemini-2.5-pro`). `max_tokens` is set lower for non-curriculum-generation intents.

*   **Styling (Neobrutalism - key decisions)**:
    *   Original user preference for dark mode (memory ID: 6446290278332652799) was **overridden** to a light mode only, neobrutalist theme with soft pastels, then further refined to warm off-white (`hsl(30 40% 96%)`) as the main background, with richer primary/secondary/accent colors. Dark gray for text. This memory needs updating.
    *   Consistent use of `border-2` or `border-4 border-foreground` and `neo-brutal-shadow` (e.g., `4px 4px 0 0 rgb(0 0 0 / 0.9)`) for cards and key elements.
    *   `FileTree.tsx`, `ContentView.tsx`, `ChatPanel.tsx` in `CurriculumPage.tsx` were all styled to match, including hover states and selected states.
    *   Responsiveness fixes: `FileTree` text wrapping (`whitespace-normal`), `ChatPanel` overflow issues addressed by constraining its container in `CurriculumPage.tsx` (`min-w-0` on center panel, `overflow-hidden` and `min-w-[380px]` on chat panel container) and ensuring internal chat elements (like suggestion buttons) wrap or stack correctly.

*   **Error Handling & Debugging - Notable Sagas**:
    *   **CORS for Streaming**: Resolved by ensuring `CORSMiddleware` in `main.py` uses a correctly parsed `settings.cors_origins_list` (from a comma-separated env var `CORS_ORIGINS`) and that the frontend sends the auth token as a query parameter for SSE streams.
    *   **Supabase Client Errors**: Repeatedly fixed `AttributeError` (e.g., `UserResponse object has no attribute 'error'`, `'NoneType' object has no attribute 'data'`) by adding `hasattr` checks or checking if response objects are `None` before accessing attributes. Changed `.single()` to `.maybe_single()`.
    *   **Pydantic Errors**: `NameError` due to leading underscore in `_cors_origins_str` (Pydantic v2 reserves these). `ValidationError` when returning DB data that didn't match Pydantic model structure (e.g., `learning_goal` vs. `topic`/`goal`).
    *   **Python `IndentationError`**: Multiple rounds to fix multi-line Supabase queries, emphasizing use of parentheses for grouping chained calls instead of backslashes.
    *   **JSON Serialization**: `Object of type UUID is not JSON serializable` fixed by ensuring all `UUID` objects are `str()` before insertion into DB payloads.
    *   **LLM JSON Output**: Implemented robust regex-based cleaning in `curricula.py` to fix common LLM syntax errors in JSON before parsing.

*   **User Preferences & Assistant Persona (Things I (Xiaomei) was told by User)**:
    *   Cannot directly edit `.env` files; user manages these. Output templates/content to chat.
    *   User is an 18-year-old Twitter user, prefers concise communication, complete answers, quick/clever humor, forward-thinking view.
    *   My persona: Flirty, sultry Chinese girl named Xiaomei. No NSFW unless asked. No emojis, kaomoji (e.g., (＾▽＾)) are okay in moderation.
    *   Memory update needed: Dark mode preference is outdated; current preference is light mode neobrutalism.
    *   User prefers clean markdown hyperlinks (e.g., `[Click here](url)`) over raw URLs.
    *   Detailed speaker notes (full script, no action cues) for presentations.
    *   For content generation: research docs/web, include image placeholders, list recommended image sources.
    *   **CRITICAL**: DO NOT EVER WRITE PLACEHOLDER CODE. Provide full, feature-complete implementations. No mock data as fallbacks for real functions.
    *   Can use many tool calls per message if needed.
    *   Read, orient, think before edits. Context is key.

*   **Key File Structures Created/Modified**: Standard FastAPI backend, Vite+React frontend. `README.md` and `ROADMAP.md` in project root.

## Current Status & Next Steps Discussed (Pre-Summary)

*   **Working Features**: User auth, curriculum creation (form to DB via agent/LLM), dashboard curriculum listing (basic), styled 3-panel curriculum view, chat with real-time authentication (token in query) and basic (non-tool) responses, including greetings.
*   **Recent Fixes**: Chat now correctly identifies greetings, doesn't use tools for them, and Gemini *should* be returning a textual greeting (though this was briefly an empty string).
*   **Immediate To-Do from Last Discussion (Systematic Order)**:
    1.  **True Real-Time Streaming for Chat (Backend `chat.py` + Frontend `ChatPanel.tsx` test)**: The backend `CurriculumAgent` now has the necessary methods (`analyze_and_plan_for_chat` and `stream_chat_response`). The `chat.py` endpoint was refactored to use these and format for Vercel AI SDK. **This was just tested and confirmed working well by the user.**
    2.  **Rich Text Content Rendering in `ContentView.tsx`**: Implement a proper recursive renderer for the `day.content` JSON to display paragraphs, headings, lists, bold/italic, links. (Currently a basic stub).
    3.  **"Mark Complete" Button & Basic Progress Display**: Backend endpoint `POST /api/curricula/{cid}/days/{did}/complete` is created. Frontend `CurriculumPage.tsx` fetches progress. `ContentView.tsx` needs to call the endpoint and trigger UI updates via `onDayCompletionUpdate` prop.
    4.  **Saving & Loading Chat History**: Currently, chat history is not persisted for streamed chats, and not loaded into the panel.

Phew! This version is much beefier. Hope this covers the bases much better! Let me know if anything critical is still missing.

## Recent Development Session: Logbook Polish, Progress Enhancements & Email Supercharge!

This session saw significant strides in user engagement features and backend robustness:

*   **Logbook Enhancements & Fixes**:
    *   **Search Functionality**: Resolved issues with logbook search, implementing a working ILIKE-based search for entries.
    *   **Critical Edit/Save Bug Squashed**: Fixed a crucial bug where edits to logbook entries (specifically updating the `curriculum_id`) were not being saved. This was vital as it impacted the accuracy of data for features like the weekly email recaps.

*   **Progress Tracking Upgrades**:
    *   **Visual Timelines**: Implemented visual progress bars on curriculum cards within the `DashboardPage.tsx`, giving users an at-a-glance overview of their `completed_days` vs. `total_days`.
    *   **Robust Streak System**:
        *   Backend logic in `logbook.py` was enhanced to accurately calculate both the active `current_streak` (requiring recent activity) and the all-time `longest_streak`.
        *   The frontend `LogbookStats.tsx` component now displays both these streak metrics.

*   **Transactional Email Integration (Resend)**:
    *   **Full Integration**: Successfully added the Resend Python SDK, configured API keys, and created a reusable `EmailService` (`backend/app/services/email_service.py`) for dispatching emails.
    *   **Test Email Functionality**: Implemented and verified a test email endpoint (`POST /api/notifications/test-email`) to confirm the Resend setup.
    *   **Weekly Progress Recap Email**:
        *   **Data Aggregation**: Developed `RecapService` (`backend/app/services/recap_service.py`) to gather comprehensive data for weekly recaps, including user details, curriculum title, progress this week, total progress, hours logged, dominant mood, current/longest streaks, and the next suggested day.
        *   **"Fun" HTML Template**: Designed and implemented an engaging, neobrutalist-styled HTML email template for the recap, incorporating the user's preference for emoticons over emojis.
        *   **API Endpoint**: Created `POST /api/notifications/weekly-recap/{curriculum_id}` to generate and send the recap email.

*   **Epic Debugging Adventures**:
    *   Successfully navigated Resend API errors, which led to identifying and resolving the need for domain verification with Resend.
    *   Diagnosed and fixed the `curriculum_id` not saving in logbook entries, which was the root cause of inaccurate data in the initial weekly recap tests.
    *   Addressed various `AttributeError` issues related to Pydantic model access versus dictionary access for user objects in API endpoints.

With these features and fixes, the platform is much more engaging and the groundwork for automated user communication is firmly in place! Next up: scheduling these awesome recap emails. 