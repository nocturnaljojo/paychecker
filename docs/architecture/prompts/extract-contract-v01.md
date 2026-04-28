# Extract Contract Prompt v01

**Status:** Skeleton (Sprint A3, 2026-04-29). Full prompt copy lands in Sprint B2.
**Model:** `claude-sonnet-4-6`
**Used by:** Pipeline step 3 (EXTRACT) when `detected_type = 'contract'`.
**Output schema:** see `extraction-service-v01.md` § "EXTRACTION OUTPUT — contract".
**Downstream consumer:** `worker_classification_facts` schema + `calc-rules-v01.md` Rules 3, 4, 5.
**Version:** v01 (initial).

## SYSTEM

Role: You extract structured fields from an Australian employment contract or letter of offer. You return strict JSON only.

**Layer 1 generic patterns (inline):**

- **Standard contract sections:** parties, position + classification, hours, rate, allowances, leave, termination, signature.
- **Award reference:** contracts reference `MA000NNN`. Common: `MA000074` (Poultry Processing), `MA000059` (Meat), `MA000028` (Horticulture), `MA000009` (Hospitality). Worker's relevant award is the one this contract names.
- **MA000074 classification enum (Apete's award):** `PE_LEVEL_1` through `PE_LEVEL_6` ("Process Employee Level N" per FWC Schedule A.1.x). Some employers use synonyms like *"Process Worker Grade N"* — Layer 2 patterns capture these per-employer aliases.
- **Employee type:** `full_time`, `part_time`, `casual`. Inferred from contract sections (ordinary hours commitment + casual loading clause).
- **Day worker vs shiftworker:** Per `calc-rules-v01.md` Rule 3 + Rule 4. Day worker spread is 5am–5pm Mon–Fri (cl 13.2). Shiftworker any-day (cl 13.3). Permanent night shift triggered by 4+ consecutive weeks (cl 20.1) — usually stated explicitly in contract.
- **Hourly rate vs annualised salary:** if contract states an annual figure, divide by 52 × ordinary_hours_per_week to derive hourly. Flag at REVIEW if division yields a non-round number that doesn't match `award_rates`.
- **`hourly_rate_override` field:** captured for future migration support per Sprint 7 honest-deviation note. Calc engine ignores until a future ADR + migration adds the column.
- **Effective dates:** `effective_from` is contract start date; `effective_to` is end date if fixed-term, NULL if ongoing.
- **Allowances listed in contract:** mapped to the schema allowance shape; downstream calc engine joins against `award_allowances` reference data.

## USER (template — fields filled at runtime)

```
# Employer-specific context (Layer 2)
{{layer_2_employer_patterns}}

# Worker-specific context (Layer 3)
{{layer_3_worker_preferences}}

# Document
[image attachment]

# Worker metadata
- Worker UUID: {{worker_uuid}}
- Employer ID: {{employer_id}}
- Upload timestamp: {{uploaded_at}}

# Task
Extract structured fields from this employment contract. Return JSON
matching the EXTRACTION OUTPUT — contract schema in
extraction-service-v01.md. Strict JSON only.
```

## OUTPUT_SCHEMA

See `extraction-service-v01.md` § "EXTRACTION OUTPUT — contract".

## CORRECTIONS (REVIEW stage)

- Classification field shown alongside the contract excerpt (split view).
- Synonym-mapping prompt: if extracted `classification_code` doesn't match the MA000074 enum, surface *"Your contract says '...'. Which level is this?"* with the 6-level picker. Worker correction triggers Layer 2 counter-example pattern (Apete's specific employer uses 'Process Worker Grade X' for `PE_LEVEL_X`).
- `employee_type` confirmation prompt: *"Are you {full_time | part_time | casual}?"*
- `day_or_shift_worker` + `permanent_night_shift` confirmation if extracted with confidence < 0.70.

## VERSIONING

Bump when MA000NNN classification enums change, when output schema changes, or for major prompt-copy revisions.

## SUCCESS METRICS

- `classification_code` accuracy ≥ 95% (gates calc engine — wrong classification = wrong rate).
- `employee_type` accuracy ≥ 95% (gates Rule 1 casual-loading interaction).
- `day_or_shift_worker` accuracy ≥ 90% (gates Rules 3 + 4 OT logic).
