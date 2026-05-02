# STATE-PRJ-issues.md — PayChecker open issues
# Bugs, blockers, regressions, broken state. Severity-rated. NOT for polish or improvements.
# For polish / UX / DX backlog see STATE-PRJ-improvements.md.

## Severity legend

- **P0** — production down, calculation incorrect, privacy breach, data loss. Drop everything.
- **P1** — feature broken, blocks active phase work, security smell. Fix this session or next.
- **P2** — degraded path, workaround exists, doesn't block phase progression. Fix when in area.
- **P3** — known smell, not user-facing, not currently a risk. Track only.

## Status legend

- **OPEN** — needs triage / unstarted
- **PLANNED** — accepted, in `PLAN-PRJ-mvp-phases.md`
- **IN PROGRESS** — actively being worked on
- **FIXED** — closed; commit hash + date noted
- **WONTFIX** — closed without fix; reason noted
- **DUPLICATE** — closed; refers to another issue ID

## Format

```
### ISS-NNN — short title
- **Severity:** P{0..3}
- **Status:** OPEN | PLANNED | IN PROGRESS | FIXED | WONTFIX | DUPLICATE
- **Found:** YYYY-MM-DD by {who} (session-NNN)
- **Phase:** {0..5} | cross-cutting
- **Symptom:** what the user / system sees
- **Repro:** minimal steps
- **Root cause:** if known
- **Fix:** if known / planned
- **Closed:** YYYY-MM-DD by commit `{hash}` (or WONTFIX reason)
```

---

## Open issues

### ISS-001 — `src/lib/upload.ts` `PAYSLIPS_BUCKET` constant breaks once `payslips` bucket is removed
- **Severity:** P2
- **Status:** FIXED
- **Found:** 2026-04-29 by Jovi (Sprint A5)
- **Phase:** 0 (Sprint B1 target)
- **Symptom:** `src/lib/upload.ts:3` hardcodes `PAYSLIPS_BUCKET = 'payslips'`. Migration 0011 created the new `documents` bucket but retained `payslips` as an alias to avoid breaking the existing Sprint 7 manual form. Once the alias is removed (a later cleanup migration after Sprint B1), the constant must already point at `'documents'` or every call in the file fails.
- **Repro:** none in current state — alias keeps things working. Fails when `payslips` bucket is dropped without updating the constant.
- **Root cause:** Sprint 7 (`e949ce1`) was designed pre-ADR-013 when `payslips` was the only bucket. ADR-013 introduced a per-type-in-path strategy under a renamed `documents` bucket; the rename + constant-update were intentionally split for safety.
- **Fix:** Sprint B1 updates `src/lib/upload.ts` constant to `'documents'` AND updates the upload path-shape to match `storage-architecture-v01.md` filename convention. After B1 ships, a follow-up migration removes the `payslips` bucket.
- **Closed:** 2026-04-29 by Sprint B1. `DOCUMENTS_BUCKET = 'documents'` is now the canonical constant in `src/lib/upload.ts`; `PAYSLIPS_BUCKET` retained as a backwards-compat alias pointing at the same value (so any pre-cutover import path keeps working). Canonical filename pattern `{worker_uuid}/_unclassified/{ISO-ts}_{4-hex}.{ext}` adopted per `storage-architecture-v01.md`. POL-003 (drop the `payslips` bucket alias entirely + remove the constant alias) becomes actionable after B2/B3/D ship.

### ISS-002 — 9× `unindexed_foreign_keys` performance advisor (pre-existing)
- **Severity:** P3
- **Status:** FIXED
- **Found:** 2026-04-29 by Jovi (Sprint A5)
- **Phase:** 0 (cross-cutting)
- **Symptom:** Supabase performance advisor flags FK columns without covering indexes on `bank_deposit_facts.source_doc_id`, `payslip_facts.employer_id`, `payslip_facts.source_doc_id`, `shift_facts.employer_id`, `shift_facts.source_doc_id`, `super_contribution_facts.source_doc_id`, `worker_classification_facts.award_id`, `worker_classification_facts.employer_id`, `worker_classification_facts.source_doc_id`. Pre-existing — NOT introduced by Migration 0011.
- **Repro:** Supabase MCP `get_advisors(type='performance')` returns 9 INFO-level rows for these FKs.
- **Root cause:** Migrations 0002 + 0005 created FK constraints without explicit covering indexes. At Phase 0 row counts (≤ tens of rows per table) the impact is negligible; at Phase 1+ scale this becomes real.
- **Fix:** see IMP-NNN — Migration 0012 candidate (FK indexes on `*_facts`).
- **Closed:** 2026-04-29 by Migration 0012 (Sprint POL-002-APPLY). Advisor scan post-apply: `unindexed_foreign_keys` count cleared from 9 → 0; all 9 indexes verified present via direct `pg_indexes` query.

### ISS-003 — 8× `auth_rls_initplan` performance advisor (pre-existing — note: ISS-003 originally said 7; live advisor + pg_policy confirmed 8)
- **Severity:** P3
- **Status:** FIXED
- **Found:** 2026-04-29 by Jovi (Sprint A5)
- **Phase:** 0 (cross-cutting)
- **Symptom:** Supabase performance advisor flags WARN-level entries on policies for `workers`, `employers`, `awards`, `award_rates`, `award_allowances` — these policies call `auth.jwt()` directly instead of `(SELECT auth.jwt())` so the planner re-evaluates per row. Pre-existing — NOT introduced by Migration 0011.
- **Repro:** Supabase MCP `get_advisors(type='performance')` returns 7 WARN-level entries with rule `auth_rls_initplan`.
- **Root cause:** Migrations 0002 + 0005 + 0007 wrote policies before this Supabase advisor existed; the `(SELECT ...)` wrapping pattern was adopted later (Migration 0009 + 0010 use it correctly).
- **Fix:** see IMP-NNN — Migration 0012 candidate would also re-write these 7 policies with `(SELECT auth.jwt())` wrapping. Bundle with the FK index work.
- **Closed:** 2026-04-29 by Migration 0012 (Sprint POL-002-APPLY). All 8 policies (3 on `workers`, 2 on `employers`, 1 each on `awards` / `award_rates` / `award_allowances`) rewritten with `( SELECT (auth.jwt() ->> 'sub'::text))` wrapping. Verified directly via `pg_policy` query — every policy body now contains the SELECT-wrapped form. **Note on advisor cache:** the `auth_rls_initplan` advisor lint output remained stale at 8 entries immediately post-apply (cache_key based), despite the policies being structurally correct in the live DB. Truth source = `pg_policy`. The advisor is expected to refresh on its next cycle. The `unindexed_foreign_keys` advisor cleared immediately, suggesting per-rule cache TTLs differ.

### ISS-004 — `unused_index` advisors on Migration 0011 + pre-existing tables
- **Severity:** P3
- **Status:** OPEN
- **Found:** 2026-04-29 by Jovi (Sprint A5)
- **Phase:** 0 (cross-cutting)
- **Symptom:** Supabase performance advisor flags 13 INFO-level `unused_index` entries: 6 pre-existing on `award_rates` + history-table FK indexes; 7 new on Migration 0011 tables (`documents_batch_id_idx`, `documents_state_idx`, `documents_embedding_idx`, `document_classifications_*`, `document_extractions_*`, `employer_extraction_patterns_lookup_idx`, `worker_extraction_preferences_worker_idx`).
- **Repro:** Supabase MCP `get_advisors(type='performance')` returns 13 INFO-level `unused_index` rows.
- **Root cause:** All 7 Migration 0011 indexes are intentionally pre-emptive — they back query paths Sprint B1+ will wire. The advisor catches them as unused at Phase 0 because no traffic exists yet. Pre-existing 6 are similarly low-traffic in Phase 0.
- **Fix:** No action needed at Phase 0. Re-evaluate post Sprint B1+ when real traffic arrives — if any index is still unused after meaningful Apete usage, drop in a follow-up cleanup migration. Otherwise close as expected-behaviour.
- **Closed:** _open — re-evaluate post-Sprint-B1 traffic_

### ISS-015 — `extend_case_with_document` RPC missing `deleted_at IS NULL` check
- **Severity:** P3
- **Status:** OPEN
- **Found:** 2026-05-02 by Session 012A plan (Unknowns Gate U3)
- **Phase:** 0 (cross-cutting — defense-in-depth)
- **Symptom:** RPC defense-in-depth: `extend_case_with_document` (migration 0015) does not check `deleted_at IS NULL`. Reachable today only via stale case URLs (bookmarks, magic links, recently-viewed widgets). Add `deleted_at IS NULL` check to RPC body. Surfaced by Session 012A plan; deferred from 012A scope.
- **Repro:** Soft-delete a case A via the 012A flow. Open `/upload?case={A.case_id}` directly via a saved URL. The UI hides deleted cases via the SELECT RLS policy so the worker can't reach this path from `/cases` normally; only direct URL access exposes it. The classify endpoint then calls `extend_case_with_document` which today verifies ownership but not delete state.
- **Root cause:** Migration 0015 wrote the RPC before soft-delete existed. Migration 0018 added `deleted_at` to `document_cases` but did not touch the RPC body.
- **Fix:** Update `extend_case_with_document` RPC ownership check to add `AND deleted_at IS NULL`. One-line addition; new follow-up migration. Likely bundled into Session 012C provenance work.
- **Closed:** _open — fix in a follow-up sprint_

### ISS-014 — `api/classify.ts` hybrid entrypoint shape causes 300s hang at `request.json()`
- **Severity:** P1 (production smoke validation blocker; function hangs full plan-default timeout on every request)
- **Status:** FIXED
- **Found:** 2026-04-30 by Codex adversarial review of DIAG-008's stdout investigation
- **Phase:** 0 (production smoke validation blocker)
- **Symptom:** After Sprint B1.11 closed ISS-012 (`TypeError: request.headers.get`) and Sprint VERCEL-MAX-DURATION-FIX closed ISS-013 (`maxDuration` ignored), production `/api/classify` still ran for 300s and 504'd. Clerk JWKS fetched successfully (295ms in dashboard External APIs panel). NO `[classify]` log lines printed. NO Anthropic / Supabase / Storage external calls visible. Function hung indefinitely between `authenticate()` returning and reaching B1.10's first log at line 134. The hang location was specifically at `await request.json()` (line 126) — the only `await` between Clerk auth and the first console.log.
- **Root cause:** `api/classify.ts:114` declared the entrypoint as a HYBRID shape:
  ```ts
  export default async function handler(request: Request): Promise<Response>
  ```
  This is NOT a documented Vercel Functions entrypoint pattern for non-Next.js projects. Vercel's documented entrypoints for Node runtime are:
  1. **Legacy:** `export default function(req: VercelRequest, res: VercelResponse)` — Vercel pre-parses body into `req.body`, response sent via `res.status().json()`
  2. **Modern fetch-object:** `export default { async fetch(request: Request): Promise<Response> }` — Web API style, documented for non-Next.js projects
  3. **Next.js Route Handlers:** `export async function POST(request: Request)` — only for Next.js (`framework: 'nextjs'`); does not apply here (our deployment metadata shows `framework: null`)
  Our hybrid (default function taking `Request`, calling `request.json()`, returning `Response`) was being routed through Vercel's legacy `(req, res)` adapter because of the `default function` declaration shape. The legacy adapter wraps `req` as a Node `IncomingMessage`-like object that does NOT expose `.json()` as a method. So `await request.json()` awaits a non-existent method — never resolves — hangs until `maxDuration` kills the function.
- **How this slipped past every prior diagnostic:** `await request.json()` is the FIRST `await` after Clerk auth that uses the Web API shape. Clerk's `verifyToken` works because it makes its own outbound HTTP call (the JWKS fetch we saw at 295ms) and doesn't depend on the request shape. The first `console.log` is at line 134, AFTER line 126's hung await. So the hang is invisible from B1.10's diagnostic logs; only POL-013's "every external boundary needs explicit timeout" pattern would have surfaced it earlier (and even then, only at the SDK timeout, not the entrypoint shape).
- **Pre-existing:** Yes — entrypoint shape shipped in Sprint B2 (commit `27b5b1d`) when the classify endpoint was first wired. The pattern looked correct because TypeScript types accepted it (`Request`/`Response` are global Web API types) and lint accepted it (no rule flags it). Vercel's runtime dispatcher behaviour was the only place where the mismatch manifested. Was masked by ISS-005 → ISS-007 → ISS-008 → ISS-009 → ISS-010 → ISS-011 → ISS-012 → ISS-013 — every upstream bug aborted the request before reaching `await request.json()`. Today's chain of fixes peeled them all back, exposing ISS-014 as the next-deepest layer.
- **Fix (this sprint, B1.12):** Convert default export from a function to the documented fetch-object pattern. Minimal-diff approach: keep `handler` as a named `async function`; add a single new default export at end of file: `export default { fetch: handler }`. Functionally identical to wrapping the entire handler body in `export default { async fetch(...) { ... } }` (which would re-indent 258 lines), but the named-function-then-default-object form keeps the diff small. Vercel sees a default export object with a `fetch` method → routes through modern Web handler dispatcher → `request.json()` works as expected → Response objects flush properly. ALSO add a top-of-handler sentinel log BEFORE the method check, BEFORE any await, so future failures are diagnosable from production logs even if the entrypoint pattern changes again or stdout capture flakes.
- **Pattern signal:** Eleventh bug today on this surface. Codex's adversarial review caught what primary investigation missed. Primary investigation correctly identified the hang LOCATION (between authenticate and entry log → therefore at `request.json()`) but treated the hang as a behavioural quirk rather than a structural entrypoint mismatch. Worth filing as **POL-017** for Phase 1+: "When a hang has no observable diagnostic surface and the request makes it past auth, the entrypoint contract itself is a defect candidate; never trust default exports — match documented patterns explicitly per runtime."
- **Closed:** 2026-04-30 by Sprint B1.12 commit (see git log).

### ISS-013 — Standalone `export const maxDuration` ignored by Vercel for non-Next.js Functions
- **Severity:** P1 (blocks production smoke validation iteration speed; each failed test costs 5 min instead of 60s)
- **Status:** FIXED
- **Found:** 2026-04-30 by DIAG-007 (Vercel MCP investigation of post-B1.11 production smoke timeout)
- **Phase:** 0 (production smoke validation blocker)
- **Symptom:** Sprint VERCEL-MAX-DURATION (commit `0bfcba0`) added `export const maxDuration = 60` as a standalone named export at top of `api/classify.ts`. Production function nonetheless ran for 300031ms = Vercel default plan-cap timeout. The 60s setting was silently ignored. Each failed smoke test took 5 minutes instead of the intended 60 seconds, slowing iteration on the remaining production bugs by ~5×.
- **Root cause:** The standalone `export const maxDuration` pattern is supported by Next.js Route Handlers and Pages API Routes, but **NOT** by pure Vercel Functions in non-Next.js projects. PayChecker is Vite + Vercel Functions (`api/*.ts` files), not Next.js. For pure Vercel Functions, `maxDuration` must live INSIDE the `config` object: `export const config = { runtime, maxDuration }`. Vercel's runtime reads only `config.maxDuration` for non-Next.js setups and silently ignores any standalone export. Documentation: <https://vercel.com/docs/functions/configuring-functions/duration>.
- **Pre-existing:** Yes — Sprint VERCEL-MAX-DURATION shipped the standalone form on the assumption (per Vercel docs that conflate Next.js and pure Vercel Functions patterns) that both shapes were equivalent. The earlier sprint's daily log even claimed "functionally identical to Vercel — both `config.maxDuration` and standalone `export const maxDuration` are recognized." That claim was wrong; this sprint corrects the record. Was masked by ISS-012 (TypeError throwing fast 500 BEFORE the function ran past 60s) and POL-014 candidate (local Norton/schannel SSL revocation issue) until B1.11 cleared ISS-012 and the user shifted to production smoke testing.
- **Diagnostic confirmation:** Vercel MCP `list_deployments` confirmed the production deployment is `dpl_EcsqroHTzwrtvU9QvrVDKo8ruVG6` for commit `8ec72ed` (B1.11) which carries both `export const config` and standalone `export const maxDuration`. `get_runtime_logs` for that deployment returned a single `/api/classify` invocation at 08:15:36 UTC with `Duration: 300031ms` — exactly the Vercel plan default, not the configured 60s. Math: 300031 ms ÷ 60s = 5.0×; the standalone export is being completely ignored.
- **Fix (this sprint, VERCEL-MAX-DURATION-FIX):** Merge `maxDuration: 60` into the existing `export const config` object. Delete the standalone `export const maxDuration` line. After deploy, function will hard-cap at 60s as intended. Aligned with B1.10's Anthropic SDK ceiling (30s × 1 retry = 60s) so SDK timeout and function timeout collapse to a single 60s budget — failed tests now triage in 1/5 the time.
- **Pattern signal:** Tenth bug today on this surface. Production logs (via Vercel MCP) were the diagnostic that finally surfaced ISS-013 — local Windows blocked earlier validation and production Vercel runtime was the only place to observe the silent-ignore behaviour. Reinforces the lesson from POL-013: **production logs are sometimes the cheapest diagnostic surface**, and silent-ignore behaviours by SDKs / runtimes are themselves a defect class worth defending against (e.g., a build-time lint that asserts `maxDuration` lives inside `config`).
- **Closed:** 2026-04-30 by Sprint VERCEL-MAX-DURATION-FIX commit (see git log).

### ISS-012 — `api/classify.ts` 500s in production with `TypeError: request.headers.get is not a function`
- **Severity:** P1
- **Status:** FIXED
- **Found:** 2026-04-30 by production smoke test from phone (post-VERCEL-MAX-DURATION push, the first time anyone successfully reached `/api/classify` on production)
- **Phase:** 0 (load-bearing for SMOKE-001 production validation)
- **Symptom:** POST `/api/classify` returns 500 in <1 second on production. Vercel function logs show:
  ```
  TypeError: request.headers.get is not a function
    at authenticate (/vercel/path0/api/classify.ts:399:34)
    at Object.handler (/vercel/path0/api/classify.ts:120:22)
  ```
  Zero `[classify]` log lines printed because the entry log at line 127 fires AFTER `authenticate()` (line 113), and authenticate throws before reaching it.
- **Root cause:** `api/classify.ts:29` declares `export const config = { runtime: 'nodejs' }`. In Vercel's Node runtime, `request.headers` is a **plain JavaScript object** with lowercase keys (Node `IncomingMessage` convention) — NOT a Web Standard `Headers` instance. Line 399's `request.headers.get('authorization')` calls a method that only exists on `Headers` instances (Edge / Web runtime). Throws `TypeError` immediately. The TypeScript type for `Request` says the headers are a `Headers` instance, but Vercel's Node runtime shape diverges from the type — so `tsc` doesn't catch this, only runtime does.
- **Pre-existing:** Yes — header-access pattern shipped in Sprint B2 (commit `27b5b1d`) when classify endpoint was first wired. Was masked by the upstream chain of bugs (ISS-005 → ISS-007 → ISS-008 → ISS-009 → ISS-010) plus the local Windows Norton/schannel SSL revocation issue (POL-014 candidate) that prevented anyone from reaching `authenticate()` end-to-end on either local or production until B1.10's diagnostic logs + VERCEL-MAX-DURATION's timeout fix unblocked the production path today.
- **Fix (this sprint, B1.11):** Add a runtime-agnostic `getHeader(request, name)` helper next to `authenticate()`. It detects whether `request.headers` is a `Headers` instance (uses `.get(name)`) or a plain object (uses `headers[name.toLowerCase()]` with `Array.isArray` defence for headers that can be string[] in Node like `set-cookie`). Replace the failing `request.headers.get('authorization') ?? request.headers.get('Authorization')` line with a single `getHeader(request, 'authorization')` call (the helper normalises to lowercase internally, so the defensive double-lookup is unnecessary). Future-proof: works in both Node and Edge runtimes if anyone ever flips the runtime config.
- **Pattern signal:** First production-validated bug of the day. Local Windows-Norton SSL issues prevented this from surfacing during local dev. The Vercel function logs (working from phone, on a clean network) immediately surfaced it. Lesson: production logs are sometimes the cheapest diagnostic surface, especially when local tooling is broken.
- **Closed:** 2026-04-30 by Sprint B1.11 commit (see git log).

### ISS-010 — `api/classify.ts` hangs / 500s with no diagnostic surface
- **Severity:** P1
- **Status:** FIXED
- **Found:** 2026-04-30 by SMOKE-001 attempt + Codex adversarial review (Sprint B1.10)
- **Phase:** 0 (Sprint B1.10 target — load-bearing for SMOKE-001 completion)
- **Symptom:** `/api/classify` runs for 30+ seconds. Vercel dev terminal shows only `"function still running after 30s"` warning. Eventually returns 500 to browser. ZERO console output from `api/classify.ts` (no `console.log` anywhere in the file). UI pill flips to "Couldn't read" with reason like `CLASSIFY FAILED (500)`. Hard refresh + retry produces identical result.
- **Diagnostic gap:** Without any logs in the handler, we cannot tell where the hang/500 originated — could be at JWT verify, worker resolve, consent gate, document load, state update, storage download, Anthropic API, or response parsing. The hang has zero observable surface from the operator's terminal.
- **Root cause (per Codex diagnosis):** Two simultaneous defects in `api/classify.ts`:
  1. **No explicit timeout on Anthropic SDK.** `api/classify.ts:226` has `new Anthropic({ apiKey })` with SDK defaults: `timeout: 600_000ms` (10 min) per attempt × `maxRetries: 2` (default) = up to 30 minutes total wall time per request. Vercel dev's 30s warning fires but does not kill the function; the SDK keeps awaiting silently.
  2. **Zero `console.log` statements in the handler.** The function file shipped in Sprint B2 (commit `27b5b1d`) without any instrumentation. Cannot diagnose any failure mode from terminal.
- **Pre-existing:** Yes — both defects shipped together in Sprint B2's initial classify wiring. They were masked by the upstream chain of bugs (ISS-005 → ISS-007 → ISS-008 → ISS-009) that prevented any document from reaching `/api/classify` until B1.9 + Migration 0013 unblocked the storage path. ISS-010 is the next-deepest layer of latent hardening debt.
- **Fix (this sprint, B1.10):** Two-part fix.
  - **Part 1 — Bound the Anthropic boundary.** Constructor at `api/classify.ts:226` now passes `timeout: 30_000` (30s per attempt) and `maxRetries: 1` (one retry, not two). Worst-case wall time becomes 60s (2 attempts × 30s) vs the prior ~30 min default. On timeout, the SDK throws `AbortError`/timeout error; existing `callClassifier:518` try/catch surfaces it through `failClassification` to the client as a clean `'failed'` status with worker-readable reason.
  - **Part 2 — Tactical diagnostics throughout the handler.** 15 `console.log` / `console.error` statements distributed across every major checkpoint: entry (after `document_id` validation), post-JWT, post-worker-resolve, post-consent, post-doc-load (with state + mime), post-state-update, post-storage-download (with size), Anthropic-start (with `Date.now()` capture), Anthropic-end (with elapsed-ms), parse result (detected_type + confidence), routing decision, classification INSERT, each terminal `jsonResponse(200)`, plus error logs in `callClassifier` catch and `failClassification`. Privacy-safe per `REF-PRIVACY-baseline.md` hard rule 1: UUIDs + metadata only, never document content; Clerk user_id truncated to first 8 chars in the auth log to limit noise.
- **Today's 500 — what we DON'T yet know:** What actually caused today's 500 in the SMOKE-001 attempt. After B1.10 ships, the next attempt's terminal output will tell us in <5 seconds which step failed. Most likely: the rotated Clerk dev secret (SEC-001) means Anthropic key may also have been touched, OR the Anthropic API itself was slow, OR a regional flake. The point of B1.10 is that the next failure of any kind will be diagnosable, not silent.
- **POL-013 captured:** every external API boundary going forward needs explicit timeout + diagnostic logs as a project convention. Diagnostic gap is its own defect.
- **Closed:** 2026-04-30 by Sprint B1.10 commit (see git log).

### ISS-009 — Storage RLS denies all uploads (Clerk JWT vs `TO authenticated` role-scoping mismatch)
- **Severity:** P1
- **Status:** FIXED
- **Found:** 2026-04-30 by SMOKE-001 attempt + dual Codex/Claude-Code adversarial review (Sprint B1.9)
- **Phase:** 0 (Sprint B1.9 target — load-bearing for SMOKE-001)
- **Symptom:** Click Choose Files, pick a fresh JPEG; pill flips `pending → uploading → failed` ("Couldn't read"); reason text reads `"new row violates row-level security policy"`; console shows `Failed to load resource: 400` on the `*.supabase.co/storage/v1/object/...` upload URL. Network log shows zero `documents` INSERT requests because uploadDocument's storage upload returned 400 first. DB queries confirm zero rows in `documents` and zero objects under the worker's prefix in either `documents` or `payslips` bucket.
- **Repro:** Sign in with onboarded worker (consent_records exists). Navigate to /upload. Click Choose Files. Pick any image under the bucket size limit. Pill flips to "Couldn't read" with the RLS error string within 1-2 seconds.
- **Root cause:** `supabase/migrations/0011_document_intelligence_schema.sql:294-320` created `documents_storage_self_*` policies on `storage.objects` scoped `TO authenticated`. Migration 0003 created `payslips_self_*` with the same scope. The Clerk vanilla session JWT in use (`src/lib/supabase.ts:13-32` documents this: "no shared secret, no JWT template, vanilla session JWT") **does not include a `role: 'authenticated'` claim**. Supabase Storage's role-assignment for Clerk-JWT requests defaults to `anon` (not `authenticated`), so the `TO authenticated` policies do not apply at all; with no other allow policy for that role, RLS denies the INSERT and Postgres returns `"new row violates row-level security policy"`. By contrast, every `public.*` policy (workers, documents, consent_records) uses the no-`TO`-clause pattern (effectively `TO PUBLIC`), which is why those SELECTs work for the same JWT — the policy applies regardless of role, and the JWT-derived `auth.jwt() ->> 'sub'` resolves the user correctly.
- **Diagnostic confirmation:** Live `pg_policy` query showed `polroles: {authenticated}` for all six storage policies versus `polroles: {0}` (PUBLIC) for every `public.*` policy. `current_worker_id()` itself is correct — it returns the workers UUID for the user when called via the same JWT path that already works in `workers_self_select`. The function isn't being evaluated for storage INSERT because no policy is applying.
- **Pre-existing:** Yes — latent in Migration 0011 since 2026-04-29 (3 days). Surfaced today because B1.5/B1.7/B1.8's progressive bug fixes finally let the storage upload path actually execute in a real browser session. Three sprints in `useUploadBatch` (B1.5/B1.7/B1.8) all aborted before storage was reached, hiding this RLS asymmetry from anyone who tried.
- **Fix (this sprint, B1.9):** New `supabase/migrations/0013_storage_rls_public_pattern.sql` drops the six `TO authenticated` storage policies and recreates them with no `TO` clause (PUBLIC) plus an explicit JWT-presence guard `(SELECT auth.jwt() ->> 'sub') IS NOT NULL`. Mirrors the `public.documents` pattern that already works for Clerk-JWT. Security model identical: anonymous requests fail the JWT guard; cross-tenant requests fail the `current_worker_id()` foldername check. Migration 0012's `(SELECT ...)` wrap precedent followed for planner-init-plan caching.
- **Pattern signal:** Five sprints today (B1.5, B1.6, B1.7, B1.8, B1.9) all on the same upload pipeline; each one unmasked the next bug. ISS-009 was hidden by ISS-008 which was hidden by ISS-007 which was hidden by ISS-005. SMOKE-001 was the right next sprint to schedule but couldn't run because each unmasking surfaced fresh blockers. Lesson confirmed: **browser-smoke each sprint that touches a new pipeline stage**, even when lint+build pass.
- **Defense-in-depth alternative:** POL-012 captures the "more correct" Supabase-native fix — configuring Clerk JWT to include a `role: 'authenticated'` claim via Clerk JWT template, which would let storage policies stay in their Supabase-default `TO authenticated` shape. Not urgent; Migration 0013 closes ISS-009 fully on its own.
- **Drafted:** 2026-04-30 by Sprint B1.9 (commit `0a65d5b`) — `supabase/migrations/0013_storage_rls_public_pattern.sql` written + committed. Apply step initially blocked by transient Supabase MCP outage; MCP recovered; migration applied immediately after.
- **Applied:** 2026-04-30 via Supabase MCP `apply_migration` (post-recovery, same sprint). Verified via 4 queries:
  - All 6 storage policies (3 `documents_storage_*` + 3 `payslips_self_*`) now show `polroles: {PUBLIC}` (flipped from `{authenticated}` pre-apply).
  - `pg_get_expr(polqual / polwithcheck)` confirms each policy now contains the three-clause guard: `bucket_id` match + `(SELECT auth.jwt() ->> 'sub') IS NOT NULL` + `foldername[1] = current_worker_id()::text`.
  - `public.*` policies (workers, documents, consent_records) UNCHANGED — still `{PUBLIC}`, still bare `current_worker_id()`. Migration 0013 did not touch them.
  - Performance advisor scan: no new lints introduced. The 8 `auth_rls_initplan` warnings are the pre-existing stale-cache entries from POL-002 (Migration 0012's policies rewritten correctly, advisor cache not yet refreshed); the `unused_index` lints are pre-existing per ISS-004. None caused by 0013.
- **Closed:** 2026-04-30 by Sprint B1.9 (commit `0a65d5b` drafts the migration; apply + verify completed in the same sprint window).

### ISS-008 — `startUpload` setState-updater race causes silent stall at "Uploading..."
- **Severity:** P1
- **Status:** FIXED
- **Found:** 2026-04-30 by browser smoke test post-B1.7 + dual Codex/Claude-Code adversarial review
- **Phase:** 0 (Sprint B1.8 target — load-bearing for SMOKE-001)
- **Symptom:** After B1.7 closed first-click loud-fail, files transition `pending → "Uploading..."` but stay there indefinitely. Network tab shows zero storage POSTs, zero `documents` INSERT, zero `/api/classify` calls. No console errors. `documents` table query returns zero rows for the worker. Pill never progresses to Uploaded → Reading → Saved.
- **Repro:** Sign in with onboarded worker (consent_records exists). Navigate to /upload. Click Choose Files. Pick any file (e.g. 155 KB JPEG). Pill flips to "Uploading..." and stays there for 30+ seconds. Hard refresh + retry produces identical failure.
- **Root cause:** `src/features/upload/useUploadBatch.ts:142-153` — `pending` array mutated INSIDE the `setState((prev) => { ... })` updater (line 145: `pending = prev.files.filter(...)`). React 18 batches functional setState updaters; the updater (and its side-effect assignment to the closure-captured `pending`) runs deferred during the next render commit. The synchronous `if (pending.length === 0) return` at line 153 reads `pending` immediately after the setState call — sees the initial empty array — hits the early return — exits before the worker pool spawns. `processWorker` never runs; `uploadDocument` never called; no storage upload, no `documents` INSERT, no `/api/classify`. The setState updater eventually runs during render commit and DOES flip files to `'uploading'` (which is what the user sees), but by then `startUpload` has already returned.
- **Same anti-pattern as ISS-007** (different function, same hook). Codex flagged the structural issue during the ISS-007 review — POL-009 captured the refactor recommendation. We deferred. Bug surfaced 5 hours later when B1.7's narrow fix unmasked this one.
- **Pre-existing:** Yes — present since Sprint B1's initial commit (`1d05e08`). Was masked by ISS-007's loud-fail branch firing first; B1.7 unmasked it.
- **Fix (this sprint, B1.8):** Refactor `useUploadBatch` to eliminate the refs-mirroring-state pattern entirely (the structural smell that produced both ISS-007 and ISS-008). `addFiles` now returns `{ entries, batchId }` synchronously; `startUpload` takes explicit `(entries, workerId, batchId)` parameters; no refs; no side-effect-in-setState-updater patterns. Drop-zone gating brought into symmetry with button gating. B1.5's loud-fail branch removed — explicit parameters make the impossible state actually impossible (POL-010 closed by removal).
- **Pattern signal:** Three bugs (ISS-005 silent hang, ISS-007 first-click race, ISS-008 silent stall) in `useUploadBatch` in 24 hours, all in the same anti-pattern family. Codex flagged the structural issue during ISS-007 review (POL-009). We deferred. Bill came due in 5 hours. **Lesson:** when an external review flags a structural pattern, schedule the fix immediately, not "later." POL-009 + POL-010 now landed in the same sprint as ISS-008's closure.
- **Closed:** 2026-04-30 by Sprint B1.8 commit (see git log).

### ISS-007 — `addFiles` setState-updater race causes deterministic first-click failure
- **Severity:** P1
- **Status:** FIXED
- **Found:** 2026-04-30 by Codex adversarial review (post-Sprint-B1.6 smoke surface)
- **Phase:** 0 (Sprint B1.7 target — load-bearing for SMOKE-001)
- **Symptom:** First Choose-Files click after every hard refresh deterministically fails with status pill "Couldn't read" + reason "ACCOUNT NOT READY — TRY REFRESHING". Network log shows workers SELECT 200 (resolved) but NO storage upload request, NO `/api/classify` request, NO `documents` INSERT. Hard refresh doesn't fix it — same failure on every cold first click.
- **Repro:** Sign in with onboarding-completed worker (consent record exists). Navigate to /upload. ConsentRequired passes. Click Choose Files. Pick any file. Pill flips to failed with the misleading copy.
- **Root cause (per Codex diagnosis):** `src/features/upload/useUploadBatch.ts:90` — `batchIdRef.current = nextBatchId` is assigned INSIDE the `setState((prev) => { ... })` updater. React 18 batches functional setState updaters; the updater (and its side-effect ref assignment) runs deferred during the next render commit, not synchronously when `setState` is called. `UploadZone.onPickFiles` calls `addFiles(files)` then synchronously calls `void startUpload()` on the same event tick. `startUpload` reads `batchIdRef.current` → still null → falls into B1.5's loud-fail branch (line 125-139) which assumes any null ref = worker-not-resolved.
- **Why the message misled:** B1.5 collapsed two distinct null-states (worker-not-resolved vs batch-not-yet-assigned) into a single error branch with a single piece of copy. Network tab showed worker SELECT succeeding because the worker WAS resolved — `workerIdRef.current` is set fine. The actual null was `batchIdRef.current`. POL-010 captures the copy split for follow-up.
- **Pre-existing:** Yes — bug introduced in commit `1d05e08` (Sprint B1) when `addFiles` was first written. B1.5 made it visible (loud failure replacing the prior silent hang). B1.6 didn't touch this surface. Neither sprint browser-smoke-tested the happy path, so the bug surfaced only on the first real upload attempt.
- **Fix (this sprint, B1.7):** Lift `batchIdRef.current = nextBatchId` OUT of the setState updater. Compute `nextBatchId` synchronously from the ref (not from `prev.batchId`, which would still be a stale-closure read against the latest ref). Assign the ref synchronously, then call `setState` with a pure updater that mirrors the ref into visible state. Surgical: ~5 lines moved.
- **Residual risk:** None for the immediate bug. Architectural smell (refs-mirroring-state with manual lock-step) captured as POL-009 for Phase 1+ refactor. Loud-fail-branch copy ambiguity captured as POL-010.
- **Closed:** 2026-04-30 by Sprint B1.7 commit (see git log).

### ISS-006 — Upload + manual-fallback pipelines write/process worker data before consent
- **Severity:** P1
- **Status:** FIXED
- **Found:** 2026-04-30 by Codex-style audit during Sprint B1.5 verification pass
- **Phase:** 0 (Sprint B1.6 target — load-bearing for ship)
- **Symptom:** New Clerk-authed user can sign in → land on `/upload` → upload payslip → `/api/classify` sends image bytes to Anthropic API across the border BEFORE a `consent_records` row exists for their `worker_id`. Same class of gap exists at `/buckets/employment-contract` (Sprint 7 manual-fallback) — fact rows can be written into `worker_classification_facts` before consent. The manual path is APP 1 only (no cross-border transfer; data stays in Supabase AU); the upload path is APP 1 + APP 6 + R-010 (cross-border to Anthropic).
- **APP exposure:**
  - APP 1 — open + transparent management (worker has not seen privacy policy)
  - APP 6 — use only as disclosed (no disclosed purpose since worker hasn't consented) — upload path only
  - R-010 — cross-border data transfer (US Anthropic) without prior consent — upload path only
- **Repro (upload path):** Sign up via Clerk fresh. Navigate directly to `/upload`. Upload any image. `/api/classify` succeeds; `document_classifications` row inserted; `consent_records` does NOT exist. Privacy gap confirmed.
- **Repro (manual path):** Same fresh signup. Navigate directly to `/buckets/employment-contract`. Type a legal name. `worker_classification_facts` proposed-state row created without consent.
- **Pre-existing scope:** `ensureWorker` auto-create has existed since pre-B1.5. B1.5 made the failure mode reachable from a cold start (no longer silent). The gap itself pre-dates B1.5; B1.5 just made it visible.
- **Fix (this sprint, B1.6):** Layer (a) route guard via new `ConsentRequired` component wrapping BOTH `/upload` AND `/buckets/employment-contract` (rationale: APP 1 applies to all data-writing routes, not just the cross-border one). Layer (c) server-side check in `api/classify.ts` (403 with `error: 'consent_required'` if missing). Together: UI gates routes; even if UI bypassed, classify refuses to run.
- **Residual risk after this sprint:** Direct DB INSERT via service-role-impersonation could still bypass both layers. Layer (d) RLS predicate (POL-008) is the authoritative gate that closes this. Phase 1 priority. A future regression in `api/classify.ts` that removes the check is also covered by POL-008's RLS gate.
- **Out of scope, captured separately:**
  - POL-008 — RLS predicate on `documents_self_insert` (defense-in-depth)
  - Granular per-purpose consent (classify vs extract vs Layer-2 employer-pattern memory) — Phase 1+
  - Consent revocation flow — Phase 1+ (privacy policy v1 currently treats withdrawal = account deletion; `consent_records` is immutable per `0004:25-38`)
  - Multi-version consent re-prompting on policy v1 → v2 — Phase 1+
- **Closed:** 2026-04-30 by Sprint B1.6 commit (see git log).

### ISS-005 — `ensureWorker()` silent hang on missing workers row
- **Severity:** P2
- **Status:** FIXED
- **Found:** 2026-04-29 by Jovi (Sprint B1+B2 smoke test)
- **Phase:** 0 (Sprint B1.5 target)
- **Symptom:** Upload UI hangs at "Waiting" forever when Clerk user has no corresponding workers row. No console error. No UI feedback. Network tab shows workers SELECT returning 200 with 0.4 KB (empty result set), then no storage upload request fires.
- **Repro:** Sign in with Clerk user that hasn't completed onboarding. Navigate to /upload. Click Choose files. Pick any file. Status pill stays "Waiting" indefinitely.
- **Root cause:** Two-layer bug. (1) `src/lib/upload.ts` `ensureWorker()` already auto-creates on miss (Sprint B1 left it correct), but raw Postgres errors (RLS denial, network) propagated up without a worker-friendly prefix. (2) `useUploadBatch.startUpload()` early-returned silently when `workerIdRef.current` was null. (3) `UploadZone` re-enabled "Choose files" / "Take a photo" buttons when `isResolvingWorker` cleared, even if `workerError` was set — so the worker could keep adding files into a dead pipeline. The combination produced a "Waiting" pill that never advanced.
- **Impact:** Any new user who lands on /upload before completing onboarding (or whose worker resolution failed transiently) got a broken experience. Apete-shaped failure mode on day one.
- **Fix:** **Option (a) AUTO-CREATE + caller/UI hardening.** `ensureWorker()` keeps auto-create (already schema-safe — only `clerk_user_id` is NOT NULL without default; `tier` defaults to `'palm_free'`, `preferred_language` to `'en'`); thrown errors now wrap with worker-friendly prefix. `useUploadBatch.startUpload()` now marks all queued `'pending'` files as `'failed'` with `error: "Account not ready — try refreshing"` when worker resolution failed, so the row pill flips from "Waiting" to "Couldn't read" instead of hanging silently. `UploadZone` now disables the upload buttons when `workerError` is set (not just `isResolvingWorker`), and the error banner uses worker-friendly copy ("We couldn't set up your upload area — try refreshing"). Onboarding flow + consent_records gate untouched (Sprint 7 unchanged).
- **Closed:** 2026-04-30 by Sprint B1.5 commit (see git log).

## Closed issues

### SEC-002 — `SUPABASE_SERVICE_ROLE_KEY` leaked into client bundles via `VITE_*` prefix
- **Severity:** P0
- **Status:** FIXED
- **Found:** 2026-04-29 by Jovi (Sprint A5-era audit — Vite bundling investigation surfaced that `VITE_SUPABASE_SERVICE_ROLE_KEY` had been used in `.env.local`, which Vite inlines into client JS bundles)
- **Phase:** 0 (cross-cutting — security)
- **Symptom:** Service-role-shaped JWT (signed by legacy HS256 signing key `fe492a2d`, role claim `service_role`, issuer `supabase`, ref `zzppuwyufloobskinehf`, iat `1777104044` ≈ 2026-04-26) was inlined into a client-side production bundle as `VITE_SUPABASE_SERVICE_ROLE_KEY`. Anyone fetching the bundle could extract it and impersonate service-role against the project's REST + Storage APIs (RLS bypass, full read/write on all tables and buckets). The variable was renamed to `SUPABASE_SERVICE_ROLE_KEY` (no `VITE_` prefix) on 2026-04-30 to stop further exposure, but the **value was not rotated** — DIAG-002 / DIAG-003 / DIAG-007 confirmed it was byte-identical to the leaked one. P0 stayed functionally OPEN ~60 hours from leak to close.
- **Repro (pre-fix):** decode the `eyJ...` value from the production JS bundle at `paychecker-three.vercel.app`, paste into JWT.io → see `role: 'service_role'`, `iss: 'supabase'`, `iat: 1777104044`. Use it as a `Bearer` token against `https://zzppuwyufloobskinehf.supabase.co/rest/v1/...` → bypass all RLS.
- **Root cause:** `VITE_*` prefix instructs Vite to inline the var into client bundles at build time (per `https://vitejs.dev/guide/env-and-mode.html`). The service-role key is supposed to be server-side ONLY (used by Vercel Functions in `api/*.ts`, never client). Adding the `VITE_` prefix is the canonical way to leak a server secret in a Vite project. The mistake mirrors SEC-001 (Clerk secret with wrong prefix) but on a higher-blast-radius credential.
- **Why earlier "rotation" did not close SEC-002 (today, 2026-05-01 ~10:30 AEST):** First attempt followed an outdated brief that assumed Supabase signing-key rotation would re-sign the legacy `anon`/`service_role` JWTs. That assumption is **wrong on a project that has already migrated to the new signing-keys system** (PayChecker did this ~5 days ago — `fe492a2d` is the legacy HS256 secret in a Previous slot; `ee358704` was the first ECC P-256 signing key). Per Supabase docs (`https://supabase.com/docs/guides/auth/signing-keys`): once migrated, *"`anon` and `service_role` must be rotated simultaneously [via the legacy 'rotate JWT secret' action]; Publishable and secret API keys no longer are based on the JWT signing key and can be independently managed"* — so rotating the user-session signing key (Standby `3e611...` → Current) is Auth-hygiene only and leaves the leaked legacy `service_role` JWT verifying. Lost ~30 min of misdirected work; pivoted after the first iat decode showed `1777104044` unchanged (which we initially read as user error but was actually correct system behaviour).
- **Fix (the actual closing path, 2026-05-01 AEST):** Migrate to the new opaque API keys + disable + revoke. Five steps:
  1. **Pre-rotation audit (PART 1, MCP):** Supabase MCP `get_project` confirmed `ACTIVE_HEALTHY` ap-southeast-2; Vercel MCP `get_project` confirmed `prj_ze3ANW2hVrMyNvtz1wNiTx15tVdH` / team `team_L4Rfv4RTq3QAwXW8T9nrHdQn`; `list_deployments` baseline = `dpl_6qtpfEaaLyHruZ4FTiipz9oDuSmP` (commit `7877d9b`).
  2. **Migration (PART 2):** retrieved `sb_publishable_unnJQIYCEabeJrCCF0W8ww_BrovpYRK` via Supabase MCP `get_publishable_keys`; user grabbed `sb_secret_*` from Dashboard (MCP intentionally cannot return secrets); both pasted into Vercel env vars (Production + Preview) for `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`; `.env.local` updated to match.
  3. **Verification (PART 3):** empty commit `51bbe75` triggered Vercel redeploy → `dpl_HtwLF5WrsGEzBaqm7k1djFsugaqC` READY ~78s; pre-revoke production smoke (Contract3.jpeg) → `/api/classify` 200 in 10s, classified `other` confidence 0.95, auto_routed to `other/` storage subdir, sentinel `[classify] handler_called` log fired in Vercel runtime logs.
  4. **Pre-disable codebase audit (SEC-002-AUDIT, PART 1+2):** read-only sweep before clicking destructive buttons. `grep eyJhbGciOi` over `src/` + `api/` → 0 hits; `grep JWT_SECRET` → 0 hits. `src/lib/supabase.ts:7-19` JSDoc states explicitly *"NO shared secret, NO JWT template"* — Clerk third-party auth via JWKS-validated tokens at Clerk's Frontend API URL. `api/classify.ts:449` uses `@clerk/backend` `verifyToken({ secretKey })` which fetches Clerk's RS256 JWKS internally, **independent of Supabase HS256 secret**. Verdict: PROCEED — disable + revoke is structurally safe.
  5. **Disable + revoke (PART 5):** Supabase Dashboard → Settings → API Keys → "Disable JWT-based legacy API keys" (legacy `eyJ...` keys stop being accepted by Supabase API gateway). Then Settings → JWT → `fe492a2d` → Revoke (legacy HS256 signing key moved to Revoked slot — leaked legacy `service_role` JWT becomes unverifiable). Per docs: *"Supabase products do not rely on this cache and revocation is instantaneous."*
- **Post-revoke verification:** Supabase MCP `execute_sql` queried `documents` + `workers` count post-revoke (both responded — proves service-role auth via `sb_secret_*` still works through PostgREST + RLS); production smoke #2 (Contract24.jpeg) classified as `contract` confidence 0.92, auto_routed, 10s elapsed at `2026-05-01 11:38:26 AEST` — proves the **Clerk JWT → Supabase third-party JWKS auth → RLS path** still works end-to-end after `fe492a2d` revocation.
- **Audit trail (immutable):**
  - Old leaked iat: `1777104044` (≈ 2026-04-26 00:00:44 UTC) — captured pre-rotation by user via JWT.io decode of pre-migration `VITE_SUPABASE_ANON_KEY`
  - Pre-revoke smoke: Contract3.jpeg, document_id `ecaec32e-a77f-4ef3-849a-94129ac1196e`, `/api/classify` 200 at `2026-05-01 10:47:57 AEST`
  - Post-revoke smoke: Contract24.jpeg, classified at `2026-05-01 11:38:26 AEST`, `detected_type: contract`, `confidence: 0.92`, `routing_status: auto_routed`
  - Vercel deployment with new keys: `dpl_HtwLF5WrsGEzBaqm7k1djFsugaqC` (commit `51bbe75`)
  - Supabase project state at close: ACTIVE_HEALTHY, postgres 17.6.1, `fe492a2d` in Revoked slot, `ee358704` (Previous) + `3e611...` (Current) on the new signing-keys system
- **Time open:** ~60 hours from leak (2026-04-29) to functional close (2026-05-01 01:35 UTC). Earlier today's signing-key rotation (~10:30 AEST) was misdirected work; the actual close happened ~11:35 AEST.
- **POL candidates surfaced (filing in `STATE-PRJ-improvements.md` separately):**
  - **POL-019** — Verify project key model state BEFORE applying any rotation procedure. The brief assumed legacy-only; reality was migrated-to-new-signing-keys 5 days ago. Verification cost = 1 MCP `get_publishable_keys` call (~5s).
  - **POL-020** — For P0 credential leaks the load-bearing question is "what specifically invalidates the leaked credential?" not "what does the standard rotation procedure recommend?" Map the leaked credential to its signing key (or its scope), then revoke at THAT level.
  - **POL-021** — Pre-disable codebase audit before clicking destructive Supabase Dashboard buttons. Today's audit was 10 min and gave a strong PROCEED verdict; would have caught a hidden HS256 dependency if one existed.
- **Closed:** 2026-05-01 by single SEC-002-CLOSE-CORRECTED commit (see git log) bundling .gitignore tweak (`.claude/tmp/` exclusion) + this STATE entry + tasks/today-2026-05-01.md daily log.


- **Severity:** P1
- **Status:** FIXED
- **Found:** 2026-04-26 by Jovi (s002, ~9:15am Canberra)
- **Phase:** 0 (cross-cutting — security)
- **Symptom:** Clerk dev `sk_test_*` secret key pasted into chat as part of an env-var hand-off. Briefly also written to `.env.local` (gitignored, never committed) under the wrong prefix `CLERK_SECRET_KEY=`.
- **Repro:** n/a (one-off paste).
- **Root cause:** Clerk docs default to Next.js variable names (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`); the user copied the pair without distinguishing publishable vs secret, and we're on Vite (which has no use for the secret key in Phase 0).
- **Fix:**
  1. Rotated the secret key in Clerk dashboard within ~10 minutes — old key dead, new key never left the dashboard.
  2. Removed the `CLERK_SECRET_KEY=` line from `.env.local`.
  3. Renamed `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → `VITE_CLERK_PUBLISHABLE_KEY` (the prefix Vite reads).
  4. Added a `pk_*` validator in `src/config/clerk.ts` that throws with a clear message if a key starting with `sk_` is ever pasted into the publishable-key var.
  5. `.env.local.example` documents the do-not-paste rule for secret keys.
  6. Lesson captured in `tasks/lessons.md` (s002 entry — env-var prefix mismatch + secret key placement).
- **Closed:** 2026-04-26 — no production impact (test mode, no real users, key never reached git, never reached production).
