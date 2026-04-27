-- ============================================================
-- 0007: REVOKE EXECUTE on *_history() trigger functions FROM PUBLIC
-- ============================================================
-- Sprint 2.5 (migration 0006) REVOKED FROM anon + authenticated.
-- That was a no-op because EXECUTE was granted via the PUBLIC
-- pseudo-role at function creation time (Postgres default).
-- REVOKE FROM PUBLIC is the canonical fix.
--
-- Source: INFRA-006 diagnosis (Sprint 2.5 retro).
-- Sprint 2.6 (2026-04-27).
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.log_bdf_history() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_psf_history() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_scf_history() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_sf_history()  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_wcf_history() FROM PUBLIC;

-- Trigger semantics unaffected: the trigger machinery invokes these
-- functions via the table owner's privileges, not via PUBLIC. INSERT
-- / UPDATE on the corresponding *_facts tables continues to write
-- *_facts_history rows as before.
