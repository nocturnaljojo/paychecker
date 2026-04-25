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
POST   /facts/classification            → propose new Layer 1 fact (unconfirmed)
PATCH  /facts/classification/{id}/confirm → confirm a Layer 1 fact

GET    /facts/shifts?from=&to=          → list Layer 2 facts in date range
POST   /facts/shifts                    → propose new shift
PATCH  /facts/shifts/{id}               → edit shift (unsets confirmed_at)
PATCH  /facts/shifts/{id}/confirm       → confirm shift

POST   /facts/payslips                  → propose new payslip (manual entry)
PATCH  /facts/payslips/{id}/confirm     → confirm payslip

POST   /documents                       → upload document
GET    /documents/{id}/extraction       → get extraction-staging row
POST   /documents/{id}/confirm          → confirm extraction → write to fact tables

POST   /comparisons                     → run comparison for a period
                                         → returns immutable snapshot
GET    /comparisons/{id}                → fetch a snapshot
GET    /comparisons/{id}/report.pdf     → fetch the PDF report

DELETE /me/data                         → user-initiated deletion (Privacy Act)
```

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
