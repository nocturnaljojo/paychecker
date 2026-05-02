-- ============================================================
-- Migration 0018: document_cases soft delete
-- Session 012A (2026-05-02). APPLIED via Supabase MCP
-- apply_migration in the same session window. This file mirrors
-- the applied SQL.
--
-- APP 11.2 compliance: workers can destroy a case after upload.
-- No hard delete this sprint — storage objects stay in place;
-- a hard-delete cron is separate work.
--
-- Path:
-- 1. Add deleted_at column (nullable timestamptz).
-- 2. Replace SELECT RLS policy with one that filters
--    deleted_at IS NULL. Single enforcement point covers all
--    three frontend SELECT call sites (useAllCases,
--    useWorkerCases, useCaseFeedback) without per-hook code
--    change.
-- 3. UPDATE policy unchanged: worker can still UPDATE rows to
--    flip deleted_at, then the SELECT policy hides the row.
--
-- Index deferred per Session 012A EDIT 3: re-add
-- idx_document_cases_deleted_at (partial, where deleted_at
-- is null) is a tracked follow-up if /cases SELECT
-- performance degrades.
--
-- ISS-015 (RPC defense-in-depth on extend_case_with_document)
-- tracked separately in .claude/STATE-PRJ-issues.md and
-- deferred to a follow-up sprint.
-- ============================================================

alter table document_cases
  add column deleted_at timestamptz;

drop policy document_cases_select_own on document_cases;

create policy document_cases_select_own
  on document_cases for select
  using (
    worker_id = current_worker_id()
    and deleted_at is null
  );
