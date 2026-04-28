# REF-API-routes

## Purpose
API surface reference. Updated in the same commit as any route change. Drift between this file and the FastAPI handlers is a P1 audit finding.

## Status
**Phase 0 — placeholder.** No backend yet; calcs run via Supabase RPC and client-side. This file becomes the source of truth when the FastAPI service is stood up in Phase 1.

## Phase 0 Supabase RPCs

| RPC | Purpose | Access |
|---|---|---|
| (none yet) | | |

## Phase 1+ planned API surface

Base URL (production): `https://api.paychecker.app/v1/`

### Auth
All endpoints require a Clerk JWT in `Authorization: Bearer <token>`. The Clerk token is exchanged for a Supabase JWT internally and used for RLS.

### Routes (planned shapes)

```
GET    /me                              → current worker profile
PATCH  /me                              → update profile

GET    /facts/classification            → list Layer 1 facts for current worker
POST   /facts/classification            → propose new Layer 1 fact (unconfirmed)  [fallback path]
PATCH  /facts/classification/{id}/confirm → confirm a Layer 1 fact

GET    /facts/shifts?from=&to=          → list Layer 2 facts in date range
POST   /facts/shifts                    → propose new shift                       [fallback path]
PATCH  /facts/shifts/{id}               → edit shift (unsets confirmed_at)
PATCH  /facts/shifts/{id}/confirm       → confirm shift

POST   /facts/payslips                  → propose new payslip (manual entry)      [fallback path]
PATCH  /facts/payslips/{id}/confirm     → confirm payslip

POST   /comparisons                     → run comparison for a period
                                         → returns immutable snapshot
GET    /comparisons/{id}                → fetch a snapshot
GET    /comparisons/{id}/report.pdf     → fetch the PDF report

DELETE /me/data                         → user-initiated deletion (Privacy Act)
```

### Upload-first routes (Sprint B1+ TODO — ADR-013)

The upload-first flow is the **primary** entry point per ADR-013. Manual-form routes above remain as fallback paths (worker has no document; extraction failed; explicit "I don't have my contract" escape hatch). Service-side contracts live in `docs/architecture/extraction-service-v01.md`; storage layout in `docs/architecture/storage-architecture-v01.md`.

```
POST   /documents/upload                → upload document(s); accepts batch via batch_id
                                         → returns documents[] with state='raw'
                                         → Sprint B1
POST   /documents/{id}/classify         → trigger CLASSIFY pipeline step
                                         → writes document_classifications row
                                         → returns detected_type, confidence-bucketed routing
                                           ('auto_routed' / 'review_pending' / 'manual_required')
                                         → Sprint B2
POST   /documents/{id}/extract          → trigger EXTRACT pipeline step (per-bucket)
                                         → writes document_extractions row
                                         → returns extracted fields with field_confidences
                                         → Sprint B2
PATCH  /documents/{id}/route            → worker correction at ROUTE review
                                         → updates document_classifications.routing_status
                                           = 'worker_corrected'
                                         → triggers Layer 2 + Layer 3 memory writes
                                         → Sprint B3
GET    /documents/{id}/preview          → signed-URL fetch for the original document
                                         → 1-hr TTL; for split-view at REVIEW stage
                                         → Sprint B1
POST   /documents/{id}/confirm          → confirm extraction → write to fact tables
                                           with provenance='ocr_suggested_confirmed'
                                         → Sprint B2
```

Bucket scope per route:
- `/documents/upload` — multi-bucket; `documents.doc_type` set after CLASSIFY.
- `/documents/{id}/extract` — per-bucket extraction; reads `document_classifications.detected_type`.
- `/documents/{id}/confirm` — writes to `worker_classification_facts` (contract), `payslip_facts`, `shift_facts`, `super_contribution_facts`, or `bank_deposit_facts` based on bucket.

### Response shape
All success responses: `{"data": ..., "meta": ...}`. All errors: `{"error": {"code": "...", "message": "..."}}`. No raw 500s — the FastAPI exception handler maps to a sanitised error body.

### Idempotency
- `POST /comparisons` — accepts `Idempotency-Key` header to prevent duplicate snapshot rows on retry.
- `POST /documents` — accepts `Idempotency-Key`.

### Rate limits
- `/comparisons` — 30/hour per worker.
- `/documents` — 60/hour per worker.

## Why this exists
Without this file, "what does the API look like" requires reading every route handler. With it, scanning takes 30 seconds.
