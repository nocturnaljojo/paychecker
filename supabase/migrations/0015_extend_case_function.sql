-- ============================================================
-- Migration 0015: extend_case_with_document RPC
-- Sprint M0.5-BUILD-03 (2026-05-01). APPLIED via Supabase MCP
-- apply_migration in the same sprint window. This file mirrors
-- the applied SQL for ADR-014 traceability.
--
-- Per ADR-014 + ChatGPT critique 2026-05-01 Round 1 finding 1
-- (atomic RPC, no direct client UPDATE on documents.case_id).
--
-- Pairs with classify_with_case() from Migration 0014 — same
-- defence-in-depth ownership pattern, same idempotent-on-replay
-- shape. Used by api/classify.ts when the worker arrives via
-- /upload?case=X to attach more pages to an existing case.
-- ============================================================

create or replace function extend_case_with_document(
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
    where case_id = p_case_id and worker_id = p_worker_id
  ) then
    raise exception 'extend_case_with_document: case % not owned by worker %',
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

revoke execute on function extend_case_with_document(uuid, uuid, uuid) from public;
grant  execute on function extend_case_with_document(uuid, uuid, uuid) to service_role;
