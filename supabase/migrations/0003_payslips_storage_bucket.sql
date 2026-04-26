-- ============================================================
-- 0003: payslips storage bucket + RLS policies on storage.objects
-- ============================================================
-- Private bucket. 10 MB max per file. PNG / JPEG / PDF only.
-- Object path convention: {workers.id}/{uuid}-{original_filename}
--   so the first folder segment = workers.id and we can RLS on it.
-- Downloads via signed URLs (1 hr default; client-set TTL via supabase-js).
-- No public access. No DELETE policy → soft-delete only via documents.deleted_at.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payslips',
    'payslips',
    false,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS on storage.objects is enabled by default on Supabase. Add scoped policies
-- for this bucket only.

CREATE POLICY payslips_self_select ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'payslips'
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );

CREATE POLICY payslips_self_insert ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'payslips'
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );

CREATE POLICY payslips_self_update ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'payslips'
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    )
    WITH CHECK (
        bucket_id = 'payslips'
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );

-- DELETE intentionally omitted — soft-delete via documents.deleted_at instead.
