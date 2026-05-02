# ISS-017 — `document_cases_active` view + lint enforcement (design proposal v01)

## Status

DRAFT — not yet approved for implementation. ISS-017 is OPEN in `.claude/STATE-PRJ-issues.md`. This document is the design pass; an implementation session is a separate future commit chain. Per CAL-005 (see §7) the implementation work will be labelled defensive, not load-bearing.

## Convention-establishment note

This is the first inhabitant of `docs/proposals/`. Convention proposed: design documents that are *approved for design but not yet implemented* live here. Once approved + implemented, the doc either moves to `docs/architecture/` (as-built reference) or stays here with a status update. The distinction is meaningful — `docs/architecture/*.md` describes the system as built or actively followed; `docs/proposals/*.md` describes work agreed in principle but pending implementation.

---

## 1. Problem restatement

ISS-017 (P2, OPEN) was filed by Codex adversarial review of the 012A.1 RLS soft-delete fix (Q2). The 012A.1 commit (`db066b3`) moved the soft-delete visibility contract out of one RLS predicate (where 012A had it) and into N application call sites:

- `useAllCases.ts:76-79` — `.is('deleted_at', null)` (the 012A "belt-and-suspenders" filter)
- `useWorkerCases.ts:94-97` — added in 012A.1
- `useCaseFeedback.ts:60-63`, `:114-117` — added in 012A.1
- `UploadZone.tsx:247-251` — added in 012A.1.1
- `api/classify.ts:347-352` — added in 012A.1.1

Each site carries the same `.is('deleted_at', null)` filter today, with a "no exceptions" comment at `useAllCases.ts:68-74`. Codex's pushback: convention enforcement does not survive the 9th call site added at 2am. The first new read against `document_cases` that forgets the filter silently leaks soft-deleted rows into the UI, with no compile-time signal and no test that would catch it.

Today there are 6 read sites. The 10th site is one PR away.

This proposal closes the structural risk by introducing a `document_cases_active` view that bakes the filter in at the schema level, plus a lint rule that prevents new direct reads against the base `document_cases` table outside an explicit allowlist.

**Out of scope:** ISS-020 (UI render-keyed-on-URL, orphan-document accumulation) and ISS-021 (RPC TOCTOU race). Those failures live on different surfaces and need their own fixes. ISS-017 closes the bypass risk; it does not close the post-012A.1.1 exposures Codex surfaced separately.

---

## 2. Proposed solution architecture

### 2.1 The view (verbatim SQL — proposal only, NOT a migration file)

```sql
create or replace view public.document_cases_active
  with (security_invoker = on)
as
  select case_id,
         worker_id,
         doc_type,
         completion_status,
         created_at,
         updated_at,
         deleted_at  -- exposed for column-set parity with base table; always NULL when read via view
  from public.document_cases
  where deleted_at is null;

-- Grants mirror the base table's read access surface.
grant select on public.document_cases_active to anon, authenticated, service_role;
```

Notes:

- Column set is identical to the base table. Including `deleted_at` (which is always NULL through the view) keeps `select *` semantics consistent and lets the implementation session's TS type generation produce a row type structurally identical to `document_cases` minus the `deleted_at IS NOT NULL` rows.
- `create or replace view` is idempotent on re-apply.
- No row count change in the underlying table — the view is purely a read projection.
- No instead-of triggers proposed. Writes stay on the base table (§2.3).

### 2.2 `security_invoker = on` — semantics and why

Postgres 15 introduced view-level `security_invoker`. With `security_invoker = on`, the view's underlying SELECT executes as the *calling role*, not the view owner. This matters for RLS:

- **Authenticated worker** (Clerk JWT → PostgREST → `authenticated` role): RLS evaluates against the calling role, so `document_cases_select_own` policy fires:
  - `qual: (worker_id = ( SELECT current_worker_id() AS current_worker_id))`
  - The view's own `WHERE deleted_at IS NULL` clause is layered on top.
  - Result: worker A reads worker A's active rows only. Cross-tenant isolation preserved by the RLS policy; soft-delete visibility enforced by the view.
- **Service-role** (api/classify.ts, classify_with_case-class RPCs): RLS is bypassed for service-role regardless of the view setting, BUT the view's body still includes `WHERE deleted_at IS NULL`. That clause is plain SQL; it applies to every caller. So service-role reading the view still gets only active rows — no need for the application code to re-add `.is('deleted_at', null)`.
- **Anonymous** (`anon` role): no RLS policy permits reads of `document_cases` for anon today. The view inherits that — `anon` gets zero rows.

The alternative, `security_definer` (the default in some Postgres versions), would run the view's body as the *view owner* (typically `postgres`, which has `BYPASSRLS`). That would silently skip RLS for every caller, and worker A could read worker B's rows. Wrong for our purposes.

**`security_invoker = on` is mandatory for this view.** The implementation session must verify this property in the live DB post-migration (see §5.1 U1 + §6 ACs).

`current_worker_id()` resolution path is unchanged from today: reads `auth.jwt() ->> 'sub'` → looks up `workers` row by `clerk_user_id` → returns the worker UUID.

### 2.3 Read/write split

- **Reads → view.** All 6 read sites move from `from('document_cases').select(...)` to `from('document_cases_active').select(...)`. The redundant `.is('deleted_at', null)` filters at each call site become deletable in the same commit (the view enforces it once).
- **Writes → base table.** All 4 write sites stay on `from('document_cases').update(...)`.
  - Reasoning: PostgREST supports UPDATE on simple views via auto-detected updatable views or via instead-of triggers. Both add complexity (primary-key inference, trigger maintenance, error-message indirection). Writes are infrequent (4 sites, all user-initiated UI flows) and auditable. Keeping writes on the base table is simpler and clearer.
  - The UPDATE RLS policy on `document_cases` still enforces ownership for writes; nothing changes there.
- **RPCs that read `document_cases` directly stay on the base table.** Today: `extend_case_with_document` reads `document_cases` in its function body (`select 1 from document_cases where case_id = … and worker_id = … and deleted_at is null`). The RPC's own SQL is auditable and the filter is explicit in the body. RPCs are not the source of the "9th call site" risk — they're reviewed at the function-definition level, not at scattered query sites. Future RPCs that touch `document_cases` should follow the same convention; ISS-021 (TOCTOU fix) is the next RPC change and should observe this rule. See §8 Q2 for the lint-rule scope question.

### 2.4 Migration sequence

Single migration file. Filename to be allocated by the implementation session (next sequential after current 0021 at the time of implementation). The migration:

1. Creates the view + grants.
2. Does NOT alter the base table.
3. Does NOT change any existing RLS policy.

Deploy timing matches the 012A.1.1 pattern:

1. Apply migration via Supabase MCP (DB now has the view; base table unchanged).
2. Land the frontend changes (6 read sites moved to the view) in the same commit.
3. Push triggers Vercel build + deploy.
4. During the deploy window, production traffic on the OLD frontend continues working against `document_cases` directly (base table still exists, view is additive).
5. Post-deploy, OLD frontend is replaced; all reads now go through the view.
6. Lint rule (added in the same commit OR a follow-up commit per implementation session's /plan) fires on the next PR that touches `document_cases`.

No mid-deploy break window. The base-table-vs-view choice is per-call-site and the migration is purely additive.

---

## 3. Lint enforcement mechanism

### 3.1 Decision: ESLint custom rule + allowlist file

Custom ESLint rule that flags any `from('document_cases')` call where the chained operation is a read (`.select(...)`). Mutations (`.update(...)`, `.delete(...)`, `.insert(...)`) pass. The rule fails CI at `error` severity.

Allowlist mechanism: a configuration file (format TBD by implementation session — see §8 Q3) that lists legitimate base-table read sites. Each entry pairs a file path (or function/identifier) with a reason. Modifications to the allowlist surface as their own diff in any PR — reviewers see a base-table read being explicitly approved, not an implicit bypass.

### 3.2 Why ESLint, not the other options

- **Pre-commit grep** (e.g., a shell script in a Husky hook): runs locally only, easy to skip with `--no-verify`. Not enforced in CI. Asymmetric: the rule binds developers who follow the local hook and skips developers who don't. Insufficient.
- **CI grep step** (e.g., a step in `.github/workflows/*.yml`): works but loses IDE feedback. Errors appear only after push, when the cost of fixing is highest. Slower correction loop.
- **Code-review checklist** (an item in PR template or CONTRIBUTING.md): humans miss things at 2am. The whole point of CAL-005 is that human-only enforcement is insufficient.
- **Biome rule:** the project uses ESLint today (per CLAUDE.md "React + Vite + TypeScript"). Switching to Biome is a separate decision; if it happens, the rule can be ported. Don't cross that bridge yet.

ESLint is already in the project. A custom rule runs anywhere ESLint runs — IDEs that integrate it (immediate feedback while typing), CI builds (catch on PR), and any local pre-commit setup the developer has. Three potential layers of enforcement against the same rule, no new tooling required.

### 3.3 Allowlist initial entries

Pre-populated at implementation time with:

- The 4 write-site files (W1–W4 in §4). Conservative inclusion — `update()` chains don't trip the rule, but if a file later adds a `select()` chain, the allowlist makes the precedent visible.
- Any RPC entrypoint or `api/*.ts` file that reads `document_cases` directly. Today: just `api/classify.ts:347-352` (the `ownerCheck` query). The implementation session decides whether this stays on the base table (allowlist entry) or moves to the view (per §8 Q4).

The exact format and layout of the allowlist file are deferred to the implementation session's /plan (§8 Q3).

---

## 4. Migration of existing call sites

### 4.1 Reads (move to `document_cases_active`)

| # | File:line | Operation | Current `deleted_at` filter | After migration |
|---|---|---|---|---|
| R1 | `api/classify.ts:347-352` | SELECT case_id, doc_type, worker_id (existence/owner check, service-role) | `.is('deleted_at', null)` | `from('document_cases_active')` + filter removed |
| R2 | `src/features/upload/useCaseFeedback.ts:60-63` | SELECT count by completion_status (header) | `.is('deleted_at', null)` | `from('document_cases_active')` + filter removed |
| R3 | `src/features/upload/useCaseFeedback.ts:114-117` | SELECT case_id, doc_type, completion_status by `.in('case_id', caseIds)` | `.is('deleted_at', null)` | `from('document_cases_active')` + filter removed |
| R4 | `src/features/upload/UploadZone.tsx:247-251` | SELECT doc_type by case_id (anchor) | `.is('deleted_at', null)` | `from('document_cases_active')` + filter removed |
| R5 | `src/features/cases/useAllCases.ts:76-79` | SELECT list (the `/cases` page) | `.is('deleted_at', null)` | `from('document_cases_active')` + filter removed |
| R6 | `src/features/dashboard/useWorkerCases.ts:94-97` | SELECT list (Dashboard "Your papers" cards) | `.is('deleted_at', null)` | `from('document_cases_active')` + filter removed |

### 4.2 Writes (stay on `document_cases`)

| # | File:line | Operation |
|---|---|---|
| W1 | `src/features/cases/useAllCases.ts:150-152` | UPDATE doc_type + completion_status (relabel from `/cases`) |
| W2 | `src/features/cases/useAllCases.ts:180-182` | UPDATE deleted_at = now() (the soft-delete writer) |
| W3 | `src/features/upload/useCaseFeedback.ts:154-156` | UPDATE completion_status (confirm from upload feedback) |
| W4 | `src/features/upload/useCaseFeedback.ts:195-197` | UPDATE doc_type + completion_status (relabel + confirm) |

### 4.3 Sequencing

- **Option A: single PR, all 6 read sites moved at once.** Simplest, atomic. The view migration applies first, then the frontend changes. Consistent with how 012A.1 + 012A.1.1 shipped (one cohesive commit per fix).
- **Option B: incremental waves, file-by-file.** Adds friction with no benefit at this scale (6 reads). Worth considering only if the lint rule's allowlist mechanism takes longer to implement than the read-site moves; even then, allowlist-everything-temporarily then move-and-de-allowlist is also one cohesive PR.

**Recommended: Option A.**

---

## 5. Risks and unknowns (Unknowns Gate per CLAUDE.md)

### 5.1 Architectural unknowns — STOP and ask before /build

- **U1 — Does Supabase ap-southeast-2 (Postgres 17) honour `security_invoker = on` on views?** Supabase docs say yes for Postgres 15+; the project is on Postgres 17.6.1 (verified earlier this session). **Hard pre-flight requirement when ISS-017 implementation opens:** create a test view with `security_invoker = on` in a transaction, confirm RLS fires for an authenticated `SET LOCAL` test, ROLLBACK. Outcome A (RLS fires correctly) → proceed. Outcome B (RLS skipped) → STOP and reassess; the proposal's core mechanism doesn't apply on this DB. This must run before any frontend code is touched, and before the migration is committed.
- **U2 — Performance.** Does `WHERE deleted_at IS NULL` in the view's body impose measurable planner cost beyond the existing per-call-site `.is('deleted_at', null)` filter? At Phase 0 row counts (tens of rows per worker) the cost is negligible. At scale, the planner should inline the view and produce identical plans. Implementation session verifies via `EXPLAIN` on a representative query against view vs base table.
- **U3 — Policy inheritance through the view.** When a worker queries `document_cases_active`, does Postgres invoke `document_cases_select_own` policy on the underlying base table? `security_invoker = on` says yes, but verify empirically alongside U1.
- **U4 — TypeScript type generation.** `supabase gen types` should produce a type for `document_cases_active`. Views sometimes need explicit hints (e.g., `comment on view ... is e'@graphql({"primary_key_columns": ["case_id"]})'` for some configurations). If types don't generate cleanly, implementation session decides between explicit type annotation, view metadata hints, or hand-written types.

### 5.2 Implementation unknowns — choose and log at implementation time

- ESLint rule package layout: inline rule (e.g., `.eslintrc.cjs` `rules:` block referencing a local file) vs separate plugin (e.g., `eslint-plugin-paychecker/`).
- Allowlist file format and location (see §8 Q3).
- Test fixture for the lint rule: snapshot-based against ESLint's RuleTester or assertion-based with manual fixtures.
- Pre-commit hook integration: add to existing Husky setup if present, otherwise leave as a CI-and-IDE-only enforcement.

### 5.3 Performance

- View on a small table with a simple `WHERE` is essentially free at query time. Postgres planner inlines the view definition into the calling query.
- Queries using `.in('case_id', caseIds)` against the view should produce the same plan as against the base table because the view's WHERE collapses into the query plan via predicate pushdown.
- Re-evaluate at Phase 1+ scale (10k+ rows per worker, multi-tenant load). Adding an index on `(worker_id, deleted_at)` may become useful at that point — out of scope here.

### 5.4 RLS interaction

- Post-012A.1, RLS on `document_cases` is pure ownership (verbatim from `pg_policies`):
  ```
  document_cases_select_own | SELECT | qual: (worker_id = ( SELECT current_worker_id() AS current_worker_id))                       | with_check: NULL
  document_cases_update_own | UPDATE | qual: (worker_id = ( SELECT current_worker_id() AS current_worker_id))                       | with_check: same
  ```
- The view's `WHERE deleted_at IS NULL` is layered on top — the view returns rows that pass BOTH RLS (ownership) AND the soft-delete filter.
- No conflict; the two filters compose cleanly. Per CAL-003: both qual and with_check on both policies have been quoted verbatim above.

### 5.5 Backward-compatibility

- `extend_case_with_document` RPC (post-012A.1.1, migration 0021): reads base table directly with explicit `deleted_at is null` clause in its body. Unchanged by this proposal.
- `classify_with_case` RPC: doesn't read `document_cases`; it INSERTs. Unchanged.
- Future RPCs (e.g., ISS-021's TOCTOU fix): per §2.3 + §8 Q2, RPCs stay on base table. No accidental inheritance of a different convention.
- `pg_views` consumers, observability dashboards, etc.: the view is additive — no existing query path breaks.

---

## 6. Acceptance criteria for the eventual implementation session

(Tagged per CLAUDE.md Session Rule 19. Not run yet — these are the bar the future session must clear.)

- **[Supabase-MCP-runnable]** Pre-flight U1 verification (HARD GATE BEFORE /BUILD): test view with `security_invoker = on` in a transaction, RLS fires for an authenticated `SET LOCAL` JWT test, ROLLBACK. Outcome A → proceed. Outcome B → STOP and reassess.
- **[Supabase-MCP-runnable]** Migration applies cleanly. `document_cases_active` view exists in `pg_views`. Definition contains `select … from document_cases where deleted_at is null`. View options include `security_invoker = on`.
- **[Supabase-MCP-runnable]** `security_invoker = on` confirmed via `pg_class.relkind = 'v'` + `pg_options_to_table((select reloptions from pg_class where relname = 'document_cases_active'))` showing `security_invoker = on`.
- **[Supabase-MCP-runnable]** Empirical RLS test on the view: worker A's JWT querying `document_cases_active` returns only worker A's active rows. Worker B's JWT returns only worker B's active rows. Soft-deleted rows excluded for both. Cross-tenant isolation preserved.
- **[Supabase-MCP-runnable]** Empirical service-role test: service-role querying `document_cases_active` returns active rows for all workers (RLS bypassed) but NOT soft-deleted rows (view's WHERE applies).
- **[Supabase-MCP-runnable]** `EXPLAIN` on a representative view query and the equivalent base-table query produce comparable plans. No significant planner cost added.
- **[Claude-runnable]** ESLint custom rule fires on a synthetic test fixture containing `from('document_cases').select(...)`. Allowlisted entries do NOT trip the rule.
- **[Claude-runnable]** All 6 read sites (R1–R6) moved to `from('document_cases_active')`. Redundant `.is('deleted_at', null)` filters removed at those sites. Update comments at `useAllCases.ts:68-74` and `:166` rewritten to reflect that the view enforces the contract (the application-layer convention from 012A.1.1 is now superseded by the view).
- **[Claude-runnable]** All 4 write sites (W1–W4) unchanged. Allowlist contains the expected entries plus any RPC/API base-table read that stays.
- **[Claude-runnable]** `npx tsc --noEmit` clean. Supabase-generated types include `document_cases_active`.
- **[Playwright-runnable]** Smoke against the deployed app: `/cases`, `/dashboard`, `/upload` (no `?case=`), and the soft-delete cycle (delete from `/cases`, confirm row hidden on Dashboard refetch and on `/cases` refetch). All paths render correctly under the new query path. Optimistic-UI flows behave identically.
- **[Claude-runnable]** `git diff --stat` scope: 1 migration file + view-using changes to all 6 read sites + lint rule artefacts (count and layout determined by the implementation session's /plan) + allowlist mechanism (format and location determined by the implementation session). File count and structure are scoped during the implementation session, not pre-allocated by this proposal.

---

## 7. CAL-005 self-applicability — defensive, NOT load-bearing

This work is **defensive** per CAL-005:

- Structural reasoning (preventing the 9th call site bypass).
- No current failing operation that the view fixes — the convention enforcement at the 6 existing sites works today.
- No transaction-scoped minimal mutation that demonstrates a current bug (the kind CAL-004 demands for load-bearing fixes).

CAL-005 implications for the implementation session:

- Commit message uses `chore(defensive):` prefix, NOT `fix:`.
- Retro labels the work explicitly as defensive convention.
- Plan does NOT put this in the "fix" slot (in the sense that it isn't closing a present-day failing operation; it's preventing a future regression).
- Migration filename does NOT use `_fix` suffix.

This proposal document itself is also defensive convention — it preserves the 012A.1.1 trade-off (frontend filter convention) by ratcheting it into a structural enforcement, ahead of the regression that CAL-005 predicts. No CAL-005 violation by writing it; it's a design ahead of need.

---

## 8. Open questions for review (genuinely undecided)

- **Q1 — View column set.** The view exposes `worker_id`, `deleted_at`, etc. for column-set parity with the base table. Implication: explicit `worker_id` lets `api/classify.ts:351`'s `.eq('worker_id', workerId)` filter work without code change. Implication: explicit `deleted_at` (always NULL through the view) keeps generated TS types' shape consistent. Default: include all columns. Resolved in §2.1 — included.
- **Q2 — Should RPCs eventually move to reading the view (`SELECT 1 FROM document_cases_active WHERE …`) for consistency?** Default: no — RPCs are auditable at the function-definition level; their own SQL declares the filter. But worth a separate discussion when ISS-021 (TOCTOU fix) lands. The implementation session should note this in its retro and decide whether to include RPCs in the lint rule's scope.
- **Q3 — Allowlist file format.** JSON (declarative, machine-editable, easy to diff) or JS module (runs at config time, supports comments). Default: implementation session decides; both are acceptable. The lint rule must handle whichever format the session picks.
- **Q4 — ESLint rule scope: only `src/*` or also `api/*.ts` (Vercel functions)?** Default: both, with `api/classify.ts` either on the allowlist (if it stays on base table) or moved to the view. The implementation session resolves this when it scopes its own /plan — depends on whether U1 confirms the view works correctly under service-role.

---

## 9. References

- **ISS-017** in `.claude/STATE-PRJ-issues.md` — the issue this proposal addresses. Filed by Codex adversarial review of 012A.1 (Q2) on 2026-05-02 evening.
- **012A.1 retro:** `docs/retros/2026-05-02-s012a1-rls-soft-delete-fix.md` — trade-off section explains why the convention-only filter pattern needs structural reinforcement.
- **Codex Q2 (the original surface)** — referenced from staging commit `b184991` and the 012A.1 retro.
- **CAL-005** in `.claude/CALIBRATION-PRJ-backlog.md` — defensive labelling discipline. Applied in commit `78f1379`.
- **CAL-004** in `.claude/CALIBRATION-PRJ-backlog.md` — engine-semantics empirical falsification. Applied in commit `78f1379`. The view's RLS-interaction question (U1) falls under CAL-004's domain when the implementation session opens.
- **ISS-018** (PARTIALLY-FIXED, commit `3552dd3`) — the parallel security boundary work. Different surface; this proposal does not touch ISS-018's load-bearing layer.
- **ISS-020** + **ISS-021** in `.claude/STATE-PRJ-issues.md` — separate post-012A.1.1 follow-ups. ISS-017 closes the structural bypass risk; ISS-020 + ISS-021 close UI/orphan/TOCTOU concerns. Independent fixes.
