-- ============================================================
-- Migration 0016: payslip_facts extraction columns
-- Sprint M0.5-BUILD-11 (2026-05-02). APPLIED via Supabase MCP
-- apply_migration in the same sprint window. This file mirrors
-- the applied SQL.
--
-- Path A from architectural fork audit (2026-05-02 chat).
--
-- The base payslip_facts table shipped in migration 0002 as the
-- Layer 3 fact destination, designed for the standard project
-- fact pattern (provenance + confirmed_at + source_doc_id +
-- _history sibling + audit trigger from migration 0010). It had
-- 0 rows; nothing depended on its current shape.
--
-- This migration extends payslip_facts (and its _history sibling)
-- to be the writeable destination for the async Vision extraction
-- pipeline. New columns:
-- - case_id: link to document_cases (per ADR-014; mirrors
--   documents.case_id added in migration 0014)
-- - pay_date: payment-date for future bank-deposit reconciliation,
--   distinct from period_start/period_end (work period covered)
-- - extraction_status: async lifecycle (pending → extracted →
--   confirmed | failed). Provides UI signal beyond the standard
--   confirmed_at pattern.
-- - extracted_at: when the model returned values
-- - extraction_jsonb: raw model output for audit + future prompt
--   iteration
--
-- Also relaxes employer_id to nullable: extraction at upload time
-- doesn't yet know the employer (employer linkage is a separate
-- step the worker drives later).
--
-- The existing payslip_facts_confirmed_integrity CHECK constraint
-- (migration 0009: confirmed_at IS NULL OR core fields populated)
-- stays in force. Extraction may return partial data; the UI will
-- disable [Looks right] when required fields are missing rather
-- than relax the integrity invariant.
-- ============================================================

-- Relax employer_id (extraction doesn't know employer at write time).
alter table payslip_facts
  alter column employer_id drop not null;

alter table payslip_facts_history
  alter column employer_id drop not null;

-- New extraction-state columns on the fact table.
alter table payslip_facts
  add column case_id uuid references document_cases(case_id) on delete cascade,
  add column pay_date date,
  add column extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'extracted', 'confirmed', 'failed')),
  add column extracted_at timestamptz,
  add column extraction_jsonb jsonb;

-- Mirror on _history sibling (no CHECK, no NOT NULL — audit trail
-- pattern: history rows get whatever the trigger writes).
alter table payslip_facts_history
  add column case_id uuid,
  add column pay_date date,
  add column extraction_status text,
  add column extracted_at timestamptz,
  add column extraction_jsonb jsonb;

-- Indexes for the read paths that ship in BUILD-11.
create index idx_payslip_facts_case on payslip_facts (case_id);
create index idx_payslip_facts_extraction_status on payslip_facts (extraction_status);
