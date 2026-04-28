# REF-DB-schema

## Purpose
Source of truth for the Supabase schema. Update this file in the same commit as any migration. Drift between this file and `supabase/migrations/` is a P1 audit finding.

## Status
**Phase 0 schema — APPLIED.** Migrations `0001` (superseded), `0002_phase0_full_schema`, and `0003_payslips_storage_bucket` are live in `supabase/migrations/` and on the Supabase project. RLS smoke-tested 14/14 user-role tests + 2/2 trigger defense-in-depth tests pass (s003).

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
- `worker_id uuid fk workers`
- `employer_id uuid fk employers`
- `classification_code text`
- `award_id uuid fk awards`
- `effective_from date`, `effective_to date`
- `provenance text` (enum: see `REF-FACT-model.md`)
- `confirmed_at timestamptz`
- `source_doc_id uuid fk documents` (nullable)
- `created_at`, `updated_at`

`worker_classification_facts_history` — same shape + `change_type text` and `changed_at timestamptz`.

### `shift_facts` (Layer 2)
- `id uuid pk`
- `worker_id uuid fk workers`
- `employer_id uuid fk employers`
- `started_at timestamptz`, `ended_at timestamptz`
- `break_minutes int default 0`
- `shift_type text check (shift_type in ('ordinary', 'overtime', 'public_holiday', 'weekend_penalty'))`
- `notes text`
- `provenance text`, `confirmed_at timestamptz`, `source_doc_id uuid fk documents`
- `created_at`, `updated_at`

`shift_facts_history` — same + change tracking.

### `payslip_facts` (Layer 3)
- `id uuid pk`
- `worker_id uuid fk workers`
- `employer_id uuid fk employers`
- `period_start date`, `period_end date`
- `gross_pay numeric(10,2)`, `net_pay numeric(10,2)`
- `ordinary_hours numeric(8,2)`, `ordinary_rate numeric(10,4)`
- `ot_hours numeric(8,2)`, `ot_rate numeric(10,4)`
- `allowances jsonb`, `deductions jsonb`
- `tax numeric(10,2)`, `super_amount numeric(10,2)`, `super_destination text`
- `provenance text`, `confirmed_at timestamptz`, `source_doc_id uuid fk documents`
- `created_at`, `updated_at`

`payslip_facts_history` — same + change tracking.

### `bank_deposit_facts` (Layer 3)
- `id`, `worker_id`, `deposited_at date`, `amount numeric(10,2)`, `narration text`
- standard fact columns

### `super_contribution_facts` (Layer 3)
- `id`, `worker_id`, `received_at date`, `amount numeric(10,2)`, `source_employer text`
- standard fact columns

### `documents`
Uploaded source documents (payslips, contracts, etc.).
- `id uuid pk`
- `worker_id uuid fk workers`
- `doc_type text check (doc_type in ('payslip', 'contract', 'super_statement', 'bank_export', 'other'))`
- `storage_path text`
- `uploaded_at timestamptz`
- `deleted_at timestamptz` (soft delete; hard delete after 30 days on user request)

### `extraction_staging`
- `id uuid pk`
- `document_id uuid fk documents`
- `agent_version text`
- `extracted_json jsonb`
- `confidence_per_field jsonb`
- `created_at`
- (Worker confirms FROM here INTO the corresponding `*_facts` table — never directly.)

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
- `extraction_staging`: SELECT only for the document owner. INSERT only via service role (extraction agent).
- `*_facts` (Layer 1, 2, 3): SELECT/INSERT/UPDATE for own rows. No DELETE.
- `*_facts_history`: SELECT only for the fact owner. INSERTs come exclusively from BEFORE-UPDATE triggers (`SECURITY DEFINER`, bypass RLS). Triggers are the only write path.
- `comparisons`: SELECT/INSERT only. UPDATE/DELETE rejected by trigger (so even service role can't mutate). RLS additionally blocks user-role UPDATE/DELETE silently (no policy → zero rows).

Storage RLS (bucket `payslips`, see migration `0003`): `(storage.foldername(name))[1] = current_worker_id()::text` for SELECT/INSERT/UPDATE, scoped to `bucket_id = 'payslips'`. No DELETE.

## Triggers

- On UPDATE to any `*_facts` row: insert old row into `*_history`, set `confirmed_at = null`, set `updated_at = now()`.
- On INSERT to `comparisons`: validate that all `inputs_snapshot` fact ids have `confirmed_at IS NOT NULL`. Fail the insert if not.

## Why this exists
This file IS the schema until migrations exist. When migrations exist, this file MUST match them — drift is a P1 audit finding.
