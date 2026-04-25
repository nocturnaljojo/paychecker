# SKILL-COMP-calculator

## Purpose
Run a comparison: what the award + contract say the worker should have been paid vs. what they were actually paid. Always against confirmed facts, always with an immutable snapshot, always through two gates.

## Trigger phrases
- "run a comparison"
- "calculate this pay period"
- Any new code path that produces a comparison result

## Hard rule
The calculator is **deterministic and auditable**. Same inputs → same output, every time. No randomness. No LLM. No "smart" inference.

## Inputs

A comparison requires:
- A worker's confirmed Layer 1 facts (employer + classification + pay terms).
- A pay period (start + end date).
- Confirmed Layer 2 facts within the period (shifts, hours).
- Confirmed Layer 3 facts within the period (payslip and/or bank deposit and/or super contribution).
- Award reference data effective during the period.

If any input is missing or unconfirmed, the calc does NOT run — it surfaces "we can't compare yet, here's what we still need".

## The two gates

### Gate 1 — Re-verify inputs are current
- For each Layer 1 fact: when was it last confirmed? If a worker changed jobs and the classification is stale, refuse and prompt re-confirmation.
- For each Layer 2 / Layer 3 fact: confirmed within the period? Any unconfirmed rows in the period?
- Any award rate effective during the period — has it been superseded?

### Gate 2 — Classify the gap
After computing expected vs. received, classify the gap:
- **Size:** absolute $ and % of expected.
- **Frequency:** is this a one-off or has this gap appeared in N of the last M periods?
- **Confidence:** how strong is each input fact's provenance? Layer 3 from a confirmed-from-OCR payslip is high; Layer 2 from worker-typed shifts that contradict the payslip is medium; missing super statement is low.

## Output

Every comparison produces an immutable snapshot row:
- `id` (uuid), `worker_id`, `period_start`, `period_end`
- `award_ref_snapshot` — full JSON of award rules used (NOT a foreign key, a copy)
- `inputs_snapshot` — full JSON of all confirmed facts used
- `expected_amounts` — JSON breakdown
- `received_amounts` — JSON breakdown
- `gap` — JSON: `{size, frequency, confidence, classification}`
- `created_at`, `created_by_session`
- `report_pdf_storage_path` (nullable)

The snapshot is written ONCE. Never updated. New inputs → new comparison row.

## Surfacing rules (information tool framing)
- Words used: "expected", "received", "difference". NEVER "underpaid", "wage theft", "you should".
- Numbers shown with two decimals always. Currency symbol prefixed.
- Ranges when uncertain (`$280 – $620`), never a point estimate dressed as fact.
- "Why this number?" is tappable on every line — shows the source chain.

## Common pitfalls
- Running a calc on partially confirmed inputs and "filling the gaps" with LLM guesses. Don't.
- Updating an existing snapshot when re-running the calc. Always create a new row.
- Mutating award reference data in place. Awards are versioned, time-bounded.
- Surfacing a difference without classifying it through Gate 2 — leads to false alarms.
- Using language that asserts a fact ("you were underpaid"). Stick to "the difference is $X".

## Why this exists
Three things make this a regulated-safe information tool: deterministic calc, immutable snapshots, and worker-confirmed inputs. Lose any one and we're shipping advice in a calculator costume.
