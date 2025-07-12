# onemonth.dev MVP Completion Plan (2 Days)

## Day 1: Core Functionality

### Morning: Mobile Block & Generation Transparency
**Mobile Block (1 hour)**
- Auth page: Check viewport, show "Desktop-only" card if < 1024px
- Add redirect logic to curriculum/dashboard pages
- Simple card: "onemonth.dev is a desktop-only experience. Please visit on a wider screen."

**Generation Transparency (2 hours)**
- Preview modal after step 4:
  ```
  - "You're about to generate: {title}"
  - "Topic: {topic}, Goal: {goal}"
  - "This will take 3-5 minutes"
  - [Generate] → payment gate if not subscribed
  ```
- Progress polling (poll /curricula/{id} every 2s):
  - Backend: Add `generation_status` field to curriculum model
  - Show status updates in UI: "Researching...", "Planning Day X...", etc.

### Afternoon: Curriculum Editing
**Backend (2 hours)**
- PATCH /curriculum-days/{id} - Edit content
- PUT /curriculum-days/reorder - Bulk update day_numbers
- POST /curriculum-days - Add custom day
- DELETE /curriculum-days/{id} - Delete day
- POST /curriculum-days/{id}/regenerate - Regenerate with context

**Frontend (3 hours)**
- Edit mode toggle on each day card
- Markdown editor for content (textarea, not rich text)
- Drag-n-drop reordering (update titles automatically)
- Add/Delete day buttons
- Regenerate button with improvement prompt

### Evening: Practice Problems Schema
**Supabase Tables**
```sql
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  curriculum_id UUID REFERENCES curricula,
  day_id UUID REFERENCES curriculum_days,
  problems JSONB NOT NULL, -- [{question, options, answer, explanation}]
  responses JSONB DEFAULT '[]', -- [{problem_id, answer, correct}]
  score INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE practice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  session_id UUID REFERENCES practice_sessions,
  concept TEXT NOT NULL,
  mastery_level INTEGER DEFAULT 0, -- 0-100
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Day 2: Polish & Launch

### Morning: Practice Problems & Projects
**Practice Generation (3 hours)**
- POST /practice/generate endpoint
- Agent prompt: Generate 5-10 MCQ/short answer based on day content
- Store in practice_sessions, track responses
- Simple UI: Question cards with submit/next

**Enhanced Projects (1 hour)**
- Update curriculum agent prompts:
  - Projects span 3-5 days minimum
  - Include: Setup, milestones, deliverables
  - Real-world application focus

### Afternoon: Onboarding & Payments
**Onboarding Flow (2 hours)**
1. Sign up → Auto login
2. Welcome screen: "Let's create your first curriculum"
3. Guided creation form (same 4 steps)
4. Preview → Payment gate
5. Polar checkout: `https://polar.sh/pay/{product_id}`
6. Success → Generate curriculum

**Polar Integration (1 hour)**
- Webhook endpoint: /webhooks/polar
- Handle: subscription.created, subscription.cancelled
- Update user `subscription_status` in profiles table
- Gate features based on status

### Late Afternoon: Public Curricula
**Backend (1 hour)**
```sql
CREATE TABLE public_curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_curriculum_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL, -- Full snapshot
  author_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
- POST /curricula/{id}/publish
- GET /public/curricula/{id}

**Frontend (30 min)**
- Publish modal with warning
- Public view page (no auth required)
- Share URL: onemonth.dev/c/{id}

### Final Polish (1 hour)
- Test payment flow end-to-end
- Add loading states everywhere
- Error boundaries
- Update README with setup instructions

## Notes
- Weekly email cron: Post-MVP (use Supabase Edge Functions)
- Multiple chat sessions: Post-MVP
- No skip functionality - just complete/incomplete
- Markdown only, no rich text parsing complexity 

### ✅ Completed (so far)
- Desktop-only guard across routes
- Progress polling + status field
- Preview modal before generate
- Backend & UI for editing day content
- Regenerate Day endpoint (Gemini structured output)
- Chat agent brace-escaping fix (no more prompt errors)
- Day Re-ordering & Add/Delete Day UI (drag-drop, add/delete buttons)
- Practice Problems (backend + UI) ✅
  - POST /practice/generate endpoint with Gemini
  - Question cards UI with multiple choice, short answer, code
  - Self-grading flow with reveal answer/explanation
  - Score summary and retry functionality
- Project Support ✅
  - `num_projects` slider in creation form
  - Even distribution logic in agent prompt
  - `is_project_day` & `project_data` schema
  - Project-day UI + logbook prompt generator
  - Parsing robustness (json5 fallback)

### 🔜 Next Steps (remaining MVP scope)
1. **Onboarding Flow & Polar Payments** 🚧 _in progress_
   – Guided first-curriculum wizard  
   – Polar checkout & webhook → `subscription_status`
2. **Public Curricula Publishing**
   – POST /curricula/{id}/publish → view at /c/{id}
3. **Final Polish**
   – Loading states, error boundaries, README setup, smoke tests

> Time-box: ~10-12 hrs total (fits Day 2). Let's tackle re-ordering & add/delete UI next to fully close the editing feature. 🚀 