# .claude/INDEX.md — PayChecker file map
# This file is the single retrieval point. Names alone should tell you what each file is for.
# If you find yourself opening five files to find one fact, the index has gone stale — fix it.

## Operational entry points

- `../CLAUDE.md` — project bible. Read first every session.
- `../docs/retros/LATEST.md` — pointer to the most recent retro. Read second.
- `STATE-PRJ-issues.md` — open bugs/blockers with severity. Read third.
- `STATE-PRJ-improvements.md` — polish/UX/DX backlog (NOT the issues tracker).
- `PLAN-PRJ-mvp-phases.md` — locked 6-phase plan with checklists. Update on phase progress.

## Skills (`.claude/skills/`)

| File | When to invoke |
|---|---|
| `SKILL-PRJ-session-start.md` | Beginning of every session |
| `SKILL-PRJ-session-end.md` | End of every session |
| `SKILL-PRJ-retro.md` | Writing the session retro |
| `SKILL-PRJ-idea-to-execution.md` | ANY new feature / idea / architectural direction |
| `SKILL-PRJ-audit-before-build.md` | Before adding code in an unfamiliar area |
| `SKILL-AWARD-add-new.md` | Adding a new Modern Award |
| `SKILL-FACT-confirmation.md` | Building any flow that captures or confirms a worker fact |
| `SKILL-DOC-extraction.md` | Building OCR / Claude extraction pipelines |
| `SKILL-COMP-calculator.md` | Building / modifying the comparison engine |

## Agents (`.claude/agents/`)

| File | Use for |
|---|---|
| `researcher.md` | Web research — awards, EAs, Fair Work updates |
| `auditor.md` | Read-only code/data audit before changes |
| `compliance-checker.md` | Privacy + Fair Work alignment review |
| `document-extractor.md` | Payslip/contract OCR + structured extraction |

## Reference (`.claude/ref/`)

| File | Topic |
|---|---|
| `REF-DB-schema.md` | Supabase tables, columns, RLS policies |
| `REF-API-routes.md` | API surface (placeholder until Phase 1) |
| `REF-STK-stack.md` | Full stack details + deploy targets |
| `REF-NAMING-conventions.md` | File / folder / DB / commit naming rules |
| `REF-FACT-model.md` | 3-layer architecture deep dive |
| `REF-INDEXING-not-looping.md` | Memory pattern — why we never load full history |
| `REF-AWARDS-list.md` | Modern Awards we support and what's planned |
| `REF-PRIVACY-baseline.md` | APP compliance requirements |

## Docs (`../docs/`)

- `retros/` — `LATEST.md` + dated session retros (`YYYY-MM-DD-sNNN-topic.md`)
- `product/` — buckets, workflows, positioning, pricing
- `architecture/` — fact model, memory stack, confirmation flow
- `planning/` — phase success criteria
- `research/` — awards research notes
- `operations/` — billing actions, ops runbooks

## Tasks & scripts

- `../tasks/lessons.md` — non-obvious gotchas learned across sessions
- `../scripts/` — repo automation scripts (none yet)

## React app + design-system layout

After session 002 scaffolding:
- The React/Vite app owns root: `index.html` (Vite entry), `package.json`, `vite.config.ts`, `src/`, `tailwind.config.js`, etc.
- The static design-system preview lives under `public/design-system/`. Vite copies it to `dist/design-system/` at build → Vercel serves at `/design-system/`.
- Token sync: `src/styles/tokens.css` (React bundle) ≡ `public/design-system/colors_and_type.css` (design-system reference). Edit one → edit the other. See TOKEN SYNC NOTE in either file.
- `DESIGN-SYSTEM.md` (docs) and `README.md` (project README) stay at root.
