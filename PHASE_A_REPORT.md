# Lamppost — Phase A Execution Report

> **This report reflects state at the final Phase A commit. For current state, see `CLAUDE.md`.** Historical record, not a living document; do not attempt to keep it in sync with ongoing work.

---

## 1. Summary

Lamppost is a fork of OpenMAIC (Tsinghua University) extended for Bangladesh and global English-medium education. Phase A established the foundation: server-owned API keys, a student portal with a working anonymous-classroom magic moment, a five-screen onboarding funnel through phone/email OTP, a three-section admin portal for content and support ops, and a weekly Postmark-powered parent email. What follows is the execution record.

**Phase A at a glance:**

| | Value |
|---|---|
| Milestones shipped | 8 commits across 7 logical steps |
| Net diff | **+7,843 / −29,881 lines** (net −22,038) |
| Files touched | 213 |
| Migrations added | 10 (`005`–`014`) |
| New API routes | 5 (plus auth guards on 3 existing) |
| Tests | **47 / 47 passing** (from 21 at Phase A start) |
| Typecheck | **clean** |
| Lint | **0 errors**, 3 warnings (all in upstream OpenMAIC code, untouchable per fork policy) |
| Fork policy | `lib/action/`, `lib/generation/`, `lib/orchestration/`, `lib/playback/` untouched (verified) |

---

## 2. Per-milestone deliverables

Each milestone below is one git commit on the `ripclass/main` branch. Final Phase A head: **`6142892`**.

### Step 1 — Foundation (`9679fad`)
*21 files, +1,026 / −1*
- 10 new Supabase migrations (`005`–`014`): users root table, students/parents/admin extensions, onboarding sessions, user_usage_daily, admin audit log, study plans, interactions anon column + CHECK constraint, RPC for anonymous→authed conversion.
- `lib/config/server.ts` — Zod-validated single source of truth for every server env var. Boot-time fail-fast if required keys are missing.
- `lib/auth/` — `proxy-session.ts` (refreshes Supabase cookies on every request, reads `users.role`), `server.ts` (Server Component / Action helpers), `roles.ts` (admin section access map), `anonymous.ts` (nanoid-backed cookie session), `migrate.ts` (anon→authed RPC wrapper).
- `proxy.ts` — Next.js 16 `proxy.ts` (not `middleware.ts`) guarding `/app/*` and `/admin/*`.
- `.env.example` expanded with every new key.

### Step 2 — Route tree refactor (`25f77c0`)
*32 files, +733 / −65*
- Three route groups: `(marketing)`, `(onboarding)`, `app/app/` (student portal).
- `app/admin/` scaffolded as 9 sections (overview, users, billing, content, flywheel, costs, system, notifications, team) with a shared layout using `canAccessAdminSection` for role filtering.
- OpenMAIC's legacy admin root moved to `app/admin/creator/` (hidden, not in sidebar).
- Student portal layout with sidebar-on-desktop / bottom-tab-on-mobile.

### Step 3 — Creator-flow deletion + BYOK purge (`484b725` + `12cc04b`)
*107 + 13 files, +218 / −29,339 + +145 / −45*
- Removed the OpenMAIC creator-flow surface: 4 route trees, 14 API routes, ~40 components, 3 hooks, 5 server utils. Preserved rendering primitives (`components/slide-renderer/`, `components/whiteboard/`), audio/media/PDF playback, and OpenMAIC upstream modules.
- Eliminated BYOK: zero `process.env.ANTHROPIC` anywhere in the codebase outside `serverConfig`; deleted API-key settings UI, Zustand provider slices, and routes that parsed keys from request bodies/headers.
- `RateLimitError` with `scope: 'anon' | 'free'` + `limit: number` typed-thrown from `handleStudentInteraction`. Soft check-then-update rate limiter keyed by `user_id` or `anonymous_session_token`, Asia/Dhaka date boundary.

### Step 4 — Student portal MVP + sample fixture (`7e9435b`)
*17 files, +1,271 / −257*
- Anonymous classroom at `app/(onboarding)/try/lesson/[sampleId]/page.tsx`. Identity-agnostic `<ClassroomPlayer>` split into `ChapterHeader` / `QuestionInput` / `ResponseStream` sub-components.
- `Identity` discriminated union — the load-bearing invariant that separates the UUID used for `student_interactions.session_id` from the nanoid used for `user_usage_daily.anonymous_session_token`.
- `/api/qa-bank/search` returns HTTP 429 with `{ code, scope, limit, resetAt }` + `Retry-After` integer seconds anchored to next Asia/Dhaka midnight. Rate-limit hits log to `student_interactions` with `resolution_type='rate_limit_block'` for funnel analytics.
- Sample chapter fixture: SSC Physics Ch. 4 *Work, Energy and Power*, 35 Q&A entries (sorted by question for deterministic diffs) + cached embeddings JSON. `scripts/seed-sample-chapter.ts --regenerate-embeddings` refreshes via Ollama.
- `QA_SIMILARITY_THRESHOLD` consolidated to `serverConfig` only (was triple-sourced).

### Step 5 — Onboarding + OTP + anon→authed migration (`bcbdd70`)
*18 files, +1,122 / −49*
- Full funnel: `/try` → `/try/[c]` → `/try/lesson/[sampleId]` → `/signup` → `/personalize` → `/app`.
- Phone + email OTP via Supabase Auth (Twilio lives in Supabase dashboard, not our env). Narrow detection of "SMS provider not configured" → silent fall-back to email tab. Rate-limit errors surfaced distinctly.
- `verifyOtpAction` handles three paths explicitly: new-user-with-anon-session, new-user-without-session, returning-user.
- Language preference inferred from curriculum (SSC/HSC → `bn-BD`, Cambridge → `en-US`). NOT a personalize question.
- Step 4 regression fix: `logClassroomInteraction` now writes `anonymous_session_id` for anon turns, satisfying migration 013's CHECK constraint (discovered during Step 5 pre-code discovery, would have broken every anon insert once migrations applied).
- "Save progress" chip on the classroom chrome (anon-only, subtle) paired with the rate-limit banner's hard-stop CTA.

### Step 6 — Admin portal (`bcc229a`)
*25 files, +1,861 / −267*
- `requireAdminRole(minRole)` in `lib/auth/admin-guard.ts` — synthetic role hierarchy (super_admin=100 … read_only=10). Split into its own module so vitest can mock `getSession` at the boundary.
- **Overview** (`/admin`) — alerts (low match-rate, stuck, failed generations), 5-metric trend strip (DAU, WAU, Q&A hit rate, interactions 30d, 30-day API spend with daily spark line), flywheel-health widget (so the flywheel cron's pulse is visible even though `/admin/flywheel/*` stays a skeleton).
- **Content** (`/admin/content`, `/admin/content/[chapterId]`, `/admin/content/generate`) — tree with status badges, three-panel read-only detail (metadata / charts / Q&A entries), "Flag for regeneration" button that toggles `chapters.metadata.needs_regeneration`.
- **Users** (`/admin/users`, `/admin/users/[userId]`) — search by name/email/phone/UUID, results table, user detail with `resolution_type` column on recent interactions.
- Three previously-ungated API routes now require role-appropriate access (`POST /api/qa-bank/generate`, `POST /api/curriculum/batch-generate`, `GET /api/qa-bank/stats`).
- Legacy `/admin/analytics` and `/admin/generate` deleted; reusable charts moved to `components/admin/charts/`.
- Admin queries split into `lib/db/queries/admin/{overview,users,content}.ts`.

### Step 7 — Parent weekly email cron (`6142892`)
*16 files, +1,625 / −16*
- `/api/cron/parent-weekly` — CRON_SECRET-gated, graceful-skips with "would-have-emailed N parents" when Postmark is absent, supports `?dryRun=true` for pre-provisioning rehearsal.
- Real-data-only template: interactions count, chapters touched, Q&A hit rate, streak days (Asia/Dhaka), rate-limit hits, most active chapter. Spec-listed placeholder fields (study hours, quiz avg, strong/weak topics, planned chapters) explicitly rejected — placeholder values erode trust faster than a lean honest template.
- One email per parent (not per link) with single-student and multi-student cases rendered from a single flexible template.
- Shadow parent users: `users` row with `role='parent'`, `auth_id=NULL`. Cannot log in. Phase B parent OTP claims the existing row via the same anon→authed pattern used for students.
- Stateless HMAC unsubscribe: `UNSUBSCRIBE_SECRET` (separate env from `CRON_SECRET`), tokens embed `{parentId, issuedAt}`, reject tokens older than 90 days.
- Postmark via `fetch` (no SDK), 10s timeout, `lamppost-transactional` stream. **XSS bug caught during tests** — student names needed escaping in the outer HTML paragraphs, not just inside the student section card.
- Welcome/opt-out email fires on parent-link creation so the parent has agency before the first weekly arrives.
- `scripts/postmark-deliverability-smoke-test.ts` — sends + polls Postmark's Messages API for actual delivery status, intended to be run with Gmail/Yahoo baselines alongside BD ISP addresses.

### Step 8 — Finalization (this commit)
*Cleanup commit*
- Fixed 2 Lamppost lint warnings; 3 remaining warnings are in upstream OpenMAIC code.
- Updated ~12 stale "ships in Phase A Step N" placeholder strings to user-facing "coming soon" or code-comment "deferred to Phase B" depending on audience.
- Added `pnpm test` to the Commands block in CLAUDE.md + a note explaining why 3 lint warnings persist.
- Shipped this report.

---

## 3. Fork policy verification

CLAUDE.md's non-negotiable rule: *"Do NOT delete or modify existing OpenMAIC files under `lib/generation/`, `lib/orchestration/`, `lib/playback/`, `lib/action/`."*

Run this command in a fresh clone to verify:

```bash
git log main --not ca642f0^ -- lib/action/ lib/generation/ lib/orchestration/ lib/playback/
```

Output: **empty**. No Phase A commit touched any of those paths. The last commit that touched `lib/action/` is `cce7087` (upstream OpenMAIC), which predates Phase A's starting commit `9679fad`.

---

## 4. Test state

47 vitest tests across 7 files — all passing.

| Area | Tests | File |
|---|---|---|
| Provider config / Zod boot validation | 14 | `tests/server/provider-config.test.ts` |
| Minimax AI provider | 4 | `tests/ai/minimax-provider.test.ts` |
| Minimax TTS model config | 3 | `tests/audio/minimax-tts-models.test.ts` |
| Admin API auth guards (Step 6) | 7 | `tests/auth/admin-api-guard.test.ts` |
| Unsubscribe token HMAC (Step 7) | 6 | `tests/notifications/unsubscribe-token.test.ts` |
| Parent email render + Postmark send (Step 7) | 9 | `tests/notifications/parent-email.test.ts` |
| Parent-weekly cron route (Step 7) | 4 | `tests/notifications/parent-weekly-cron.test.ts` |

Two tests caught real bugs during development:
- **Admin API guards test → live ungated endpoint**: `POST /api/qa-bank/generate` responded 200 to any caller before the guard shipped. Fixed in Step 6.
- **Parent-email XSS test → student names unescaped**: the outer HTML paragraphs interpolated `primaryName` without escaping. Fixed in Step 7.

Not covered: Next.js page rendering, Supabase RPC behavior, real Postmark/Twilio/Ollama integration. Integration tests against real external services are Phase B work.

---

## 5. Known issues + deferred work

### Deferred to Phase B

| Area | Status | Why deferred |
|---|---|---|
| Authed student classroom (`/app/classroom/[chapterId]`) | Skeleton | Requires slide-playback layer; building Lamppost's scene renderer is a full milestone on its own |
| Slide playback on top of `components/slide-renderer/` + `components/whiteboard/` | Not started | Scene-shape design, TTS cue point generation, whiteboard orchestration — each a rabbit hole |
| Student lobby "Continue" hero, weekly plan strip, recent activity | Skeleton | `study_plans.generated_schedule_json` has no generator yet |
| Student progress / history / help pages | Skeletons | Engagement surfaces, not blocking Phase A |
| Admin actions on user detail (refund, reset password, merge) | Not started | Needs audit-log infrastructure, confirmation flows, recovery paths |
| Full Billing / Flywheel / Costs / System / Notifications / Team admin sections | Skeletons | Step 6 deliberately shipped only the three operational sections |
| Curriculum Studio inline editing (Q&A entries, lesson scenes) | Not started | Version history, approval, conflict resolution — own milestone |
| Parent portal UI / parent OTP onboarding | Not started | Shadow-parent schema is primed; OTP claim flow is Phase B |
| `study_plans` generation algorithm | Not started | Punted in Step 5; nothing reads study_plans yet |
| Real-time batch-generation progress UI | Not started | Step 6 ships a start-batch button; live progress needs Vercel Queues or polling |
| BYOK paid-tier distinction for rate limiting | Not started | `RATE_LIMIT_FREE_DAILY` applies to all authed users; add `users.tier` when billing ships |

### Known limitations

- **BD-ISP email deliverability unverified.** The smoke-test script is ready; actual delivery to @grameenphone.net / @robi.com.bd / @banglalink.net has not yet been confirmed because Postmark DNS isn't configured.
- **Supabase Auth email transport still Supabase-default.** Migration to Postmark SMTP (for the same deliverability reason) is a dashboard change + smoke test, documented in CLAUDE.md and memory.
- **Twilio phone OTP dependent on Supabase dashboard config.** Code path detects "provider not configured" errors and falls back to email, but until Twilio creds land in Supabase, the phone tab is effectively a dead option.
- **Q&A generation endpoint is still a placeholder stub.** `/api/qa-bank/generate` currently returns a "Phase 2 — pipeline not implemented" response. The admin UI happily calls it; the pipeline itself needs to be wired.
- **Flywheel cron runs but hasn't been tested end-to-end against live unmatched questions.** Schema + cron + admin health widget are in place.
- **Rate limiter is deliberately soft** (check-then-update, not atomic). Effective cap is `cap ± concurrency`. Acceptable for UX caps; upgrade to a Postgres RPC if billing-grade enforcement is ever needed.

---

## 6. External provisioning checklist

**A new engineer should be able to work through this linearly and arrive at a running system.**

- [ ] **Clone the repo** and checkout `main`
- [ ] **Install dependencies**: `pnpm install` (requires Node ≥ 20.9, pnpm ≥ 10)
- [ ] **Create a Supabase project** with `pgvector` enabled. URL + anon + service-role keys go into `.env.local`.
- [ ] **Apply migrations**: `supabase db push` (applies `001` through `014`)
- [ ] **Copy `.env.example` to `.env.local`** and fill in at minimum:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY` (for fallback LLM)
  - `GOOGLE_API_KEY` (for Gemini translation, optional but recommended)
  - `OLLAMA_BASE_URL` (default `http://localhost:11434` works if Ollama runs locally)
  - `CRON_SECRET` (any sufficiently-random string; Vercel auto-sets this in production)
  - `UNSUBSCRIBE_SECRET` (separate random string for parent-email HMAC)
- [ ] **Install Ollama** and pull `nomic-embed-text` for local 768-dim embeddings:
  ```bash
  ollama pull nomic-embed-text
  ```
- [ ] **Seed the sample chapter**: `npx tsx scripts/seed-sample-chapter.ts --regenerate-embeddings` (first time; writes `scripts/fixtures/physics-ch4.embeddings.json` — commit it)
- [ ] **Configure Supabase Auth → Phone provider** with Twilio credentials in the Supabase dashboard (no env vars on our side).
- [ ] **Create a Postmark account**, configure the `lamppost-transactional` stream, verify sending domain DNS (SPF / DKIM / DMARC).
- [ ] **Set Postmark env vars** in `.env.local`: `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL`.
- [ ] **Run deliverability smoke test**: `npx tsx scripts/postmark-deliverability-smoke-test.ts --to you@gmail.com,you@yahoo.com,test@grameenphone.net,test@robi.com.bd,test@banglalink.net`. Gmail + Yahoo are baselines; BD ISP addresses isolate BD-specific issues from our Postmark config.
- [ ] **Configure Supabase Auth → SMTP** to use the same Postmark credentials + transactional stream + FROM address.
- [ ] **Verify dev boot**: `pnpm dev` → open `http://localhost:3000` → click "Try a free lesson" → pick SSC → pick Physics → land in the sample classroom → ask a question → verify the Q&A bank answers (not the fallback).

---

## 7. Dev-boot sequence (copy-pasteable)

```bash
git clone https://github.com/ripclass/lamppost.git
cd lamppost
pnpm install
cp .env.example .env.local
# Edit .env.local with the required keys — see Section 6

# With Ollama running locally:
ollama pull nomic-embed-text

# Apply Supabase migrations:
supabase db push

# Seed the sample chapter (writes physics-ch4.embeddings.json; commit that file):
npx tsx scripts/seed-sample-chapter.ts --regenerate-embeddings

# Start dev server:
pnpm dev

# In another terminal, verify:
pnpm typecheck
pnpm test
pnpm lint
```

---

## 8. Phase B roadmap suggestions

These are logical next steps, not commitments. Priority is Ripon's call.

1. **Authed classroom + slide playback.** The biggest gap between "demo works" and "real product." Needs a Lamppost-owned scene shape and a slide renderer built on the preserved `components/slide-renderer/` + `components/whiteboard/` primitives.
2. **Real Q&A generation pipeline.** `/api/qa-bank/generate` currently returns a placeholder. Wire the Opus Batch API, embedding generation, insertion into `qa_bank`, and batch progress tracking.
3. **Billing + paid-tier distinction.** Add `users.tier`, branch the rate limiter, integrate bKash / Nagad / Stripe. Unlocks the full admin Billing section.
4. **Parent portal.** Claim-existing-shadow-parent OTP flow → parent dashboard with per-child view. Schema is primed.
5. **Curriculum Studio editing.** Q&A entry inline edit + version history + approval workflow + collaborative comments. Big milestone.
6. **Study plan generator.** Schema exists (`study_plans.generated_schedule_json`); no algorithm yet. Triggers the "Continue" lobby hero.
7. **Full Flywheel admin section.** Current flywheel cron runs; Phase B surfaces proposed Q&A entries for human review before they land in the bank.
8. **Institutional mode.** Revisit if organic demand from schools appears.

---

## 9. Files + line counts

Cumulative Phase A diff (`9679fad^..HEAD`):

```
213 files changed, 7,843 insertions(+), 29,881 deletions(-)
```

Net: **−22,038 lines**. Most of the deletion (−29,339) came from Step 3a's OpenMAIC creator-flow removal. The insertions span 10 migrations, auth + config + admin-guard infrastructure, the student classroom + onboarding + signup + personalize pages, the admin Overview + Content + Users sections, the parent-email cron + unsubscribe + profile linking, the sample-chapter fixture + seed script, and 26 new tests.

Per-commit:

| Commit | Step | Files | +lines | −lines |
|---|---|---:|---:|---:|
| `9679fad` | Step 1 — foundation | 21 | +1,026 | −1 |
| `25f77c0` | Step 2 — route tree refactor | 32 | +733 | −65 |
| `484b725` | Step 3a — creator-flow delete | 107 | +218 | −29,339 |
| `12cc04b` | Step 3b — BYOK purge + rate limiter | 13 | +145 | −45 |
| `7e9435b` | Step 4 — student MVP + fixture | 17 | +1,271 | −257 |
| `bcbdd70` | Step 5 — onboarding + OTP | 18 | +1,122 | −49 |
| `bcc229a` | Step 6 — admin portal | 25 | +1,861 | −267 |
| `6142892` | Step 7 — parent email cron | 16 | +1,625 | −16 |
| *Step 8 (this commit)* | finalization | — | — | — |

---

*End of report.*
