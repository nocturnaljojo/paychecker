-- ============================================================
-- Migration 0017: payslip_facts.provenance — allow 'ocr_suggested'
-- Sprint M0.5-BUILD-11.5 hotfix (2026-05-02). APPLIED via Supabase
-- MCP apply_migration in the same hotfix window. This file mirrors
-- the applied SQL.
--
-- BUILD-11 introduced the first writer that wants the unconfirmed-
-- OCR provenance state. The CHECK constraint from migration 0002
-- pre-dated that distinction and only allowed the *confirmed* form
-- ('ocr_suggested_confirmed'). docs/architecture/fact-model-v1.md
-- explicitly references 'ocr_suggested' (without _confirmed
-- suffix) as the unconfirmed-extraction provenance — schema /
-- docs drift surfaced by BUILD-11's silent-INSERT bug.
--
-- Fix: extend the CHECK to include 'ocr_suggested' alongside the
-- existing values. No other constraints touched.
-- ============================================================

alter table payslip_facts
  drop constraint payslip_facts_provenance_check;

alter table payslip_facts
  add constraint payslip_facts_provenance_check
  check (provenance = any (array[
    'worker_entered'::text,
    'ocr_suggested'::text,
    'ocr_suggested_confirmed'::text,
    'assisted'::text
  ]));
