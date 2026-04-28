-- ============================================================
-- 0008: Extend allowance unit enum + seed Sprint 2 deferred rows
-- ============================================================
-- ADR-011 (Sprint 5.5) — extends `unit` enum with 'km' and 'event'
-- to support vehicle and meal allowances per MA000074 cl 17.3.
--
-- Sprint 2 (migration 0005) left three allowance rows unseeded:
--   - Cold Work middle band: amount [SOURCE NEEDED] in v01
--     (now known: $1.67/hr per cl 17.2(c) — verbatim live HTML).
--   - Meal allowance: amount [SOURCE NEEDED] + unit 'event' didn't
--     exist (now $18.38, unit 'event' added).
--   - Vehicle allowance: amount [SOURCE NEEDED] + unit 'km' didn't
--     exist (now $0.98, unit 'km' added).
--
-- v02 (Sprints 4 + 5) closed the research gaps; ADR-011 closed the
-- schema gap. Sprint 2.1 ships the data — atomic ALTER + INSERT.
--
-- Source: docs/research/awards-ma000074-v02.md §17.2(c), §17.3.
-- All amounts verbatim from FWC consolidated text (live HTML cross-
-- validated; exposure draft for clause structure).
--
-- Trigger conditions for 'event'-unit allowances live in calc-engine
-- code keyed off the `code` column (per ADR-011 + calc-rules-v01.md
-- Rule 7), NOT in schema. Schema records the unit dimension only;
-- the engine knows when to fire MEAL_OVERTIME.
-- ============================================================


-- ----- Part A: extend unit enum (per ADR-011) -----

ALTER TABLE public.award_allowances
    DROP CONSTRAINT award_allowances_unit_check;

ALTER TABLE public.award_allowances
    ADD CONSTRAINT award_allowances_unit_check
    CHECK (unit IN ('hour', 'week', 'shift', 'km', 'event'));


-- ----- Part B: seed 3 deferred allowance rows -----

WITH a AS (SELECT id FROM public.awards WHERE award_code = 'MA000074')
INSERT INTO public.award_allowances (
    award_id, code, description, amount, unit, purpose, fwc_clause, effective_from
)
VALUES
    -- Cold work middle band — additive, per cl 17.2(c).
    -- Closes Sprint 2 gap: bookend bands were seeded in 0005;
    -- middle band was [SOURCE NEEDED] then, now confirmed.
    ((SELECT id FROM a),
     'COLD_WORK_BAND_MID',
     'Cold work allowance — temperature −18.0°C to −23.3°C',
     1.67, 'hour', 'additive', '17.2(c)', DATE '2025-07-01'),

    -- Meal allowance — additive event-triggered, per cl 17.3(a).
    -- Trigger: ≥1.5 hr OT after ordinary hours, employer didn't
    -- provide a meal. Trigger logic encoded in calc-engine code
    -- keyed off `code = 'MEAL_OVERTIME'`, not in schema.
    ((SELECT id FROM a),
     'MEAL_OVERTIME',
     'Meal allowance (≥1.5 hr OT after ordinary, no employer meal)',
     18.38, 'event', 'additive', '17.3(a)', DATE '2025-07-01'),

    -- Vehicle allowance — additive per-km, per cl 17.3(b).
    -- Trigger: required to use own vehicle during working time.
    -- Worker logs km as a Layer 2 fact; calc engine multiplies.
    ((SELECT id FROM a),
     'VEHICLE_KM',
     'Vehicle allowance (required to use own vehicle in working time)',
     0.98, 'km', 'additive', '17.3(b)', DATE '2025-07-01')
ON CONFLICT (award_id, code, effective_from) DO NOTHING;
