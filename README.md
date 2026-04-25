# PayChecker

> Save the hours of paperwork required to check your pay.

PayChecker is a wage-compliance calculator for Australian award-covered workers and PALM-scheme visa workers. It computes what an award and a contract say a worker should have been paid, compares it to what they actually received, and produces a report. The worker decides what to do next.

PayChecker is an **information tool** — same regulatory category as the FWO Pay Calculator. It is not legal advice and does not assert facts about a worker's employment.

## Status

**Phase 0 in development.** No production app yet. Currently shipped:
- Static design system (this repo at root, deployed to Vercel) — see `DESIGN-SYSTEM.md`.
- Operational scaffolding (`CLAUDE.md`, `.claude/`, `docs/`) — see `.claude/INDEX.md`.

The Phase 0 React/Vite app will be scaffolded into `/src/` alongside the existing design system, not replacing it.

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
/                       — design-system snapshot (deployed to Vercel)
  index.html              landing page for the design system
  colors_and_type.css     design token source of truth
  preview/                design-system preview cards
  ui_kits/                PWA + admin UI kits (HTML + JSX mocks)
  assets/, fonts/         brand assets
  DESIGN-SYSTEM.md        full design-system documentation

CLAUDE.md               — project bible (read first)
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

Phase 0 setup steps will be added when the React/Vite app is scaffolded.

For the design-system preview today:
```
# from the repo root
npx serve .
# or open index.html in a browser
```

## Owner

Built by [Jovi (Jovilisi Draunimasi)](https://github.com/nocturnaljojo) — solo founder, Canberra. Prior project: CareVoice (NDIS voice-notes SaaS).

## License

TBD.

## Contact

Not legal advice. Fair Work Ombudsman: 13 13 94.
