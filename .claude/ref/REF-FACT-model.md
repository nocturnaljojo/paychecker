# REF-FACT-model

## Purpose
Deep dive on the 3-layer fact model. Architectural principle #2 (from `CLAUDE.md`) operationalised.

## Why a fact model at all

A wage-compliance comparison is a function of many small facts: who you work for, what classification you're on, what hours you worked, what you got paid. Some of these change rarely (your classification), some daily (your shifts), some per pay cycle (your payslip).

If we treat them all the same, we either over-confirm (worker re-confirms classification every Monday — friction) or under-confirm (worker accepts pre-filled shift values without checking — silent lies). The 3-layer split lets confirmation cadence match data cadence.

## The 3 layers

### Layer 1 — Stable facts
Things about the worker's employment that change rarely.

- Employer (entity, ABN)
- Classification (per relevant Modern Award)
- Pay terms (casual / part-time / full-time, ordinary hours)
- Award reference (which MA00NNNN applies)
- Bank account for wage deposits (just the last 4 + bank name; never full account)
- Super fund destination

**Confirmation cadence:** confirmed once at onboarding, re-confirmed on edit, re-confirmed when the worker says they changed jobs.

### Layer 2 — Period facts
Things that vary within a pay period.

- Shifts (start / end / breaks / shift type — ordinary, OT, public holiday)
- Hours worked
- Allowances earned (per shift — laundry, travel, etc.)

**Confirmation cadence:** confirmed at logging time. If the worker logs Monday's shift on Monday, that's the confirmation. If a shift is edited after the pay period closes, the edit unsets `confirmed_at` and the worker re-confirms.

### Layer 3 — Payment facts
What was actually paid.

- Payslip line items (gross, net, ordinary hours pay, OT pay, allowances, deductions, tax, super)
- Bank deposit (date, amount, narration)
- Super contribution (date, amount, source employer)

**Confirmation cadence:** confirmed at upload time. Each new payslip is its own confirmation event.

## Provenance

Every fact row has a `provenance` enum and a `confirmed_at` timestamp.

| Provenance | Meaning | Calc-eligible? |
|---|---|---|
| `worker_entered` | Worker typed it in | Yes (when `confirmed_at` set) |
| `ocr_suggested_confirmed` | Extracted by OCR/Claude, then worker confirmed | Yes (when `confirmed_at` set) |
| `assisted_entered` | Support staff entered, worker signed off | Yes (when `confirmed_at` set) |
| `derived` | Computed from other confirmed facts | Yes (auto — `confirmed_at` = derivation time) |
| `ocr_suggested` | Extracted, NOT confirmed | NO — invisible to calc |
| `imported_unverified` | Bulk import, not yet confirmed | NO — invisible to calc |

## Calc-time selection rule

The comparison engine selects fact rows where:
```sql
WHERE confirmed_at IS NOT NULL
  AND provenance IN ('worker_entered', 'ocr_suggested_confirmed', 'assisted_entered', 'derived')
  AND effective_at <@ '[period_start, period_end]'::tstzrange
```

This is the ONLY allowed way to read facts into a calc. Any code path that bypasses this is a P0 issue.

## History

Every fact table has a sibling `*_history` table with the full row each time it changed (insert, update, soft-delete). History rows are append-only and never modified. This is what makes "what did the app tell Apete on April 23rd" answerable.

## Schema sketch (see `REF-DB-schema.md` for current state)

```sql
-- Layer 1 example
create table worker_classification_facts (
  id uuid primary key,
  worker_id uuid references workers,
  classification_code text,
  award_ref text,
  effective_from date,
  effective_to date,
  provenance text not null,
  confirmed_at timestamptz,
  created_at timestamptz default now(),
  source_doc_id uuid references documents
);
create table worker_classification_facts_history (...same shape...);
```

## Common pitfalls

- Treating `inserted` as `confirmed`. Insert is the proposal; confirm is the act.
- Soft-deleting a fact and assuming the calc will ignore it. Use `confirmed_at = null` or a `revoked_at` field, never just a `deleted` flag.
- Putting derived values (e.g. weekly hours) into a Layer 2 table. Derived facts go in their own `derived_facts` table, computed lazily, never stored as if entered.
- Allowing the calc to "fall back" to unconfirmed values "if no confirmed value exists". This is the single most dangerous pattern. Refuse to calc instead.

## Why this exists
The information-tool framing dies the moment a calc runs on facts the worker didn't see and confirm. The 3-layer model is what makes the framing operational rather than aspirational.
