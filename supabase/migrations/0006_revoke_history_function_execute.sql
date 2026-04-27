-- ============================================================
-- 0006: REVOKE EXECUTE on *_history() trigger functions
-- ============================================================
-- Supabase advisor rules 0028 / 0029 flagged these SECURITY DEFINER
-- functions as callable via /rest/v1/rpc/... by anon + authenticated
-- roles. They are trigger functions only — invoked by the trigger
-- machinery on UPDATE of the corresponding *_facts table — and were
-- never intended to be RPC-callable.
--
-- Defensive REVOKE matches principle of least privilege. Trigger
-- semantics are unaffected: SECURITY DEFINER + table-owner grants are
-- what permit trigger-driven invocation; REVOKE EXECUTE only blocks
-- direct callers.
--
-- Source: Sprint 2 verification (2026-04-27); s003h7 / Sprint 2.5.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.log_bdf_history() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_psf_history() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_scf_history() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_sf_history()  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_wcf_history() FROM anon, authenticated;
