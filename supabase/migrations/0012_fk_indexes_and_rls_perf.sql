-- ============================================================
-- Migration 0012: FK indexes + RLS init-plan perf rewrites
-- Sprint POL-002-PREP (2026-04-29). DRAFT — apply tomorrow morning
-- via Sprint POL-002-APPLY.
--
-- Closes pre-existing tech debt surfaced by Sprint A5's advisor scan:
--   - ISS-002: 9 unindexed_foreign_keys on *_facts tables
--   - ISS-003: 8 auth_rls_initplan WARN entries on early policies
--             (STATE-PRJ-issues.md said "7"; the live advisor output
--              from Sprint A5 listed 8 — this migration fixes all 8)
--
-- This is mechanical perf work. NO schema changes. NO functional
-- behaviour changes:
--   - Indexes are accelerators (cover existing FK constraints).
--   - RLS rewrites wrap `auth.jwt()` in `(SELECT ...)` so the planner
--     caches the call once per statement instead of per row. The
--     predicate result is identical for any given row.
--
-- All policies preserve their original NAME, COMMAND, and (where
-- present) USING/WITH CHECK shape. Only the implementation changes.
--
-- Reversibility: ROLLBACK block at end has verbatim originals from
-- migrations 0002 + 0005, captured live via pg_policy on 2026-04-29.
-- ============================================================


-- ============================================================
-- PART 1: FK covering indexes (ISS-002)
-- ============================================================

-- bank_deposit_facts.source_doc_id (nullable — partial index keeps small)
CREATE INDEX bank_deposit_facts_source_doc_id_idx
    ON public.bank_deposit_facts (source_doc_id)
    WHERE source_doc_id IS NOT NULL;

-- payslip_facts.employer_id (NOT NULL — full index)
CREATE INDEX payslip_facts_employer_id_idx
    ON public.payslip_facts (employer_id);

-- payslip_facts.source_doc_id (nullable — partial)
CREATE INDEX payslip_facts_source_doc_id_idx
    ON public.payslip_facts (source_doc_id)
    WHERE source_doc_id IS NOT NULL;

-- shift_facts.employer_id (NOT NULL — full)
CREATE INDEX shift_facts_employer_id_idx
    ON public.shift_facts (employer_id);

-- shift_facts.source_doc_id (nullable — partial)
CREATE INDEX shift_facts_source_doc_id_idx
    ON public.shift_facts (source_doc_id)
    WHERE source_doc_id IS NOT NULL;

-- super_contribution_facts.source_doc_id (nullable — partial)
CREATE INDEX super_contribution_facts_source_doc_id_idx
    ON public.super_contribution_facts (source_doc_id)
    WHERE source_doc_id IS NOT NULL;

-- worker_classification_facts.award_id (nullable since 0009 — partial)
CREATE INDEX worker_classification_facts_award_id_idx
    ON public.worker_classification_facts (award_id)
    WHERE award_id IS NOT NULL;

-- worker_classification_facts.employer_id (NOT NULL — full)
CREATE INDEX worker_classification_facts_employer_id_idx
    ON public.worker_classification_facts (employer_id);

-- worker_classification_facts.source_doc_id (nullable — partial)
CREATE INDEX worker_classification_facts_source_doc_id_idx
    ON public.worker_classification_facts (source_doc_id)
    WHERE source_doc_id IS NOT NULL;


-- ============================================================
-- PART 2: RLS init-plan perf rewrites (ISS-003)
--
-- Pattern: `auth.jwt() ->> 'sub'` → `(SELECT auth.jwt() ->> 'sub')`
-- so the planner caches the JWT lookup once per statement.
-- Predicate result is identical for any given row.
--
-- Postgres has no ALTER POLICY for the body — must DROP + CREATE.
-- Original NAME and COMMAND preserved; only the expression changes.
-- ============================================================

-- ----- 2.1 workers (3 policies) -----

DROP POLICY workers_self_select ON public.workers;
CREATE POLICY workers_self_select ON public.workers FOR SELECT
    USING (clerk_user_id = (SELECT auth.jwt() ->> 'sub'));

DROP POLICY workers_self_insert ON public.workers;
CREATE POLICY workers_self_insert ON public.workers FOR INSERT
    WITH CHECK (clerk_user_id = (SELECT auth.jwt() ->> 'sub'));

DROP POLICY workers_self_update ON public.workers;
CREATE POLICY workers_self_update ON public.workers FOR UPDATE
    USING (clerk_user_id = (SELECT auth.jwt() ->> 'sub'))
    WITH CHECK (clerk_user_id = (SELECT auth.jwt() ->> 'sub'));

-- ----- 2.2 employers (2 policies) -----

DROP POLICY employers_select_signed_in ON public.employers;
CREATE POLICY employers_select_signed_in ON public.employers FOR SELECT
    USING ((SELECT auth.jwt() ->> 'sub') IS NOT NULL);

DROP POLICY employers_insert_signed_in ON public.employers;
CREATE POLICY employers_insert_signed_in ON public.employers FOR INSERT
    WITH CHECK ((SELECT auth.jwt() ->> 'sub') IS NOT NULL);

-- ----- 2.3 awards (1 policy) -----

DROP POLICY awards_select_signed_in ON public.awards;
CREATE POLICY awards_select_signed_in ON public.awards FOR SELECT
    USING ((SELECT auth.jwt() ->> 'sub') IS NOT NULL);

-- ----- 2.4 award_rates (1 policy) -----

DROP POLICY award_rates_select_signed_in ON public.award_rates;
CREATE POLICY award_rates_select_signed_in ON public.award_rates FOR SELECT
    USING ((SELECT auth.jwt() ->> 'sub') IS NOT NULL);

-- ----- 2.5 award_allowances (1 policy) -----

DROP POLICY award_allowances_select_signed_in ON public.award_allowances;
CREATE POLICY award_allowances_select_signed_in ON public.award_allowances FOR SELECT
    USING ((SELECT auth.jwt() ->> 'sub') IS NOT NULL);


-- ============================================================
-- ROLLBACK (commented — apply manually if needed)
--
-- Verbatim original policy bodies as they existed in production on
-- 2026-04-29 (captured via pg_policy before this migration ran).
-- These originals are functionally identical to the rewrites above;
-- they only differ in the planner's caching behaviour. Restoring
-- them is safe but reintroduces the auth_rls_initplan advisor.
-- ============================================================

-- -- Drop FK indexes (Part 1):
-- DROP INDEX public.worker_classification_facts_source_doc_id_idx;
-- DROP INDEX public.worker_classification_facts_employer_id_idx;
-- DROP INDEX public.worker_classification_facts_award_id_idx;
-- DROP INDEX public.super_contribution_facts_source_doc_id_idx;
-- DROP INDEX public.shift_facts_source_doc_id_idx;
-- DROP INDEX public.shift_facts_employer_id_idx;
-- DROP INDEX public.payslip_facts_source_doc_id_idx;
-- DROP INDEX public.payslip_facts_employer_id_idx;
-- DROP INDEX public.bank_deposit_facts_source_doc_id_idx;
--
-- -- Restore original RLS policies (Part 2 — verbatim from production):
--
-- DROP POLICY workers_self_select ON public.workers;
-- CREATE POLICY workers_self_select ON public.workers FOR SELECT
--     USING (clerk_user_id = (auth.jwt() ->> 'sub'));
--
-- DROP POLICY workers_self_insert ON public.workers;
-- CREATE POLICY workers_self_insert ON public.workers FOR INSERT
--     WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'));
--
-- DROP POLICY workers_self_update ON public.workers;
-- CREATE POLICY workers_self_update ON public.workers FOR UPDATE
--     USING (clerk_user_id = (auth.jwt() ->> 'sub'))
--     WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'));
--
-- DROP POLICY employers_select_signed_in ON public.employers;
-- CREATE POLICY employers_select_signed_in ON public.employers FOR SELECT
--     USING ((auth.jwt() ->> 'sub') IS NOT NULL);
--
-- DROP POLICY employers_insert_signed_in ON public.employers;
-- CREATE POLICY employers_insert_signed_in ON public.employers FOR INSERT
--     WITH CHECK ((auth.jwt() ->> 'sub') IS NOT NULL);
--
-- DROP POLICY awards_select_signed_in ON public.awards;
-- CREATE POLICY awards_select_signed_in ON public.awards FOR SELECT
--     USING ((auth.jwt() ->> 'sub') IS NOT NULL);
--
-- DROP POLICY award_rates_select_signed_in ON public.award_rates;
-- CREATE POLICY award_rates_select_signed_in ON public.award_rates FOR SELECT
--     USING ((auth.jwt() ->> 'sub') IS NOT NULL);
--
-- DROP POLICY award_allowances_select_signed_in ON public.award_allowances;
-- CREATE POLICY award_allowances_select_signed_in ON public.award_allowances FOR SELECT
--     USING ((auth.jwt() ->> 'sub') IS NOT NULL);
