# Planning — phase success criteria

The gate criteria for moving from one phase to the next. A phase is not "done" because every checkbox in `PLAN-PRJ-mvp-phases.md` is ticked — it's done when the success criterion below is verifiably met. The criterion is the gate.

## Phase 0 — Apete's Calculator

**Criterion:** Apete has used PayChecker for 4 consecutive pay periods, and a third-party reviewer (a union official or registered Working Women's Service person) has reviewed at least one PayChecker report and agreed the comparison is accurate and the surfacing is appropriate.

**Evidence required to gate:**
- Apete's 4 comparison snapshots in the DB.
- Reviewer's name + role + date of review documented in this file (when the review happens).
- Any reviewer-flagged issues filed to `STATE-PRJ-issues.md` and resolved.

**Anti-criteria (do NOT gate Phase 0 if any of these are true):**
- A calc has been wrong by more than $1.00 in any of Apete's 4 periods (without a documented reason).
- The report uses any advice-language slip ("you should", "you have been").
- An LLM was found in the calc path during phase exit audit.
- Apete reported a screen / flow felt accusatory.

## Phase 1 — Apete's Household

**Criterion:** 4–6 active workers across at least 2 households, each having self-onboarded without operator hand-holding and run ≥2 comparisons each within 14 days of signup.

**Evidence:**
- 4–6 worker accounts in production.
- Onboarding analytics show ≥80% complete-without-support rate (lightweight tracking only — no PII, no replay).
- Each user has ≥2 comparison snapshots.

**Anti-criteria:**
- Operator had to manually fix data for any worker.
- Any worker reported confusion that wasn't resolved by in-app help.

## Phase 2 — Paid tier launches

**Criterion:** First paying customer onboarded via organic channel (NOT Jovi's network), AND complete refund/cancel flow tested end-to-end without operator escalation.

**Evidence:**
- Stripe customer record in production.
- Test refund + test cancel completed; both written up in `docs/retros/`.
- No P0 / P1 billing issues open.

## Phase 3 — Second award

**Criterion:** MA000059 added in ≤ 5 working days from kickoff to first comparison run, with no regression in MA000074 calculations and one MA000059 worker tests end-to-end.

**Evidence:**
- Day-by-day log of award addition in a retro.
- Regression suite for MA000074 passes.
- MA000059 worker's first comparison snapshot.

## Phase 4 — Horticulture (piece rates)

**Criterion:** Piece-rate worker gets accurate report; data model didn't need a special-case branch in the calc engine (i.e. the engine remained data-driven).

**Evidence:**
- Comparison snapshot for the piece-rate worker.
- Code review confirms no `if award == 'MA000028'` style branches were added to the calc engine.

## Phase 5 — Richer workflows

**Criterion:** A worker can upload a payslip photo, have it extracted, confirm the values, and produce an evidence pack — entirely on their phone, offline-capable.

**Evidence:**
- One end-to-end test session from a worker's phone (with their consent), documented.
- PWA passes Lighthouse PWA audit (installable, offline-capable).
- LLM extraction respects all gates (worker confirms; no calc-path LLM; identity stripped).

## Anti-pattern: gate by checklist, not criterion

If every checkbox in `PLAN-PRJ-mvp-phases.md` is ticked but the criterion above isn't met, the phase is NOT done. Add the missing tasks to the plan and continue. Don't ship a phase you can't verify.

## Why this file exists
Without explicit gates, "done" drifts. The criterion is the contract.
