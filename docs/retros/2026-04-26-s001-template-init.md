# Session 001 Retro — Template Initialisation
# Date: 2026-04-26
# Scope: PRJ-init

## What Was Done

Initialised PayChecker operational scaffolding around an existing static design-system snapshot. The repo already shipped two commits before this session: the initial design-system snapshot and a 404 fix for the Vercel deploy. Rather than start from empty, this session layered the operational pattern (CLAUDE.md, `.claude/`, `docs/`, `tasks/`, `scripts/`) alongside the existing design system without disturbing it.

Specifically:
- Created the full folder structure (`.claude/{skills,agents,ref}`, `docs/{retros,architecture,product,operations,research,planning}`, `tasks/`, `scripts/`).
- Wrote `CLAUDE.md` (project bible — identity, stack, principles, session rules, registries, naming).
- Wrote `.claude/INDEX.md` (file map).
- Wrote `.claude/PLAN-PRJ-mvp-phases.md` (6 locked phases with checklists + success criteria).
- Wrote `.claude/STATE-PRJ-issues.md` and `.claude/STATE-PRJ-improvements.md` (empty trackers with format docs).
- Wrote 9 SKILL files: PRJ session-start, session-end, retro, idea-to-execution, audit-before-build; AWARD-add-new; FACT-confirmation; DOC-extraction; COMP-calculator.
- Wrote 4 agent files: researcher, auditor, compliance-checker, document-extractor.
- Wrote 8 reference files: REF-DB-schema, REF-API-routes, REF-STK-stack, REF-NAMING-conventions, REF-FACT-model, REF-INDEXING-not-looping, REF-AWARDS-list, REF-PRIVACY-baseline.
- Wrote `docs/` content: retros/LATEST.md pointer, product/{buckets, workflows, positioning, pricing-strategy-v1}, architecture/{fact-model-v1, memory-stack-v1, confirmation-flow}, planning/phase-success-criteria, research/awards-research, operations/billing-actions.
- Wrote `tasks/lessons.md` (empty header).
- Renamed existing comprehensive design-system docs `README.md` → `DESIGN-SYSTEM.md`. Wrote a fresh public-facing `README.md` introducing PayChecker + linking to design system + status.
- Extended `.gitignore` with PayChecker data-hygiene rules (`/apete-data/`, `/uploads/`, `*.xlsx`, `.env.production.local`).

Saved Claude memory entries (user profile, project basics, stack decisions, architecture rules, repo state at s001, workflow preferences) so future sessions can orient without re-deriving from scratch.

## Decisions Made

- **Existing design-system snapshot is preserved at root.** It's already deployed to Vercel. The Phase 0 React/Vite app will scaffold into `/src/` *alongside* it, not replace it. The static design system remains the brand-system reference site.
- **Renamed the design-system README to `DESIGN-SYSTEM.md`** so a fresh project README can sit at root without clobbering the design docs. Internal self-reference in DESIGN-SYSTEM.md updated.
- **Adopted the indexing-not-looping pattern as policy** (`.claude/ref/REF-INDEXING-not-looping.md` + `docs/architecture/memory-stack-v1.md`). The whole operational system depends on indexes being trustworthy.
- **Confirmed the 5 non-negotiable architecture principles** in `CLAUDE.md`: confirmation model is sacred, 3-layer fact model, no LLM in calc paths, immutable comparison snapshots, indexing not looping.
- **Locked the 6-phase plan** with explicit success criteria and anti-criteria (`docs/planning/phase-success-criteria.md`).
- **Phase 0 schema drafted** in `REF-DB-schema.md` (no migrations applied yet — to be confirmed when Phase 0 begins).
- **Pricing locked at $0 PALM / $4.99/mo non-PALM** with no feature gating (`docs/product/pricing-strategy-v1.md`).

## What's Open

- GitHub remote not yet checked / set (the prompt referenced `gh repo clone nocturnaljojo/paychecker` — repo exists locally with one remote already; verify before pushing).
- No code shipped — Phase 0 React/Vite scaffold not started.
- Supabase project not yet created in Sydney region.
- Clerk app not yet created.
- No award reference data loaded — MA000074 is "PLANNED", not "SUPPORTED".
- No production tests / CI / lint config — added to Phase 0 first session.
- Commits not yet made — to be done as the next step in this session per the prompt's Step 15.

## Lessons / Gotchas

- **The repo wasn't empty.** The scaffolding prompt assumed a fresh `git init`; the actual repo already had a deployed design system. Audit-before-build (one of the skills now codified in `.claude/skills/SKILL-PRJ-audit-before-build.md`) caught this before any overwrite. This is the first proof point for that pattern.
- **`README.md` collision.** The existing design-system README was comprehensive and well-written — preserved by rename rather than rewrite. Anything created at the root in a "from-scratch" prompt should always be checked for collision first.
- (No entry added to `tasks/lessons.md` yet — will add if a non-obvious gotcha appears in Phase 0.)

## Next Session

**Phase 0 kickoff.** Concrete first action:

1. Verify `gh` remote: `git remote -v` and confirm it points at `nocturnaljojo/paychecker`. If yes, decide whether to push the scaffolding or stage further. (Per prompt, do NOT push until Jovi explicitly says.)
2. Run `SKILL-PRJ-session-start.md` to orient.
3. Begin first PLAN-PRJ-mvp-phases.md Phase 0 task: scaffold React + Vite + TypeScript into `/src/` (alongside the existing design system). Wire in `colors_and_type.css` design tokens.

LATEST.md updated → points at this retro.
