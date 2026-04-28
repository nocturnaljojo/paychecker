-- Migration 0009 — Proposed-state schema support (Sprint 6.5)
--
-- Resolves a schema gap surfaced by Sprint 7 pre-flight: ADR-012 Rule 1.2 +
-- Sprint 6 RESUME requirement say a proposed-state row must persist on the
-- worker's first INPUT touch, but the *_facts tables had NOT NULL on domain
-- fields the worker may not have entered yet (classification_code,
-- effective_from, period_start, etc.).
--
-- Fix: relax NOT NULL on those fields, then add a CHECK constraint that
-- enforces full integrity once the row is confirmed (confirmed_at IS NOT NULL).
-- Proposed-state rows (confirmed_at IS NULL) can be partial; confirmed rows
-- cannot.
--
-- Same treatment applied to the matching *_history tables so the BEFORE-UPDATE
-- trigger can copy partial proposed-state rows into history without violating
-- NOT NULL there. History tables get no CHECK — they are insert-only audit
-- trail; integrity is enforced upstream on the parent.
--
-- Out of scope (kept NOT NULL even for proposed state):
--   id, worker_id, employer_id (where present), provenance, created_at,
--   updated_at — these are always known at first INPUT.
--
-- Cross-refs: docs/architecture/decisions.md ADR-001, ADR-012;
--             docs/architecture/confirmation-flow.md;
--             tasks/today-2026-04-28.md Sprint 7 hard requirements.

BEGIN;

-- =========================================================================
-- worker_classification_facts (Layer 1)
-- =========================================================================
ALTER TABLE public.worker_classification_facts
  ALTER COLUMN award_id DROP NOT NULL,
  ALTER COLUMN classification_code DROP NOT NULL,
  ALTER COLUMN effective_from DROP NOT NULL;

ALTER TABLE public.worker_classification_facts
  ADD CONSTRAINT worker_classification_facts_confirmed_integrity
  CHECK (
    confirmed_at IS NULL OR (
      award_id IS NOT NULL
      AND classification_code IS NOT NULL
      AND effective_from IS NOT NULL
    )
  );

ALTER TABLE public.worker_classification_facts_history
  ALTER COLUMN award_id DROP NOT NULL,
  ALTER COLUMN classification_code DROP NOT NULL,
  ALTER COLUMN effective_from DROP NOT NULL;

-- =========================================================================
-- shift_facts (Layer 2)
-- (break_minutes has DEFAULT 0 — leave NOT NULL; INSERT without it succeeds.)
-- =========================================================================
ALTER TABLE public.shift_facts
  ALTER COLUMN started_at DROP NOT NULL,
  ALTER COLUMN ended_at DROP NOT NULL,
  ALTER COLUMN shift_type DROP NOT NULL;

ALTER TABLE public.shift_facts
  ADD CONSTRAINT shift_facts_confirmed_integrity
  CHECK (
    confirmed_at IS NULL OR (
      started_at IS NOT NULL
      AND ended_at IS NOT NULL
      AND shift_type IS NOT NULL
    )
  );

ALTER TABLE public.shift_facts_history
  ALTER COLUMN started_at DROP NOT NULL,
  ALTER COLUMN ended_at DROP NOT NULL,
  ALTER COLUMN shift_type DROP NOT NULL;

-- =========================================================================
-- payslip_facts (Layer 3)
-- =========================================================================
ALTER TABLE public.payslip_facts
  ALTER COLUMN period_start DROP NOT NULL,
  ALTER COLUMN period_end DROP NOT NULL,
  ALTER COLUMN gross_pay DROP NOT NULL,
  ALTER COLUMN net_pay DROP NOT NULL;

ALTER TABLE public.payslip_facts
  ADD CONSTRAINT payslip_facts_confirmed_integrity
  CHECK (
    confirmed_at IS NULL OR (
      period_start IS NOT NULL
      AND period_end IS NOT NULL
      AND gross_pay IS NOT NULL
      AND net_pay IS NOT NULL
    )
  );

ALTER TABLE public.payslip_facts_history
  ALTER COLUMN period_start DROP NOT NULL,
  ALTER COLUMN period_end DROP NOT NULL,
  ALTER COLUMN gross_pay DROP NOT NULL,
  ALTER COLUMN net_pay DROP NOT NULL;

-- =========================================================================
-- bank_deposit_facts (Layer 3)
-- =========================================================================
ALTER TABLE public.bank_deposit_facts
  ALTER COLUMN deposited_at DROP NOT NULL,
  ALTER COLUMN amount DROP NOT NULL;

ALTER TABLE public.bank_deposit_facts
  ADD CONSTRAINT bank_deposit_facts_confirmed_integrity
  CHECK (
    confirmed_at IS NULL OR (
      deposited_at IS NOT NULL
      AND amount IS NOT NULL
    )
  );

ALTER TABLE public.bank_deposit_facts_history
  ALTER COLUMN deposited_at DROP NOT NULL,
  ALTER COLUMN amount DROP NOT NULL;

-- =========================================================================
-- super_contribution_facts (Layer 3)
-- =========================================================================
ALTER TABLE public.super_contribution_facts
  ALTER COLUMN received_at DROP NOT NULL,
  ALTER COLUMN amount DROP NOT NULL;

ALTER TABLE public.super_contribution_facts
  ADD CONSTRAINT super_contribution_facts_confirmed_integrity
  CHECK (
    confirmed_at IS NULL OR (
      received_at IS NOT NULL
      AND amount IS NOT NULL
    )
  );

ALTER TABLE public.super_contribution_facts_history
  ALTER COLUMN received_at DROP NOT NULL,
  ALTER COLUMN amount DROP NOT NULL;

COMMIT;
