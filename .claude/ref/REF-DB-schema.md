# REF-DB-schema

## Purpose
Source of truth for the Supabase schema. Update this file in the same commit as any migration. Drift between this file and `supabase/migrations/` is a P1 audit finding.

## Status
**Phase 0 schema — DRAFT.** No migrations applied yet. The shapes below are the starting design, to be refined when Phase 0 scaffolding begins.

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
- `created_at`, `updated_at`

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

- Workers can SELECT only rows where `worker_id = auth.uid()`.
- Workers can INSERT into fact tables and `documents` for their own `worker_id`.
- Workers can UPDATE their own fact rows (which unsets `confirmed_at` per trigger).
- Workers cannot DELETE; soft-delete via `deleted_at` only.
- Admin role: full read; no write to fact tables (audit trail integrity).
- Service role (extraction agent): writes only to `extraction_staging`.

## Triggers

- On UPDATE to any `*_facts` row: insert old row into `*_history`, set `confirmed_at = null`, set `updated_at = now()`.
- On INSERT to `comparisons`: validate that all `inputs_snapshot` fact ids have `confirmed_at IS NOT NULL`. Fail the insert if not.

## Why this exists
This file IS the schema until migrations exist. When migrations exist, this file MUST match them — drift is a P1 audit finding.
