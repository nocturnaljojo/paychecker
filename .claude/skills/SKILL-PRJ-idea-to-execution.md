# SKILL-PRJ-idea-to-execution

## Purpose
The 10-step audit-plan-review-execute cycle that runs for ANY new idea, feature, or architectural direction. The point is to spend minutes on auditing rather than hours on duplication or rework.

## Trigger phrases
- "should we add..."
- "what if we..."
- "let's build a..."
- "I had an idea..."
- ANY suggestion that introduces something new or reshapes existing architecture

## Hard rule
DO NOT write production code in response to a raw idea. Run this cycle first. If the user says "just do it", point them at this file and confirm they want to skip the cycle.

## The 10 steps

1. **Restate.** In one sentence, restate the idea in your own words. Confirm with user.
2. **Phase fit.** Which phase in `PLAN-PRJ-mvp-phases.md` does this belong to? If "later", park it and stop.
3. **Audit prior art.** Grep / read for what already exists. Use `SKILL-PRJ-audit-before-build.md`.
4. **Architectural fit.** Check against the 5 non-negotiable principles in `CLAUDE.md`. If it bends one, escalate.
5. **Privacy + safety check.** Could this expose a worker to retaliation? Touch payslip / bank / super data? Read `REF-PRIVACY-baseline.md`.
6. **Data model impact.** Does it touch the 3-layer fact model (`REF-FACT-model.md`)? Sketch the data shape.
7. **DB + API impact.** What changes in `REF-DB-schema.md` and `REF-API-routes.md`? Migration required?
8. **Plan.** Write a numbered plan, file by file, with checkable steps. Save to `PLAN-PRJ-mvp-phases.md` under the right phase.
9. **Review.** Have the user (or `compliance-checker` agent) review the plan before any code is written.
10. **Execute.** Implement the plan. Tick steps as they complete. Retro the work at session end.

## Output format
For each step, a short paragraph. Don't skip to step 8 even if the idea seems "obviously fine".

## Common pitfalls
- Skipping the audit because "I already know this codebase". Audits catch what memory misses.
- Writing the plan after writing the code. The plan is the contract; the code is the implementation.
- Letting "small" ideas bypass the cycle. There are no small ideas in a regulated information tool — every screen ships a stance.
- Auditing only filenames, not contents. Open the file.

## Why this exists
Solo founders who skip the audit step end up duplicating themselves three sessions later. The cycle is cheap insurance.
