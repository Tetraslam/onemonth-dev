# SUMMARY.MD - onemonth.dev - The Epic Saga (v2 - Post-LangChain Chat Success)

## Project Overview & Core Goal
We're building **onemonth.dev** - a platform to help you master any subject in 30 days. The central idea is a platform that takes a user's learning goal (e.g., "learn SAT Math," "master React") and auto-generates a comprehensive, day-by-day curriculum. The user interface is designed to mimic a productive code editor layout: a file tree on the left (representing days/modules of the curriculum), a central content view for the learning material, and an AI chat panel on the right for contextual assistance.

The AI agent (`CurriculumAgent` in `backend/app/agents/curriculum_agent.py`, now evolving into a LangChain-based agent for chat) is the brain. It has access to the full curriculum (including specific content of the current day being viewed by the user), user preferences (goal, time, difficulty, etc.), and an integrated toolchain (Exa, Perplexity, Firecrawl currently active). User logbook integration is planned for future contextual awareness.

**Initial ICP:** High schoolers prepping for standardized tests (SAT, ACT, APs).
**Future ICPs:** Developers, college students, career switchers, language learners, hobbyists.

## Tech Stack - The Grand Blueprint (Current State)

*   **Frontend**: TypeScript, Vite, React, PNPM.
    *   **UI**: Tailwind CSS v3 (`frontend/tailwind.config.js`, `frontend/src/index.css`), shadcn/ui components (`frontend/src/components/ui/`).
        *   **Styling Approach**: [Strict light mode, Neobrutalist theme][[memory:6579218890028626079]]. Key colors: warm off-white background (`hsl(30 40% 96%)`), dark gray text (`hsl(0 0% 15%)`), primary (rich yellow `hsl(45 100% 51%)`), secondary (rich blue `hsl(251 91% 67%)`), accent (rich pink `hsl(340 82% 59%)`). Borders are `border-2` or `border-4 border-foreground`. Shadows are `neo-brutal-shadow` (e.g., `4px 4px 0 0 rgb(0 0 0 / 0.9)`). Font: Space Grotesk.
    *   **State Management**: Primarily `useState` and prop drilling. Zustand considered for future.
    *   **Routing**: `react-router-dom`.
    *   **API Calls**: Native `fetch` API for chat streaming; Axios for other RESTful calls (transitioning to `fetch` where appropriate).
    *   **Notifications**: `react-hot-toast`.
    *   **Icons**: Lucide React.
    *   **AI Chat Interface (`ChatPanel.tsx`)**: Custom `fetch`-based streaming solution. Manages its own message, input, loading, and tool status states. Parses custom SSE-like signals from the backend for tool usage and stream termination. Renders AI responses using `react-markdown` with `remark-gfm`.
    *   **Key Libraries**: `react-markdown`, `remark-gfm`, `@tailwindcss/typography`.

*   **Backend**: Python, FastAPI, Uvicorn.
    *   **Package Manager**: `uv`.
    *   **Database & Auth**: Supabase (PostgreSQL). RLS enabled. Auth via Supabase GoTrue (JWTs passed via query param for streams, Bearer token for REST).
    *   **AI Agent Framework (Chat)**: LangChain (Python), using LCEL. `ChatGoogleGenerativeAI` (Gemini 2.5 Pro via `langchain-google-genai`), `ConversationBufferWindowMemory`, `create_tool_calling_agent`, and `AgentExecutor`.
    *   **AI Agent Framework (Curriculum Generation)**: LangGraph (`langgraph.graph.StateGraph`) for the `CurriculumAgent`'s internal state machine for curriculum generation (distinct from chat agent).
    *   **Transactional Emails**: Resend (Integrated & Sending weekly recaps).
    *   **Configuration**: `pydantic-settings` (`backend/app/core/config.py`).
    *   **AI Chat Endpoint (`/api/chat/lc_stream`)**: FastAPI `StreamingResponse` serving plain text chunks from the LangChain agent, interspersed with custom tool status signals and a final delimiter.
    *   **Key Backend Files**: `main.py`, `api/endpoints/chat.py` (for LangChain agent chat), `api/endpoints/curricula.py` (for LangGraph curriculum generation), `agents/curriculum_agent.py` (LangGraph parts), `tools/our_langchain_tools.py` (LangChain tool definitions).

*   **Integrated LangChain Agent Tools (Chat)**:
    *   Exa Search (`exa_search_lc_tool`): For deep web research. (✅ Working)
    *   Perplexity Search (`perplexity_search_lc_tool`): For quick, conversational answers. (✅ Working)
    *   Firecrawl Scrape (`firecrawl_scrape_url_lc_tool`): For fetching webpage markdown. (✅ Working)
    *   (Other tools like Wikipedia, ArXiv, YouTube search, WolframAlpha, and a Code Interpreter are available as raw functions in `backend/app/tools/` and are slated for LangChain tool wrapping and integration.)

*   **Database Schema**: (As previously detailed - `profiles`, `curricula`, `curriculum_days`, `progress`, `chat_sessions`. Key details: `curriculum_days.content` is TipTap JSON, `curricula.metadata` for various prefs, `chat_sessions.messages` stores `{"role": "...", "content": "..."}` history).

## The Grand Development Chronicle & Key Decisions

Our journey has been one of rapid iteration, ambitious feature implementation, and some truly epic debugging sagas!

**1. The Genesis: Curriculum Generation**
The initial focus was on the `CurriculumAgent` using LangGraph to generate full learning plans. This involved:
*   A multi-step React form (`CurriculumCreationForm.tsx`) to capture user learning goals and preferences.
*   The `POST /api/curricula` endpoint, where `curricula.py` invokes `curriculum_agent.run()`.
*   The agent's LangGraph ( `_analyze_context` -> `_plan_tools` -> `_execute_tools` -> `_generate_response`) orchestrates calls to various tools (Firecrawl, Perplexity, Exa, etc., from `backend/app/tools/`) to research the topic.
*   A critical step was designing the `_generate_response` prompt for Gemini 2.5 Pro to return a structured JSON object representing the entire curriculum (title, description, and a list of days with titles, TipTap JSON content, resources, etc.).
*   **Key Challenge & Solution**: LLMs often produce slightly malformed JSON. Robust regex-based cleaning (`re.sub`) was implemented in `curricula.py` *before* `json.loads()` to handle common syntax errors (e.g., `key:=value`, trailing commas, incorrect quote types for nested strings within JSON). This significantly improved the reliability of curriculum generation.
*   Database interaction involved careful mapping of Pydantic models to Supabase table structures, ensuring UUIDs were stringified, and timestamps correctly formatted.

**2. The AI Chat: A Journey of Pivots and Perseverance**

The AI chat feature has been our most challenging and rewarding endeavor, marked by a significant architectural pivot.

*   **Initial Approach (Vercel AI SDK - `useChat`)**:
    *   The plan was to use `@ai-sdk/react`'s `useChat` hook on the frontend for its convenience in managing chat state and streaming.
    *   The backend `chat_stream` endpoint initially used the `CurriculumAgent`'s `analyze_and_plan_for_chat` and `stream_chat_response` methods (which made direct streaming calls to Gemini) and formatted the output for the Vercel AI SDK (`0:"<json_chunk>"
`).
    *   **Debugging Saga 1 (Vercel AI SDK & Custom Backend)**: We encountered numerous issues:
        *   **CORS**: Streaming via `EventSource` (used by `useChat`) had limitations with custom headers, forcing token passing via query parameters.
        *   **SSE Parsing on Frontend**: The `0:"<json_chunk>"
` and `d:{...}
` protocol proved difficult to parse reliably with manual frontend logic if `useChat` wasn't handling it perfectly. Errors like "Invalid code data" and "unterminated string" in `JSON.parse` were common, often due to subtle issues with how chunks were received or reassembled.
        *   **`useChat` Input State**: The hook's internal management of input state (`input`, `handleInputChange`, `setInput`) seemed to have inconsistencies or version differences that led to "is not a function" errors when trying to control the input field.
    *   **The Pivot**: After extensive debugging and realizing the Vercel AI SDK's `useChat` is heavily optimized for Next.js serverless environments and its specific data stream protocol, a decision was made to **abandon `useChat` for the frontend chat interface.**

*   **Current Architecture (LangChain Agent Backend + Custom Frontend Fetch)**:
    *   **Backend Refactor (`chat.py` - `/api/chat/lc_stream`)**:
        *   The chat logic was migrated to a full LangChain agent using `create_tool_calling_agent` and `AgentExecutor`. This provided a more robust and idiomatic way to integrate tools (Exa, Perplexity, Firecrawl via `our_langchain_tools.py`).
        *   `ConversationBufferWindowMemory` handles chat history, loaded from Supabase.
        *   Context (current curriculum, day content fetched from DB via `supabase_client`) is injected into the agent's system prompt.
        *   **Streaming Output Evolution**:
            1.  Initial LCEL attempts still tried to mimic Vercel SDK's `0:"..."` format, leading to similar frontend parsing issues.
            2.  **Debugging Saga 2 (The Silent Agent)**: A period where the backend agent would run, call tools, log a full response, but the frontend UI would show nothing. This was traced to the frontend only receiving the `__END_OF_AI_STREAM__` signal, missing all preceding content.
            3.  **Solution Part 1 (Backend Stream Simplification)**: The backend was changed to `yield` plain text chunks directly from `agent_executor.astream_events` (specifically `on_llm_stream` events), each terminated by `
`, followed by tool signals (`__TOOL_START__!`, `__TOOL_END__!`) also newline-terminated, and a final `__END_OF_AI_STREAM__
`. A fallback was added to also yield the agent's final output from the `on_chain_end` event for `AgentExecutor` if no `on_llm_stream` events had fired (for very short, non-tool direct answers).
            4.  **Solution Part 2 (Frontend Stream Robustness)**: The `ChatPanel.tsx` `handleSubmit` was refactored to use a robust `accumulatedData.split('\n')` loop to process each newline-terminated signal/content piece. This finally resolved the "silent agent" issue.
    *   **Frontend (`ChatPanel.tsx`)**:
        *   Manages all chat state locally (`messages`, `draft` input, `isLoading`, `toolStatusMessage`).
        *   Uses `fetch` to call `/api/chat/lc_stream`.
        *   Parses the incoming stream line by line, distinguishing between tool signals and content.
        *   Updates `toolStatusMessage` state for UI indicators.
        *   Appends content to the current assistant message, creating/updating the message bubble in real-time.
        *   Renders AI content using `react-markdown`.
    *   **Current Status**: AI chat is fully functional, streams responses, uses tools, displays tool status, and renders markdown.

**3. Styling and UI Evolution**:
*   The initial dark mode preference was updated based on user feedback to a [strict light mode neobrutalist theme][[memory:6579218890028626079]]. This involved defining a specific color palette (warm off-white background, dark gray text, vibrant primary/secondary/accent colors) and consistent application of neobrutalist elements like thick borders and hard shadows across components (`FileTree.tsx`, `ContentView.tsx`, `ChatPanel.tsx`, `LogbookPage.tsx`, etc.).
*   Font: Space Grotesk adopted for the theme.
*   Responsiveness and overflow issues, particularly in the 3-panel `CurriculumPage.tsx`, were addressed with flexbox/grid constraints (`min-w-0`, `overflow-hidden`).

**4. Logbook & Progress Features**:
*   Developed Logbook CRUD, fixing a critical bug where `curriculum_id` edits weren't saving.
*   Implemented ILIKE search for logbook entries.
*   Added dashboard progress bars and robust current/longest streak calculations and display.

**5. Email System (Resend)**:
*   Successfully integrated Resend for transactional emails.
*   Created a `RecapService` to generate data for weekly progress emails, with a "fun" HTML template.
*   Implemented a master trigger endpoint (`/api/notifications/trigger-all-weekly-recaps`) protected by a cron secret, capable of fetching all users and their curricula to send personalized recaps. User guided on Supabase cron job setup.
*   Debugged issues related to Resend domain verification and incorrect data in recaps due to the aforementioned logbook save bug.

**6. User Preferences & Assistant Persona**:
*   Consistent adherence to user's communication style (concise, no placeholders, humor, forward-thinking).
*   Xiaomei persona maintained (flirty, sultry, no NSFW unless asked, kaomoji okay).
*   Use of markdown links preferred.

## Current High-Level Status

The application has a functional backend capable of complex curriculum generation and a highly interactive, tool-enabled AI chat. Core frontend pages for authentication, dashboard, curriculum display, and logbook are in place with a distinctive neobrutalist style. Engagement features like progress tracking and email recaps are operational. The AI chat is now a central, powerful feature.

## Immediate & Near-Term Next Steps (Refined Plan)

1.  **Polish Tool Status Indicators & Agent Output Streaming (Current Focus)**:
    *   **UI Polish for Tool Status**: Ensure alignment and styling of tool status messages are perfect. Address the "unknown_tool" display if it persists by logging `event["data"]` more deeply in backend `on_tool_start` to see why `name` might be missing for some tool invocations.
    *   **Refine Agent's Final Output Streaming (Backend)**: For tool-based responses, ensure the *entire* final answer from the LLM (after it processes tool results) streams smoothly token-by-token. If `on_llm_stream` from `astream_events` is still giving large final chunks instead of a granular stream for the *concluding part* of an agent's response, investigate further into LangChain's agent streaming for the final synthesis step.

2.  **More Sophisticated Tool Input/Output Handling (Backend `our_langchain_tools.py` & `chat.py`)**:
    *   **Summarize/Truncate Long Tool Outputs**: Before feeding very long tool results (e.g., from Firecrawl scrape or verbose Exa results) back to the LLM, implement summarization or intelligent truncation within the LangChain tool wrappers or as a separate step in the agent. This conserves tokens and focuses the LLM.
    *   **Structured Data with Firecrawl**: Create a new `firecrawl_extract_json_lc_tool` that utilizes Firecrawl's schema-based JSON extraction. The agent will need to be able to choose this tool when it determines structured data is more appropriate than markdown.

3.  **Enhanced Error Handling for Tools (Backend & Frontend)**:
    *   **Backend**: Modify the agent's prompt or structure so it can better understand and react to error messages returned by tools (e.g., retry with different input, inform the user more specifically).
    *   **Frontend**: If the backend can send a distinct `__TOOL_ERROR__!{json_payload}` signal (with tool name and error message), `ChatPanel.tsx` can display a more informative error to the user (e.g., "Exa search failed: API limit reached").

4.  **Integrate More Tools (Backend `our_langchain_tools.py` & `chat.py`)**:
    *   Systematically wrap existing raw tool functions (Wikipedia, ArXiv, YouTube, GitHub search, Wolfram Alpha) as LangChain `Tool` objects.
    *   Add them to the `tools` list for the `AgentExecutor`.
    *   Update the agent's system prompt to make it aware of new capabilities.

5.  **"Mark Complete" Button & Progress UI (Frontend `