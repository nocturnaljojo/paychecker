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
| `SKILL-PRJ-architectural-integration.md` | Whenever a new concept / layer / capability is proposed — 4-step audit ensures it integrates with the existing pipeline rather than entering as a standalone |
| `SKILL-PRJ-pressure-test.md` | Pre-build failure-mode surfacing — runs between idea-to-execution steps 4 and 5 |
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
- `product/` — buckets, workflows, positioning, pricing, **personas (who PayChecker serves)**
- `architecture/` — fact model, memory stack, confirmation flow, **decisions (ADRs)**, **risks (failure modes by design)**
- `planning/` — phase success criteria
- `research/` — awards research notes
- `operations/` — billing actions, ops runbooks

### Key docs by name

| File | Topic |
|---|---|
| `product/personas.md` | Apete + household + paid-tier + advocate. The humans behind every default. |
| `architecture/decisions.md` | ADR records — every architectural choice with context, options, decision, consequences. |
| `architecture/risks.md` | R-NNN failure modes the system must defend against by design. |
| `architecture/document-intelligence-plan-v01.md` | Future-state plan for upload-first fact capture; promoted to ADR-013. |
| `architecture/add-fact-pattern.md` | "Add a Fact" UX operational spec (5 stages); amended by ADR-013 (4 pre-stages). |
| `architecture/confirmation-flow.md` | Fact state machine + trigger-layer EDIT-vs-CONFIRM logic (Migration 0010). |
| `architecture/calc-rules-v01.md` | FWC calc rules (Sprint 5.5) — Rule 1 records the v01 §4 casual-stacking correction. |
| `architecture/storage-architecture-v01.md` | Storage layout + filename convention + RLS pattern for the `documents` bucket (Sprint A2). |
| `architecture/layered-memory-v01.md` | 4-layer memory read/write paths + privacy boundaries (Sprint A4). |
| `architecture/extraction-service-v01.md` | Model selection (Haiku 4.5 + Sonnet 4.6 + Voyage-3-large 1024d) + output schemas + retry semantics (Sprint A3). |
| `architecture/prompts/` | 6 prompt template skeletons (classify + 5 bucket extracts); Sprint B2 fills production copy. |
| `architecture/integration-plan-v01.md` | Where new concepts (Calc Explanation / Worker Context / Sentiment) plug into the existing pipeline (Sprint INTEG-001). Adds Sprint E design constraint. |

### ADRs

| # | Title | Status |
|---|---|---|
| ADR-001 | Confirmation model is sacred | Accepted |
| ADR-002 | 3-layer fact model | Accepted |
| ADR-003 | Information tool, not advice tool | Accepted |
| ADR-004 | Clerk + Supabase third-party auth | Accepted |
| ADR-005 | Indexing not looping | Accepted |
| ADR-006 | Orient, don't collect | Accepted |
| ADR-007 | Two gates before surfacing mismatches | Accepted |
| ADR-008 | Single Supabase project per environment | Accepted |
| ADR-009 | Allowance purpose handling on award reference data | Accepted |
| ADR-010 | Allowance table shape | Accepted |
| ADR-011 | Allowance unit enum extension | Accepted |
| ADR-012 | "Add a Fact" UX pattern (stage-based) | Accepted (amended by ADR-013) |
| ADR-013 | Upload-first fact capture (Document Intelligence) | Accepted |

### Migrations

| # | Title | Notes |
|---|---|---|
| 0001 | Profiles + admin helper | Superseded by 0002 (Supabase-Auth-keyed; incompatible with Clerk-JWT) |
| 0002 | Phase 0 full schema | Identity + 3-layer facts + comparisons |
| 0003 | Payslips storage bucket | Retained as alias post-0011 until Sprint B1 |
| 0004 | Onboarding workers + consent | `country` + `preferred_language` cols |
| 0005 | award_allowances + MA000074 seed | ADR-010 table shape |
| 0006 | REVOKE history function execute | Sprint 2.5 |
| 0007 | REVOKE FROM PUBLIC | Sprint 2.6 (correct REVOKE pattern) |
| 0008 | Extend allowance unit enum | ADR-011 — `'km'` + `'event'` |
| 0009 | Proposed-state schema support | NOT NULL relaxation + CHECK constraint |
| 0010 | Distinguish CONFIRM from EDIT | Trigger logic for proposed→confirmed |
| 0011 | Document Intelligence schema | ADR-013 — pgvector + 4 new tables + documents bucket |

## Tasks & scripts

- `../tasks/lessons.md` — non-obvious gotchas learned across sessions
- `../scripts/` — repo automation scripts (none yet)

## React app + design-system layout

After session 002 scaffolding:
- The React/Vite app owns root: `index.html` (Vite entry), `package.json`, `vite.config.ts`, `src/`, `tailwind.config.js`, etc.
- The static design-system preview lives under `public/design-system/`. Vite copies it to `dist/design-system/` at build → Vercel serves at `/design-system/`.
- Token sync: `src/styles/tokens.css` (React bundle) ≡ `public/design-system/colors_and_type.css` (design-system reference). Edit one → edit the other. See TOKEN SYNC NOTE in either file.
- `DESIGN-SYSTEM.md` (docs) and `README.md` (project README) stay at root.
