-- ============================================================
-- 0002: Phase 0 full schema (Clerk-JWT, 3-layer fact model)
-- ============================================================
-- Supersedes 0001 (Supabase-Auth-based profiles → Clerk-JWT workers).
-- Implements REF-DB-schema.md verbatim:
--   workers, employers, awards, award_rates,
--   documents, extraction_staging,
--   worker_classification_facts (L1) + history,
--   shift_facts (L2) + history,
--   payslip_facts (L3) + history,
--   bank_deposit_facts (L3) + history,
--   super_contribution_facts (L3) + history,
--   comparisons (immutable snapshots).
--
-- Identity model: every owned row references public.workers(id);
-- workers.clerk_user_id maps to auth.jwt() ->> 'sub' (Clerk JWT).
--
-- Confirmation model: every fact has provenance + confirmed_at.
-- *_history siblings capture every UPDATE and clear confirmed_at,
-- so any change re-enters the unconfirmed state.
--
-- Comparisons: BEFORE INSERT validates inputs_snapshot.facts[].confirmed_at
-- is non-null; UPDATE/DELETE rejected by trigger. Re-run = new row.
-- ============================================================


-- ----- 1. Drop 0001 artifacts (Supabase-Auth identity model) -----

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_admin();
DROP TABLE IF EXISTS public.profiles CASCADE;
-- public.set_updated_at() is generic; KEEP and reuse below.


-- ----- 2. Extensions -----

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ----- 3. Identity & reference data -----

CREATE TABLE public.workers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id text UNIQUE NOT NULL,
    display_name text,
    tier text NOT NULL DEFAULT 'palm_free' CHECK (tier IN ('palm_free', 'aud_paid')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.workers IS 'PayChecker user identity, keyed by Clerk JWT sub.';
CREATE INDEX workers_clerk_user_id_idx ON public.workers (clerk_user_id);

CREATE TABLE public.employers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name text NOT NULL,
    abn text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.awards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    award_code text UNIQUE NOT NULL,
    title text NOT NULL,
    fwc_consolidation_date date,
    fwc_source_url text,
    effective_from date,
    effective_to date
);

CREATE TABLE public.award_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    award_id uuid NOT NULL REFERENCES public.awards(id) ON DELETE RESTRICT,
    classification_code text NOT NULL,
    pay_basis text NOT NULL CHECK (pay_basis IN ('hourly', 'weekly', 'piece')),
    amount numeric(10,2) NOT NULL,
    effective_from date NOT NULL,
    effective_to date
);
CREATE INDEX award_rates_award_id_idx ON public.award_rates (award_id);
CREATE INDEX award_rates_classification_idx ON public.award_rates (classification_code);


-- ----- 4. Documents & extraction pipeline -----

CREATE TABLE public.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    doc_type text NOT NULL CHECK (doc_type IN ('payslip', 'contract', 'super_statement', 'bank_export', 'other')),
    storage_path text NOT NULL UNIQUE,
    original_filename text,
    mime_type text,
    size_bytes bigint,
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);
CREATE INDEX documents_worker_id_idx ON public.documents (worker_id);

CREATE TABLE public.extraction_staging (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
    agent_version text NOT NULL,
    extracted_json jsonb NOT NULL,
    confidence_per_field jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.extraction_staging IS 'Worker confirms FROM here INTO *_facts; LLM never writes directly to facts.';
CREATE INDEX extraction_staging_document_id_idx ON public.extraction_staging (document_id);


-- ----- 5. Layer 1: classification facts -----

CREATE TABLE public.worker_classification_facts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE RESTRICT,
    award_id uuid NOT NULL REFERENCES public.awards(id) ON DELETE RESTRICT,
    classification_code text NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    provenance text NOT NULL CHECK (provenance IN ('worker_entered', 'ocr_suggested_confirmed', 'assisted')),
    confirmed_at timestamptz,
    source_doc_id uuid REFERENCES public.documents(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wcf_worker_id_idx ON public.worker_classification_facts (worker_id);

CREATE TABLE public.worker_classification_facts_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_id uuid NOT NULL,
    worker_id uuid NOT NULL,
    employer_id uuid NOT NULL,
    award_id uuid NOT NULL,
    classification_code text NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    provenance text NOT NULL,
    confirmed_at timestamptz,
    source_doc_id uuid,
    change_type text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wcfh_fact_id_idx ON public.worker_classification_facts_history (fact_id);


-- ----- 6. Layer 2: shift facts -----

CREATE TABLE public.shift_facts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE RESTRICT,
    started_at timestamptz NOT NULL,
    ended_at timestamptz NOT NULL,
    break_minutes int NOT NULL DEFAULT 0,
    shift_type text NOT NULL CHECK (shift_type IN ('ordinary', 'overtime', 'public_holiday', 'weekend_penalty')),
    notes text,
    provenance text NOT NULL CHECK (provenance IN ('worker_entered', 'ocr_suggested_confirmed', 'assisted')),
    confirmed_at timestamptz,
    source_doc_id uuid REFERENCES public.documents(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sf_worker_id_idx ON public.shift_facts (worker_id);

CREATE TABLE public.shift_facts_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_id uuid NOT NULL,
    worker_id uuid NOT NULL,
    employer_id uuid NOT NULL,
    started_at timestamptz NOT NULL,
    ended_at timestamptz NOT NULL,
    break_minutes int NOT NULL,
    shift_type text NOT NULL,
    notes text,
    provenance text NOT NULL,
    confirmed_at timestamptz,
    source_doc_id uuid,
    change_type text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sfh_fact_id_idx ON public.shift_facts_history (fact_id);


-- ----- 7. Layer 3: payslip / bank deposit / super contribution facts -----

CREATE TABLE public.payslip_facts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE RESTRICT,
    period_start date NOT NULL,
    period_end date NOT NULL,
    gross_pay numeric(10,2) NOT NULL,
    net_pay numeric(10,2) NOT NULL,
    ordinary_hours numeric(8,2),
    ordinary_rate numeric(10,4),
    ot_hours numeric(8,2),
    ot_rate numeric(10,4),
    allowances jsonb,
    deductions jsonb,
    tax numeric(10,2),
    super_amount numeric(10,2),
    super_destination text,
    provenance text NOT NULL CHECK (provenance IN ('worker_entered', 'ocr_suggested_confirmed', 'assisted')),
    confirmed_at timestamptz,
    source_doc_id uuid REFERENCES public.documents(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX psf_worker_id_idx ON public.payslip_facts (worker_id);

CREATE TABLE public.payslip_facts_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_id uuid NOT NULL,
    worker_id uuid NOT NULL,
    employer_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    gross_pay numeric(10,2) NOT NULL,
    net_pay numeric(10,2) NOT NULL,
    ordinary_hours numeric(8,2),
    ordinary_rate numeric(10,4),
    ot_hours numeric(8,2),
    ot_rate numeric(10,4),
    allowances jsonb,
    deductions jsonb,
    tax numeric(10,2),
    super_amount numeric(10,2),
    super_destination text,
    provenance text NOT NULL,
    confirmed_at timestamptz,
    source_doc_id uuid,
    change_type text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX psfh_fact_id_idx ON public.payslip_facts_history (fact_id);

CREATE TABLE public.bank_deposit_facts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    deposited_at date NOT NULL,
    amount numeric(10,2) NOT NULL,
    narration text,
    provenance text NOT NULL CHECK (provenance IN ('worker_entered', 'ocr_suggested_confirmed', 'assisted')),
    confirmed_at timestamptz,
    source_doc_id uuid REFERENCES public.documents(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bdf_worker_id_idx ON public.bank_deposit_facts (worker_id);

CREATE TABLE public.bank_deposit_facts_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_id uuid NOT NULL,
    worker_id uuid NOT NULL,
    deposited_at date NOT NULL,
    amount numeric(10,2) NOT NULL,
    narration text,
    provenance text NOT NULL,
    confirmed_at timestamptz,
    source_doc_id uuid,
    change_type text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bdfh_fact_id_idx ON public.bank_deposit_facts_history (fact_id);

CREATE TABLE public.super_contribution_facts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    received_at date NOT NULL,
    amount numeric(10,2) NOT NULL,
    source_employer text,
    provenance text NOT NULL CHECK (provenance IN ('worker_entered', 'ocr_suggested_confirmed', 'assisted')),
    confirmed_at timestamptz,
    source_doc_id uuid REFERENCES public.documents(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scf_worker_id_idx ON public.super_contribution_facts (worker_id);

CREATE TABLE public.super_contribution_facts_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_id uuid NOT NULL,
    worker_id uuid NOT NULL,
    received_at date NOT NULL,
    amount numeric(10,2) NOT NULL,
    source_employer text,
    provenance text NOT NULL,
    confirmed_at timestamptz,
    source_doc_id uuid,
    change_type text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scfh_fact_id_idx ON public.super_contribution_facts_history (fact_id);


-- ----- 8. Comparisons (immutable snapshots) -----

CREATE TABLE public.comparisons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    period_start date NOT NULL,
    period_end date NOT NULL,
    award_ref_snapshot jsonb NOT NULL,
    inputs_snapshot jsonb NOT NULL,
    expected_amounts jsonb NOT NULL,
    received_amounts jsonb NOT NULL,
    gap jsonb NOT NULL,
    report_pdf_storage_path text,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.comparisons IS 'Immutable snapshots. Re-run = new row. UPDATE/DELETE rejected by trigger.';
CREATE INDEX comparisons_worker_id_idx ON public.comparisons (worker_id);


-- ----- 9. RLS helper: current_worker_id() -----
-- STABLE so the planner caches per-statement. Reads workers via the
-- workers SELECT policy (which admits the caller's own row by clerk
-- JWT sub). Returns NULL when no signed-in worker / no JWT.

CREATE OR REPLACE FUNCTION public.current_worker_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT id FROM public.workers
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    LIMIT 1
$$;
COMMENT ON FUNCTION public.current_worker_id() IS 'Resolves the current Clerk JWT sub to a workers.id. NULL if not signed in.';


-- ----- 10. updated_at trigger on workers (re-uses 0001 set_updated_at) -----

CREATE TRIGGER workers_set_updated_at
    BEFORE UPDATE ON public.workers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER employers_set_updated_at
    BEFORE UPDATE ON public.employers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----- 11. Audit-trail triggers per fact table -----

CREATE OR REPLACE FUNCTION public.log_wcf_history()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.worker_classification_facts_history(
        fact_id, worker_id, employer_id, award_id, classification_code,
        effective_from, effective_to, provenance, confirmed_at, source_doc_id,
        change_type, changed_at
    ) VALUES (
        OLD.id, OLD.worker_id, OLD.employer_id, OLD.award_id, OLD.classification_code,
        OLD.effective_from, OLD.effective_to, OLD.provenance, OLD.confirmed_at, OLD.source_doc_id,
        TG_OP, now()
    );
    NEW.confirmed_at := NULL;
    NEW.updated_at := now();
    RETURN NEW;
END $$;
CREATE TRIGGER wcf_audit_trail
    BEFORE UPDATE ON public.worker_classification_facts
    FOR EACH ROW EXECUTE FUNCTION public.log_wcf_history();

CREATE OR REPLACE FUNCTION public.log_sf_history()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.shift_facts_history(
        fact_id, worker_id, employer_id, started_at, ended_at, break_minutes,
        shift_type, notes, provenance, confirmed_at, source_doc_id,
        change_type, changed_at
    ) VALUES (
        OLD.id, OLD.worker_id, OLD.employer_id, OLD.started_at, OLD.ended_at, OLD.break_minutes,
        OLD.shift_type, OLD.notes, OLD.provenance, OLD.confirmed_at, OLD.source_doc_id,
        TG_OP, now()
    );
    NEW.confirmed_at := NULL;
    NEW.updated_at := now();
    RETURN NEW;
END $$;
CREATE TRIGGER sf_audit_trail
    BEFORE UPDATE ON public.shift_facts
    FOR EACH ROW EXECUTE FUNCTION public.log_sf_history();

CREATE OR REPLACE FUNCTION public.log_psf_history()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.payslip_facts_history(
        fact_id, worker_id, employer_id, period_start, period_end,
        gross_pay, net_pay, ordinary_hours, ordinary_rate, ot_hours, ot_rate,
        allowances, deductions, tax, super_amount, super_destination,
        provenance, confirmed_at, source_doc_id,
        change_type, changed_at
    ) VALUES (
        OLD.id, OLD.worker_id, OLD.employer_id, OLD.period_start, OLD.period_end,
        OLD.gross_pay, OLD.net_pay, OLD.ordinary_hours, OLD.ordinary_rate, OLD.ot_hours, OLD.ot_rate,
        OLD.allowances, OLD.deductions, OLD.tax, OLD.super_amount, OLD.super_destination,
        OLD.provenance, OLD.confirmed_at, OLD.source_doc_id,
        TG_OP, now()
    );
    NEW.confirmed_at := NULL;
    NEW.updated_at := now();
    RETURN NEW;
END $$;
CREATE TRIGGER psf_audit_trail
    BEFORE UPDATE ON public.payslip_facts
    FOR EACH ROW EXECUTE FUNCTION public.log_psf_history();

CREATE OR REPLACE FUNCTION public.log_bdf_history()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.bank_deposit_facts_history(
        fact_id, worker_id, deposited_at, amount, narration,
        provenance, confirmed_at, source_doc_id,
        change_type, changed_at
    ) VALUES (
        OLD.id, OLD.worker_id, OLD.deposited_at, OLD.amount, OLD.narration,
        OLD.provenance, OLD.confirmed_at, OLD.source_doc_id,
        TG_OP, now()
    );
    NEW.confirmed_at := NULL;
    NEW.updated_at := now();
    RETURN NEW;
END $$;
CREATE TRIGGER bdf_audit_trail
    BEFORE UPDATE ON public.bank_deposit_facts
    FOR EACH ROW EXECUTE FUNCTION public.log_bdf_history();

CREATE OR REPLACE FUNCTION public.log_scf_history()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.super_contribution_facts_history(
        fact_id, worker_id, received_at, amount, source_employer,
        provenance, confirmed_at, source_doc_id,
        change_type, changed_at
    ) VALUES (
        OLD.id, OLD.worker_id, OLD.received_at, OLD.amount, OLD.source_employer,
        OLD.provenance, OLD.confirmed_at, OLD.source_doc_id,
        TG_OP, now()
    );
    NEW.confirmed_at := NULL;
    NEW.updated_at := now();
    RETURN NEW;
END $$;
CREATE TRIGGER scf_audit_trail
    BEFORE UPDATE ON public.super_contribution_facts
    FOR EACH ROW EXECUTE FUNCTION public.log_scf_history();


-- ----- 12. Comparisons immutability + INSERT validation -----
-- inputs_snapshot must be shape { "facts": [{..., "confirmed_at": <iso>}, ...] }.
-- Every fact entry must carry a non-null confirmed_at, ensuring the
-- snapshot records only confirmed inputs at the moment of comparison.

CREATE OR REPLACE FUNCTION public.validate_comparison_inputs()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    fact jsonb;
BEGIN
    IF jsonb_typeof(NEW.inputs_snapshot -> 'facts') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION
            'comparisons.inputs_snapshot must contain a facts array (shape: { "facts": [{...}] })';
    END IF;
    FOR fact IN SELECT jsonb_array_elements(NEW.inputs_snapshot -> 'facts') LOOP
        IF fact ->> 'confirmed_at' IS NULL THEN
            RAISE EXCEPTION
                'comparisons.inputs_snapshot contains an unconfirmed fact: %', fact;
        END IF;
    END LOOP;
    RETURN NEW;
END $$;
CREATE TRIGGER comparisons_validate_inputs
    BEFORE INSERT ON public.comparisons
    FOR EACH ROW EXECUTE FUNCTION public.validate_comparison_inputs();

CREATE OR REPLACE FUNCTION public.reject_comparison_mutation()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'comparisons rows are immutable; re-run produces a new row.';
END $$;
CREATE TRIGGER comparisons_no_update
    BEFORE UPDATE ON public.comparisons
    FOR EACH ROW EXECUTE FUNCTION public.reject_comparison_mutation();
CREATE TRIGGER comparisons_no_delete
    BEFORE DELETE ON public.comparisons
    FOR EACH ROW EXECUTE FUNCTION public.reject_comparison_mutation();


-- ----- 13. RLS enable -----

ALTER TABLE public.workers                              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employers                            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards                               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_rates                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents                            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_staging                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_classification_facts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_classification_facts_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_facts                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_facts_history                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_facts                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_facts_history                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_deposit_facts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_deposit_facts_history           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_contribution_facts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_contribution_facts_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparisons                          ENABLE ROW LEVEL SECURITY;


-- ----- 14. RLS policies -----

-- workers: own row only via Clerk JWT sub. INSERT allowed on first-sign-in.
CREATE POLICY workers_self_select ON public.workers FOR SELECT
    USING (clerk_user_id = (auth.jwt() ->> 'sub'));
CREATE POLICY workers_self_insert ON public.workers FOR INSERT
    WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'));
CREATE POLICY workers_self_update ON public.workers FOR UPDATE
    USING (clerk_user_id = (auth.jwt() ->> 'sub'))
    WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'));

-- employers: signed-in workers can SELECT/INSERT. No UPDATE/DELETE — employer
-- legal_name/abn changes go through a future merge flow rather than ad-hoc edit.
CREATE POLICY employers_select_signed_in ON public.employers FOR SELECT
    USING ((auth.jwt() ->> 'sub') IS NOT NULL);
CREATE POLICY employers_insert_signed_in ON public.employers FOR INSERT
    WITH CHECK ((auth.jwt() ->> 'sub') IS NOT NULL);

-- awards & award_rates: read-only public reference data for any signed-in worker.
-- Writes occur via service-role / migrations only.
CREATE POLICY awards_select_signed_in ON public.awards FOR SELECT
    USING ((auth.jwt() ->> 'sub') IS NOT NULL);
CREATE POLICY award_rates_select_signed_in ON public.award_rates FOR SELECT
    USING ((auth.jwt() ->> 'sub') IS NOT NULL);

-- documents: own-only. UPDATE allowed for soft-delete; no DELETE policy.
CREATE POLICY documents_self_select ON public.documents FOR SELECT
    USING (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY documents_self_insert ON public.documents FOR INSERT
    WITH CHECK (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY documents_self_update ON public.documents FOR UPDATE
    USING (worker_id = (SELECT public.current_worker_id()))
    WITH CHECK (worker_id = (SELECT public.current_worker_id()));

-- extraction_staging: read-only for the document owner; writes by service role only.
CREATE POLICY extraction_staging_self_select ON public.extraction_staging FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = extraction_staging.document_id
          AND d.worker_id = (SELECT public.current_worker_id())
    ));

-- *_facts: own rows, SELECT/INSERT/UPDATE. No DELETE policy → no deletes.
CREATE POLICY wcf_self_all ON public.worker_classification_facts
    FOR ALL
    USING (worker_id = (SELECT public.current_worker_id()))
    WITH CHECK (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY sf_self_all ON public.shift_facts
    FOR ALL
    USING (worker_id = (SELECT public.current_worker_id()))
    WITH CHECK (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY psf_self_all ON public.payslip_facts
    FOR ALL
    USING (worker_id = (SELECT public.current_worker_id()))
    WITH CHECK (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY bdf_self_all ON public.bank_deposit_facts
    FOR ALL
    USING (worker_id = (SELECT public.current_worker_id()))
    WITH CHECK (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY scf_self_all ON public.super_contribution_facts
    FOR ALL
    USING (worker_id = (SELECT public.current_worker_id()))
    WITH CHECK (worker_id = (SELECT public.current_worker_id()));

-- *_facts_history: read-only for the fact owner. Triggers (SECURITY DEFINER above)
-- write to history bypassing RLS — only path that can insert into these tables.
CREATE POLICY wcfh_self_select ON public.worker_classification_facts_history FOR SELECT
    USING (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY sfh_self_select ON public.shift_facts_history FOR SELECT
    USING (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY psfh_self_select ON public.payslip_facts_history FOR SELECT
    USING (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY bdfh_self_select ON public.bank_deposit_facts_history FOR SELECT
    USING (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY scfh_self_select ON public.super_contribution_facts_history FOR SELECT
    USING (worker_id = (SELECT public.current_worker_id()));

-- comparisons: own rows, SELECT and INSERT only. UPDATE/DELETE rejected by triggers above.
CREATE POLICY comparisons_self_select ON public.comparisons FOR SELECT
    USING (worker_id = (SELECT public.current_worker_id()));
CREATE POLICY comparisons_self_insert ON public.comparisons FOR INSERT
    WITH CHECK (worker_id = (SELECT public.current_worker_id()));
