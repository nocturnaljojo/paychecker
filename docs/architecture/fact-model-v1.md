> **Superseded by:** `docs/architecture/add-fact-pattern.md` — see that file for current fact model design intent.

# Architecture — fact model v1

> **Source-of-truth status:** Historical
> **Canonical source:** `docs/architecture/add-fact-pattern.md`
> **Last verified against source:** 2026-04-26
> **Drift policy:** This file is preserved for historical context. For current fact model design, see `add-fact-pattern.md`.

This is the architecture-track companion to `.claude/ref/REF-FACT-model.md`. The REF file is the engineer's quick-reference; this file is the reasoning trail.

## Why a 3-layer model and not, say, 1 or 5?

**1-layer (everything is just a "fact"):** simplest, but confirmation cadence collapses. Either we ask for confirmation too often (annoying) or too rarely (silent corruption).

**5-layer (more granular):** more shapes, more code paths, more places to drift. The 3 we picked map cleanly to confirmation cadence (once / per-period / per-event), and that's the dimension we care about.

**3-layer:** the minimum split that lets confirmation cadence match the data's natural cadence.

## Edge cases the model has to handle

### Worker changes employer mid-period
Layer 1 fact (`worker_classification_facts`) gets a new row with `effective_from = transition_date`, the old row gets `effective_to = transition_date - 1`. Layer 2 facts after the transition reference the new Layer 1 row implicitly via `effective_at` matching.

### Worker is wrong about their classification
The classification is what they confirm. Even if it's wrong relative to the FWC. This is by design — we are not a classification arbiter; we are a calculator. The report should expose enough source detail that a third-party reviewer can spot the error.

### Same shift logged twice (e.g. worker enters it, then OCR finds it on payslip)
Two `shift_facts` rows; both confirmed; both end up in the calc. This is a problem and we handle it by surfacing duplicates in the UI for worker resolution. The calc itself does NOT auto-dedupe.

### Worker edits a confirmed fact after a comparison was already run
The comparison is immutable — already-stored snapshot includes the old value. The edit unsets `confirmed_at` on the fact row. Worker can re-confirm and re-run. Old comparison stays as historical record.

### LLM extracts a value the worker can't easily verify (e.g. a coded allowance)
Surface "we couldn't be sure — please check your contract or ask your employer" rather than asking the worker to confirm something they can't actually evaluate. Provenance is `ocr_suggested` (NOT `_confirmed`), so it stays out of calcs until they do confirm.

### Worker wants to enter facts going backwards (last 6 months)
Allowed. Layer 1 / Layer 2 facts can have any historical `effective_from`. Layer 3 payslips ditto. Comparisons run for any historical period. The model is time-bounded throughout.

## Piece rates (Phase 4 stress test)

Horticulture workers can be paid per bin, not per hour. The model's response:
- Layer 2 `shift_facts` extends with optional `pieces_completed` and `pieces_unit` columns.
- Layer 1 `worker_classification_facts` `pay_basis` enum extends to include `piece`.
- `award_rates` already has `pay_basis`. Engine reads it and dispatches.

If this requires a special-case branch in the calc engine, that's an architectural finding — escalate via idea-to-execution.

## Open questions for v2
- Do we need a `pay_period_facts` Layer 2.5 (the period itself as a fact, separate from shifts)? Phase 0 says no; piece rates may force it in Phase 4.
- Annualised salaries (Hospitality MA000009) — do we treat the annual base as Layer 1 with derived weekly Layer 2.5 expectations? TBD Phase 2 prep.

## Why this file exists
The REF version is for "what is the rule". This file is for "why does the rule exist", "what edge cases were considered", and "what we'd revisit". When future-Jovi or a new contributor asks "why three layers", they read this.
