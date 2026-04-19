# Lamppost — লেম্পোস্ট

AI-powered interactive classroom. Fork of OpenMAIC (Tsinghua University). Extends OpenMAIC with a pre-computed Q&A bank, multi-model routing, Bangla localization, and curriculum management.

## IMPORTANT: Do NOT break OpenMAIC

This is a FORK. All original OpenMAIC files in `app/`, `lib/`, `components/` MUST continue working. Add new modules alongside existing ones. Never rewrite or delete OpenMAIC code — only extend.

## Architecture (non-negotiable)

1. **Opus generates lessons + Q&A bank** (one-time, via Batch API) → stored in Supabase
2. **Embedding search** handles 95% of student interactions (pgvector similarity) → zero LLM cost
3. **Fallback LLM** (Sonnet/Haiku) handles only unmatched questions → pennies
4. **Flywheel**: unmatched questions get batched nightly → Opus generates new Q&A entries → bank grows

The Q&A bank is the core product. Every design decision serves it.

## Tech stack

- Next.js 16 / React 19 / TypeScript 5 (strict) / pnpm
- Tailwind CSS 4 + shadcn/ui + Radix (OpenMAIC convention)
- Zustand for client state (OpenMAIC convention)
- LangGraph 1.1 for multi-agent orchestration (OpenMAIC convention)
- Supabase (PostgreSQL 16 + pgvector + Auth + Storage + Edge Functions)
- Ollama for local embeddings (nomic-embed-text) and offline models (Gemma 3)

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # dev server on localhost:3000
pnpm build            # production build
pnpm typecheck        # run tsc --noEmit
pnpm lint             # eslint
```

## Code style

- ES modules (import/export), never CommonJS (require)
- Destructure imports: `import { useState } from 'react'`
- Strict TypeScript — no `any`, no `@ts-ignore`
- Use `type` for type-only imports: `import type { Lesson } from './types'`
- Async/await, never raw `.then()` chains
- Error handling: always try/catch around API calls and DB queries
- File naming: kebab-case for files (`qa-bank.ts`), PascalCase for components (`QABankSearch.tsx`)

## Project structure — what goes where

```
app/api/qa-bank/      → Q&A bank search, generation, flywheel endpoints
app/api/curriculum/    → Curriculum ingestion, chapter management
app/api/translate/     → Bangla translation pipeline
lib/qa-bank/           → Core Q&A engine (generator, embedder, search, router)
lib/classroom-engine/  → Smart interaction handler (match → serve or escalate)
lib/curriculum/        → PDF parsing, NCTB/Cambridge content ingestion
lib/translate/         → Gemini translation, Bangla utilities
lib/db/                → Supabase client, queries, migrations
scripts/               → CLI tools for batch operations
```

## Database

PostgreSQL via Supabase with pgvector extension. Key tables:
- `curricula` → `subjects` → `chapters` → `lessons` (content hierarchy)
- `qa_bank` — the Q&A entries with `question_embedding vector(768)`
- `unmatched_questions` — feeds the flywheel
- `student_interactions` — logs every interaction for analytics
- Always enable RLS on student-facing tables

## Model routing

| Task | Model | Why |
|------|-------|-----|
| Lesson generation | `claude-opus-4-6` | Best pedagogy, one-time cost |
| Q&A bank generation | `claude-opus-4-6` | Comprehensive coverage |
| Classroom fallback | `claude-sonnet-4-6` | Quality real-time responses |
| Quiz grading | `claude-haiku-4-5` | Simple classification |
| Translation (→ Bangla) | `gemini-3-flash` | Best Bangla quality |
| Embeddings | `nomic-embed-text` (Ollama) | Local, free, 768-dim |
| Offline classroom | `gemma3:12b` (Ollama) | Zero cost, school deploy |

## Q&A bank similarity threshold

- `>= 0.85` cosine similarity → serve from bank (cost: $0)
- `< 0.85` → escalate to fallback LLM
- Always log the interaction regardless of resolution path
- Always save unmatched questions for flywheel processing

## Bangla rules

- Content language: Opus generates English → Gemini translates to Bangla
- UI locale: `bn-BD` alongside existing `en-US` and `zh-CN`
- Font: Noto Sans Bengali, Hind Siliguri fallback
- Line height: minimum `leading-relaxed` (1.625) for Bangla text
- Number system: configurable — Bengali numerals (০১২) or Western (012)
- Text direction: LTR (same as English)

## Bangla Educational Style Layer

Opus generates Q&A bank content using a Bangla pedagogical style guide so answers feel like a Bangladeshi teacher wrote them, not a foreign AI.

- The style guide is NOT content — it's presentation patterns extracted from Bangladeshi guidebooks (Panjeree, Lecture, Nobodoot style)
- Lives at `lib/qa-bank/prompts/bangla-style-guide.ts`
- Defines: answer structure per mark allocation (1/2/3/5/10-mark), Bangla transitional phrases (অর্থাৎ, সুতরাং, অতএব, যেমন), diagram-first conventions, key-term underlining patterns, numbered sub-point formatting with Bengali numerals, and the formal-term-then-English-bracket pattern (e.g. `বলবিদ্যা (Mechanics)`)
- Injected into the Opus Q&A generation system prompt alongside `QA_BANK_GENERATION_SYSTEM_PROMPT`
- **Content comes from NCTB textbooks (original). Style comes from the guide. Never copy guidebook content — only learn the voice.**

## Environment variables

See `.env.example` for all required vars. Critical ones:
- `ANTHROPIC_API_KEY` — Claude (generation + fallback)
- `GOOGLE_API_KEY` — Gemini (translation) + Google TTS (Bangla voice)
- `OLLAMA_BASE_URL` — local embeddings + offline models
- `NEXT_PUBLIC_SUPABASE_URL` + keys — database
- `QA_SIMILARITY_THRESHOLD` — defaults to 0.85

## Portal architecture (Phase A)

Three route trees, each with its own layout, auth model, and design language:

- `app/(marketing)/` — public landing, pricing, about (public)
- `app/(onboarding)/` — pre-signup `/try` → `/signup` → `/personalize` (public, anonymous session cookie)
- `app/app/` — student portal (authenticated student/parent)
- `app/admin/` — admin portal (role-gated; see Admin role model below)

### Admin sections (9)

`/admin` Overview, `/admin/users`, `/admin/billing`, `/admin/content` (+ `content/generate` batch form + `content/[chapterId]` three-panel read-only detail in Step 6), `/admin/flywheel` (+ `flywheel/proposed` + `flywheel/health`), `/admin/costs` (+ `costs/calculator`), `/admin/system` (+ `system/audit`), `/admin/notifications`, `/admin/team`.

Sidebar nav is defined in `app/admin/layout.tsx` and filtered by `canAccessAdminSection(session.role, section)` from `lib/auth/roles.ts`.

### Admin API auth guards

Admin-sensitive API routes use `requireAdminRole(minRole)` from `lib/auth/admin-guard.ts`. The helper takes a minimum role and enforces a synthetic hierarchy (super_admin=100, content_editor=50, support_agent=40, finance_viewer=30, infra_engineer=30, read_only=10). Returns a 403 NextResponse on failure rather than throwing, so routes can early-return without try/catch.

Gated endpoints:

| Endpoint | Minimum role | Reason |
|---|---|---|
| `POST /api/qa-bank/generate` | `content_editor` | Drives Opus spend |
| `POST /api/curriculum/batch-generate` | `content_editor` | Drives Opus spend |
| `GET /api/qa-bank/stats` | `read_only` | Read-only analytics, any admin |

The hierarchy is synthetic because the underlying role model in `lib/auth/roles.ts` is section-scoped, not strictly hierarchical. For endpoints whose permission boundary doesn't line up with "content or above," prefer section-scoped gating via `canAccessAdminSection`. The synthetic hierarchy is a pragmatic choice for the content-write endpoints shipped in Step 6; move to per-section gating if new endpoints need non-content-shaped permissions.

Admin page routes (under `app/admin/*`) continue to rely on the combination of `proxy.ts` (auth required) + `admin/layout.tsx`'s `isAdminRole` check. The API guard is additive — an endpoint that also sits behind the proxy gets both.

## Parent weekly email (Step 7)

The `/api/cron/parent-weekly` route sends a short weekly summary every Sunday 10 AM Asia/Dhaka (`0 4 * * 0` UTC, configured in `vercel.json`). Rules the implementation follows:

- **Real data only, no placeholders.** The template surfaces interactions count, chapters touched, Q&A hit rate, streak days, rate-limit hits, and the most active chapter title — all computed from real `student_interactions` rows. If we don't track a metric today, it does not appear in the email. "Coming soon" lines erode trust faster than a lean honest template.
- **One email per parent, one template for both single-student and multi-student cases.** The render function iterates over a `students` array; a household with two kids gets one email with two sections, not two emails.
- **Shadow parent users are real `users` rows with `auth_id = null` and `role = 'parent'`.** They cannot log in. Phase B's parent OTP flow should claim the existing row (set `auth_id`, confirm email) rather than create a duplicate — same pattern as Step 5's anon-session → authed-student conversion.
- **Unsubscribe is stateless HMAC.** Tokens embed `{parentId, issuedAt}` signed with `UNSUBSCRIBE_SECRET` (separate env from `CRON_SECRET` so they rotate independently). Tokens older than 90 days are rejected at verification time. See `lib/notifications/unsubscribe-token.ts`.
- **Postmark via `fetch`, not the SDK.** 10-second timeout on every send so a hanging Postmark request can't stall the cron. All transactional mail — parent weekly, Supabase Auth OTP (after the Step 7 dashboard migration) — uses the `lamppost-transactional` Postmark message stream. Broadcast / announcement mail should use a separate stream so deliverability reputation stays unified on the transactional side.
- **Cron dry-run.** Passing `?dryRun=true` (only useful with a valid `CRON_SECRET` bearer) runs the full query + render path but skips the Postmark call. Valuable for manual verification before Postmark is provisioned.
- **Graceful skip when Postmark is missing.** The cron still runs the query and logs "would have emailed N parents" even when `POSTMARK_SERVER_TOKEN` is absent. Returns 200, not 500 — we don't want cron-level monitoring to page on a known provisioning gap.
- **Courtesy welcome email on parent-link creation.** The `linkParentEmailAction` server action sends a one-shot welcome/opt-out email via the same Postmark infrastructure the moment a student adds a parent. This gives the parent a chance to unsubscribe before the first weekly email ever arrives.
- **BD-ISP deliverability.** `scripts/postmark-deliverability-smoke-test.ts` sends a test to a `--to` list and queries Postmark's Messages API for actual delivery status (not just "sent"). Always include at least one `@gmail.com` and one `@yahoo.com` address alongside `@grameenphone.net` / `@robi.com.bd` / `@banglalink.net` so you can isolate Postmark-config issues from BD-ISP-specific problems.
- **Supabase Auth email transport.** Migrate Supabase Auth OTP emails to use Postmark SMTP (configured in the Supabase dashboard → Auth → SMTP). Use the same `lamppost-transactional` stream and the same `POSTMARK_FROM_EMAIL`. Run the smoke test against real BD addresses before declaring the migration complete.

## Admin data queries

Admin metrics and admin-only reads live under `lib/db/queries/admin/*`, split by concern:

- `admin/overview.ts` — DAU/WAU, 30-day API spend series, Q&A hit rate, alerts (low-match / stuck / failed), flywheel health
- `admin/users.ts` — search (name/email/phone/UUID), user detail, recent interactions with `resolution_type`
- `admin/content.ts` — curriculum → subject → chapter tree, chapter detail, Q&A entries list, `needs_regeneration` flag (stored in `chapters.metadata.needs_regeneration`, no migration needed)

Flywheel health (`getFlywheelHealth`) surfaces on Overview even though the Flywheel section itself is still a skeleton — operators need visibility into whether the nightly cron is alive without the full section being built.

### Legacy creator flow — removed

The upstream OpenMAIC creator UI (`/admin/creator`, `/generation-preview`, `/classroom/[id]`, `/curriculum/*`) was deleted in Phase A Step 3. Lamppost's content pipeline is batch-driven via `/admin/content/generate`; the interactive creator is philosophically incompatible with Lamppost's pre-generated Q&A bank architecture. Rendering primitives (`components/slide-renderer/`, `components/whiteboard/`) and playback infrastructure (`lib/audio/`, `lib/media/`, `lib/pdf/`) were preserved for Step 4's student classroom.

Guards live in `proxy.ts` (Next.js 16 renames `middleware.ts` → `proxy.ts`). It uses `lib/auth/proxy-session.ts` to refresh the Supabase cookie and read the joined `users.role` on every request.

Server-side session helpers: `lib/auth/server.ts` (`getSession`, `requireSession`). Roles helper: `lib/auth/roles.ts`. Anonymous onboarding session cookie + CRUD: `lib/auth/anonymous.ts`. Anonymous → authenticated conversion: `lib/auth/migrate.ts` + SQL RPC `rpc_convert_onboarding_session`.

## API key policy

**End users NEVER see or configure API keys.** All LLM, TTS, ASR, PDF, Image, Video, and Web Search provider keys live in `process.env` and are validated at boot by `lib/config/server.ts` (Zod schema). Import `serverConfig` wherever a key is needed. Client code must never reference a key.

The admin System section may surface provider *status* (`providerStatus` from `lib/config/server.ts`) as read-only booleans + per-category counts — never the keys themselves.

BYOK purge completed in Phase A Step 3 (commit `484b725`): the settings UI for keys, the Zustand provider slices, the API routes that parsed keys from client bodies/headers, and the entire OpenMAIC creator-flow surface were all deleted. Any new API route that accepts a key from a request body or header is a regression.

## Admin role model

`users.role` enum values: `student`, `parent`, `super_admin`, `content_editor`, `support_agent`, `finance_viewer`, `infra_engineer`, `read_only`.

Admin section visibility (`lib/auth/roles.ts` → `ADMIN_SECTION_ACCESS`):

| Role | Sections |
|------|----------|
| super_admin | All 9 sections |
| content_editor | content, flywheel |
| support_agent | users, billing |
| finance_viewer | billing, costs |
| infra_engineer | system, costs |
| read_only | All 9 sections (no write) |

`isAdminRole()` gates the admin route tree. `canAccessAdminSection(role, section)` gates sidebar links and API routes.

## Users table (extension-per-role pattern)

- `users` — root profile (id, auth_id, role, display_name, phone, email, language_preference, theme_preference, created_at, updated_at)
- `students` — 1:1 extension where `students.id = users.id`, holds curriculum/grade/target_exam_date/daily_minutes_commitment
- `parents` — 1:1 extension + `parent_student_links` join table
- `admin_profiles` — 1:1 extension for admin-role users (assigned_team, permission_overrides, is_active)

Never add role-specific columns to `users`. Add them to the matching extension.

## Rate limiting conventions

`user_usage_daily` keys off either `user_id` (authenticated) or `anonymous_session_token` (anonymous onboarding session). A CHECK constraint enforces exactly one of the two keys is set per row.

- Anonymous cap: `RATE_LIMIT_ANON_SAMPLE` (default 10 interactions on the sample chapter)
- Authenticated cap: `RATE_LIMIT_FREE_DAILY` (default 15/day)
- Paid tier: currently NOT distinguished — all authenticated users use the free-tier cap. When billing ships (Phase B+), add a `users.tier` column and branch the cap.
- The limiter is **soft** by design: `lib/db/queries/user-usage.ts` does a check-then-update, not an atomic Postgres RPC. The effective cap is `cap ± concurrency` — acceptable for UX caps, not billing-grade. Tighten with a Postgres function if strict enforcement is ever needed.
- On cap, `lib/classroom-engine/interaction-handler.ts` throws `RateLimitError` (from `lib/classroom-engine/types.ts`) carrying `scope: 'anon' | 'free'` and `limit: number`. API routes catch this and return HTTP 429 with a typed payload so the client can render appropriate messaging.
- The rate limit is checked **before** any embedding or LLM work, so Q&A-bank-only interactions still count toward the cap (intentional — anon's sample chapter is a UX window, not a cost window).
- Daily window is **Asia/Dhaka**, not UTC — both `user_usage_daily.date` (migration 010 default) and `lib/db/queries/user-usage.ts#todayInDhaka` roll over at Bangladesh midnight. The 429 response sets `Retry-After` (integer seconds) and a `resetAt` ISO field in the body, both pointing at the next Asia/Dhaka midnight.

## Classroom interaction identity

`handleStudentInteraction` takes an `Identity` discriminated union (exported from `lib/classroom-engine/types.ts`):

```ts
type Identity =
  | { type: 'anon'; sessionToken: string; sessionId: string }
  | { type: 'authed'; studentId: string; sessionId: string };
```

The invariant is load-bearing:
- `sessionId` is **always** a UUID. It maps to `student_interactions.session_id` (UUID column). For anon it's `onboarding_sessions.id`; for authed it's the auth session's UUID.
- `sessionToken` (anon only) is the opaque nanoid from the `lp_onb` cookie. It maps to `user_usage_daily.anonymous_session_token` (TEXT column). Never use it for logging — it's the wrong column type and it's the cookie secret.

API routes that call the interaction handler must construct `Identity` from their own auth context (for authed) or from `getOrCreateOnboardingSession()` (for anon). The `ClassroomPlayer` component takes the same `Identity` shape as a prop and forwards it to `/api/qa-bank/search`.

### Identity-flow invariants (funnel → authed migration)

Three rules formalized in Step 5; violating any of them silently corrupts the anon→authed funnel:

- **Anon interactions carry `onboarding_sessions.id` in `student_interactions.anonymous_session_id`** (not only in `session_id`). Migration 013's CHECK constraint requires exactly one of `student_id` / `anonymous_session_id` to be set per row. The interaction handler passes `anonymousSessionId: identity.sessionId` through `logClassroomInteraction` for every anon turn.
- **OTP verify preserves `anonymous_session_id`** via `rpc_convert_onboarding_session` (migration 014). The RPC re-attributes anon rows to the new `student_id` and clears `anonymous_session_id` in one transaction, so funnel analytics can follow a visitor from their first sample question through their eventual paid subscription.
- **Language preference is inferred from curriculum at conversion time**, not asked as a personalize question. SSC/HSC → `bn-BD`, Cambridge → `en-US`. The Profile section (Step 6+) exposes a toggle for students who want something different; do not add a language question to the onboarding funnel.

## Onboarding flow

Five-minute path from marketing landing to `/app`:

```
(marketing)/            → "Try a free lesson" CTA
(onboarding)/try        → curriculum picker (pickCurriculumAction)
(onboarding)/try/[c]    → subject picker (pickSubjectAction)
(onboarding)/try/lesson/[sampleId]   → anon classroom (Step 4)
(onboarding)/signup     → phone/email OTP (sendOtpAction + verifyOtpAction)
(onboarding)/personalize → goal + daily minutes + exam date (savePersonalizeAction)
app/                     → authed lobby
```

Key decisions:

- **Phone OTP is Supabase-handled**: `supabase.auth.signInWithOtp({ phone })` sends via Twilio credentials configured in the Supabase dashboard, not Lamppost env vars. If the phone provider isn't configured, `classifySendError` detects it by message substring (provider / twilio / sms provider) and returns `reason: 'sms_not_configured'`; the UI silently switches to email. Rate-limit errors are detected separately by status 429 or `rate limit` in the message so they aren't misread as config issues.
- **Email OTP uses Supabase built-in sender** through Step 5. Step 7 will migrate Supabase Auth to a Postmark SMTP transport (to fix BD-ISP deliverability) — that migration must include a smoke test against real `@gmail.com`, `@yahoo.com`, Grameenphone / Robi / Banglalink addresses before closing.
- **`verifyOtpAction` handles three paths explicitly**: (1) new user + anon session → `convertAnonymousToUser` → `/personalize`; (2) new user + no anon session → `ensureUserRow` upserts → `/personalize`; (3) returning user (users row exists with `students.study_goal` set) → skip conversion → `/app`.
- **"Coming soon" subject picks still persist** `curriculum_choice` + `subject_choice` to `onboarding_sessions` before rendering the placeholder. Dead clicks are dead funnel data.
- **`/personalize` is guarded at the page level** via `getSession()` + study_goal check. No session → redirect to `/signup`. Session + study_goal already set → redirect to `/app` (returning users don't re-personalize).
- **Personalize answers are independent**: each question has its own Skip; a partial answer writes only the answered fields.

## What NOT to do

- Do NOT generate lessons in Bangla directly — always English first, then translate
- Do NOT call Opus for real-time classroom interactions — that's what the Q&A bank is for
- Do NOT store embeddings in JSON files — use pgvector in Supabase
- Do NOT delete or modify existing OpenMAIC files under `lib/generation/`, `lib/orchestration/`, `lib/playback/`, `lib/action/`
- Do NOT expose LLM/TTS/ASR/PDF/Image/Video/Web Search provider keys to Client Components — keys are server-only via `serverConfig`
- Do NOT accept API keys from request bodies or headers in new API routes — use `serverConfig`
- Do NOT write `users`-table columns for role-specific data — use the matching extension table (`students`, `parents`, `admin_profiles`)
- Do NOT skip interaction logging — the flywheel depends on complete data
- Do NOT create `middleware.ts` at repo root — Next.js 16 uses `proxy.ts` (export `proxy`, `proxyConfig`)

## References

- Full architecture: `docs/architecture.md` (read on demand — Opus Q&A prompt, full DB schema, interaction flow)
- OpenMAIC docs: @README.md
- Database schema: @supabase/migrations/
