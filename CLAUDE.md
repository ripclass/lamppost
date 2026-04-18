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

Guards live in `proxy.ts` (Next.js 16 renames `middleware.ts` → `proxy.ts`). It uses `lib/auth/proxy-session.ts` to refresh the Supabase cookie and read the joined `users.role` on every request.

Server-side session helpers: `lib/auth/server.ts` (`getSession`, `requireSession`). Roles helper: `lib/auth/roles.ts`. Anonymous onboarding session cookie + CRUD: `lib/auth/anonymous.ts`. Anonymous → authenticated conversion: `lib/auth/migrate.ts` + SQL RPC `rpc_convert_onboarding_session`.

## API key policy

**End users NEVER see or configure API keys.** All LLM, TTS, ASR, PDF, Image, Video, and Web Search provider keys live in `process.env` and are validated at boot by `lib/config/server.ts` (Zod schema). Import `serverConfig` wherever a key is needed. Client code must never reference a key.

The admin System section may surface provider *status* (`providerStatus` boolean map from `lib/config/server.ts`) as read-only signals — not the keys themselves.

BYOK removal is Phase A Step 3 — settings UI for keys, Zustand provider slices, and API routes that accept keys are all being deleted.

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

## Rate limiting

`user_usage_daily` tracks both authenticated users (by `user_id`) and anonymous onboarding sessions (by `anonymous_session_token` + IP hash). A CHECK constraint enforces exactly one of the two keys is set per row. Default caps: anonymous = 10 interactions per sample chapter, free-tier = 15/day, paid-tier = unlimited (override via `RATE_LIMIT_*` env vars).

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
