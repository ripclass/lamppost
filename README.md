<p align="center">
  <img src="public/logo-horizontal.svg" alt="Lamppost" width="420"/>
</p>

<p align="center">
  <strong>Lamppost — লেম্পোস্ট</strong><br/>
  An interactive AI classroom for Bangladesh and global education
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg?style=flat-square" alt="License: AGPL-3.0"/></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Supabase-pgvector-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Language-Bangla%20%7C%20English-1a1a2e?style=flat-square" alt="Bangla | English"/>
</p>

---

## What is Lamppost?

Lamppost is a fork of [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) (Tsinghua University's open-source multi-agent interactive classroom) extended for Bangladeshi and global English-medium education.

It is **not** a chatbot and **not** a video platform. It is a complete virtual classroom where AI teachers lecture, draw on a whiteboard, give quizzes, and run simulations — and students can raise their hand at any moment to get a personalised answer in their own language.

### The core innovation: a pre-computed Q&A bank

Unlike traditional AI tutors, Lamppost does not run expensive LLM inference on every student question. Instead:

1. **Opus generates everything up front** — lessons, slides, narration, quizzes, and a comprehensive Q&A bank of 1,000–2,000+ entries per chapter. One-time cost.
2. **Embedding search handles 95 %+ of real-time interactions** — student question → pgvector cosine similarity → pre-built answer. Zero LLM cost.
3. **A small fallback model answers the rest** — only novel questions escalate to Sonnet, Gemma, or Haiku.
4. **The flywheel** — every unmatched question is logged, batched nightly, sent to Opus, and converted into new Q&A entries. The bank gets smarter with every student.

After six months of live use, match rate approaches 99 %. The Q&A bank is the product.

## What's different from upstream OpenMAIC?

| | OpenMAIC | Lamppost |
|---|---|---|
| Target audience | General self-learners | SSC, HSC, O/A-level students in Bangladesh and global English-medium |
| Primary languages | English, Chinese | English, **Bangla (বাংলা)** |
| Content source | User-provided documents | NCTB + Cambridge/Edexcel textbooks |
| Intelligence model | Live LLM on every interaction | Pre-baked Q&A bank + embedding search + small fallback |
| Offline support | — | Full offline mode via Ollama + Gemma for schools with intermittent internet |
| Deployment | Vercel / self-hosted | Vercel / Supabase + Docker stack for schools |

All OpenMAIC scene generation, multi-agent orchestration, and playback features are preserved and continue to work unchanged.

## Quick start

### Prerequisites
- Node.js ≥ 20, pnpm ≥ 10
- A Supabase project with `pgvector` enabled (for the Q&A bank)
- Ollama running locally with `nomic-embed-text` pulled (for embeddings)
- At least one LLM provider key (`ANTHROPIC_API_KEY` recommended)

### Install

```bash
git clone https://github.com/ripclass/lamppost.git
cd lamppost
pnpm install
cp .env.example .env.local
# fill in ANTHROPIC_API_KEY, GOOGLE_API_KEY, Supabase URL + keys, etc.
pnpm dev
```

Open **http://localhost:3000**.

### Apply database migrations

```bash
# from supabase/migrations — run against your Supabase project
supabase db push
```

### School / offline deployment

```bash
docker compose -f docker-compose.school.yml up --build
```

This brings up the Next.js app, Postgres + pgvector, and Ollama (with Gemma) on a single host — fully functional with zero external internet dependency.

## Architecture

See **[`docs/architecture.md`](docs/architecture.md)** for the full technical design — the Q&A bank schema, the Opus generation prompt, the classroom interaction flow, model routing, and the Bangla translation pipeline.

Key directories:

```
lib/qa-bank/           Q&A bank engine (generator, embedder, search, router, flywheel)
lib/classroom-engine/  Smart interaction handler (match → serve or escalate)
lib/curriculum/        PDF parsing, NCTB/Cambridge content ingestion
lib/translate/         Gemini translation, Bangla utilities
lib/db/                Supabase client, queries, migrations
supabase/migrations/   Database schema
app/api/qa-bank/       Q&A bank search, generation, flywheel endpoints
app/api/curriculum/    Curriculum ingestion, chapter management
app/admin/             Admin dashboard (flywheel, analytics, cost tracker)
scripts/               CLI tools for batch operations
```

OpenMAIC modules under `lib/generation/`, `lib/orchestration/`, `lib/playback/`, `lib/action/`, and the existing `components/` tree are untouched per fork policy.

## Licence and attribution

Lamppost is licensed under **[AGPL-3.0](LICENSE)**, inherited from OpenMAIC as required by the upstream licence.

This project is a derivative work of OpenMAIC by the Tsinghua MAIC team, published in JCST 2026 (DOI: [10.1007/s11390-025-6000-0](https://jcst.ict.ac.cn/en/article/doi/10.1007/s11390-025-6000-0)). All original OpenMAIC copyright and attribution is preserved. See [`CHANGELOG.md`](CHANGELOG.md) for upstream release history.

The name "Lamppost" is inspired by Ishwar Chandra Vidyasagar's vision that every person deserves quality education regardless of where they were born — and by the founder's earlier 2019 project of the same name.
