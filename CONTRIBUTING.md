# Contributing to Lamppost

Thank you for your interest in contributing to Lamppost! This guide will help you get started and ensure a smooth collaboration.

> Lamppost is a fork of [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC). For contributions to the upstream multi-agent classroom engine (scene generation, orchestration, playback, action engine), please open a PR against the OpenMAIC repository. For Lamppost-specific contributions (Q&A bank, Bangla localisation, curriculum pipeline, flywheel, admin dashboard), open a PR against this repository.

## How to Contribute

| Contribution type | What to do |
| --- | --- |
| **Bug fix** | Open a PR directly (link the issue if one exists) |
| **Q&A bank, curriculum, Bangla, or admin dashboard changes** | Open a PR directly against this repo |
| **Upstream classroom engine changes** | PR against [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) instead — Lamppost pulls those from upstream |
| **New feature or architecture change** | Open a GitHub issue on this repo describing the change **before** opening a PR |
| **Design / UI change** | Open an issue first — include mockups or screenshots |
| **Refactor-only PR** | Not accepted unless a maintainer explicitly requests it |
| **Documentation** | Open a PR directly |

## Claiming Issues

To avoid duplicate effort, please **comment on an issue** to claim it before you start working. A maintainer will assign you.

- If **no PR or meaningful update** (WIP commit, progress comment) appears within **1 day**, the issue may be reassigned to someone else.
- If you see an issue already assigned, reach out to the assignee first to coordinate — you may be able to collaborate or split the work.
- If you can no longer work on a claimed issue, please leave a comment so others can pick it up.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.9.0
- [pnpm](https://pnpm.io/) (latest)
- A copy of `.env.local` — see [`.env.example`](.env.example) for reference

## Getting Started

```bash
# Clone the repository
git clone https://github.com/ripclass/lamppost.git
cd lamppost

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start the development server
pnpm dev
```

## Development Workflow

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature main
   ```
2. **Branch naming convention:**
   - `feat/` — new features or enhancements
   - `fix/` — bug fixes
   - `docs/` — documentation changes
3. Make your changes and **test locally**.
4. Run **all CI checks** before committing (see below).
5. Open a **Pull Request** against `main`.

## Before You Submit a PR

Run the following checks locally — CI will run them too, but catching issues early saves everyone time:

```bash
# 1. Format code
pnpm format

# 2. Lint (with auto-fix)
pnpm lint --fix

# 3. TypeScript type checking
npx tsc --noEmit
```

If formatting or lint auto-fixes produce changes, include them in your commit.

### Local Testing

Before marking a PR as **Ready for Review**, you **must**:

1. **Verify your goal** — confirm that the PR achieves what it set out to do (bug is fixed, feature works as expected, etc.)
2. **Regression test** — manually check that existing functionality is not broken by your changes (e.g. navigate key flows, verify related features still work)
3. **Run CI checks locally** (see above)

If you have not completed local verification, keep your PR in **Draft** status. Only move it to Ready for Review once you are confident it works and does not regress other features.

### PR Guidelines

- **Every PR must link to an issue** — use `Closes #123` or `Fixes #456` in the PR description. If no issue exists yet, create one first. PRs without a linked issue will not be reviewed.
- **Keep PRs focused** — one concern per PR; do not mix unrelated changes
- **Describe what and why** — fill out the [PR template](.github/pull_request_template.md)
- **Include screenshots** — for UI changes, show before/after
- **Ensure CI passes** before requesting review
- **All UI text must be internationalized (i18n)** — do not hardcode user-facing strings

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`, `style`

Examples:

```
feat(tts): add Azure TTS provider
fix(whiteboard): prevent canvas from resetting on window resize
docs: add CONTRIBUTING.md
```

## AI-Assisted PRs 🤖

PRs built with AI tools (Codex, Claude, Cursor, etc.) are welcome! We just ask for transparency and self-review:

- **Mark it** — note in the PR title or description that the PR is AI-assisted
- **AI-review your own code first** — before requesting maintainer review, run an AI code review (e.g. Claude, Codex, Copilot) on your changes and address the findings. This is **required** for AI-assisted PRs to avoid dumping large amounts of unreviewed generated code on maintainers.
- **You are responsible for what you submit** — understand the code, not just the prompt.

AI-assisted PRs are held to the same quality standard as any other PR. Community members are also encouraged to leave constructive feedback on any PR — peer review helps everyone improve.

## Project Structure

```
lamppost/
├── app/              # Next.js app router pages and API routes
├── components/       # React components
├── lib/              # Shared utilities and core logic
│   ├── qa-bank/      # Q&A bank engine (Lamppost)
│   ├── classroom-engine/  # Smart interaction handler (Lamppost)
│   ├── curriculum/   # NCTB / Cambridge ingestion (Lamppost)
│   ├── translate/    # Gemini Bangla translation (Lamppost)
│   ├── db/           # Supabase client and queries (Lamppost)
│   └── generation/   # Upstream OpenMAIC lesson generation (do not modify)
├── packages/         # Internal packages (mathml2omml, pptxgenjs)
├── public/           # Static assets
├── supabase/         # Database migrations (Lamppost)
└── .github/          # Issue templates, PR template, CI workflows
```

## Reporting Bugs

Open a bug report on this repository's issue tracker. Include:

- Steps to reproduce
- Expected vs. actual behaviour
- Browser / OS / Node version
- Screenshots or error logs if applicable

## Requesting Features

Open a feature request on this repository's issue tracker. For larger features, please file an issue describing the change before opening a PR.

## Security Vulnerabilities

Please report security vulnerabilities through this repository's GitHub Security Advisories. **Do not** open a public issue for security vulnerabilities.

## License

By contributing to Lamppost, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE), which is inherited from the upstream OpenMAIC project.
