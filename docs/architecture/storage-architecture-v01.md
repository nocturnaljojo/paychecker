# Storage Architecture v01

**Status:** Design (Sprint A2, 2026-04-29).
**Implements:** ADR-013 storage commitments.
**Implementation lands in:** Migration 0011 (Sprint A5).
**Related:** ADR-013, `docs/architecture/document-intelligence-plan-v01.md` §3 + §6, `REF-DB-schema.md` (documents table), R-004, R-006.

## Why this document exists

ADR-013 commits to 4 new pre-stages (UPLOAD / CLASSIFY / ROUTE / EXTRACT) and 4 new tables (`document_classifications`, `document_extractions`, `employer_extraction_patterns`, `worker_extraction_preferences`). This document specifies the storage shape: how files are named, where they live, how page-splits track, how soft-delete works, how PII is kept out of filenames. Migration 0011 (Sprint A5) implements this spec.

This document does NOT write SQL. It writes the decisions Sprint A5 will encode.

## Storage bucket strategy

**DECISION: Option (b) — one bucket "documents" with type encoded in path.**

The bucket is renamed in Sprint A5: `payslips` → `documents`. The current `payslips` bucket is misleadingly named — it predates the multi-doctype model, currently holds zero production objects (Phase 0; Sprint 7's manual form has no upload step yet), and the rename is safe.

**Options considered:**
- **(a) One bucket per document type** (5 buckets: contracts, payslips, super, bank, shifts). Discarded — five RLS policy sets to maintain, five storage configs to drift, no storage-cost benefit. Each new document type would need a new bucket + new policies.
- **(b) One bucket "documents" with type encoded in path.** Single RLS policy set; type lives in the path so the existing `storage.foldername(name)` RLS pattern extends cleanly; supports unclassified initial uploads under `_unclassified/`. **(Chosen.)**
- **(c) One bucket per worker** (`worker_uuid` as bucket name). Discarded — Supabase has bucket-creation rate limits and per-bucket overhead; thousands of buckets at Phase 1 scale is operationally toxic.

**RLS pattern stays identical to migration 0003:** `(storage.foldername(name))[1] = current_worker_id()::text`. Worker UUID remains the first path segment, which is what gates the read.

## File naming convention

**Canonical filename pattern:**

```
{worker_uuid}/{type}/{YYYY-MM-DD}_{employer_slug?}_{disambiguator}.{ext}
```

For uploads where the type is not yet known (i.e., before CLASSIFY runs):

```
{worker_uuid}/_unclassified/{upload_timestamp}_{disambiguator}.{ext}
```

After CLASSIFY assigns a type, the file is moved (storage-move, not re-upload) into the typed subpath.

**Components:**

| Component | Why included | PII discipline |
|---|---|---|
| `worker_uuid` | RLS-required first segment (matches migration 0003 RLS pattern) | UUID is opaque — never the worker's name, email, or Clerk ID |
| `type` | Self-describing path; matches `documents.doc_type` enum | One of: `payslip`, `contract`, `super_statement`, `bank_export`, `shift` (added per ADR-013), or `_unclassified` for pre-CLASSIFY |
| `YYYY-MM-DD` | Primary sort key for the worker's bucket; matches the document's effective date when known | ISO 8601 only — never `15-04-2026` (AU) or `04-15-2026` (US) |
| `employer_slug` | Disambiguator across employers; helps Apete or advocate skim the file list | Slug-only: lowercase, `[a-z0-9-]`, max 32 chars, derived from `employers.legal_name` at upload time. Empty (`__`) when employer unknown. Never the raw legal_name, never the ABN. |
| `disambiguator` | 4 hex chars from a fresh UUID; avoids same-day same-employer collisions | Random; carries no PII |
| `ext` | Preserved from upload (`.pdf`, `.png`, `.jpg`, `.heic` after Sprint A2 expansion) | Lowercased; original casing discarded |

**Example:**

```
85e2e02f-ab0a-47fe-aac8-bf5009c4b626/payslip/2026-04-15_acme-poultry_a8f3.pdf
```

Reads as: "worker 85e2…, payslip type, period or upload date 2026-04-15, employer Acme Poultry, disambiguator a8f3, PDF."

**Empty employer slug:**

```
85e2e02f-.../contract/2026-04-15__a8f3.pdf   ← double-underscore = unknown employer
```

The double-underscore is intentionally ugly; it surfaces as a soft signal that the employer wasn't known at upload, which the worker-facing name layer can interpret and clean up.

## Storage path structure

```
documents/{worker_uuid}/{type}/{filename}
```

**Why nested by worker UUID first:** matches the existing migration 0003 RLS pattern (`storage.foldername(name)[1]`); a leaked URL gives away nothing about the document until you also have the worker's auth context. Type-second nesting makes per-bucket UI fast (single `LIKE worker_uuid/type/%` storage list call).

## Page-split / page-join shape

A single uploaded file may classify into multiple buckets (page 1 contract, page 2 payslip) or multiple uploads may be pages of the same logical document (worker uploads two photos of a 2-page payslip).

**DECISION: Option (a) — single source file in storage; page-range tracked in `document_classifications`.**

Per `document-intelligence-plan-v01.md` §6, `document_classifications.parent_doc_id` and `document_classifications.page_range` already encode this. The original document in storage is never split or rewritten. The audit truth is "this is the file the worker uploaded." Each detected document-within-file produces a separate `document_classifications` row pointing at a `page_range` of the same `documents.id`.

**Options considered:**
- **(a) Single source file + N classification rows pointing at page ranges.** Original is the audit truth; never modified. Page-extraction for display happens client-side (PDF.js for PDFs; cropping client-side for image-with-multiple-pages). **(Chosen.)**
- **(b) Split into N child documents at upload time.** Discarded — premature commitment to a classification before the classifier has run; doubles storage; loses the original file; complicates "show me my upload" for the worker.
- **(c) Store original + extract pages on-demand at classification.** Discarded — implies modifying the storage object after the fact, which our existing storage RLS + audit pattern doesn't allow without a service-role write surface.

**Page-join (multiple uploads, one logical document):** Sprint A4 (layered memory, Layer 4 reconciliation) handles this — vector similarity at classify time detects "this is page 2 of upload-X." Resolution writes a `document_classifications` row whose `parent_doc_id` points at upload-X with the appropriate `page_range`. Sprint A2 commits to the schema shape; Sprint A4 specifies the algorithm.

## Document lifecycle states + storage implications

Per `document-intelligence-plan-v01.md` §3, a document moves through 10 states. Storage implication per state:

| State | File location | Worker can view? | Surfaces in bucket? |
|---|---|---|---|
| RAW | `_unclassified/` | yes (raw upload list) | no — pre-CLASSIFY |
| CLASSIFYING | `_unclassified/` | yes | no — in flight |
| CLASSIFIED | still `_unclassified/` (move pending) | yes | no — awaiting ROUTE |
| ROUTED | moved to `{type}/` | yes | yes — under the assigned bucket |
| EXTRACTING | `{type}/` | yes | yes |
| EXTRACTED | `{type}/` | yes | yes |
| REVIEWED | `{type}/` | yes | yes |
| CONFIRMED | `{type}/` | yes | yes — calc-engine eligible (per ADR-001) |
| DISPUTED | `{type}/` | yes | yes — flagged for re-review |
| ARCHIVED | `{type}/` (no move) | yes (separate "older" view) | no — superseded |

**Storage-move on ROUTED:** the only state transition that moves the file. Implementation: copy to new path, update `documents.storage_path`, delete from `_unclassified/`. Service-role atomic operation. Worker's UI updates on next render.

## Soft-delete + archival policy

**DECISION: Option (b) — soft-delete with `deleted_at`; 30-day grace period; service-role cron hard-deletes after grace.**

Existing pattern (migration 0002 + 0003) already uses `documents.deleted_at`. Sprint A5 keeps this and adds `archived_at` for the supersede case (new contract replaces old contract — old isn't deleted, just superseded; stays for audit).

**Reasoning vs alternatives:**
- **(a) Hard delete on worker request; no recovery.** Discarded — too punishing for the misclick case. Apete's anxiety + ESL = high risk of accidental delete.
- **(b) Soft-delete with 30-day grace + cron hard-delete.** **(Chosen.)** Existing infrastructure (`deleted_at`) extends; cron is Phase 1+ scope so for now soft-delete-only is the operational state.
- **(c) Soft-delete forever.** Discarded — Privacy Act 7-yr minimum + worker-right-to-delete obligation requires hard-delete eventually.

**Archival** (separate from deletion):
- `documents.archived_at timestamptz NULL` — set when a newer document of the same type + same period supersedes this one (e.g., revised payslip).
- Archived documents do NOT show in the bucket card by default; surface via "Older versions" tertiary on the bucket detail.
- Comparisons that referenced the archived document remain valid per ADR-005 (`inputs_snapshot` is immutable; the archived document doesn't disappear from the snapshot).
- Worker can un-archive via a tertiary; un-archive is a same-row update (`archived_at = NULL`).

**Hard-delete cadence (Phase 1+):**
- Cron query: `DELETE FROM documents WHERE deleted_at < now() - interval '30 days'` plus storage-object delete in same transaction.
- Privacy policy v1 (Phase 0 finish-line) discloses the 30-day window.
- Storage objects orphaned by failed delete are swept by the same cron (per `src/lib/upload.ts:60` design note).

## RLS policy structure

Sprint A5 SQL adds these. **Names** here, not bodies — the bodies match existing migration 0002/0003 patterns.

For the renamed `documents` storage bucket (was `payslips`):

| Policy | Operation | Pattern |
|---|---|---|
| `documents_storage_self_select` | SELECT | `bucket_id='documents' AND foldername[1] = current_worker_id()::text` |
| `documents_storage_self_insert` | INSERT | same pattern |
| `documents_storage_self_update` | UPDATE | same pattern (covers move-from-_unclassified) |
| (no DELETE policy) | — | hard-delete via service role only |

For the `documents` table (existing — already has policies in migration 0002):
- `documents_self_select` ✓ (exists)
- `documents_self_insert` ✓ (exists)
- `documents_self_update` ✓ (exists — covers archive + soft-delete)
- (no DELETE policy) ✓ (no-op; intentional)

For the 4 new tables in Migration 0011 (`document_classifications`, `document_extractions`, `employer_extraction_patterns`, `worker_extraction_preferences`):

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `document_classifications` | own (via documents.worker_id) | service role only | service role only | none |
| `document_extractions` | own (via documents.worker_id) | service role only | service role only | none |
| `employer_extraction_patterns` | service role only (operator-only memory; not worker-facing) | service role only | service role only | none |
| `worker_extraction_preferences` | own (via worker_id) | service role only | service role only | none |

Layer 2 (employer patterns) is operator-only because surfacing it to the worker has no actionable value and reading another employer's patterns leaks across workers. Layer 3 (worker preferences) is own-only — worker can see their own pattern history.

## Filename collisions + idempotency

**DECISION: Option (b) — accept the upload, dedup at classification stage via `content_hash`.**

Sprint A5 adds `documents.content_hash text NULL` (sha256 hex of file content). UNIQUE INDEX on `(worker_id, content_hash) WHERE content_hash IS NOT NULL`. The hash is computed client-side at upload time (Web Crypto API; ~1 ms for a 1 MB file).

**Behaviour:**
- Worker uploads file → client computes sha256 → INSERT into `documents` with `content_hash`. UNIQUE violation = duplicate.
- On UNIQUE violation, the upload UI surfaces: *"You already uploaded this file. Open the existing one?"* with a tertiary to keep the original.
- Layer 4 reconciliation (Sprint A4) catches partial duplicates (re-photographed payslip with different cropping) using vector similarity, not the hash.

**Reasoning vs alternatives:**
- **(a) Reject upload as duplicate before storing.** Discarded — Apete may have legitimate reason to re-upload (corrected version, different cropping); rejection without surface is a stop without explanation.
- **(b) Accept, dedup at classification.** **(Chosen.)** Honest UX (worker's tap succeeded), cheap to dedup later.
- **(c) Accept, latest-wins.** Discarded — silently overwrites the original which is the audit-truth artefact.

## PII in filenames + paths

**DECISION:**
- Worker UUID in path: **yes** (RLS-required, opaque identifier).
- Employer name: **slugified only** (`acme-poultry`), never raw legal_name. Slug derivation: lowercase → strip non-`[a-z0-9-]` → collapse runs of `-` → trim leading/trailing `-` → cap at 32 chars.
- Date: ISO 8601 (`2026-04-15`).
- Disambiguator: 4 hex chars from `gen_random_uuid()` substring.
- ABN: **never** in filename or path (PII; cross-references to employer records suffice).
- Worker name / email / phone / Clerk ID: **never** in filename or path.

**Slug collision handling:** slug collisions across employers are possible (two "Acme Poultry Pty Ltd" employer rows would slug to the same `acme-poultry`). Disambiguator + UUID-uniqueness constraint on `documents.storage_path` catches this — collisions never produce a path conflict because the disambiguator is per-file random.

## Worker-facing display names

**DECISION: Option (b) — stored on `documents.worker_facing_name text NULL`.**

Initially NULL at upload. Populated by the EXTRACT stage with a friendly name derived from extracted fields:
- Payslip: *"Payslip — 1 to 14 April 2026 — Acme Poultry"*
- Contract: *"Employment contract — Acme Poultry — signed 12 February 2026"*
- Super statement: *"Super statement — Q1 2026 — AustralianSuper"*
- Bank export: *"Bank statements — March 2026 — CBA"*

Worker can edit `worker_facing_name` via a tertiary. The canonical filename in storage never changes.

**Reasoning vs alternatives:**
- **(a) Computed at render time from canonical filename.** Discarded — doubles render cost; worker edits would need a separate column anyway.
- **(b) Stored on `documents.worker_facing_name`.** **(Chosen.)** One column; populated post-EXTRACT; worker-editable.
- **(c) Computed from extracted metadata after classification.** Same as (b) but not stored — discarded for the worker-edit case.

## Migration 0011 column additions to existing `documents` table

Sprint A5 SQL drafts these. Sprint A2 commits the names + types + nullability + purpose.

| Column | Type | Nullable | Purpose |
|---|---|---|---|
| `batch_id` | uuid | NULL | Groups documents uploaded in the same UI session (Apete drops 4 photos at once → 1 batch_id, 4 documents rows). Foreign-key-less to keep batches lightweight. Enables "upload review" UI showing the whole batch. |
| `content_hash` | text | NULL | SHA-256 hex of file content for dedup. UNIQUE INDEX on `(worker_id, content_hash) WHERE content_hash IS NOT NULL`. |
| `worker_facing_name` | text | NULL | Human-readable label shown in bucket cards; populated by EXTRACT. Worker-editable. |
| `state` | text | NOT NULL DEFAULT `'raw'` | Document lifecycle state per plan §3. CHECK enforces enum. Drives bucket-card visibility (only `routed` and onward show). |
| `archived_at` | timestamptz | NULL | Supersede marker (separate from `deleted_at`). Archived rows hide from default bucket view. |

**Columns NOT added** (already exist or out of scope):
- `parent_doc_id` / `page_range` — live on `document_classifications`, not `documents` (per plan §6 + Page-split decision above).
- `canonical_filename` — IS `storage_path`. Don't duplicate.
- `original_filename` — already exists on `documents`.

**Existing column `doc_type` enum** needs **extension** in Sprint A5: add `'shift'` to the CHECK constraint (currently `'payslip','contract','super_statement','bank_export','other'`). Per ADR-013, all 5 buckets accept uploads; `'shift'` is the missing one. The existing `'other'` value stays as the unclassified-but-not-fitting-anywhere fallback. Note that `'_unclassified'` is a path-segment, not a doc_type value — pre-classification documents have `doc_type = 'other'` until ROUTED.

**Existing `extraction_staging` table — Sprint A5 audit question:**

The plan §6 introduces `document_extractions`. The existing `extraction_staging` table (migration 0002, lines 101–110) covers similar ground (`agent_version`, `extracted_json`, `confidence_per_field`). Sprint A5 must decide: deprecate `extraction_staging` and migrate its (currently empty) shape into `document_extractions`, or keep both with distinct roles. Out of Sprint A2 scope to resolve; flagged here.

## Pressure test summary

`SKILL-PRJ-pressure-test.md` 5/5 cleared with mitigations.

**1. Break this system — 5 ways the storage shape fails Apete.**

| # | Failure | Stage | Mitigation |
|---|---|---|---|
| (i) | Hash collision races: two parallel uploads of the same file produce two `documents` rows before either INSERT commits. | Upload | UNIQUE INDEX on `(worker_id, content_hash)` makes the second INSERT fail; client retry surfaces "you already uploaded this." Race window ≤ one round-trip; worst-case Apete sees a confusing error one-in-thousands; second tap succeeds. |
| (ii) | Page-split orphan: a `document_classifications` row points at a `parent_doc_id` whose `documents` row was hard-deleted. | After cron sweep | FK with `ON DELETE RESTRICT` on `document_classifications.document_id`. Hard-delete cron must check + cascade or skip. Sprint A5 SQL spec covers this. |
| (iii) | Bucket rename (`payslips` → `documents`) breaks Sprint 7's existing `src/lib/upload.ts` — `PAYSLIPS_BUCKET = 'payslips'` constant. | Sprint A5 → next deploy | Sprint A5 ships migration + Sprint B1 ships matching constant rename in `src/lib/upload.ts` in same commit window. Backwards-compat: keep `payslips` bucket alias for 1 release, then drop. Phase 0 has no production users so the cost is bounded. |
| (iv) | Archive vs delete confusion in worker UI: Apete archives a contract intending to delete it; later sees a "you have an archived contract" hint and is anxious. | AFTERMATH (per ADR-012) | Worker-facing copy uses literal language: archived = *"superseded by your newer contract"* with a tertiary to un-archive; deleted = *"removed from your data"* with a 30-day grace explainer. No "archive" verb in worker-facing copy — use *"replace with newer"* and *"remove"* explicitly. |
| (v) | Slug collision across two real employers with the same legal_name (e.g., two regional Acme Poultry entities). | Upload | Disambiguator (4 hex chars) makes paths unique. Worker-facing name disambiguates by ABN parenthetical when slug is identical: *"Payslip — Acme Poultry (ABN 12 345 678 901)."* Sprint B1 implements. |

**2. Personas — Apete + advocate + Mia.**

- **Apete:** never sees the canonical filename. He sees `worker_facing_name`. Pass — naming convention is invisible to him.
- **Advocate (Apete's brother / FWO):** may see the canonical filename if reviewing a downloaded copy. Slugged employer + ISO date + worker UUID are not personally identifying without other context. Pass.
- **Mia (paid-tier hospitality):** multi-employer scenario (Mia works at two pubs simultaneously) — different `employer_id`s → different slugs → different paths. Schema supports without change. Pass.

**3. Apete misreadings.**

| Misreading | Mitigation |
|---|---|
| Apete sees `_unclassified` in a download URL and thinks his file isn't real. | Path is RLS-gated; download surface always uses `worker_facing_name` after EXTRACT runs. The `_unclassified` segment exists only pre-CLASSIFY; even there, worker-facing copy says *"Processing your upload…"* not *"Unclassified."* |
| Apete uploads what he thinks is a contract; classifier routes it to "payslip"; he sees the file under the wrong bucket. | ROUTE review screen (per ADR-013 stage CLASSIFY → ROUTE) lets Apete correct the bucket. Auto-route only above 0.85 confidence; below that goes to review. |

**4. Privacy / safety / APP.**

- **APP 1 (open + transparent).** Storage paths and lifecycle disclosed in privacy policy v1 (Phase 0 finish-line). Worker sees plain-language explanation at first UPLOAD: *"PayChecker stores your documents privately. Only you can see them."*
- **APP 3 (collection for disclosed purpose).** Files collected to support the comparison engine; purpose stated at UPLOAD.
- **APP 5 (notification at collection).** UPLOAD copy is the notification.
- **APP 6 (use only as disclosed).** Stored files used only for classification + extraction + worker review. Never analytics; never model training (Anthropic API terms forbid; documented in Sprint A3).
- **APP 11 (security).** Files: TLS to Supabase Storage (private bucket); RLS gates read; service-role-only writes from extraction service; never on disk beyond the worker's session. Pass.
- **R-004 (worker safety).** Filename URL leak doesn't reveal worker identity (UUID is opaque). Slugged employer name is the maximum identifying signal in a path; that's worker's own employer, not surveillance leakage. Pass.
- **R-006 (Privacy Act).** 30-day soft-delete + cron hard-delete + 7-yr retention disclosed in privacy policy v1. Pass with caveat — privacy policy v1 must list these timings explicitly.

**5. Reversibility.**

- **Naming convention change later:** add a `canonical_filename_v2` column or migrate `storage_path` in place; worker UUID + type segment stay stable across any rename. Re-storing files is unnecessary because the path components are content-derived.
- **Bucket rename rollback:** keep `payslips` bucket alias for 1 release; one ALTER if rolling back.
- **Soft-delete → hard-delete cadence change:** cron query is config-only.
- **Schema additions rollback:** `ALTER TABLE documents DROP COLUMN ...` per added column; no data loss in core columns. `archived_at`, `worker_facing_name`, etc. are all nullable.
- **One-way doors:** none. Original uploaded file is never modified. Page-split is recoverable (re-classify). Hard-delete after 30 days IS one-way for the file content but is the disclosed worker right.

**5/5 cleared. No blockers.** One residual: privacy policy v1 must disclose the storage shape + retention timings — already a Phase 0 finish-line item per ADR-006.

## What this document does NOT cover

- Migration 0011 SQL (Sprint A5).
- Extraction prompt templates (Sprint A3).
- Layered memory tables read/write paths (Sprint A4) — schema is named here, behaviour lives there.
- Upload UI / drop zone (Sprint B1).
- Vector similarity infrastructure for Layer 4 reconciliation (Sprint A4).
- Comparison engine (Sprint E).
- The `extraction_staging` vs `document_extractions` reconciliation question — flagged for Sprint A5 audit.

## When this document changes

- A new bucket strategy is needed (e.g., per-region or per-tier) → version bump (`storage-architecture-v02.md`); supersede this file; cross-reference forward.
- Filename convention substantively changes → version bump.
- New document lifecycle state added → version bump.
- A pressure-test failure surfaces in production → append mitigation; version bump.
- Sprint A5 surfaces an implementation constraint that forces a decision change → version bump and link from Sprint A5's commit.
