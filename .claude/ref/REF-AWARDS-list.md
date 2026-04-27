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
| MA000074 | Poultry Processing Award 2020 | Phase 0 | **PARTIAL** | **2026-04-27** | [`awards-ma000074-v01.md`](../../docs/research/awards-ma000074-v01.md) — ~70 % v01; full once §6 `[SOURCE NEEDED]` gaps close in v02 |
| MA000059 | Meat Industry Award | Phase 3 | PLANNED | _none yet_ | _to be created_ |
| MA000028 | Horticulture Award | Phase 4 | PLANNED | _none yet_ | _to be created_ |
| MA000009 | Hospitality Industry (General) Award | Phase 2 | PLANNED | _none yet_ | _to be created_ |

### MA000074 partial-coverage detail (Sprint 2 seed, migration 0005)
- **Classifications seeded:** Levels 1–6 (per cl 15.1, varied by PR786612, effective 2025-07-01). Both weekly + hourly rows in `award_rates`.
- **Allowances seeded:** Leading Hand 1–19 / 20+ (cl 17.2(b)(i), all-purpose); First Aid (cl 17.2(d), additive); Cold Work bookend bands low + high (cl 17.2(c), additive).
- **Allowances NOT seeded (`[SOURCE NEEDED]` per research v01 §6):** Cold Work intermediate temperature bands; Meal allowance; Vehicle allowance.
- **Rules NOT seeded:** Schedule A classification definitions (verbatim text); span-of-hours / ordinary-hours window clause; night-shift vs permanent-night-shift definition; public-holiday OT rate; casual + penalty interaction rule. v02 research closes these.
- **Promote to `SUPPORTED`:** when v01 → v02 follow-up checklist (research note §6) is fully closed AND a real worker has run ≥ 1 comparison reviewed by a third party (per `SKILL-AWARD-add-new` step 6).

## Process for adding a new award
See `.claude/skills/SKILL-AWARD-add-new.md`. Do not skip steps even when the award seems "just like the last one".

## Annual variations
The FWC Annual Wage Review usually publishes around 1 June with rates effective 1 July. Schedule the `researcher` agent to re-pull each currently-supported award between 1 June and 1 July annually, and surface variations as `STATE-PRJ-issues.md` entries.

## Pending FWC variations to watch
_None tracked yet._

## Why this exists
Knowing which awards we say we support, vs. which we actually have tested calcs for, is a regulatory + worker-safety question. This file is the ground truth.
