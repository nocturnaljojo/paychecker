# REF-AWARDS-list

## Purpose
Index of Modern Awards we support, partially support, or plan to support. Single line per award; deep notes live in `docs/research/awards-{maNNNN}-vNN.md`.

## Status legend
- **SUPPORTED** — full reference data, tested with a real worker, included in calc engine.
- **PARTIAL** — reference data loaded, calc handles the common path, gaps documented.
- **PLANNED** — agreed for a future phase, no work started.
- **PARKED** — researched but deferred.

## Awards

| Code | Title | Phase | Status | Last reviewed | Research notes |
|---|---|---|---|---|---|
| MA000074 | Poultry Processing Award 2020 | Phase 0 | **PARTIAL** | **2026-04-28** | v01 + [`awards-ma000074-v02.md`](../../docs/research/awards-ma000074-v02.md) — Sprints 4 + 5 closed all v01 §6 gaps; status remains PARTIAL until Apete real-world use + third-party signoff per `SKILL-AWARD-add-new` step 6 |
| MA000059 | Meat Industry Award | Phase 3 | PLANNED | _none yet_ | _to be created_ |
| MA000028 | Horticulture Award | Phase 4 | PLANNED | _none yet_ | _to be created_ |
| MA000009 | Hospitality Industry (General) Award | Phase 2 | PLANNED | _none yet_ | _to be created_ |

### MA000074 partial-coverage detail (Sprint 2 seed, migration 0005)
- **Classifications seeded:** Levels 1–6 (per cl 15.1, varied by PR786612, effective 2025-07-01). Both weekly + hourly rows in `award_rates`.
- **Allowances seeded:** Leading Hand 1–19 / 20+ (cl 17.2(b)(i), all-purpose); First Aid (cl 17.2(d), additive); Cold Work bookend bands low + high (cl 17.2(c), additive).
- **Allowances NOT seeded (still `[SOURCE NEEDED]` for migration even though v02 has the values):** Cold Work middle band ($1.67/hr cl 17.2(c)); Meal allowance ($18.38 cl 17.3(a)); Vehicle allowance ($0.98/km cl 17.3(b) — also blocked on `award_allowances.unit` enum needing a `km` value, future ADR). A follow-up migration (Sprint 2.1 candidate) lands these once the schema enum question resolves.
- **Rules captured in v02 but not yet wired:** Schedule A.1.1 / A.1.2 / A.1.3 verbatim definitions (Process Employee Levels 1–3); cl 13.2 day-worker span 5am–5pm; cl 13.3 shiftworker any-day; cl 17.4 additive-allowance immutability under penalties; cl 19.2 OT rates; cl 19.5 + cl 11.3 casual×OT/penalty interaction (no stacking — corrects v01 §4 hypothesis); cl 20.1 night-shift definitions; cl 20.2 penalty rates table. Calc engine implementation (Sprint 6+) consumes these directly from v02.
- **Promote to `SUPPORTED`:** when v01 → v02 follow-up checklist (research note §6) is fully closed AND a real worker has run ≥ 1 comparison reviewed by a third party (per `SKILL-AWARD-add-new` step 6).

## Process for adding a new award
See `.claude/skills/SKILL-AWARD-add-new.md`. Do not skip steps even when the award seems "just like the last one".

## Annual variations
The FWC Annual Wage Review usually publishes around 1 June with rates effective 1 July. Schedule the `researcher` agent to re-pull each currently-supported award between 1 June and 1 July annually, and surface variations as `STATE-PRJ-issues.md` entries.

## Pending FWC variations to watch
_None tracked yet._

## Why this exists
Knowing which awards we say we support, vs. which we actually have tested calcs for, is a regulatory + worker-safety question. This file is the ground truth.
