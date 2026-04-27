-- ============================================================
-- 0005: award_allowances table + MA000074 reference data seed
-- ============================================================
-- ADR-010 (Sprint 1.75) — new award_allowances table, parallel to award_rates.
-- ADR-009 (Sprint 1.5)  — purpose enum on allowances:
--                          all_purpose | additive | penalty_modifier | one_off.
-- Sprint 1 research     — docs/research/awards-ma000074-v01.md (~70%, v01).
--
-- Seed scope is Apete-shaped: classification rates Levels 1-6 (weekly + hourly
-- rows, both FWC/FWO-published primary forms), plus the four firmly-sourced
-- allowances (Leading Hand 1-19 / 20+, First Aid, Cold Work bookend bands).
-- [SOURCE NEEDED] gaps from the research note §6 are NOT seeded — partial
-- coverage is honest; fake coverage is worker-safety risk (R-005).
-- ============================================================


-- ----- Part A: award_allowances table (per ADR-010) -----

CREATE TABLE public.award_allowances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    award_id uuid NOT NULL REFERENCES public.awards(id) ON DELETE RESTRICT,
    code text NOT NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    unit text NOT NULL CHECK (unit IN ('hour', 'week', 'shift')),
    purpose text NOT NULL DEFAULT 'additive' CHECK (purpose IN ('all_purpose', 'additive', 'penalty_modifier', 'one_off')),
    fwc_clause text NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (award_id, code, effective_from)
);
COMMENT ON TABLE public.award_allowances IS
    'Per-award allowance reference data. purpose column per ADR-009; table parallel to award_rates per ADR-010.';

CREATE INDEX award_allowances_award_period_idx
    ON public.award_allowances (award_id, effective_from, effective_to);

ALTER TABLE public.award_allowances ENABLE ROW LEVEL SECURITY;

-- RLS mirrors award_rates pattern from migration 0002:
-- read-only for any signed-in worker; writes via service role / migrations only.
CREATE POLICY award_allowances_select_signed_in ON public.award_allowances FOR SELECT
    USING ((auth.jwt() ->> 'sub') IS NOT NULL);


-- ----- Part B: award_rates idempotency constraint -----
-- Existing award_rates table (migration 0002) has no UNIQUE constraint.
-- Adding one so this seed and future seed updates can use ON CONFLICT
-- DO NOTHING safely. Tuple is the natural key for a rate row.

ALTER TABLE public.award_rates
    ADD CONSTRAINT award_rates_unique_rate_per_period
    UNIQUE (award_id, classification_code, pay_basis, effective_from);


-- ----- Part C: awards row for MA000074 -----
-- Source: docs/research/awards-ma000074-v01.md §1.
-- Consolidated to 2026-01-23; FWC variations PR794768 / PR795698 most recent.

INSERT INTO public.awards (
    award_code, title, fwc_consolidation_date, fwc_source_url, effective_from
)
VALUES (
    'MA000074',
    'Poultry Processing Award 2020',
    DATE '2026-01-23',
    'https://awards.fairwork.gov.au/MA000074.html',
    DATE '2020-01-01'
)
ON CONFLICT (award_code) DO NOTHING;


-- ----- Part D: award_rates seed for MA000074 Levels 1-6 -----
-- Source: research note §2, clause 15.1, varied by PR786612, effective 2025-07-01.
-- Storing both weekly (FWC-published primary) and hourly (FWO-published; verified
-- equal to weekly ÷ 38 per cl 13.1(b) ordinary hours of work). Both rows are
-- independently authoritative; calc engine reads whichever pay_basis the calc
-- context needs without runtime derivation.

WITH a AS (SELECT id FROM public.awards WHERE award_code = 'MA000074')
INSERT INTO public.award_rates (
    award_id, classification_code, pay_basis, amount, effective_from
)
VALUES
    ((SELECT id FROM a), 'LEVEL_1', 'weekly',  952.20, DATE '2025-07-01'),
    ((SELECT id FROM a), 'LEVEL_2', 'weekly',  977.70, DATE '2025-07-01'),
    ((SELECT id FROM a), 'LEVEL_3', 'weekly',  990.60, DATE '2025-07-01'),
    ((SELECT id FROM a), 'LEVEL_4', 'weekly', 1003.50, DATE '2025-07-01'),
    ((SELECT id FROM a), 'LEVEL_5', 'weekly', 1016.00, DATE '2025-07-01'),
    ((SELECT id FROM a), 'LEVEL_6', 'weekly', 1042.20, DATE '2025-07-01'),
    ((SELECT id FROM a), 'LEVEL_1', 'hourly',   25.06, DATE '2025-07-01'),
    ((SELECT id FROM a), 'LEVEL_2', 'hourly',   25.73, DATE '2025-07-01'),
    ((SELECT id FROM a), 'LEVEL_3', 'hourly',   26.07, DATE '2025-07-01'),
    ((SELECT id FROM a), 'LEVEL_4', 'hourly',   26.41, DATE '2025-07-01'),
    ((SELECT id FROM a), 'LEVEL_5', 'hourly',   26.74, DATE '2025-07-01'),
    ((SELECT id FROM a), 'LEVEL_6', 'hourly',   27.43, DATE '2025-07-01')
ON CONFLICT (award_id, classification_code, pay_basis, effective_from) DO NOTHING;


-- ----- Part E: award_allowances seed for MA000074 -----
-- Source: research note §3.
-- ONLY firmly-sourced allowances. [SOURCE NEEDED] gaps from §6 are NOT seeded:
--   - Cold work intermediate temperature bands (bookends only here)
--   - Meal allowance (clause 17.2 sub-clause; amount not in v01 fetch)
--   - Vehicle allowance (clause 17.2 sub-clause; amount not in v01 fetch)
-- A v02 research pass closes those gaps.

WITH a AS (SELECT id FROM public.awards WHERE award_code = 'MA000074')
INSERT INTO public.award_allowances (
    award_id, code, description, amount, unit, purpose, fwc_clause, effective_from
)
VALUES
    -- Leading hand allowance — all-purpose (folds into hourly rate per cl 17.2(a)).
    ((SELECT id FROM a),
     'LEADING_HAND_1_19',
     'Leading hand allowance — in charge of 1-19 employees',
     39.11, 'week', 'all_purpose', '17.2(b)(i)', DATE '2025-07-01'),
    ((SELECT id FROM a),
     'LEADING_HAND_20_PLUS',
     'Leading hand allowance — in charge of 20 or more employees',
     65.35, 'week', 'all_purpose', '17.2(b)(i)', DATE '2025-07-01'),

    -- First aid allowance — additive (paid on top; not folded).
    -- Conditions per cl 17.2(d): trained + qualified + employer-appointed.
    ((SELECT id FROM a),
     'FIRST_AID',
     'First aid allowance (trained, qualified, employer-appointed)',
     21.41, 'week', 'additive', '17.2(d)', DATE '2025-07-01'),

    -- Cold work allowance — bookend bands only.
    -- Intermediate temperature bands [SOURCE NEEDED] per research §6.
    ((SELECT id FROM a),
     'COLD_WORK_BAND_LOW',
     'Cold work allowance — temperature −15.6°C to −18.0°C',
     0.95, 'hour', 'additive', '17.2(c)', DATE '2025-07-01'),
    ((SELECT id FROM a),
     'COLD_WORK_BAND_HIGH',
     'Cold work allowance — temperature below −23.3°C',
     2.62, 'hour', 'additive', '17.2(c)', DATE '2025-07-01')
ON CONFLICT (award_id, code, effective_from) DO NOTHING;
