# Session 003 Retro — Supabase end-to-end
# Date: 2026-04-26
# Scope: PHASE-0 / Supabase + DB schema + storage + RLS

## What Was Done

Phase 0 tasks "Set up Supabase project" and "Define DB schema and apply migrations" — completed end-to-end. Three migrations applied, full Phase 0 schema live, RLS verified via in-DB user-role simulation.

1. **Audit before build.** Found an existing migration `01_profiles_and_admin_helper` applied 2026-04-25 (the day before s002), which built a Supabase-Auth-keyed `profiles` table (FK to `auth.users`). This is incompatible with our Clerk-JWT auth model — `auth.users` stays empty when sign-in is via Clerk. Surfaced the conflict, got user direction (replace `profiles` → `workers`, full REF-DB-schema.md scope) before any DDL.

2. **Created `supabase/migrations/`** in the repo (didn't exist). Committed `0001_profiles_and_admin_helper.sql` verbatim from the DB for audit-trail visibility, marked SUPERSEDED in the file header.

3. **Migration `0002_phase0_full_schema`** — applied. Drops every artifact 0001 created (`profiles`, `is_admin`, `handle_new_user`, `on_auth_user_created` trigger; keeps the generic `set_updated_at`). Creates 17 tables matching `REF-DB-schema.md` verbatim:
   - Identity / reference: `workers` (clerk_user_id text unique), `employers`, `awards`, `award_rates`.
   - Pipeline: `documents`, `extraction_staging`.
   - Layer 1: `worker_classification_facts` + `_history`.
   - Layer 2: `shift_facts` + `_history`.
   - Layer 3: `payslip_facts` + `_history`, `bank_deposit_facts` + `_history`, `super_contribution_facts` + `_history`.
   - Snapshots: `comparisons` (immutable).
   - 5 audit triggers (BEFORE UPDATE, SECURITY DEFINER) write old-row → history and clear `confirmed_at` on every fact mutation.
   - 2 immutability triggers on `comparisons` reject UPDATE/DELETE; 1 INSERT-validation trigger requires every entry in `inputs_snapshot.facts[]` to carry a non-null `confirmed_at`.
   - RLS enabled on all 17 tables. Policies use `auth.jwt() ->> 'sub'` and a `STABLE` helper `current_worker_id()`.

4. **Migration `0003_payslips_storage_bucket`** — private bucket, 10 MB limit, MIME types png/jpeg/pdf. Storage RLS on `storage.objects` scoped by `bucket_id='payslips'` and `(storage.foldername(name))[1] = current_worker_id()::text` (folder-per-worker). SELECT/INSERT/UPDATE only; no DELETE (soft-delete via `documents.deleted_at`).

5. **Hardened functions** for the `function_search_path_mutable` advisor — added `SET search_path = public` to `set_updated_at`, `current_worker_id`, `validate_comparison_inputs`, `reject_comparison_mutation`. Supabase advisors clean (zero lints).

6. **Frontend integration:**
   - `npm install @supabase/supabase-js@^2.104` (no peer-dep conflicts with React 18).
   - `src/config/supabase.ts` validates `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` at module-load; throws on missing or service-role-shaped values (matches the clerk.ts loud-fail pattern).
   - `src/lib/supabase.ts` exports `createSupabaseClient(getToken)` and `useSupabaseClient()` hook. Uses supabase-js's `accessToken` callback (v2.45+) to inject Clerk JWTs on every request — no manual refresh loop.
   - `src/lib/upload.ts`: `ensureWorker(supabase, clerkUserId)` (idempotent upsert — RLS guarantees scope-safety), `uploadPayslip(file, supabase, workerId)` (client-side MIME + size validation, path `{workerId}/{uuid}-{safeFilename}`, inserts `documents` row), `signPayslipUrl(supabase, path, ttl)`.
   - `src/pages/Onboarding.tsx`: behind sign-in, renders a file input + upload button + inline `documentId` / `storagePath` log. PayChecker tokens (`bg-pc-navy`, `text-pc-coral`); not the polished UX, just the smoke-test surface.

7. **Generated TS types** via Supabase MCP into `src/types/db.ts` — single source of truth for table shapes.

## Decisions Made

- **Replace, don't adapt.** The existing `profiles` table had 0 rows and depended on Supabase Auth, which we don't use. Adapting it (drop the FK, rename, add `clerk_user_id`) would have left vestigial columns (`role`, `country`, `preferred_language`) that don't appear in `REF-DB-schema.md`. Replacing it is honest about the architectural mismatch and keeps the canonical doc as the source of truth.

- **One big migration, not many small ones.** Phase 0 schema is internally consistent (FKs, triggers, RLS all reference each other). Splitting into 5 migrations would have either created intermediate broken states or required CASCADE drops on rebuild. One atomic `0002` is replayable as-is.

- **Storage-bucket migration kept separate.** Bucket creation + storage RLS lives in `0003` rather than appended to `0002` because storage policies live in the `storage` schema (not `public`), and a single SQL block touching two schemas is harder to reason about. Logical-chunk separation = clearer git history.

- **Migration `0001` committed verbatim with SUPERSEDED header.** Two alternatives considered: (a) skip committing it (loses provenance — git would show schema appearing fully-formed in 0002 with no history); (b) edit it to "be" 0002 (rewrites history). The verbatim-with-header approach makes drift-detection honest — anyone reading `supabase/migrations/` in order sees exactly what happened.

- **`SECURITY DEFINER` on history triggers, not on `current_worker_id()`.** History triggers must bypass RLS to insert into history tables (which have SELECT-only policies). `current_worker_id()` runs as the caller because `STABLE` is enough for plan-caching and the workers SELECT policy already admits the caller's own row.

- **Accepted the C2/C3 silent-zero-rows behavior on `comparisons`.** When a user-role caller tries `UPDATE comparisons` or `DELETE FROM comparisons`, RLS has no UPDATE/DELETE policy → zero rows match → no rows to mutate → BEFORE-trigger never fires → no exception. The "silent success" is acceptable because the *effect* is the same (no rows changed). The trigger is the second wall, fired only when something bypasses RLS (service role, future server code) — verified separately. Defense-in-depth intact.

- **Clerk JWT template approach over Supabase third-party auth.** Followed the user's explicit STEP 2. Flagged in chat that the JWT template was soft-deprecated in 2025; the alternate path (Supabase Project Settings → Auth → Third-party Auth → Add Clerk; client uses `getToken()` not `getToken({template:'supabase'})`) only requires changing one line if the template is gone from the dashboard.

- **`payslips` storage path is `{workerId}/{uuid}-{filename}`, not `{clerkUserId}/...`.** The first folder segment must match `current_worker_id()::text` per the RLS policy. Using the workers UUID (rather than the Clerk sub) keeps storage paths stable across hypothetical Clerk-id changes and is one indirection deeper for any storage-path → user attacker.

## Verified end-to-end

In-DB simulation via `SET request.jwt.claims` + `SET ROLE authenticated` inside a single rolled-back transaction. 16 of 16 assertions green (after re-running C2/C3 against the trigger directly):

- A1–A5 (5/5): signed-in worker A reads own worker / employers / awards / documents / storage object.
- B1 (1/1): worker B reads only own worker row.
- B2–B5 (4/4): B sees zero of A's documents / storage objects; cannot forge a document under A's `worker_id`; cannot upload under A's storage folder.
- T1–T2 (2/2): UPDATE on `shift_facts` writes a `*_history` row and clears `confirmed_at`.
- C1 (1/1): `comparisons` INSERT with confirmed inputs succeeds.
- C2–C3 (defense-in-depth, 2/2): `comparisons` UPDATE/DELETE rejected by trigger when called from postgres-role (RLS-bypass).
- C4 (1/1): `comparisons` INSERT with an unconfirmed input rejected.

Local build (`npm run build`) clean: 452 kB JS / 129 kB gzipped (was 251/76 in s002 — supabase-js adds ~200 kB / 53 kB; expected, well under any bundle-size concern for Phase 0).

## What's Open

- **Browser end-to-end smoke test pending.** Requires the Clerk JWT template named `supabase` to be configured in the Clerk dashboard. SQL-level RLS testing fully exercises the same policies, so the browser test is now confirmation rather than discovery.
- **Clerk JWT template was soft-deprecated in 2025.** If the dashboard no longer offers it, switch to Supabase third-party auth (one line change in `src/lib/supabase.ts`: drop `{ template: 'supabase' }` from `getToken`).
- **No backend yet.** Service-role operations (extraction agent writing to `extraction_staging`, awards/award_rates seeding) will need a server-side path in Phase 1. For now, MCP / SQL-direct.
- **No real award reference data.** `awards` and `award_rates` are empty. Apete's MA000074 + classification rates are a separate Phase 0 task (next-next).
- **Push not done.** Awaiting review per the user's hard stop.

## Lessons / Gotchas

Two added to `tasks/lessons.md`:

4. **`auth.jwt() ->> 'sub'` ≠ `auth.uid()`.** `auth.uid()` returns the Supabase-Auth user id, which is empty when identity comes from Clerk JWT. RLS policies must read `(auth.jwt() ->> 'sub')::text` (or wrap it in a helper). REF-DB-schema.md was updated to reflect this — it had used `auth.uid()` from a Supabase-Auth-default reflex.

5. **`PERFORM` is PL/pgSQL-only.** The first attempt at the smoke-test SQL used `PERFORM pg_temp.record(...)` at top level — parser error. Switched to `SELECT pg_temp.record(...)` for top-level calls; kept `PERFORM` inside `DO` blocks (where it's valid). Worth remembering when batch-scripting raw SQL.

## Next Session

**Hour 4 — Apete's MA000074 reference data + onboarding wizard skeleton.** Concrete first action:

1. Read `docs/retros/LATEST.md` (this file) + `STATE-PRJ-issues.md`.
2. Choose between (a) seeding `awards` + `award_rates` for MA000074 from FWC source data, or (b) starting the onboarding wizard (Layer 1 facts capture). Probably (a) first — comparison engine needs the rates.
3. If (a), follow `SKILL-AWARD-add-new.md` end-to-end. Includes researching the current consolidation date, classifications, and rates; storing FWC source URLs.

LATEST.md updated → points at this retro.
