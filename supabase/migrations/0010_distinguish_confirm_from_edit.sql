-- Migration 0010 — Distinguish CONFIRM from EDIT in audit triggers (Sprint 6.6)
--
-- The Sprint 6.5 verification surfaced that the existing 5 BEFORE-UPDATE
-- audit triggers nullified `confirmed_at` on every UPDATE. Documented intent
-- in confirmation-flow.md is "edit unsets confirmation" — but the original
-- triggers conflated "any UPDATE" with "edit", which makes the
-- proposed→confirmed transition (the CONFIRM tap, itself an UPDATE)
-- impossible to persist.
--
-- Fix: rewrite all 5 trigger functions so they distinguish three cases by
-- looking at OLD.confirmed_at:
--
--   1. CONFIRM (or fill-and-confirm in one step):
--      OLD.confirmed_at IS NULL. The row is in proposed state. Trust whatever
--      NEW.confirmed_at is — the worker may be confirming, or may still be
--      filling fields with confirmed_at left NULL. No nullification.
--
--   2. EDIT after confirmation:
--      OLD.confirmed_at IS NOT NULL AND a data field changed. Per
--      confirmation-flow.md "edit unsets confirmation" — set
--      NEW.confirmed_at := NULL. Worker must re-confirm.
--
--   3. No-op UPDATE:
--      Nothing material changed (no data fields, confirmed_at same). Don't
--      log to history; don't modify confirmation. updated_at still bumps.
--
-- History rows are logged whenever a data field OR confirmed_at changed.
--
-- DEVIATION FROM SPRINT 6.6 BRIEF PSEUDOCODE:
-- The brief's pseudocode required `NOT data_fields_changed` for is_confirm.
-- That would block the legitimate "fill-the-NULLs-and-confirm-in-one-tap"
-- flow that Sprint 7's CONFIRM stage wants. Keying off OLD.confirmed_at
-- (rather than NEW vs OLD field equality) makes proposed-state rows
-- write-permissive and confirmed rows write-restrictive — which matches the
-- ADR-001 intent and the verification spec C2 ("UPDATE row to set
-- confirmed_at = now() + fill required fields in same statement").
--
-- Cross-refs: ADR-001, ADR-012 Rule 1.2, confirmation-flow.md.

BEGIN;

-- =========================================================================
-- worker_classification_facts (Layer 1)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.log_wcf_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  data_changed boolean;
  confirmation_changed boolean;
BEGIN
  data_changed := (
    NEW.worker_id          IS DISTINCT FROM OLD.worker_id
    OR NEW.employer_id     IS DISTINCT FROM OLD.employer_id
    OR NEW.award_id        IS DISTINCT FROM OLD.award_id
    OR NEW.classification_code IS DISTINCT FROM OLD.classification_code
    OR NEW.effective_from  IS DISTINCT FROM OLD.effective_from
    OR NEW.effective_to    IS DISTINCT FROM OLD.effective_to
    OR NEW.provenance      IS DISTINCT FROM OLD.provenance
    OR NEW.source_doc_id   IS DISTINCT FROM OLD.source_doc_id
  );
  confirmation_changed := (NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at);

  -- EDIT after CONFIRM: data field changed on a confirmed row → unconfirm.
  IF OLD.confirmed_at IS NOT NULL AND data_changed THEN
    NEW.confirmed_at := NULL;
    confirmation_changed := true;  -- ensure history captures the unconfirm
  END IF;

  -- Log to history only if anything material changed.
  IF data_changed OR confirmation_changed THEN
    INSERT INTO public.worker_classification_facts_history(
      fact_id, worker_id, employer_id, award_id, classification_code,
      effective_from, effective_to, provenance, confirmed_at, source_doc_id,
      change_type, changed_at
    ) VALUES (
      OLD.id, OLD.worker_id, OLD.employer_id, OLD.award_id, OLD.classification_code,
      OLD.effective_from, OLD.effective_to, OLD.provenance, OLD.confirmed_at, OLD.source_doc_id,
      TG_OP, now()
    );
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =========================================================================
-- shift_facts (Layer 2)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.log_sf_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  data_changed boolean;
  confirmation_changed boolean;
BEGIN
  data_changed := (
    NEW.worker_id        IS DISTINCT FROM OLD.worker_id
    OR NEW.employer_id   IS DISTINCT FROM OLD.employer_id
    OR NEW.started_at    IS DISTINCT FROM OLD.started_at
    OR NEW.ended_at      IS DISTINCT FROM OLD.ended_at
    OR NEW.break_minutes IS DISTINCT FROM OLD.break_minutes
    OR NEW.shift_type    IS DISTINCT FROM OLD.shift_type
    OR NEW.notes         IS DISTINCT FROM OLD.notes
    OR NEW.provenance    IS DISTINCT FROM OLD.provenance
    OR NEW.source_doc_id IS DISTINCT FROM OLD.source_doc_id
  );
  confirmation_changed := (NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at);

  IF OLD.confirmed_at IS NOT NULL AND data_changed THEN
    NEW.confirmed_at := NULL;
    confirmation_changed := true;
  END IF;

  IF data_changed OR confirmation_changed THEN
    INSERT INTO public.shift_facts_history(
      fact_id, worker_id, employer_id, started_at, ended_at, break_minutes,
      shift_type, notes, provenance, confirmed_at, source_doc_id,
      change_type, changed_at
    ) VALUES (
      OLD.id, OLD.worker_id, OLD.employer_id, OLD.started_at, OLD.ended_at, OLD.break_minutes,
      OLD.shift_type, OLD.notes, OLD.provenance, OLD.confirmed_at, OLD.source_doc_id,
      TG_OP, now()
    );
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =========================================================================
-- payslip_facts (Layer 3)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.log_psf_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  data_changed boolean;
  confirmation_changed boolean;
BEGIN
  data_changed := (
    NEW.worker_id            IS DISTINCT FROM OLD.worker_id
    OR NEW.employer_id       IS DISTINCT FROM OLD.employer_id
    OR NEW.period_start      IS DISTINCT FROM OLD.period_start
    OR NEW.period_end        IS DISTINCT FROM OLD.period_end
    OR NEW.gross_pay         IS DISTINCT FROM OLD.gross_pay
    OR NEW.net_pay           IS DISTINCT FROM OLD.net_pay
    OR NEW.ordinary_hours    IS DISTINCT FROM OLD.ordinary_hours
    OR NEW.ordinary_rate     IS DISTINCT FROM OLD.ordinary_rate
    OR NEW.ot_hours          IS DISTINCT FROM OLD.ot_hours
    OR NEW.ot_rate           IS DISTINCT FROM OLD.ot_rate
    OR NEW.allowances        IS DISTINCT FROM OLD.allowances
    OR NEW.deductions        IS DISTINCT FROM OLD.deductions
    OR NEW.tax               IS DISTINCT FROM OLD.tax
    OR NEW.super_amount      IS DISTINCT FROM OLD.super_amount
    OR NEW.super_destination IS DISTINCT FROM OLD.super_destination
    OR NEW.provenance        IS DISTINCT FROM OLD.provenance
    OR NEW.source_doc_id     IS DISTINCT FROM OLD.source_doc_id
  );
  confirmation_changed := (NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at);

  IF OLD.confirmed_at IS NOT NULL AND data_changed THEN
    NEW.confirmed_at := NULL;
    confirmation_changed := true;
  END IF;

  IF data_changed OR confirmation_changed THEN
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
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =========================================================================
-- bank_deposit_facts (Layer 3)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.log_bdf_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  data_changed boolean;
  confirmation_changed boolean;
BEGIN
  data_changed := (
    NEW.worker_id        IS DISTINCT FROM OLD.worker_id
    OR NEW.deposited_at  IS DISTINCT FROM OLD.deposited_at
    OR NEW.amount        IS DISTINCT FROM OLD.amount
    OR NEW.narration     IS DISTINCT FROM OLD.narration
    OR NEW.provenance    IS DISTINCT FROM OLD.provenance
    OR NEW.source_doc_id IS DISTINCT FROM OLD.source_doc_id
  );
  confirmation_changed := (NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at);

  IF OLD.confirmed_at IS NOT NULL AND data_changed THEN
    NEW.confirmed_at := NULL;
    confirmation_changed := true;
  END IF;

  IF data_changed OR confirmation_changed THEN
    INSERT INTO public.bank_deposit_facts_history(
      fact_id, worker_id, deposited_at, amount, narration,
      provenance, confirmed_at, source_doc_id,
      change_type, changed_at
    ) VALUES (
      OLD.id, OLD.worker_id, OLD.deposited_at, OLD.amount, OLD.narration,
      OLD.provenance, OLD.confirmed_at, OLD.source_doc_id,
      TG_OP, now()
    );
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =========================================================================
-- super_contribution_facts (Layer 3)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.log_scf_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  data_changed boolean;
  confirmation_changed boolean;
BEGIN
  data_changed := (
    NEW.worker_id         IS DISTINCT FROM OLD.worker_id
    OR NEW.received_at    IS DISTINCT FROM OLD.received_at
    OR NEW.amount         IS DISTINCT FROM OLD.amount
    OR NEW.source_employer IS DISTINCT FROM OLD.source_employer
    OR NEW.provenance     IS DISTINCT FROM OLD.provenance
    OR NEW.source_doc_id  IS DISTINCT FROM OLD.source_doc_id
  );
  confirmation_changed := (NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at);

  IF OLD.confirmed_at IS NOT NULL AND data_changed THEN
    NEW.confirmed_at := NULL;
    confirmation_changed := true;
  END IF;

  IF data_changed OR confirmation_changed THEN
    INSERT INTO public.super_contribution_facts_history(
      fact_id, worker_id, received_at, amount, source_employer,
      provenance, confirmed_at, source_doc_id,
      change_type, changed_at
    ) VALUES (
      OLD.id, OLD.worker_id, OLD.received_at, OLD.amount, OLD.source_employer,
      OLD.provenance, OLD.confirmed_at, OLD.source_doc_id,
      TG_OP, now()
    );
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMIT;
