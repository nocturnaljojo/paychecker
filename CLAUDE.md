# CLAUDE.md — PayChecker
# Read this first, every session, before any work.
# Then read docs/retros/LATEST.md for current state.
# Then read .claude/STATE-PRJ-issues.md for open issues.

## Project Identity

**Name:** PayChecker
**Tagline:** "Save the hours of paperwork required to check your pay."
**Owner:** Jovi (Jovilisi Draunimasi), Canberra
**Type:** Solo-founder SaaS, two-tier (PALM free / everyday paid)
**Regulatory category:** Information tool, NOT advice. Same as FWO Pay Calculator.

## What PayChecker Does

Saves workers the hours of paperwork required to check whether their pay, super, and deductions match what the award and their contract say they should be. Produces a report. The worker decides what to do next.

The system NEVER asserts a fact about a worker's employment — it only computes from facts the worker has confirmed.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui
- **Backend:** FastAPI (Python) — deferred until Phase 1; Phase 0 uses manual calcs / Supabase functions
- **Database:** Supabase (AU region — ap-southeast-2 Sydney)
- **Auth:** Clerk (consistent with CareVoice patterns)
- **Hosting:** Vercel (frontend), Fly.io (backend, when needed)
- **Caching:** Upstash Redis (Phase 1+)
- **LLM:** Claude API (Anthropic) — extraction only, NEVER in calculations
- **Payments:** Stripe (Phase 2+)
- **File storage:** Supabase Storage (encrypted, AU region)

## Core Architectural Principles (NON-NEGOTIABLE)

1. **Confirmation model is sacred.** Every fact has provenance (worker entered, OCR-suggested-confirmed, or assisted). Calculations run against confirmed facts ONLY.

2. **3-layer fact model:**
   - Layer 1 — Stable facts (employer, classification, pay terms). Confirmed once, re-confirmed on change.
   - Layer 2 — Period facts (shifts, hours). Confirmed at logging time.
   - Layer 3 — Payment facts (payslips, deposits, super). Confirmed each time a new one is uploaded.

3. **LLM is never authoritative.** Claude suggests values; the worker confirms. No LLM in calculation paths.

4. **Immutable comparison snapshots.** Every comparison result is stored with its full input snapshot. "What did the app tell Apete on April 23rd and why" must always be answerable.

5. **Indexing not looping.** Never load full history. Memory is summarised, tagged, and retrieved by relevance. See `.claude/ref/REF-INDEXING-not-looping.md`.

6. **Two gates before surfacing mismatches:**
   - Gate 1 — re-verify inputs are current
   - Gate 2 — classify gap by size, frequency, confidence

7. **Single source of truth.** Every fact in the system has exactly one canonical location. New representations of an existing fact require an architectural-integration audit before they're added.

## Architecture Guardrails (STRICT)

Per-action discipline that complements the audit/integration skills. For new-concept proposals, also invoke `.claude/skills/SKILL-PRJ-architectural-integration.md`.

Origin: introduced in response to BUILD-11 incidents (assumed `payslip_facts` shape; assumed provenance CHECK constraint accepted `'ocr_suggested'`). These rules exist because the prior audit/integration skills did not catch per-action schema assumptions.

- Do NOT assume schema that is not explicitly confirmed in code. Read the migration files or query the live schema (Supabase MCP `execute_sql`) before referencing tables, columns, or JSON shapes.
- Do NOT introduce new tables, columns, or JSON shapes unless explicitly listed in the session scope.
- Do NOT refactor existing models unless required to meet acceptance criteria.
- Do NOT create multiple sources of truth for the same value. If a change would introduce a second representation of an existing fact, STOP and flag it.

## Unknowns Gate (MANDATORY before any code in /build)

For larger audits, escalate to `.claude/skills/SKILL-PRJ-audit-before-build.md` Pattern 7.

Before writing any code in /build, classify every unknown:

**Architectural unknowns — STOP and ask:**
- Database schema, table relationships, column types, JSON shapes
- Where a piece of state lives or which layer owns it
- Source of truth for any value
- Whether existing data is immutable or mutable
- Interaction with audit/history tables or confirmation state

**Implementation unknowns — choose and log:**
- Component naming, icon choice, copy text
- Local file organisation when no convention exists
- Style/colour decisions covered by the design system

If any architectural unknown exists, do not proceed to /build. List it, ask, wait.

## Source of Truth Discipline

See `docs/architecture/fact-model-v1.md` for the 3-layer model.

- Every fact in the system has exactly one source of truth (Architectural Principle 7).
- Before writing to a field, confirm it is the canonical location for that fact.
- If extraction produces a value AND a worker can correct it, the schema must make the relationship between original and corrected explicit. Do not silently overwrite.
- `extraction_jsonb.raw` is immutable. Never write back to it. Never merge corrected values into it. Treat it as a permanent record of what OCR/extraction returned. Worker corrections live outside raw JSON in the approved canonical fact location. Reads from `extraction_jsonb.raw` are permitted for audit, debugging, and re-extraction comparison only — never as the source for displayed or calculated values.

## Session Rules

1. Always read `docs/retros/LATEST.md` and `.claude/STATE-PRJ-issues.md` at session start.
2. Use the appropriate skill from `.claude/skills/` for your task type.
3. NO new feature ideas without invoking `SKILL-PRJ-idea-to-execution.md`.
4. Audit before adding — never duplicate what already exists. See "Architecture Guardrails (STRICT)" + "Unknowns Gate" above.
5. Commit per logical chunk, not per session.
6. Update `.claude/PLAN-PRJ-mvp-phases.md` when phase items complete.
7. Track session work via `docs/retros/`, never a single SESSIONS.md.
8. NDIS / care references in code = wrong project. Stop and check.
9. NO LLM in calculation paths. Ever. This is the most important rule.
10. NO advice language ("you should", "this is wrong"). Only "this is what we computed", "this is what your payslip shows", "the difference is X".
11. Every privacy-touching feature must reference `.claude/ref/REF-PRIVACY-baseline.md` before building.
12. PayChecker is an information tool. Never wage-theft-detector. Framing matters as much as features.
13. Bank/super/payslip data is stored encrypted, accessed via RLS, deleted on user request. Privacy Act APP compliance.
14. Verify Supabase MCP on correct PayChecker account before any DB work.
15. Verify Stripe MCP authenticated before any payment integration.
16. Idea-to-Execution workflow — invoke `SKILL-PRJ-idea-to-execution.md` for ANY new idea, feature, or architectural direction. Audit costs minutes; duplication costs hours.
17. Improvements/polish/small bugs go to `.claude/STATE-PRJ-improvements.md`, NOT `STATE-PRJ-issues.md`.
18. Worker safety always trumps engineering elegance. If a feature could expose a worker to retaliation from their employer, do not build it without explicit safeguard review.

## Skills Registry

| Skill | File | Purpose | Status |
|---|---|---|---|
| idea-to-execution | `.claude/skills/SKILL-PRJ-idea-to-execution.md` | Audit-plan-review-execute cycle | Built |
| session-start | `.claude/skills/SKILL-PRJ-session-start.md` | Session orientation | Built |
| session-end | `.claude/skills/SKILL-PRJ-session-end.md` | End session + commit + log | Built |
| retro | `.claude/skills/SKILL-PRJ-retro.md` | Write session retro | Built |
| audit-before-build | `.claude/skills/SKILL-PRJ-audit-before-build.md` | Read-only audit pattern | Built |
| award-add-new | `.claude/skills/SKILL-AWARD-add-new.md` | Add new award support | Built |
| fact-confirmation | `.claude/skills/SKILL-FACT-confirmation.md` | The confirmation workflow | Built |
| doc-extraction | `.claude/skills/SKILL-DOC-extraction.md` | OCR + Claude extraction | Built |
| comparison-engine | `.claude/skills/SKILL-COMP-calculator.md` | Running comparisons | Built |

## Agents Registry

| Agent | File | Purpose |
|---|---|---|
| researcher | `.claude/agents/researcher.md` | Web research for awards / EAs / Fair Work |
| auditor | `.claude/agents/auditor.md` | Read-only code/data audit |
| compliance-checker | `.claude/agents/compliance-checker.md` | Privacy + Fair Work alignment |
| document-extractor | `.claude/agents/document-extractor.md` | Payslip/contract OCR pipeline |

## File Naming Conventions

See `.claude/ref/REF-NAMING-conventions.md` for full rules.

Quick reference:
- SKILL files — `SKILL-{DOMAIN}-{topic}.md`
- REF files — `REF-{CATEGORY}-{topic}.md`
- STATE files — `STATE-PRJ-{topic}.md`
- PLAN files — `PLAN-PRJ-{topic}.md`
- Retros — `YYYY-MM-DD-sNNN-topic.md`
- Migrations — `NNNN_{description}.sql`

## Repo layout

The React/Vite app owns the root. The static design-system snapshot lives under `public/design-system/` so Vite copies it to `dist/design-system/` at build, and Vercel serves it at `/design-system/`. (Moved from root in session 002.)

- `/` (root) — React app entry (`index.html`, `package.json`, `vite.config.ts`, `src/`)
- `/public/design-system/` — preserved static design-system reference (was at root in s001)
- `/src/styles/tokens.css` — React-bundled copy of the tokens, kept in sync with `public/design-system/colors_and_type.css`. See TOKEN SYNC NOTE in either file.

The design-system documentation is preserved at `DESIGN-SYSTEM.md`. The root `README.md` is the public project README.
