# Session 012A.1 — RLS soft-delete fix (ISS-016)

Hotfix session continuing 012A. Closes ISS-016 — the bug discovered during 012A's manual smoke test where `/cases` Delete clicks fired the modal but never persisted (`deleted_at` stayed NULL; every PATCH returned 401 with Postgres logging `new row violates row-level security policy for table "document_cases"`).

The 012A diagnostic addendum (`docs/retros/2026-05-02-s012a-soft-delete-cases.md` → "## Post-close diagnostic") proposed migration 0019 (wrap `current_worker_id()` in `(SELECT …)`) as the fix. **That theory was empirically falsified in 012A.1.** Migration 0019 is correct as defensive convention alignment but it is not the load-bearing fix. Migration 0020 (drop `deleted_at IS NULL` from the SELECT policy USING + filter at the frontend) is.

## Commit chain

| SHA | Subject | Role |
|---|---|---|
| `51195f3` | `chore(claude-md): apply CAL-003 — RLS verification requires quoting both qual AND with_check` | First application of CAL-003 |
| `08fc6b8` | `chore(rls): align document_cases policies with auth_rls_initplan convention (012A.1 step 1 of 2 — defensive, not the load-bearing fix; see 0020)` | Migration 0019 — defensive alignment |
| `db066b3` | `fix(rls): drop deleted_at filter from document_cases SELECT policy + filter at frontend (012A.1 — the load-bearing soft-delete fix; ISS-016)` | Migration 0020 + 3 frontend files — load-bearing fix |
| _(this commit)_ | `chore(retro): Session 012A.1 close-out` | Retro + LATEST flip + ISS-016 FIXED + CAL-003 APPLIED + CAL-004 PENDING + 012A correction append |

Builds on the 012A chain: `6ef2d40` (guardrails), `f4464aa` (ISS-015), `93c66b0` (feature), `2f3b266` (retro v1), `03d4083` (retro close-out), `0eaa326` (hygiene), `a6b1daa` (handover).

## What shipped

### Migration 0019 (defensive)
Single new file: `supabase/migrations/0019_document_cases_rls_initplan_fix.sql`. Two `ALTER POLICY` statements wrap `current_worker_id()` in `(SELECT …)` for both `document_cases_update_own.qual` and `.with_check`, and for `document_cases_select_own.qual`. Closes the `auth_rls_initplan` advisor lint on this table; aligns with every other public.* and storage.* policy in the project. **Does not fix the soft-delete bug** — see "Falsification" below.

### Migration 0020 (load-bearing)
Single new file: `supabase/migrations/0020_document_cases_select_policy_drop_deleted_filter.sql`. One `ALTER POLICY` statement: drops the `deleted_at IS NULL` clause from `document_cases_select_own.qual`. Post-migration, the SELECT policy is pure ownership (`worker_id = (SELECT current_worker_id())`) with no `deleted_at` filter.

### Frontend filter changes (3 files)
Convention from 0020 onwards: **every list query against `document_cases` excludes soft-deleted rows at the application layer, no exceptions, even where the filter is logically redundant.**

- `src/features/dashboard/useWorkerCases.ts:96` — `.is('deleted_at', null)` added to the dashboard "Your papers" list query.
- `src/features/upload/useCaseFeedback.ts:62` — `.is('deleted_at', null)` added to the worker-wide ready-count query (drives the "X papers ready" header).
- `src/features/upload/useCaseFeedback.ts:115` — `.is('deleted_at', null)` added to the "cases linked to a freshly-uploaded batch" query. The case_ids in this query come from `documents.case_id` rows the worker just uploaded, so filtering is logically redundant in this call site — included anyway for principle-consistency.
- `src/features/cases/useAllCases.ts:73-77` — `.is('deleted_at', null)` already present from 012A. Comment rewritten to reflect that the filter is now load-bearing (not "belt-and-suspenders").
- `src/features/cases/useAllCases.ts:171-178` — `softDeleteCase` comment rewritten: "DB SELECT policy now filters deleted_at IS NULL" was correct under 0018 but wrong after 0020. Now: "the row is hidden from refetches by the application-layer filter at the SELECT chain above."

## Falsification of the 012A InitPlan / wrap theory

The 012A diagnostic addendum's mechanical theory (bare-vs-wrapped + InitPlan + multi-phase RLS evaluation under STABLE-not-IMMUTABLE) was a plausible-sounding explanation built from policy-text comparison (`document_cases` bare vs `payslip_facts` wrapped) and Supabase advisor lint reasoning. It was empirically falsified in 012A.1 by two tests:

**Test 1 — Real PostgREST via Playwright (proves it's not an MCP harness artefact):**
After migration 0019 applied (wrap landed structurally — verified via `pg_get_expr(polqual)` and `pg_get_expr(polwithcheck)`), Jovi's signed-in browser (worker A, Protonmail, Clerk JWT, real production session) clicked Delete on `/cases`. Network log: `PATCH /rest/v1/document_cases?case_id=eq.67ae627b-...` → **401**. Postgres log at the matching timestamp `1777714342005000`: **`ERROR: new row violates row-level security policy for table "document_cases"`** — the same error class as before the wrap. Migration 0019 was in effect; the bug still happened.

**Test 2 — Single ALL policy mirroring `psf_self_all` (rules out the multi-policy-split theory):**
Inside a transaction, dropped the separate SELECT + UPDATE policies on `document_cases` and replaced with one `FOR ALL` policy whose USING was `(worker_id = (SELECT current_worker_id())) AND (deleted_at IS NULL)` and WITH CHECK was `(worker_id = (SELECT current_worker_id()))` — structurally identical to `payslip_facts.psf_self_all` plus the soft-delete clause. Re-ran the soft-delete UPDATE under simulated worker-A JWT. **Same `42501: new row violates row-level security policy` error.** ROLLBACK. Multi-policy split was not the cause.

**Test 2.5 — The decisive minimal change:**
Inside another transaction, kept the production policy shape (separate SELECT + UPDATE policies, both wrapped per 0019) but altered ONLY the SELECT policy's USING to drop the `deleted_at IS NULL` clause. Ran the same soft-delete UPDATE (with `RETURNING`). **PASS** — `case_id, is_deleted: true` returned. ROLLBACK.

**Conclusion:** the SELECT policy's `deleted_at IS NULL` clause was being checked against the post-UPDATE row. When the UPDATE mutates `deleted_at` to a non-null value, the new row no longer satisfies SELECT-USING. Postgres aborts with the standard `42501` error message — which uses identical text for WITH CHECK violations and for SELECT-USING-failures-on-new-row in this configuration, which is what made the 012A addendum's WITH CHECK / multi-phase theory look plausible in isolation.

The wrap (migration 0019) was correct convention but not load-bearing here. The actual Postgres mechanism: when an UPDATE mutates a column referenced in a SELECT policy's USING expression, the post-UPDATE row is checked against that USING, and a failure aborts the UPDATE rather than silently filtering it. (Per Postgres' "rows visible after modification" semantics — particularly tightened on UPDATE...RETURNING, and PostgREST's PATCH adds a default `RETURNING` even when the JS client doesn't call `.select()`.)

This pattern was new to me. CAL-004 captures the rule we'll apply next time.

## Acceptance criteria — all 7 PASS

| # | Tag | Criterion | Result |
|---|---|---|---|
| 1 | `[Supabase-MCP-runnable]` | Migration applies, `pg_policies` confirms SELECT.qual is pure ownership | PASS — `(worker_id = ( SELECT current_worker_id() AS current_worker_id))`, no `deleted_at` clause |
| 2 | `[Supabase-MCP-runnable]` | UPDATE policy unchanged sanity | PASS — `qual` and `with_check` both `(worker_id = ( SELECT current_worker_id() AS current_worker_id))` |
| 3 | `[Playwright-runnable]` | Sign-in → /cases → trash → Delete → row hidden + refresh persists + DB confirms `deleted_at IS NOT NULL` + PATCH 204 | PASS — "2 papers ready" → "1 paper ready", refresh persists, DB `deleted_at = 2026-05-02 09:54:48.046+00`, network: PATCH 204 (request #26 vs the earlier failing 401 at request #21 from Test 1) |
| 4 | `[Supabase-MCP-runnable]` | Cross-tenant isolation: B's JWT cannot UPDATE A's row | PASS — 0 rows updated under B's JWT |
| 5 | `[Supabase-MCP-runnable]` | Ownership-transfer prevention: A cannot UPDATE setting `worker_id = B` | PASS — `ERROR 42501: new row violates row-level security policy` |
| 6 | `[Supabase-MCP-runnable]` | SELECT no longer hides own deleted rows (the trade-off proof) | PASS — under A's JWT, `SELECT … WHERE worker_id = (SELECT current_worker_id())` returns both `67ae627b-…` (deleted, `is_deleted: true`) and `c2d3e2a3-…` (active, `is_deleted: false`) |
| 7 | `[Claude-runnable]` | tsc clean + `git diff --stat` for the load-bearing commit shows exactly 4 files | PASS — tsc clean. Commit `db066b3` shows 4 files: 1 migration + 3 frontend |

## Trade-off accepted

After 0020, a worker can `SELECT` their own soft-deleted rows via raw PostgREST queries. They cannot see any other worker's rows (UPDATE policy and SELECT policy both still enforce `worker_id = (SELECT current_worker_id())`). The privacy guarantee per APP 11.2 — soft-delete from the worker's perspective — is preserved by the UI: every list query carries `.is('deleted_at', null)` and deleted cases are not in scope for any feature flow.

The stale-URL surface (`UploadZone.tsx:247` reads `document_cases` by `?case=` query param) is **not** patched in 012A.1 — it's the responsibility of **ISS-015** (`extend_case_with_document` RPC adding `AND deleted_at IS NULL` to its ownership check). ISS-015 stays OPEN. 012A.1 honoured the hard-stop.

## What CAL-003 caught

The 012A.1 plan was the first application of CAL-003 (RLS verification: quote both `qual` and `with_check` verbatim). The plan's Unknowns Gate quoted both clauses verbatim for both the current production policies AND the proposed post-fix shape. CAL-003 did its job — it surfaced that the WITH CHECK predicate was just `worker_id = …` (no `deleted_at` involved), which became one of the priors that, in retrospect, *should* have made the InitPlan / WITH CHECK theory feel less load-bearing than it did. CAL-003 is good but not sufficient on its own; CAL-004 closes the next gap.

## What CAL-003 did NOT catch (origin of CAL-004)

CAL-003 mandates verbatim quoting; it does not mandate empirical falsification of the proposed mechanical cause. The 012A addendum's theory survived CAL-003 because the verbatim quoting matched the theory's framing (bare vs wrapped). The fix that the theory implied (migration 0019) was applied, and it didn't fix the bug. Test 2.5 — a single ALTER POLICY in a transaction — would have falsified the theory in one query before any code shipped, but it wasn't part of the discipline. CAL-004 adds it.

## What 0020's frontend audit caught

5 frontend `document_cases` query call sites needed inspection. 1 was already filtered (the 012A "belt-and-suspenders"). 3 needed filtering added (Dashboard list, ready-count, batch-cases-by-id). 1 was deferred to ISS-015 (UploadZone.tsx:247 — single-row by URL). The ready-count and batch-cases-by-id filters are technically redundant in their current shape (count of confirmed/suggested cases, batch-cases-just-uploaded) but were included anyway because the convention from 0020 onwards is "no exceptions."

## ISS-016 close

Filed and closed in the same session. Status FIXED by `db066b3`. Cross-reference: 0019 was defensive convention alignment, 0020 was the load-bearing fix.

## ISS-015 status

Unchanged — OPEN, P3. Defense-in-depth on `extend_case_with_document` RPC. Bundled into Session 012C provenance work or a dedicated mini-sprint, as planned in 012A.

## CAL-003 status

Flipped to APPLIED in `.claude/CALIBRATION-PRJ-backlog.md` as part of this retro commit. Lives in `CLAUDE.md` Unknowns Gate (commit `51195f3`).

## CAL-004 status

PENDING. Filed in `.claude/CALIBRATION-PRJ-backlog.md` as part of this retro commit. Lands in CLAUDE.md at the next hygiene window.

## Manual smoke (post-deploy)

Production deploy: commits `08fc6b8` and `db066b3` push to `origin/main`; Vercel auto-redeploys. Migration 0019 + 0020 already live in DB (applied via Supabase MCP during /build). Manual smoke for AC3 was performed via Playwright during /build (PATCH 204 captured, DB `deleted_at` non-null verified) — the production frontend at the time of click was running the **pre-frontend-fix** bundle (because the deploy hadn't fired yet), but the migration-only fix already made the soft-delete persist; the frontend filter changes will surface their effect on the Dashboard + worker-wide ready-count after Vercel redeploys with `db066b3`.

## Session 012B (next)

Per the 012A retro's Section C — provenance model proposal. Schema inspection pass. Output is a written proposal document — review and approve, then 012B builds against it. **Do not start 012B work in this session — 012A.1 is closed.**
