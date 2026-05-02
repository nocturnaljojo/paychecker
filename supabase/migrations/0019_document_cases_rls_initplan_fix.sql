-- ============================================================
-- Migration 0019: document_cases RLS InitPlan fix (012A.1)
-- Session 012A.1 (2026-05-02). Hotfix to ISS-016.
--
-- Problem: document_cases policies were created in 0014 with bare
-- `current_worker_id()` calls in qual + with_check, and 0018
-- propagated the form when adding the deleted_at clause to SELECT.
-- Bare-form calls are inlined per-row by the planner. Under
-- multi-phase RLS evaluation (USING during scan, WITH CHECK against
-- post-update row), the inlined inner call can resolve a stale or
-- null value in the WITH CHECK phase even when USING resolved
-- correctly. Empirically, every PATCH against document_cases failed
-- with `new row violates row-level security policy` (errcode 42501),
-- blocking the 012A soft-delete UI.
--
-- Fix: wrap `current_worker_id()` in `(SELECT ...)` so Postgres
-- materialises it as an InitPlan node — evaluated once per query,
-- the resulting scalar referenced (not re-evaluated) by both USING
-- and WITH CHECK. Matches the proven pattern on payslip_facts
-- (psf_self_all) and every other public.* policy. Documented as
-- Supabase advisor lint auth_rls_initplan; the lint frames this as
-- performance, but the empirical evidence in 012A demonstrates it
-- is also a correctness hazard for WITH CHECK on UPDATE in this
-- Postgres + PostgREST + Clerk-JWT configuration.
--
-- Three security guarantees preserved (proof in retro
-- docs/retros/2026-05-02-s012a-soft-delete-cases.md, addendum):
--   (a) Worker A can soft-delete their own row.
--   (b) Cross-tenant isolation: Worker A cannot affect Worker B's
--       row (USING blocks).
--   (c) Ownership-transfer prevention: Worker A cannot UPDATE
--       worker_id to Worker B's UUID (WITH CHECK rejects).
--
-- ALTER POLICY updates predicates in place; policy oid and
-- privileges preserved. No data migration. Atomic per ALTER.
-- Reversible by reapplying the bare form.
--
-- ISS-015 (RPC defense-in-depth on extend_case_with_document)
-- remains OPEN; not in scope here.
--
-- Pre-flight grep at 012A.1 plan time confirmed only the two
-- document_cases policies are bare-form across public.* and
-- storage.*. No other ISS-003-class misses.
-- ============================================================

alter policy document_cases_update_own on public.document_cases
  using      (worker_id = (select current_worker_id()))
  with check (worker_id = (select current_worker_id()));

alter policy document_cases_select_own on public.document_cases
  using      ((worker_id = (select current_worker_id())) and (deleted_at is null));
