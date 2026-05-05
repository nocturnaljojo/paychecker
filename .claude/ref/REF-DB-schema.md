# REF-DB-schema

> **Source-of-truth status:** Derived
> **Canonical source:** `supabase/migrations/`
> **Last verified against source:** 2026-04-28
> **Drift policy:** If this file disagrees with `supabase/migrations/`, this file is stale. Migrations are authoritative. Update this file in the same commit as any new migration.

## Purpose
Source of truth for the Supabase schema. Update this file in the same commit as any migration. Drift between this file and `supabase/migrations/` is a P1 audit finding.

## Status
**Phase 0 schema — APPLIED.** Migrations `0001` (superseded), `0002_phase0_full_schema`, and `0003_payslips_storage_bucket` are live in `supabase/migrations/` and on the Supabase project. Migrations `0004`–`0011` extend the schema (onboarding columns, `award_allowances`, REVOKE hardening, MA000074 seed gaps + unit enum, proposed-state schema support, trigger CONFIRM/EDIT distinction, **Document Intelligence schema per ADR-013**). RLS smoke-tested 14/14 user-role tests + 2/2 trigger defense-in-depth tests pass (s003).

Migration 0011 (Sprint A5, 2026-04-29) implements ADR-013's upload-first document intelligence: pgvector extension (in `extensions` schema), 6 new columns on `documents` (incl. `embedding vector(1024)`), 4 new tables (`document_classifications`, `document_extractions`, `employer_extraction_patterns`, `worker_extraction_preferences`), `documents` storage bucket (alongside retained `payslips` alias), and `extraction_staging` deprecation (DROPped — fully subsumed by `document_extractions`).

Migration history note: `0001_profiles_and_admin_helper` was applied direct-to-DB on 2026-04-25 (before this repo had `supabase/migrations/`). It built a Supabase-Auth-keyed `profiles` table that is incompatible with our Clerk-JWT auth model. `0002` drops every artifact `0001` created (table, helpers, triggers) and replaces them with the schema below. The `0001` SQL is committed verbatim purely for audit-trail visibility — never replay it on a fresh DB; replay starts at `0002`.

## Conventions
- All ids `uuid` with `default gen_random_uuid()`.
- All timestamps `timestamptz`, columns suffixed `_at`.
- All booleans prefixed `is_` / `has_`.
- All FK columns suffixed `_id` and have an explicit FK constraint.
- All tables have `created_at` and `updated_at`.
- Fact tables have `provenance`, `confirmed_at`, `source_doc_id` (nullable), and a `*_history` sibling.

## Tables

### `workers`
The user identity (linked to Clerk).
- `id uuid pk`
- `clerk_user_id text unique not null`
- `display_name text`
- `tier text check (tier in ('palm_free', 'aud_paid'))`
- `country text` (added 0004 — optional, captured at onboarding)
- `preferred_language text default 'en'` (added 0004 — captured at onboarding)
- `created_at`, `updated_at`

### `consent_records`
Immutable record of each affirmative consent action (APP-1 + APP-6 audit obligation). One row per consent event; never updated, never deleted.
- `id uuid pk`
- `worker_id uuid fk workers`
- `privacy_policy_version text not null`
- `consented_at timestamptz not null default now()`
- `user_agent text` (nullable — captured client-side via `navigator.userAgent`)
- `ip_address inet` (nullable — Phase 1 backend will populate from `x-forwarded-for`; Phase 0 leaves null)
- RLS: SELECT/INSERT for own worker only. UPDATE/DELETE rejected by trigger (immutable).

### `employers`
- `id uuid pk`
- `legal_name text`
- `abn text` (nullable — worker may not know it at onboarding)
- `created_at`, `updated_at`

### `awards`
Reference data for Modern Awards we support.
- `id uuid pk`
- `award_code text unique not null` (e.g. `MA000074`)
- `title text`
- `fwc_consolidation_date date`
- `fwc_source_url text`
- `effective_from date`
- `effective_to date` (nullable)

### `award_rates`
Time-bounded rates per classification.
- `id uuid pk`
- `award_id uuid fk awards`
- `classification_code text`
- `pay_basis text check (pay_basis in ('hourly', 'weekly', 'piece'))`
- `amount numeric(10,2)`
- `effective_from date`, `effective_to date`
- `unique (award_id, classification_code, pay_basis, effective_from)` (added 0005 — idempotent re-seed)

### `award_allowances`
Time-bounded allowance reference data, parallel to `award_rates` per ADR-010. The `purpose` enum (per ADR-009) tells the calc engine whether the allowance folds into the hourly rate before penalty/OT/leave multipliers apply (`all_purpose`), is paid on top after (`additive`), folds into OT base only (`penalty_modifier`), or is paid only when a context predicate is met (`one_off`). Created 2026-04-27 per ADR-010 (Sprint 2).
- `id uuid pk`
- `award_id uuid fk awards (on delete restrict)`
- `code text not null` (e.g. `LEADING_HAND_1_19`, `COLD_WORK_BAND_LOW`)
- `description text not null` (worker-facing label)
- `amount numeric(10,2) not null`
- `unit text not null check (unit in ('hour', 'week', 'shift', 'km', 'event'))` (extended 2026-04-28 per ADR-011 / migration 0008 to support per-km vehicle allowance and event-triggered allowances. Trigger conditions for `'event'`-unit allowances live in calc-engine code keyed off the `code` column, not in schema — see `docs/architecture/calc-rules-v01.md` Rule 7)
- `purpose text not null default 'additive' check (purpose in ('all_purpose', 'additive', 'penalty_modifier', 'one_off'))`
- `fwc_clause text not null` (e.g. `17.2(b)(i)`)
- `effective_from date not null`, `effective_to date` (nullable)
- `created_at timestamptz not null default now()`
- `unique (award_id, code, effective_from)`
- Index: `(award_id, effective_from, effective_to)` for the calc-engine fetch path.
- RLS: SELECT for any signed-in worker; no INSERT/UPDATE/DELETE policies — writes via service role / migrations only (mirrors `award_rates`).

### `worker_classification_facts` (Layer 1)
- `id uuid pk`
- `worker_id uuid fk workers` (NOT NULL)
- `employer_id uuid fk employers` (NOT NULL)
- `classification_code text` (nullable since 0009 — proposed-state)
- `award_id uuid fk awards` (nullable since 0009 — proposed-state)
- `effective_from date` (nullable since 0009), `effective_to date`
- `provenance text` (NOT NULL — enum: see `REF-FACT-model.md`)
- `confirmed_at timestamptz` (nullable; NULL = proposed-state, NOT NULL = confirmed)
- `source_doc_id uuid fk documents` (nullable)
- `created_at`, `updated_at`
- CHECK `worker_classification_facts_confirmed_integrity` (0009): `confirmed_at IS NULL OR (award_id IS NOT NULL AND classification_code IS NOT NULL AND effective_from IS NOT NULL)`

`worker_classification_facts_history` — same shape + `change_type text` and `changed_at timestamptz`. Same NOT NULL relaxations as parent (0009) so the BEFORE-UPDATE trigger can copy proposed-state rows. No CHECK on history (insert-only audit trail).

### `shift_facts` (Layer 2)
- `id uuid pk`
- `worker_id uuid fk workers` (NOT NULL)
- `employer_id uuid fk employers` (NOT NULL)
- `started_at timestamptz` (nullable since 0009), `ended_at timestamptz` (nullable since 0009)
- `break_minutes int default 0` (NOT NULL — default fills proposed-state)
- `shift_type text check (shift_type in ('ordinary', 'overtime', 'public_holiday', 'weekend_penalty'))` (nullable since 0009)
- `notes text`
- `provenance text` (NOT NULL), `confirmed_at timestamptz` (nullable), `source_doc_id uuid fk documents` (nullable)
- `created_at`, `updated_at`
- CHECK `shift_facts_confirmed_integrity` (0009): `confirmed_at IS NULL OR (started_at IS NOT NULL AND ended_at IS NOT NULL AND shift_type IS NOT NULL)`

`shift_facts_history` — same + change tracking. Same 0009 NOT NULL relaxations as parent. No CHECK.

### `payslip_facts` (Layer 3)
- `id uuid pk`
- `worker_id uuid fk workers` (NOT NULL)
- `employer_id uuid fk employers` (NOT NULL)
- `period_start date` (nullable since 0009), `period_end date` (nullable since 0009)
- `gross_pay numeric(10,2)` (nullable since 0009), `net_pay numeric(10,2)` (nullable since 0009)
- `ordinary_hours numeric(8,2)`, `ordinary_rate numeric(10,4)`
- `ot_hours numeric(8,2)`, `ot_rate numeric(10,4)`
- `allowances jsonb`, `deductions jsonb`
- `tax numeric(10,2)`, `super_amount numeric(10,2)`, `super_destination text`
- `provenance text` (NOT NULL), `confirmed_at timestamptz` (nullable), `source_doc_id uuid fk documents` (nullable)
- `created_at`, `updated_at`
- CHECK `payslip_facts_confirmed_integrity` (0009): `confirmed_at IS NULL OR (period_start IS NOT NULL AND period_end IS NOT NULL AND gross_pay IS NOT NULL AND net_pay IS NOT NULL)`

`payslip_facts_history` — same + change tracking. Same 0009 NOT NULL relaxations as parent. No CHECK.

### `bank_deposit_facts` (Layer 3)
- `id`, `worker_id` (NOT NULL), `deposited_at date` (nullable since 0009), `amount numeric(10,2)` (nullable since 0009), `narration text`
- standard fact columns; `provenance` NOT NULL; `confirmed_at`, `source_doc_id` nullable
- CHECK `bank_deposit_facts_confirmed_integrity` (0009): `confirmed_at IS NULL OR (deposited_at IS NOT NULL AND amount IS NOT NULL)`

### `super_contribution_facts` (Layer 3)
- `id`, `worker_id` (NOT NULL), `received_at date` (nullable since 0009), `amount numeric(10,2)` (nullable since 0009), `source_employer text`
- standard fact columns; `provenance` NOT NULL; `confirmed_at`, `source_doc_id` nullable
- CHECK `super_contribution_facts_confirmed_integrity` (0009): `confirmed_at IS NULL OR (received_at IS NOT NULL AND amount IS NOT NULL)`

### `documents`
Uploaded source documents (payslips, contracts, etc.). Extended by migration 0011 to support the upload-first document-intelligence pipeline (per ADR-013 + `docs/architecture/storage-architecture-v01.md` + `docs/architecture/layered-memory-v01.md`).
- `id uuid pk`
- `worker_id uuid fk workers`
- `doc_type text check (doc_type in ('payslip', 'contract', 'super_statement', 'bank_export', 'shift', 'other'))` (enum extended 0011 — added `'shift'` per ADR-013)
- `storage_path text` (per `storage-architecture-v01.md`: `{worker_uuid}/{type}/{YYYY-MM-DD}_{employer_slug?}_{disambiguator}.{ext}`)
- `original_filename text`, `mime_type text`, `size_bytes bigint`
- `uploaded_at timestamptz`
- `deleted_at timestamptz` (soft delete; hard delete after 30 days on user request)
- `batch_id uuid` (added 0011 — groups documents uploaded in the same UI session; nullable)
- `content_hash text` (added 0011 — SHA-256 hex of file content; UNIQUE INDEX on `(worker_id, content_hash) WHERE content_hash IS NOT NULL` for dedup)
- `worker_facing_name text` (added 0011 — human-readable label populated by EXTRACT; worker-editable; nullable)
- `state text NOT NULL DEFAULT 'raw'` (added 0011 — 10-state lifecycle per `storage-architecture-v01.md`: `raw / classifying / classified / routed / extracting / extracted / reviewed / confirmed / disputed / archived`; CHECK enforces enum)
- `archived_at timestamptz` (added 0011 — supersede marker, separate from `deleted_at`; nullable)
- `embedding vector(1024)` (added 0011 — Voyage `voyage-3-large` per `extraction-service-v01.md`; HNSW cosine index for Layer 4 reconciliation; nullable as kill-switch)

Indexes (0011): `documents_worker_content_hash_uniq`, `documents_batch_id_idx` (partial), `documents_state_idx`, `documents_embedding_idx` (HNSW cosine).

### `document_classifications` (Migration 0011)
Pipeline state per uploaded document for the CLASSIFY + ROUTE stages. Per `extraction-service-v01.md` "CLASSIFICATION OUTPUT" + plan §6.
- `id uuid pk`
- `document_id uuid fk documents (on delete restrict)`
- `detected_type text` (the classifier's bucket pick)
- `confidence numeric(3,2)` (operator-only — never worker-facing per ADR-013 mitigation)
- `classified_at timestamptz`
- `classifier_version text NOT NULL` (`"model@prompt-version"`, e.g. `"claude-haiku-4-5-20251001@classify-prompt-v01"`)
- `routing_status text check (routing_status in ('auto_routed', 'review_pending', 'worker_corrected', 'failed'))`
- `page_range int4range` (for mixed-content uploads; pages of `parent_doc_id`)
- `parent_doc_id uuid fk documents` (when this row is a child classification of a multi-doc upload)
- `notes text` (operator-readable, includes prompt-injection flags + Layer 4 dedup matches)
- `created_at`, `updated_at`
- RLS: SELECT for worker via `documents.worker_id` join; INSERT/UPDATE service-role only.

### `document_extractions` (Migration 0011 — supersedes `extraction_staging`)
Pipeline state per uploaded document for the EXTRACT stage. Per `extraction-service-v01.md` per-bucket output schemas + plan §6.
- `id uuid pk`
- `document_id uuid fk documents (on delete restrict)`
- `bucket text NOT NULL check (bucket in ('employment_contract', 'payslip', 'shift', 'super_statement', 'bank_deposit'))`
- `extracted_jsonb jsonb`
- `field_confidences jsonb`
- `extraction_status text NOT NULL check (extraction_status in ('pending', 'success', 'partial', 'failed', 'low_confidence'))`
- `extracted_at timestamptz`
- `extractor_version text NOT NULL` (`"model@prompt-version"`)
- `created_at`, `updated_at`
- RLS: SELECT for worker via `documents.worker_id` join; INSERT/UPDATE service-role only.

### `employer_extraction_patterns` (Migration 0011 — Layer 2 memory)
Per-employer extraction patterns per `docs/architecture/layered-memory-v01.md` Layer 2. Operator-only — workers never read.
- `id uuid pk`
- `employer_id uuid fk employers (on delete cascade)`
- `document_type text NOT NULL`
- `pattern_jsonb jsonb NOT NULL` (FORMAT-not-CONTENT — see layered-memory-v01.md §"Cross-worker leak via Layer 2" mitigation)
- `observation_count int NOT NULL DEFAULT 1`
- `last_observed timestamptz NOT NULL`
- `confidence numeric(3,2)` (EMA per layered-memory-v01.md: `new = 0.7*old + 0.3*observation_score`)
- `archived_at timestamptz` (12-month aging window; archive at confidence < 0.20)
- `created_at`, `updated_at`
- Index: `(employer_id, document_type, confidence DESC, observation_count DESC) WHERE archived_at IS NULL` for prompt-context fetch.
- RLS: explicit `USING(false)` deny-all policy + `REVOKE ALL FROM PUBLIC + authenticated`. Operator-only intent enforced; service role bypasses RLS by design.

### `worker_extraction_preferences` (Migration 0011 — Layer 3 memory)
Per-worker extraction preferences per `docs/architecture/layered-memory-v01.md` Layer 3. Worker can read + DELETE own (deliberate departure from no-DELETE pattern; APP 12/13 privacy right).
- `id uuid pk`
- `worker_id uuid fk workers (on delete cascade)` (account-deletion cascade per layered-memory-v01.md)
- `preference_key text NOT NULL`
- `preference_value jsonb NOT NULL`
- `observation_count int NOT NULL DEFAULT 1`
- `last_observed timestamptz NOT NULL`
- `confidence numeric(3,2)` (NULL until 3 observations; EMA shape mirrors Layer 2)
- `archived_at timestamptz` (same aging shape as L2)
- `created_at`, `updated_at`
- Index: `(worker_id, last_observed DESC) WHERE archived_at IS NULL`.
- RLS: SELECT for own + DELETE for own; INSERT/UPDATE service-role only.

### `extraction_staging` — DEPRECATED (Migration 0011)
DROPped in 0011. 0 rows at deprecation; functional shape fully subsumed by `document_extractions` (which adds `bucket`, `extraction_status`, `extracted_at`). Reversal SQL preserved in 0011's ROLLBACK block.

### `comparisons`
Immutable snapshots.
- `id uuid pk`
- `worker_id uuid fk workers`
- `period_start date`, `period_end date`
- `award_ref_snapshot jsonb` (full copy, not FK)
- `inputs_snapshot jsonb` (full copy of all confirmed facts used)
- `expected_amounts jsonb`
- `received_amounts jsonb`
- `gap jsonb` (size, frequency, confidence, classification)
- `report_pdf_storage_path text` (nullable)
- `created_at`

`comparisons` rows are NEVER updated. Re-run = new row.

## Row-Level Security (RLS)

Identity comes from the Clerk JWT, not Supabase Auth. The Clerk JWT template named `supabase` carries `sub` = Clerk user id and `role` = `authenticated`. RLS policies dereference identity via `auth.jwt() ->> 'sub'` (NOT `auth.uid()` — that's Supabase Auth's user id, which is empty for us).

A `STABLE` SQL helper `public.current_worker_id()` resolves the JWT sub to a `workers.id`, used by every downstream policy.

- `workers`: SELECT/INSERT/UPDATE allowed only where `clerk_user_id = auth.jwt() ->> 'sub'`. No DELETE.
- `employers`, `awards`, `award_rates`: signed-in workers can SELECT shared reference data; only `employers` allows INSERT (for ad-hoc onboarding). Awards write via service role / migrations.
- `documents`: SELECT/INSERT/UPDATE for `worker_id = current_worker_id()`. No DELETE — soft-delete via `deleted_at`.
- `document_classifications` (0011): SELECT for worker via `documents.worker_id` join. INSERT/UPDATE service-role only. No DELETE.
- `document_extractions` (0011): same shape as `document_classifications`.
- `employer_extraction_patterns` (0011 — Layer 2): explicit deny-all `USING(false)` + `REVOKE ALL` from `PUBLIC` + `authenticated`. Operator-only.
- `worker_extraction_preferences` (0011 — Layer 3): SELECT + DELETE for own (DELETE per APP 12/13 privacy right). INSERT/UPDATE service-role only.
- `*_facts` (Layer 1, 2, 3): SELECT/INSERT/UPDATE for own rows. No DELETE.
- `*_facts_history`: SELECT only for the fact owner. INSERTs come exclusively from BEFORE-UPDATE triggers (`SECURITY DEFINER`, bypass RLS). Triggers are the only write path.
- `comparisons`: SELECT/INSERT only. UPDATE/DELETE rejected by trigger (so even service role can't mutate). RLS additionally blocks user-role UPDATE/DELETE silently (no policy → zero rows).

Storage RLS:
- Bucket `payslips` (migration `0003`): `(storage.foldername(name))[1] = current_worker_id()::text` for SELECT/INSERT/UPDATE, scoped to `bucket_id = 'payslips'`. No DELETE. **Retained as alias** until Sprint B1 updates `src/lib/upload.ts`; later cleanup migration will remove.
- Bucket `documents` (migration `0011`): same `(storage.foldername(name))[1] = current_worker_id()::text` pattern, scoped to `bucket_id = 'documents'`. SELECT/INSERT/UPDATE; no DELETE.

## Extensions

- `pgcrypto` (migration 0002, schema `extensions`).
- `vector` (migration 0011, schema `extensions`) — pgvector for Layer 4 cosine-similarity search on `documents.embedding vector(1024)`.

## Triggers

- On UPDATE to any of the 4 Migration-0011 tables (`document_classifications`, `document_extractions`, `employer_extraction_patterns`, `worker_extraction_preferences`): `set_updated_at` BEFORE-UPDATE trigger reuses `public.set_updated_at()` from migration 0001.
- On UPDATE to any `*_facts` row (`*_audit_trail` BEFORE-UPDATE, rewritten in 0010 — see `docs/architecture/confirmation-flow.md` "Trigger-layer logic"):
  - If `OLD.confirmed_at IS NOT NULL` AND any data field changed → set `NEW.confirmed_at := NULL` (edit unsets confirmation).
  - If `OLD.confirmed_at IS NULL` (proposed-state) → trust `NEW.confirmed_at`. This is what makes the proposed → confirmed transition work even when the same UPDATE fills NULL fields and sets `confirmed_at = now()` (ADR-012 Rule 1.2 RESUME flow).
  - Log to `*_history` whenever a data field OR `confirmed_at` changed; no-op UPDATEs are not logged.
  - Always set `NEW.updated_at := now()`.
- On INSERT to `comparisons`: validate that all `inputs_snapshot` fact ids have `confirmed_at IS NOT NULL`. Fail the insert if not.

## Why this exists
This file IS the schema until migrations exist. When migrations exist, this file MUST match them — drift is a P1 audit finding.
