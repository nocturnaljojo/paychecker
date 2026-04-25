# PayChecker

> Save the hours of paperwork required to check your pay.

PayChecker is a wage-compliance calculator for Australian award-covered workers and PALM-scheme visa workers. It computes what an award and a contract say a worker should have been paid, compares it to what they actually received, and produces a report. The worker decides what to do next.

PayChecker is an **information tool** — same regulatory category as the FWO Pay Calculator. It is not legal advice and does not assert facts about a worker's employment.

## Status

**Phase 0 in development.** Currently shipped:
- React + Vite + TypeScript app scaffolded at root with Tailwind v3.4 + design tokens wired (s002).
- Clerk auth (test mode) integrated (s002).
- Static design-system reference preserved at `public/design-system/` → served at `/design-system/` in production.
- Operational scaffolding (`CLAUDE.md`, `.claude/`, `docs/`) — see `.claude/INDEX.md`.

Phase 0 next steps: Supabase project (Sydney), DB migrations, worker onboarding (Layer 1 facts capture).

## Tiers

- **Free** — PALM scheme visa workers.
- **Paid ($4.99/mo, AUD)** — Australian award-covered workers, launching with hospitality.

Both tiers get the same product. The price split is a values decision — see `docs/product/pricing-strategy-v1.md`.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui
- Database: Supabase (Sydney region — ap-southeast-2)
- Auth: Clerk
- Hosting: Vercel (frontend), Fly.io (backend, Phase 1+)
- Backend: FastAPI (Phase 1+)
- Payments: Stripe (Phase 2+)
- LLM: Claude API — extraction only, never in calc paths

Full details in `.claude/ref/REF-STK-stack.md`.

## Repo layout

```
/                       — React + Vite + TypeScript app at root
  index.html              Vite entry
  package.json, vite.config.ts, tsconfig*.json, tailwind.config.js
  vercel.json             SPA rewrite + framework: vite
  src/
    main.tsx, App.tsx, index.css, vite-env.d.ts
    components/{ui,forms,layout}/
    features/{onboarding,shifts,payslips,comparisons,reports}/
    hooks/, lib/, pages/, types/, config/, styles/
  public/
    design-system/        preserved static design-system reference
                          (served at /design-system/ in production)

CLAUDE.md               — project bible (read first)
DESIGN-SYSTEM.md        — design-system documentation
.claude/                — operational scaffolding
  INDEX.md                file map
  PLAN-PRJ-mvp-phases.md  6-phase MVP plan
  STATE-PRJ-issues.md     open bugs / blockers
  STATE-PRJ-improvements.md  polish backlog
  skills/                 reproducible workflows
  agents/                 agent definitions
  ref/                    reference docs (schema, naming, awards, privacy)

docs/
  retros/                 dated session retros
  product/                buckets, workflows, positioning, pricing
  architecture/           fact model, memory stack, confirmation flow
  planning/               phase success criteria
  research/               award research notes
  operations/             billing runbook
tasks/
  lessons.md              non-obvious gotchas
scripts/                  repo automation (none yet)
```

## Setup

```bash
# 1. Install deps (Node 20.17+; do NOT bump to Node 22 yet — see INFRA-001)
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit .env.local — set VITE_CLERK_PUBLISHABLE_KEY to a Clerk dev key.
# Get one at: https://clerk.com → New application → API Keys → copy the
# "Publishable key" (starts with pk_test_).
# DO NOT put the secret key (sk_test_) in this file — Vite would risk
# bundling it into client JS. Phase 0 frontend doesn't need it.

# 3. Run dev server
npm run dev   # → http://localhost:5173

# 4. Build / preview production output
npm run build
npm run preview   # → http://localhost:4173
```

The static design-system preview is served at `/design-system/` in dev (direct file path) and production. In Vite's dev mode, visiting `/design-system/` may hit the SPA fallback — use `/design-system/index.html` if so. Production via `npm run preview` and Vercel both resolve `/design-system/` correctly.

## Owner

Built by [Jovi (Jovilisi Draunimasi)](https://github.com/nocturnaljojo) — solo founder, Canberra. Prior project: CareVoice (NDIS voice-notes SaaS).

## License

TBD.

## Contact

Not legal advice. Fair Work Ombudsman: 13 13 94.
