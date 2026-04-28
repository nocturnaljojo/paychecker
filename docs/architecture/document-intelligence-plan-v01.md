# Document Intelligence Plan v01

**Status:** Future-state architecture (Sprint 7.1, 2026-04-28).
**Promoted to ADR:** Pending — Sprint A1 will write ADR-013.
**Amends:** ADR-012 (entry point + stage 2/3 semantics).
**Related:** ADR-001, ADR-005, ADR-006, ADR-007, add-fact-pattern.md, confirmation-flow.md.

## Why this document exists

Sprint 7 surfaced a fundamental architectural mismatch: ADR-012's "Add a Fact" pattern assumed worker-types-fields. Real Apete-shaped behaviour is worker-uploads-documents. This plan captures the correct model so it isn't lost between sessions.

This is NOT yet an architectural decision record. It's a planning document that ADR-013 will formalize.

## The mental model

The worker does THREE things, ever:

1. **UPLOAD** — take a photo, or upload a PDF
2. **CONFIRM** — glance at extracted values, tap "yes that's right" (or correct anything wrong)
3. **RESULT** — see the comparison

That's it. No forms. No fields. No typing — except as fallback.

The app does the WORK. The worker provides the EVIDENCE.

### Three trust gates

- **GATE 1** — App correctly understood my document
  (worker confirms classification + routing)
- **GATE 2** — App correctly extracted the values
  (worker confirms extracted data)
- **GATE 3** — App correctly compared the math
  (worker reviews comparison output per ADR-007)

Without all three gates passing, no comparison runs.

## What this changes vs ADR-012

ADR-012's 5 stages survive but their roles shift:

| Stage | ADR-012 (form-first) | Plan v01 (upload-first) |
|---|---|---|
| ENTRY | "I'm going to add a {fact}" | Same |
| SUGGEST | Values from prior context | Values from extraction |
| INPUT | Type values from scratch | Edit extracted values |
| CONFIRM | Same | Same |
| AFTERMATH | Same | Same |

NEW stages **precede** the original 5:

| Stage | Purpose |
|---|---|
| UPLOAD | Accept files (single or bulk) |
| CLASSIFY | Model decides document type + confidence |
| ROUTE | Assign to bucket(s); worker reviews if low confidence |
| EXTRACT | Pull structured data per bucket schema |

Then ADR-012's original 5 stages run with extracted values as starting point.

## Document lifecycle

Every uploaded document moves through these states:

| State | Meaning |
|---|---|
| RAW | Just uploaded, no metadata beyond filename + size |
| CLASSIFYING | Extraction service processing |
| CLASSIFIED | Type identified with confidence score |
| ROUTED | Assigned to bucket(s), stored canonically |
| EXTRACTING | Pulling structured fields per bucket schema |
| EXTRACTED | Structured data populated as proposed-state facts |
| REVIEWED | Worker has seen routing + extraction (not yet confirmed) |
| CONFIRMED | Worker tapped Confirm; calc-engine eligible |
| DISPUTED | Worker corrected routing or extraction |
| ARCHIVED | Superseded by newer document (kept for audit) |

## The 4-layer memory architecture

### Layer 1 — Generic patterns (system-level, immutable)
- Australian payslip layouts (ATO standard fields)
- ABN format (11 digits)
- MA000074 classification codes (Process Employee Level 1-6)
- Standard date / currency formats
- **Storage:** in-prompt context to extraction service
- **Cost:** zero (training data + prompt engineering)

### Layer 2 — Per-employer patterns (company-level, learned)
- "Acme Poultry payslips: gross at top-right, period in header"
- "This employer cites cl 17.3(b) on contracts"
- "Their classification letters use 'Process Worker Grade X'"
- **Storage:** `employer_extraction_patterns` table
- **Cost:** stored once, reused per employer

### Layer 3 — Per-worker patterns (individual, adaptive)
- "Apete uploads landscape screenshots"
- "Apete's super statements come from AustralianSuper quarterly"
- "Apete's payslips arrive 1st and 15th of each month"
- **Storage:** `worker_extraction_preferences` table
- **Cost:** stored per worker; adjusts classification confidence

### Layer 4 — Cross-document reconciliation (smart routing)
- "Page 2 of upload-X is page 1 of contract-Y from last week"
- "This screenshot has payslip + contract content — split"
- "This is a duplicate of doc-Z"
- **Storage:** runs at classification time using vector similarity against worker's prior documents (no dedicated table)
- **Cost:** per-classification embedding lookup

## Schema additions (Migration 0011 spec)

Building on Sprint 6.5 + 6.6 schema:

```sql
-- Already exists (Migration 0002): documents

-- NEW: classification results
document_classifications (
  id uuid pk,
  document_id uuid fk documents,
  detected_type text,
  confidence numeric(3,2),
  classified_at timestamptz,
  classifier_version text,
  routing_status text CHECK (routing_status IN (
    'auto_routed', 'review_pending', 'worker_corrected', 'failed'
  )),
  page_range int4range,
  parent_doc_id uuid fk documents,
  notes text
)

-- NEW: extraction results (proposed-state before *_facts)
document_extractions (
  id uuid pk,
  document_id uuid fk documents,
  bucket text CHECK (bucket IN (
    'employment_contract', 'payslip', 'shift',
    'super_statement', 'bank_deposit'
  )),
  extracted_jsonb jsonb,
  field_confidences jsonb,
  extraction_status text CHECK (extraction_status IN (
    'pending', 'success', 'partial', 'failed', 'low_confidence'
  )),
  extracted_at timestamptz,
  extractor_version text
)

-- NEW: layered memory (Layer 2)
employer_extraction_patterns (
  id uuid pk,
  employer_id uuid fk employers,
  document_type text,
  pattern_jsonb jsonb,
  observation_count int default 1,
  last_observed timestamptz,
  confidence numeric(3,2)
)

-- NEW: layered memory (Layer 3)
worker_extraction_preferences (
  id uuid pk,
  worker_id uuid fk workers,
  preference_key text,
  preference_value jsonb,
  observation_count int default 1,
  last_observed timestamptz
)
```

## The extraction service

**Service:** Claude API vision (Sonnet for accuracy, Haiku for high-volume cheap passes).

**Pipeline per document:**

1. **Pre-classification** — identify document type with confidence
2. **Routing decision** — auto-route ≥0.85, review 0.50-0.85, manual <0.50
3. **Per-bucket extraction** — pull structured JSON per schema
4. **Reconciliation pass** — Layer 4 memory check (duplicates, page joins, splits)
5. **Memory update** — patterns learned to Layer 2 / 3

**Prompt templates** (versioned, stored in repo):

- `classify-prompt.md` — generic classifier
- `extract-contract.md` — employment contract schema
- `extract-payslip.md` — payslip schema
- `extract-super.md` — super statement schema
- `extract-bank.md` — bank deposit schema
- `extract-roster.md` — shift roster schema

## UX flow

| Screen | Purpose |
|---|---|
| **Upload zone** | Primary entry point. Drop / pick / camera. Bulk OK. |
| **Classifying** | In-flight feedback per file |
| **Routing review** | "Here's what we found in your N files. Tap to correct." |
| **Extraction review** | Per-bucket: "We extracted these values. Tap Confirm." |
| **Aftermath** | "Saved. Stays on screen." (per ADR-012 Rule 5.1) |
| **Manual entry (fallback)** | Sprint 7's form, accessed FROM bucket detail when worker has no document or extraction failed |

## Sprint 7 disposition

Sprint 7's commit (e949ce1) ships the manual entry form for the Employment Contract bucket. It is NOT wrong — it's repositioned:

- **Was:** primary action on Dashboard ("Upload contract" → form)
- **Becomes:** fallback path inside bucket detail screen (when worker has no document or extraction failed)

The Sprint 7 code stays. Dashboard routing changes when ADR-013 ships: "Upload contract" button routes to UPLOAD zone, not the form. Form becomes accessible via "I don't have my contract" escape hatch on the upload screen, OR via bucket detail edit page.

## Tomorrow's sprint sequence (estimate)

| Sprint | Type | Budget | Output |
|---|---|---|---|
| A1 | DECISION | 60 min | ADR-013 + amend ADR-012 |
| A2 | DESIGN | 45 min | Storage + naming architecture |
| A3 | DESIGN | 45 min | Extraction service spec + prompts |
| A4 | DESIGN | 45 min | Layered memory spec |
| A5 | EXECUTION | 45 min | Migration 0011 (4 new tables) |
| B1 | BUILD | 90 min | Upload UI + drop zone |
| B2 | BUILD | 90 min | Classification service integration |
| B3 | BUILD | 90 min | Routing review UI |
| C+ | BUILD | varies | Per-bucket extraction (5 buckets) |
| D | BUILD | 60 min | Sprint 7 retrofit (Dashboard routing) |
| E | BUILD | 90 min | Comparison engine v1 (was Sprint 10) |

## Cost model (rough)

- Per-document classification: ~$0.005 (Haiku)
- Per-document extraction: ~$0.02-0.05 (Sonnet, depends on length)
- Average worker per month: ~4 payslips + ~1 super + ~4 bank = 9 docs
- ~$0.20-0.50 per worker per month at extraction cost
- Phase 0 user count target: tens, not thousands → cost negligible
- Phase 1+ scaling: revisit with batch / cache / Haiku-first optimization

## Privacy implications by layer

| Layer | Privacy concern | Mitigation |
|---|---|---|
| Layer 1 | None (system-level patterns) | n/a |
| Layer 2 | Identifies employer payslip formats | Stored per employer; not cross-shared with other workers |
| Layer 3 | Identifies worker behaviour patterns | Stored per worker_id; deletable on account deletion |
| Layer 4 | Cross-document analysis runs in extraction prompt context | Document content never leaves Anthropic API + Supabase boundary |

APP 1, 3, 5, 6, 11 unchanged from existing baseline. New surfaces documented in privacy policy v1 (Phase 0 finish-line item).

## What tomorrow's first conversation needs

1. Re-read this document
2. Confirm or amend the plan
3. Sprint A1 writes ADR-013 + amends ADR-012
4. Sprint sequence proceeds per Tomorrow's table above

## When this document changes

- ADR-013 is ratified → mark this doc "Promoted: see ADR-013"
- Plan deviates from implementation → bump to v02; supersede this file; cross-reference forward
- New layer or pipeline stage discovered → version bump
