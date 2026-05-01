-- ============================================================
-- Migration 0014: document_cases foundation
-- Sprint M0.5-BUILD-01 (2026-05-01). APPLIED via Supabase MCP
-- apply_migration in the same sprint window. This file mirrors
-- the applied SQL for ADR-014 traceability.
--
-- Per ADR-014 (docs/architecture/decisions.md). MINIMUM-VIABLE
-- columns; deferred (worker_confirmed_label, missing_items,
-- case-level confidence) to M1 per the BUILD-01 brief.
--
-- Numbering note: M0.5-spec.md and ADR-014 originally referred
-- to this as "Migration 0012". Actual slot is 0014 because
-- Migrations 0012 (fk_indexes_and_rls_perf) and 0013
-- (storage_rls_public_pattern) had already shipped between
-- Migration 0011 and this build window. Spec docs updated in
-- the same commit that lands this file.
-- ============================================================

create type document_case_completion_status as enum (
  'draft',
  'suggested',
  'confirmed',
  'partial',
  'complete'
);

create table document_cases (
  case_id           uuid primary key default gen_random_uuid(),
  worker_id         uuid not null references workers(id) on delete cascade,
  doc_type          text,
  completion_status document_case_completion_status not null default 'draft',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- documents.case_id FK — nullable so existing rows survive without backfill.
alter table documents
  add column case_id uuid references document_cases(case_id) on delete set null;

create index idx_documents_case_id on documents (case_id);

create index idx_document_cases_worker_status
  on document_cases (worker_id, completion_status);

-- updated_at trigger uses existing helper function set_updated_at().
create trigger document_cases_set_updated_at
  before update on document_cases
  for each row execute function set_updated_at();

-- RLS: workers SELECT/UPDATE own cases. Service role bypasses RLS for INSERT
-- (api/classify.ts does case creation via service-role RPC; workers never
-- INSERT directly — the upload pipeline owns case creation).
alter table document_cases enable row level security;

create policy document_cases_select_own
  on document_cases for select
  using (worker_id = current_worker_id());

create policy document_cases_update_own
  on document_cases for update
  using (worker_id = current_worker_id())
  with check (worker_id = current_worker_id());

-- Atomic case creation + document linking.
-- Called from api/classify.ts via supabase.rpc('classify_with_case', ...).
-- Wraps INSERT case + UPDATE documents.case_id in a single transaction —
-- prevents orphan cases if the second statement fails.
create or replace function classify_with_case(
  p_document_id      uuid,
  p_worker_id        uuid,
  p_doc_type         text,
  p_completion_status document_case_completion_status
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_case_id uuid;
begin
  -- Defence in depth: ensure document belongs to the worker the caller
  -- claims, even though the caller is the service-role and bypasses RLS.
  if not exists (
    select 1 from documents
    where id = p_document_id and worker_id = p_worker_id
  ) then
    raise exception 'classify_with_case: document % not owned by worker %',
      p_document_id, p_worker_id;
  end if;

  -- Idempotency: if document already has a case_id, return it without
  -- creating a duplicate. Lets api/classify.ts replay safely.
  select case_id into v_case_id
  from documents
  where id = p_document_id;

  if v_case_id is not null then
    return v_case_id;
  end if;

  insert into document_cases (worker_id, doc_type, completion_status)
  values (p_worker_id, p_doc_type, p_completion_status)
  returning case_id into v_case_id;

  update documents
  set case_id = v_case_id
  where id = p_document_id;

  return v_case_id;
end;
$$;

revoke execute on function classify_with_case(uuid, uuid, text, document_case_completion_status) from public;
grant execute on function classify_with_case(uuid, uuid, text, document_case_completion_status) to service_role;
