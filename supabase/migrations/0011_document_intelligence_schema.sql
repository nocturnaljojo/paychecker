-- ============================================================
-- Migration 0011: Document Intelligence Schema
-- Sprint A5 (2026-04-29). Implements ADR-013.
--
-- Sources:
--   - docs/architecture/storage-architecture-v01.md
--       (5 column additions + CHECK extension + storage bucket)
--   - docs/architecture/layered-memory-v01.md
--       (pgvector + L3 confidence column + L3 worker-DELETE policy)
--   - docs/architecture/extraction-service-v01.md
--       (vector(1024) confirmed; classifier_version + extractor_version)
--   - docs/architecture/document-intelligence-plan-v01.md §6
--       (4 new tables base shape)
--
-- Decisions made in Sprint A5 audit (per brief):
--   1. extraction_staging: DEPRECATE — 0 rows, schema fully subsumed
--      by document_extractions. DROP TABLE in this migration.
--   2. Storage buckets: keep payslips alias alive; create documents
--      bucket fresh. Sprint B1 updates src/lib/upload.ts; later
--      cleanup migration removes payslips bucket.
--   3. updated_at triggers: reuse public.set_updated_at() from
--      migration 0001 (not moddatetime — avoids extension dep).
--
-- Reversibility: see ROLLBACK block at end of file.
-- ============================================================


-- ============================================================
-- PART 1: Extension setup
-- ============================================================

-- pgvector lives in the `extensions` schema (Supabase best practice;
-- avoids the extension_in_public security advisor).
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;


-- ============================================================
-- PART 2: documents table additions
-- ============================================================

ALTER TABLE public.documents
    ADD COLUMN batch_id uuid NULL,
    ADD COLUMN content_hash text NULL,
    ADD COLUMN worker_facing_name text NULL,
    ADD COLUMN state text NOT NULL DEFAULT 'raw',
    ADD COLUMN archived_at timestamptz NULL,
    ADD COLUMN embedding vector(1024) NULL;

-- 10-state lifecycle CHECK (per document-intelligence-plan-v01.md §3
-- + storage-architecture-v01.md "Document lifecycle states").
ALTER TABLE public.documents
    ADD CONSTRAINT documents_state_check
    CHECK (state IN (
        'raw', 'classifying', 'classified', 'routed',
        'extracting', 'extracted', 'reviewed', 'confirmed',
        'disputed', 'archived'
    ));

-- doc_type enum extension: add 'shift'
-- (CHECK constraint must be DROP+RECREATE, can't ALTER in place).
ALTER TABLE public.documents
    DROP CONSTRAINT documents_doc_type_check;
ALTER TABLE public.documents
    ADD CONSTRAINT documents_doc_type_check
    CHECK (doc_type IN (
        'payslip', 'contract', 'super_statement',
        'bank_export', 'shift', 'other'
    ));

-- UNIQUE INDEX on content_hash for dedup
-- (per storage-architecture-v01.md "Filename collisions + idempotency")
CREATE UNIQUE INDEX documents_worker_content_hash_uniq
    ON public.documents (worker_id, content_hash)
    WHERE content_hash IS NOT NULL;

-- Indexes for new query paths
CREATE INDEX documents_batch_id_idx
    ON public.documents (batch_id)
    WHERE batch_id IS NOT NULL;

CREATE INDEX documents_state_idx
    ON public.documents (state);

-- pgvector HNSW index on embedding (cosine ops per
-- layered-memory-v01.md Layer 4 read path)
CREATE INDEX documents_embedding_idx
    ON public.documents
    USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;


-- ============================================================
-- PART 3: document_classifications
-- (per document-intelligence-plan-v01.md §6 + extraction-service-v01.md)
-- ============================================================

CREATE TABLE public.document_classifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
    detected_type text,
    confidence numeric(3,2),
    classified_at timestamptz NOT NULL DEFAULT now(),
    classifier_version text NOT NULL,
    routing_status text CHECK (routing_status IN (
        'auto_routed', 'review_pending', 'worker_corrected', 'failed'
    )),
    page_range int4range,
    parent_doc_id uuid REFERENCES public.documents(id) ON DELETE RESTRICT,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX document_classifications_document_id_idx
    ON public.document_classifications (document_id);

CREATE INDEX document_classifications_parent_doc_id_idx
    ON public.document_classifications (parent_doc_id)
    WHERE parent_doc_id IS NOT NULL;

ALTER TABLE public.document_classifications ENABLE ROW LEVEL SECURITY;

-- Worker reads own (via documents.worker_id join). No INSERT/UPDATE/DELETE
-- policies — service role only.
CREATE POLICY document_classifications_self_select
    ON public.document_classifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_classifications.document_id
              AND d.worker_id = (SELECT public.current_worker_id())
        )
    );

CREATE TRIGGER document_classifications_set_updated_at
    BEFORE UPDATE ON public.document_classifications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- PART 4: document_extractions
-- (per document-intelligence-plan-v01.md §6 + extraction-service-v01.md)
-- ============================================================

CREATE TABLE public.document_extractions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
    bucket text NOT NULL CHECK (bucket IN (
        'employment_contract', 'payslip', 'shift',
        'super_statement', 'bank_deposit'
    )),
    extracted_jsonb jsonb,
    field_confidences jsonb,
    extraction_status text NOT NULL CHECK (extraction_status IN (
        'pending', 'success', 'partial', 'failed', 'low_confidence'
    )),
    extracted_at timestamptz NOT NULL DEFAULT now(),
    extractor_version text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX document_extractions_document_id_idx
    ON public.document_extractions (document_id);

CREATE INDEX document_extractions_bucket_status_idx
    ON public.document_extractions (bucket, extraction_status);

ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

-- Same shape as document_classifications: worker reads own via join.
CREATE POLICY document_extractions_self_select
    ON public.document_extractions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_extractions.document_id
              AND d.worker_id = (SELECT public.current_worker_id())
        )
    );

CREATE TRIGGER document_extractions_set_updated_at
    BEFORE UPDATE ON public.document_extractions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- PART 5: employer_extraction_patterns (Layer 2 — operator-only)
-- (per layered-memory-v01.md "Privacy" section)
-- ============================================================

CREATE TABLE public.employer_extraction_patterns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
    document_type text NOT NULL,
    pattern_jsonb jsonb NOT NULL,
    observation_count int NOT NULL DEFAULT 1,
    last_observed timestamptz NOT NULL DEFAULT now(),
    confidence numeric(3,2),
    archived_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX employer_extraction_patterns_lookup_idx
    ON public.employer_extraction_patterns (employer_id, document_type, confidence DESC, observation_count DESC)
    WHERE archived_at IS NULL;

ALTER TABLE public.employer_extraction_patterns ENABLE ROW LEVEL SECURITY;

-- Explicit deny-all policy. Operator-only intent: service role bypasses
-- RLS by design; workers see zero rows. The deny-all policy documents
-- the intent in code AND clears the rls_enabled_no_policy advisor.
CREATE POLICY employer_extraction_patterns_no_worker_access
    ON public.employer_extraction_patterns FOR ALL
    USING (false);

-- Belt-and-suspenders REVOKE matches the migration 0007 hardening pattern:
-- workers role can never reach this table even if RLS is misconfigured.
REVOKE ALL ON public.employer_extraction_patterns FROM PUBLIC;
REVOKE ALL ON public.employer_extraction_patterns FROM authenticated;

CREATE TRIGGER employer_extraction_patterns_set_updated_at
    BEFORE UPDATE ON public.employer_extraction_patterns
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- PART 6: worker_extraction_preferences (Layer 3 — own + DELETE)
-- (per layered-memory-v01.md "Privacy" section — worker can DELETE
--  per APP 12/13 privacy right, deliberate departure from the
--  PayChecker no-DELETE pattern)
-- ============================================================

CREATE TABLE public.worker_extraction_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    preference_key text NOT NULL,
    preference_value jsonb NOT NULL,
    observation_count int NOT NULL DEFAULT 1,
    last_observed timestamptz NOT NULL DEFAULT now(),
    confidence numeric(3,2) NULL,
    archived_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX worker_extraction_preferences_worker_idx
    ON public.worker_extraction_preferences (worker_id, last_observed DESC)
    WHERE archived_at IS NULL;

ALTER TABLE public.worker_extraction_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY worker_extraction_preferences_self_select
    ON public.worker_extraction_preferences FOR SELECT
    USING (worker_id = (SELECT public.current_worker_id()));

-- DELETE is the privacy-right path. Worker can erase their own
-- preferences without operator involvement (APP 12/13).
CREATE POLICY worker_extraction_preferences_self_delete
    ON public.worker_extraction_preferences FOR DELETE
    USING (worker_id = (SELECT public.current_worker_id()));

-- INSERT/UPDATE: service role only (no policy admits worker writes).

CREATE TRIGGER worker_extraction_preferences_set_updated_at
    BEFORE UPDATE ON public.worker_extraction_preferences
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- PART 7: documents storage bucket
-- (per storage-architecture-v01.md "Storage bucket strategy" —
--  rename payslips → documents; payslips alias retained until
--  Sprint B1 updates src/lib/upload.ts)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'application/pdf', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies on storage.objects scoped to documents bucket.
-- Pattern matches migration 0003 (payslips bucket).
CREATE POLICY documents_storage_self_select
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );

CREATE POLICY documents_storage_self_insert
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );

CREATE POLICY documents_storage_self_update
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    )
    WITH CHECK (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );

-- DELETE intentionally omitted — soft-delete via documents.deleted_at
-- + service-role cron sweep (Phase 1+ per storage-architecture-v01.md).


-- ============================================================
-- PART 8: extraction_staging deprecation
-- (Sprint A5 audit decision — empty + subsumed by document_extractions)
-- ============================================================

DROP TABLE IF EXISTS public.extraction_staging CASCADE;


-- ============================================================
-- ROLLBACK (commented — apply manually if needed)
-- ============================================================

-- -- Re-create extraction_staging (from migration 0002):
-- CREATE TABLE public.extraction_staging (
--     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--     document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
--     agent_version text NOT NULL,
--     extracted_json jsonb NOT NULL,
--     confidence_per_field jsonb,
--     created_at timestamptz NOT NULL DEFAULT now()
-- );
-- ALTER TABLE public.extraction_staging ENABLE ROW LEVEL SECURITY;
-- CREATE INDEX extraction_staging_document_id_idx ON public.extraction_staging (document_id);
-- CREATE POLICY extraction_staging_self_select ON public.extraction_staging FOR SELECT
--     USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = extraction_staging.document_id AND d.worker_id = (SELECT public.current_worker_id())));
--
-- -- Drop storage policies + bucket:
-- DROP POLICY documents_storage_self_update ON storage.objects;
-- DROP POLICY documents_storage_self_insert ON storage.objects;
-- DROP POLICY documents_storage_self_select ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'documents';
--
-- -- Drop the 4 new tables:
-- DROP TABLE public.worker_extraction_preferences CASCADE;
-- DROP TABLE public.employer_extraction_patterns CASCADE;
-- DROP TABLE public.document_extractions CASCADE;
-- DROP TABLE public.document_classifications CASCADE;
--
-- -- Revert documents column additions + constraints:
-- DROP INDEX public.documents_embedding_idx;
-- DROP INDEX public.documents_state_idx;
-- DROP INDEX public.documents_batch_id_idx;
-- DROP INDEX public.documents_worker_content_hash_uniq;
-- ALTER TABLE public.documents DROP CONSTRAINT documents_state_check;
-- ALTER TABLE public.documents DROP CONSTRAINT documents_doc_type_check;
-- ALTER TABLE public.documents ADD CONSTRAINT documents_doc_type_check
--     CHECK (doc_type IN ('payslip', 'contract', 'super_statement', 'bank_export', 'other'));
-- ALTER TABLE public.documents
--     DROP COLUMN embedding,
--     DROP COLUMN archived_at,
--     DROP COLUMN state,
--     DROP COLUMN worker_facing_name,
--     DROP COLUMN content_hash,
--     DROP COLUMN batch_id;
--
-- -- Drop extension last (no other tables use it):
-- DROP EXTENSION IF EXISTS vector;
