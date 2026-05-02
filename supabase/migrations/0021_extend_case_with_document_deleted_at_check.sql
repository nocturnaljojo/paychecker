-- ============================================================
-- Migration 0021: extend_case_with_document deleted_at check (ISS-018)
-- Session 012A.1.1 (2026-05-02 evening). Hotfix to ISS-018.
--
-- Threat model (verbatim from ISS-018, three concrete paths):
--   (1) Worker hits a saved bookmark to /upload?case=<uuid>.
--   (2) Worker hits a browser-history entry for /upload?case=<uuid>.
--   (3) Worker has /upload?case=<uuid> open in a tab, deletes the
--       case from /cases in another tab, returns to first tab,
--       attaches more documents — documents land on the deleted
--       case. (Path 3 is normal browsing pattern, not URL
--       manipulation; load-bearing for the P2 severity.)
--
-- ROLLBACK SAFETY: do NOT downgrade this migration to 0015 semantics.
-- Doing so reopens ISS-018 (workers can attach documents to soft-deleted
-- cases). If a rollback is required, roll FORWARD with a corrected function
-- preserving the AND deleted_at IS NULL clause in the case-existence check.
--
-- Bug: the case-ownership check in extend_case_with_document
-- (migration 0015) filters by worker_id only — no deleted_at
-- filter. When the case has deleted_at set, the RPC accepts the
-- call and links the document to the soft-deleted case.
--
-- Pre-flight bug reproduction (012A.1.1, transaction-rolled-back):
-- called extend_case_with_document(<doc owned by A>, <A>, <case
-- 67ae627b-... owned by A but soft-deleted>). RPC returned void
-- (no exception). documents.case_id was set to the deleted case
-- inside the transaction. ROLLBACK preserved live state. Outcome A
-- per CAL-004 — bug confirmed empirically.
--
-- Fix: add `deleted_at IS NULL` to the case-ownership existence
-- check. Update the exception message to surface the deleted-case
-- diagnosis to dev logs (worker never sees this string; the
-- worker-facing defense is in UploadZone.tsx and api/classify.ts
-- in the same commit).
--
-- Defense-in-depth layers in the same commit:
--   - api/classify.ts owner check adds .is('deleted_at', null)
--     so the API skips the extend RPC call when the case is
--     deleted (cleaner code path; also load-bearing because the
--     API client is service-role and bypasses RLS).
--   - UploadZone.tsx anchor query adds .is('deleted_at', null)
--     so the UI degrades to the standard upload flow when the
--     case is deleted (worker-facing visible defense).
--
-- ISS-016 (012A.1) is the related closed issue. ISS-015 was
-- superseded by ISS-018 in the post-Codex-review staging
-- (commit b184991). ISS-019 (optimistic count check on
-- soft-delete) stays for a separate session, paired with the
-- next useAllCases.ts touch.
--
-- classify_with_case (migration 0014) was inspected in U2 and
-- has no analogous gap — it INSERTs new document_cases rows
-- and does not read existing rows by case_id. Out of scope.
-- ============================================================

create or replace function public.extend_case_with_document(
  p_document_id uuid,
  p_worker_id   uuid,
  p_case_id     uuid
) returns void
language plpgsql
security invoker
as $$
begin
  if not exists (
    select 1 from documents
    where id = p_document_id and worker_id = p_worker_id
  ) then
    raise exception 'extend_case_with_document: document % not owned by worker %',
      p_document_id, p_worker_id;
  end if;

  if not exists (
    select 1 from document_cases
    where case_id = p_case_id
      and worker_id = p_worker_id
      and deleted_at is null
  ) then
    raise exception 'extend_case_with_document: case % not owned by worker % or has been deleted',
      p_case_id, p_worker_id;
  end if;

  -- Idempotent: if already linked to the same case, no-op.
  if exists (
    select 1 from documents
    where id = p_document_id and case_id = p_case_id
  ) then
    return;
  end if;

  update documents
  set case_id = p_case_id
  where id = p_document_id;
end;
$$;

revoke execute on function public.extend_case_with_document(uuid, uuid, uuid) from public;
grant  execute on function public.extend_case_with_document(uuid, uuid, uuid) to service_role;
