-- ============================================================
-- 0004: Onboarding additions — workers.country/language + consent_records
-- ============================================================
-- Captured by the educational onboarding flow (Workflow A per
-- docs/product/workflows.md). consent_records is the APP-1 + APP-6
-- audit trail: one immutable row per affirmative consent action.
-- ============================================================

ALTER TABLE public.workers
    ADD COLUMN country text,
    ADD COLUMN preferred_language text NOT NULL DEFAULT 'en';

CREATE TABLE public.consent_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    privacy_policy_version text NOT NULL,
    consented_at timestamptz NOT NULL DEFAULT now(),
    user_agent text,
    ip_address inet
);
COMMENT ON TABLE public.consent_records IS
    'Immutable audit log of affirmative consents. One row per consent event. APP-1 + APP-6.';
CREATE INDEX consent_records_worker_id_idx ON public.consent_records (worker_id);

CREATE OR REPLACE FUNCTION public.reject_consent_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'consent_records rows are immutable; record a new consent event instead.';
END $$;
CREATE TRIGGER consent_records_no_update
    BEFORE UPDATE ON public.consent_records
    FOR EACH ROW EXECUTE FUNCTION public.reject_consent_mutation();
CREATE TRIGGER consent_records_no_delete
    BEFORE DELETE ON public.consent_records
    FOR EACH ROW EXECUTE FUNCTION public.reject_consent_mutation();

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY consent_records_self_select ON public.consent_records FOR SELECT
    USING (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY consent_records_self_insert ON public.consent_records FOR INSERT
    WITH CHECK (worker_id = (SELECT public.current_worker_id()));
-- No UPDATE / DELETE policies → silent zero rows for users (RLS).
-- The triggers above reject any path that bypasses RLS (e.g. service role).
