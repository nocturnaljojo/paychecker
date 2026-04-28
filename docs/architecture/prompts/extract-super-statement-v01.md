# Extract Super Statement Prompt v01

**Status:** Skeleton (Sprint A3, 2026-04-29). Full prompt copy lands in Sprint B2.
**Model:** `claude-sonnet-4-6`
**Used by:** Pipeline step 3 (EXTRACT) when `detected_type = 'super_statement'`.
**Output schema:** see `extraction-service-v01.md` § "EXTRACTION OUTPUT — super_statement".
**Downstream consumer:** `super_contribution_facts` schema.
**Version:** v01 (initial).

## SYSTEM

Role: You extract structured fields from an Australian superannuation statement. You return strict JSON only.

**Layer 1 generic patterns (inline):**

- **Super fund identifier patterns:** Fund name + USI (Unique Superannuation Identifier, format `XXX0001AU` etc.) + member number.
- **Common AU super funds:** AustralianSuper, REST, HESTA, Australian Retirement Trust, UniSuper, Hostplus, CBUS, MyState — each has a recognisable layout.
- **Statement period:** quarterly or annual; explicit `period_start` and `period_end` dates in header.
- **Balance fields:** opening_balance + closing_balance; difference reconciles to contributions − fees − insurance.
- **Contribution categorisation:**
  - `employer` — Superannuation Guarantee + employer additional
  - `member` — after-tax voluntary
  - `government_co_contribution` — government top-up for low-income earners
  - `salary_sacrifice` — pre-tax voluntary (sometimes labelled "concessional" or "salary sacrifice")
- **Source employer name** in the contributions table is the worker's employer at the time of the contribution; cross-check against worker's known `employers` records via Layer 3 hints.
- **Date format:** ISO 8601 in output. Source documents commonly use `DD MMM YYYY` (e.g., "15 Apr 2026") — convert.

## USER (template — fields filled at runtime)

```
# Employer-specific context (Layer 2)
{{layer_2_employer_patterns}}
<!-- Layer 2 patterns for super_statement may be sparse; super funds
     differ more than employers in document layout. -->

# Worker-specific context (Layer 3)
{{layer_3_worker_preferences}}

# Document
[image attachment]

# Worker metadata
- Worker UUID: {{worker_uuid}}
- Upload timestamp: {{uploaded_at}}

# Task
Extract structured fields from this super statement. Return JSON
matching the EXTRACTION OUTPUT — super_statement schema in
extraction-service-v01.md. Strict JSON only.
```

## OUTPUT_SCHEMA

See `extraction-service-v01.md` § "EXTRACTION OUTPUT — super_statement".

## CORRECTIONS (REVIEW stage)

- Per-contribution row review (date + amount + category + source_employer).
- Source-employer matching prompt if no match against worker's `employers` records: *"Is this contribution from {extracted_name}? We don't have that employer yet — add them?"* Worker correction may add a new `employers` row + Layer 3 preference.
- Category correction: surface picker if confidence < 0.80 on category.

## VERSIONING

Bump when fund-identifier patterns change, when category enum changes, or for major prompt revisions.

## SUCCESS METRICS

- Per-contribution accuracy on (date, amount, category) ≥ 90%.
- Source-employer matching rate (worker confirms vs corrects) ≥ 80%.
