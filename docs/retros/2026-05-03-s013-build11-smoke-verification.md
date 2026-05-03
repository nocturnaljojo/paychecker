# Session 013 — BUILD-11 smoke verification (+ chain through BUILD-12)

CAL-004 close-out for the four-commit BUILD-11 chain (`6dfd881` → `f8cc0d4` →
`ca8ad26` → `77ad656`) that shipped to production on 2026-05-02 without a
documented end-to-end smoke pass. Driven entirely via Playwright MCP +
Supabase MCP + Vercel MCP against the live deploy `dpl_4EgzLKMixserDVEUmHXCVf48rB9M`.
Worker `85e2e02f-…`, account `jo…@protonmail.com`.

Priority order executed: **E → C' → A → B → D.** Stop on first failure rule
held. No path failed.

## What shipped

Nothing. Verification-only session. No code, no migrations, no schema mutations
beyond a synthetic-doc INSERT/DELETE pair (Path E) and two real
`payslip_facts` updates routed through normal UI flows (Paths C', B).

## What passed

| Path | Verdict |
|---|---|
| E — extraction failure path | **PASS** via direct-API smoke. UI cannot reach `failExtraction` because `api/classify.ts` and `api/extract.ts` share the same `ANTHROPIC_SUPPORTED_MIME` set, so anything Anthropic rejects is caught at classify upstream. Synthetic `documents` row with `doc_type='payslip'` + non-existent `storage_path` + direct POST `/api/extract` exercised the path: `payslip_facts` row inserted with `status='failed'`, diagnostic info captured, Vercel `[extract] payslip_failed` log fired. Cleanup restored baseline. |
| C' — BUILD-12 inline edit Hours | **PASS.** `ordinary_hours` 42 → 38 on `pf 06de0a40-…`. Audit trigger fired, history row captured pre-change snapshot, UI re-rendered. |
| A — extraction auto-trigger | **PASS.** Fresh upload (`A_fresh_payslip.pdf`) → classify 200 + extract 200 → new `payslip_facts` row with `status='extracted'` and full v02 payload (employer + 3 earnings). Upload → extracted in ~20 s. |
| B — confirm flow | **PASS.** [Looks right] flipped `pf c32e029c-…` to `confirmed` with `confirmed_at` set. Integrity CHECK enforced server-side. Employer + earnings persisted through confirm. UI swapped to ConfirmedCard. |
| D — non-payslip unaffected | **PASS.** Screenshot uploaded → classify 200 with `detected_type='other'`. **No** `/api/extract` call in browser network or Vercel logs. **Zero** `payslip_facts` rows for the source_doc_id. BUILD-09 failure-guidance UI rendered. |

## Key findings (filed for follow-up; not actioned)

- **CAL-005 verification gap is real.** UI-smoke alone could not reach
  `failExtraction`. Same class as the 0017 silent-failure incident BUILD-11.5
  patched. Recommendation: future BUILD-N work that introduces a new failure
  mode ships with a documented direct-API smoke recipe alongside the UI smoke.
- **`payslip_facts_history` schema drift.** `log_psf_history` (Migration 0010)
  doesn't snapshot the columns added by Migration 0016 (`extraction_status`,
  `case_id`, `pay_date`, `extracted_at`, `extraction_jsonb`). History rows
  written today have those as NULL. Audit completeness is partial; not
  load-bearing for the worker UI but relevant for cross-version comparison or
  recovery.
- **Extract is not idempotent on failures.** Idempotency window is
  `status IN ('extracted','confirmed')`. Failures aren't included; a retry
  inserts another failure row. Path E retry produced two identical rows.
- **POL-014 candidate reproduced.** First Path E API call from browser hit
  `ERR_SSL_PROTOCOL_ERROR` while the server-side request still executed
  correctly. Norton/schannel territory; same shape as prior observations.
- **Edit-after-confirm reset behaviour deferred.** `pf c32e029c-…` is now
  available as a confirmed target if/when we want to verify the ADR-012
  reset-on-edit flow.

## What this confirms

The full ingestion + correction loop:

```
upload → classify → extract → DB write → UI render → [Edit] → DB update → UI
                                                  → [Looks right] → integrity CHECK → confirmed
                                                  → (failure path: synthetic only)
```

All five paths exercised end-to-end against production. BUILD-11 (+11.5 +11.6
+12) is verified.

## Pattern signal

The synthetic-doc + direct-API approach for Path E is a reusable pattern. It
combines:

- A synthetic `documents` row that bypasses classify but matches the
  post-classify shape extract expects.
- A direct authenticated POST from inside the live browser session (via
  `Clerk.session.getToken()` + `fetch` in `browser_evaluate`) so the same
  Clerk-JWT-→-third-party-auth flow runs as production.
- DB-only cleanup that restores baseline.

Worth keeping as the canonical recipe for any future endpoint whose failure
modes are upstream-of-UI.

## Next

ISS-023 (overbroad extend-failure fallback) + ISS-022 (compound-failure
logging + UX copy).
