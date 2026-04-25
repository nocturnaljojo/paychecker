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
| MA000074 | Poultry Processing Award | Phase 0 | PLANNED | _none yet_ | (to be created — `docs/research/awards-ma000074-v01.md`) |
| MA000059 | Meat Industry Award | Phase 3 | PLANNED | _none yet_ | _to be created_ |
| MA000028 | Horticulture Award | Phase 4 | PLANNED | _none yet_ | _to be created_ |
| MA000009 | Hospitality Industry (General) Award | Phase 2 | PLANNED | _none yet_ | _to be created_ |

## Process for adding a new award
See `.claude/skills/SKILL-AWARD-add-new.md`. Do not skip steps even when the award seems "just like the last one".

## Annual variations
The FWC Annual Wage Review usually publishes around 1 June with rates effective 1 July. Schedule the `researcher` agent to re-pull each currently-supported award between 1 June and 1 July annually, and surface variations as `STATE-PRJ-issues.md` entries.

## Pending FWC variations to watch
_None tracked yet._

## Why this exists
Knowing which awards we say we support, vs. which we actually have tested calcs for, is a regulatory + worker-safety question. This file is the ground truth.
