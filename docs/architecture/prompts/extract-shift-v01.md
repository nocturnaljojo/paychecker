# Extract Shift Prompt v01

**Status:** Skeleton (Sprint A3, 2026-04-29). Full prompt copy lands in Sprint B2.
**Model:** `claude-sonnet-4-6`
**Used by:** Pipeline step 3 (EXTRACT) when `detected_type = 'shift'`.
**Output schema:** see `extraction-service-v01.md` § "EXTRACTION OUTPUT — shift".
**Downstream consumer:** `shift_facts` schema + `calc-rules-v01.md` Rules 2, 3, 4, 5, 6.
**Version:** v01 (initial).

## SYSTEM

Role: You extract individual shifts from an Australian roster, schedule, or shift-related upload. You return strict JSON only.

**Layer 1 generic patterns (inline):**

- **Roster format conventions:**
  - **Week grid:** rows = days, columns = workers; cell = "06:00–14:30".
  - **Day-by-day list:** "Monday 14 Apr — 06:00 to 14:30, 30 min break".
  - **SMS thread screenshot:** "Hi mate, you're on tomorrow 6 to 2:30." Less structured; lower extraction confidence expected.
  - **Employer-app screenshot:** typically clean tabular format, easier extraction.
- **Shift component extraction:**
  - `started_at` — full ISO 8601 timestamp `YYYY-MM-DDTHH:MM` (timezone implied: Australia/Sydney unless document states otherwise).
  - `ended_at` — same format. May span midnight (night shift); extractor returns the calendar date the shift ENDED.
  - `break_minutes` — integer minutes; commonly 30 (paid lunch) or 0 (unpaid break excluded from worked hours per most awards).
- **`shift_type_guess` heuristic** (per `calc-rules-v01.md` Rule 5):
  - `early_morning` if `started_at >= 02:00 AND started_at < 04:00`.
  - `afternoon` if `ended_at >= 17:00 AND ended_at <= 24:00`.
  - `night` if `ended_at > 24:00 AND ended_at <= 08:00` (next day).
  - `weekend_penalty` if Saturday or Sunday (Rule 6 weekend rates apply).
  - `public_holiday` requires a public-holiday calendar (out of A3 scope; left as `'ordinary'` and worker-correction at REVIEW).
  - Else `'ordinary'`.
- **Implicit roster timeframe:** if the document shows "Week of 14 Apr", inferred `roster_period_start = 2026-04-14`, `roster_period_end = 2026-04-20`.
- **Employer guess:** uses Layer 3 hints; if Apete works at one employer, all shifts default to that employer at REVIEW.

**Field-confidence calibration:**
- ≥ 0.85 on tabular employer-app screenshots.
- 0.70 – 0.85 on week-grid handwritten or printed schedules.
- 0.50 – 0.70 on SMS / informal communications.
- < 0.50 on ambiguous time strings ("after lunch", "evening shift").

## USER (template — fields filled at runtime)

```
# Employer-specific context (Layer 2)
{{layer_2_employer_patterns}}
<!-- Includes roster format hints per employer. -->

# Worker-specific context (Layer 3)
{{layer_3_worker_preferences}}
<!-- Includes typical shift start times, day-or-shift-worker label,
     and known employer roster. -->

# Document
[image attachment]

# Worker metadata
- Worker UUID: {{worker_uuid}}
- Known employers: {{worker_employer_slugs}}
- Upload timestamp: {{uploaded_at}}

# Task
Extract individual shifts from this roster. Return JSON matching the
EXTRACTION OUTPUT — shift schema in extraction-service-v01.md. Strict
JSON only.
```

## OUTPUT_SCHEMA

See `extraction-service-v01.md` § "EXTRACTION OUTPUT — shift".

## CORRECTIONS (REVIEW stage)

- Per-shift review: date + start + end + break + shift_type_guess.
- `shift_type_guess` is a starting point; worker confirms the actual `shift_type` (which the calc engine derives anyway from started_at + ended_at + day-of-week).
- Bulk-confirm affordance: if all shifts in a roster look right, single tap confirms the batch (Layer 3 will record this convenience pattern as a worker preference).
- Tertiary: *"Add a shift the roster missed"* + *"This shift didn't happen"*.

## VERSIONING

Bump when roster pattern catalogue changes (new format support), when shift_type heuristic constants change (rare — they come from FWC clauses), or for major prompt revisions.

## SUCCESS METRICS

- Per-shift accuracy on (started_at, ended_at) ≥ 90%.
- `shift_type_guess` agreement with calc-engine derivation (informational, not gating).
- Bulk-confirm rate (proxy for worker trust in extraction) — track for Phase 0 onwards.
