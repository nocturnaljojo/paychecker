-- ============================================================
-- Migration 0013: Storage RLS PUBLIC + JWT-guard pattern
-- Sprint B1.9 (2026-04-30) — closes ISS-009.
--
-- ISSUE:
-- Migration 0011 created storage.objects policies for the
-- `documents` bucket scoped `TO authenticated`. Migration 0003
-- did the same for the `payslips` bucket. The Clerk vanilla
-- session JWT in use (per src/lib/supabase.ts) does NOT include
-- a `role: 'authenticated'` claim. Supabase Storage's role
-- assignment defaults to `anon` for those requests, so the
-- `TO authenticated`-scoped policies don't apply at all, and
-- with no fallback policy for anon, RLS denies the INSERT and
-- Postgres returns "new row violates row-level security policy".
--
-- The same Clerk JWT works fine against `public.*` tables
-- because every public-schema policy uses the no-`TO`-clause
-- pattern (effective TO PUBLIC), which applies regardless of
-- role. `auth.jwt() ->> 'sub'` resolves correctly in that path.
--
-- FIX:
-- Drop the six storage policies and recreate them with no `TO`
-- clause (PUBLIC) plus an explicit `(SELECT auth.jwt() ->> 'sub')
-- IS NOT NULL` guard. Mirrors the `public.documents` pattern
-- that already works. Same security properties:
--   - Anonymous requests: JWT guard returns NULL → denied.
--   - Cross-tenant requests: foldername mismatch with
--     current_worker_id() → denied.
--
-- Migration 0012's `(SELECT ...)` wrap precedent followed for
-- planner-init-plan caching. Original policy NAME / COMMAND /
-- (where present) USING / WITH CHECK shape preserved aside from
-- the role-scope change and the JWT-presence guard addition.
--
-- Reversibility: ROLLBACK block at end has the verbatim
-- TO-authenticated originals from Migration 0011 + 0003.
-- ============================================================


BEGIN;


-- ----- 1. documents bucket (Migration 0011) -----

DROP POLICY IF EXISTS documents_storage_self_select ON storage.objects;
CREATE POLICY documents_storage_self_select
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'documents'
        AND (SELECT auth.jwt() ->> 'sub') IS NOT NULL
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );

DROP POLICY IF EXISTS documents_storage_self_insert ON storage.objects;
CREATE POLICY documents_storage_self_insert
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'documents'
        AND (SELECT auth.jwt() ->> 'sub') IS NOT NULL
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );

DROP POLICY IF EXISTS documents_storage_self_update ON storage.objects;
CREATE POLICY documents_storage_self_update
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'documents'
        AND (SELECT auth.jwt() ->> 'sub') IS NOT NULL
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    )
    WITH CHECK (
        bucket_id = 'documents'
        AND (SELECT auth.jwt() ->> 'sub') IS NOT NULL
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );


-- ----- 2. payslips bucket (Migration 0003 — alias, retained until POL-003 cleanup) -----
--
-- Same broadening applied for consistency. The `payslips` bucket
-- alias remains alive until POL-003's cleanup migration drops it
-- entirely (after Sprint B1+B2+D have cut over to `documents`).
-- Until then it shares the same RLS asymmetry; broadening here
-- prevents any latent code path that still touches `payslips`
-- from silently failing the same way.

DROP POLICY IF EXISTS payslips_self_select ON storage.objects;
CREATE POLICY payslips_self_select
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'payslips'
        AND (SELECT auth.jwt() ->> 'sub') IS NOT NULL
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );

DROP POLICY IF EXISTS payslips_self_insert ON storage.objects;
CREATE POLICY payslips_self_insert
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'payslips'
        AND (SELECT auth.jwt() ->> 'sub') IS NOT NULL
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );

DROP POLICY IF EXISTS payslips_self_update ON storage.objects;
CREATE POLICY payslips_self_update
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'payslips'
        AND (SELECT auth.jwt() ->> 'sub') IS NOT NULL
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    )
    WITH CHECK (
        bucket_id = 'payslips'
        AND (SELECT auth.jwt() ->> 'sub') IS NOT NULL
        AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
    );


COMMIT;


-- ============================================================
-- ROLLBACK (commented — apply manually if needed)
--
-- Restores the verbatim TO-authenticated originals from
-- Migration 0011 (documents bucket) and Migration 0003
-- (payslips bucket). Restoring them reintroduces ISS-009 unless
-- the Clerk JWT is updated to carry `role: 'authenticated'`
-- (POL-012) before the rollback applies.
-- ============================================================

-- BEGIN;
--
-- -- ----- documents bucket (originals from Migration 0011) -----
--
-- DROP POLICY IF EXISTS documents_storage_self_select ON storage.objects;
-- CREATE POLICY documents_storage_self_select
--     ON storage.objects FOR SELECT
--     TO authenticated
--     USING (
--         bucket_id = 'documents'
--         AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
--     );
--
-- DROP POLICY IF EXISTS documents_storage_self_insert ON storage.objects;
-- CREATE POLICY documents_storage_self_insert
--     ON storage.objects FOR INSERT
--     TO authenticated
--     WITH CHECK (
--         bucket_id = 'documents'
--         AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
--     );
--
-- DROP POLICY IF EXISTS documents_storage_self_update ON storage.objects;
-- CREATE POLICY documents_storage_self_update
--     ON storage.objects FOR UPDATE
--     TO authenticated
--     USING (
--         bucket_id = 'documents'
--         AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
--     )
--     WITH CHECK (
--         bucket_id = 'documents'
--         AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
--     );
--
-- -- ----- payslips bucket (originals from Migration 0003) -----
--
-- DROP POLICY IF EXISTS payslips_self_select ON storage.objects;
-- CREATE POLICY payslips_self_select
--     ON storage.objects FOR SELECT
--     TO authenticated
--     USING (
--         bucket_id = 'payslips'
--         AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
--     );
--
-- DROP POLICY IF EXISTS payslips_self_insert ON storage.objects;
-- CREATE POLICY payslips_self_insert
--     ON storage.objects FOR INSERT
--     TO authenticated
--     WITH CHECK (
--         bucket_id = 'payslips'
--         AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
--     );
--
-- DROP POLICY IF EXISTS payslips_self_update ON storage.objects;
-- CREATE POLICY payslips_self_update
--     ON storage.objects FOR UPDATE
--     TO authenticated
--     USING (
--         bucket_id = 'payslips'
--         AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
--     )
--     WITH CHECK (
--         bucket_id = 'payslips'
--         AND (storage.foldername(name))[1] = (SELECT public.current_worker_id())::text
--     );
--
-- COMMIT;
