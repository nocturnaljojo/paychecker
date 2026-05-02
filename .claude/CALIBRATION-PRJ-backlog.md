# CALIBRATION-PRJ-backlog.md

Process-level calibration items surfaced by sessions. Distinct from
`STATE-PRJ-issues.md` (which tracks bugs / regressions) and
`STATE-PRJ-improvements.md` (which tracks feature/UX polish).

Each entry: rule or convention proposed, origin (which session / what
went wrong), status (APPLIED / PENDING), and where it lives if applied.

---

## CAL-001 — Architecture Guardrails wording: include design-token names

**Status:** APPLIED in commit `0eaa326` (2026-05-02).
**Origin:** Session 012A — `pc-coral-hover` token assumption near-miss. I assumed the token existed in `tokens.css` and Tailwind silently dropped the unknown class at build. Same failure class as schema assumptions; rule should cover it.
**Lives in:** `CLAUDE.md` → "Architecture Guardrails (STRICT)" section, first bullet:
> "Do NOT assume schema that is not explicitly confirmed in code. Read the migration files, query the live schema (Supabase MCP `execute_sql`), or grep the relevant source file before referencing tables, columns, JSON shapes, or design-token names."

## CAL-002 — Plan-format convention: explicit test-step runner tags

**Status:** APPLIED in commit `0eaa326` (2026-05-02).
**Origin:** Session 012A close-out — I deferred all browser-driven test steps to Jovi as "manual" when several could have been Playwright-driven, and the soft-delete bug discovery could have been a Supabase MCP `get_logs` call before any console-log instrumentation. Surfaced when Jovi asked "is Playwright not able to do these tests?"
**Lives in:** `CLAUDE.md` → Session Rule 19. Tags: `[Claude-runnable]`, `[Playwright-runnable]`, `[Supabase-MCP-runnable]`, `[human-runnable]`.

## CAL-003 — RLS verification: quote both qual (USING) and with_check verbatim

**Status:** APPLIED in commit `51195f3` (2026-05-02).
**Origin:** Session 012A U4 false-resolution. The Unknowns Gate item U4 ("UPDATE-then-SELECT semantics under new policy") was marked verified in the 012A plan because the SELECT policy's USING was correct. The actual failure was attributed at the time to the UPDATE policy's WITH CHECK predicate, which was never inspected. The bare `worker_id = current_worker_id()` form looked materially different from the structurally-wrapped form on `payslip_facts`, and CAL-003 codified the discipline of quoting both clauses verbatim before claiming an RLS verification.
**Lives in:** `CLAUDE.md` → Unknowns Gate "Architectural unknowns — STOP and ask" list, new bullet:
> "RLS policies — quote both `qual` (USING) and `with_check` clauses verbatim from `pg_policies` before claiming a policy is verified. A USING-only check is incomplete and gives false safety. Predicates that look structurally equivalent may evaluate differently at runtime — particularly when policies call functions that read session-local config (`auth.jwt()`, `current_setting()`)."
**Note:** CAL-003 caught the verbatim-quoting gap but did not catch the deeper "your mechanical theory might still be wrong even with verbatim quotes" gap — that's CAL-004's domain. See 012A.1 retro for falsification narrative.

## CAL-004 — Falsify mechanical RLS theories empirically before publishing as root cause

**Status:** PENDING. Not yet applied.

**Origin:** Session 012A.1. The 012A diagnostic addendum's "bare-vs-wrapped + InitPlan + multi-phase RLS" theory was a plausible mechanical explanation built from policy-text comparison (bare `current_worker_id()` on `document_cases` vs wrapped `( SELECT current_worker_id())` on `payslip_facts`) and Supabase advisor lint reasoning. It was **empirically falsified** in 012A.1 by Test 2.5: a single ALTER POLICY on the SELECT policy's USING clause (dropping `deleted_at IS NULL`, leaving the wrap and the UPDATE policy untouched) made the failing UPDATE pass. The actual cause was the SELECT-USING `deleted_at IS NULL` clause being checked against the post-UPDATE row when the UPDATE mutates that very column — a different mechanism entirely. The wrap fix (migration 0019) was defensive convention alignment, not the load-bearing fix; the load-bearing fix is migration 0020 (drop `deleted_at IS NULL` from SELECT-USING + move the filter to the frontend / RPC layer).

**Proposed rule:**
> "When a diagnosis attributes a database authorization, visibility, or write failure to engine semantics — including RLS policy shape, function volatility, triggers, RETURNING behavior, RPC security, or planner/cache behavior — do not publish it as root cause or ship it as the load-bearing fix until reproduction, minimal isolated change, and proposed fix have all passed."

**Reason for current wording (broadened 2026-05-02 evening):** Original CAL-004 wording scoped the trigger narrowly to "policy or function structural property" (bare-vs-wrapped, STABLE-vs-IMMUTABLE, multi-phase-evaluation). Codex adversarial review of 012A.1 (Q5) noted today's bug was actually about RLS visibility/write semantics, not planner behavior — so the original wording was too narrow to catch the actual failure class. The broader framing covers RLS visibility, triggers, RETURNING behavior, and RPC security alongside the original planner/cache concerns. The three required passes (reproduction → minimal isolated change → proposed fix) are unchanged; only the trigger surface broadened.

**Where to land:** likely a new bullet under Architecture Guardrails STRICT, OR an addition to the Unknowns Gate "Architectural unknowns — STOP and ask" list (it complements CAL-003 — CAL-003 is about quoting both qual + with_check verbatim, CAL-004 is about empirically running the failure path before publishing a theory). Defer to next hygiene window.

**Awaiting:** approval batch.

## CAL-005 — Defensive migrations are labelled defensive BEFORE deploy, not after smoke fails

**Status:** PENDING.

**Origin:** Session 012A.1, Codex adversarial review Q6. Migration 0019 occupied the "fix" slot in commit chain ordering and was applied to live DB before the falsification test (Test 2.5) identified the actual root cause. The 012A correction note records that the InitPlan theory was falsified only after migration 0019 shipped and still failed under real PostgREST. Under stricter discipline, defensive convention work should be either (a) explicitly labelled defensive in commit message and retro before deploy, or (b) held in branch until the load-bearing fix is identified.

**Proposed rule:**
> "When a candidate fix is informed by structural reasoning (policy comparison, advisor lint, convention alignment) but has not been empirically falsified by a transaction-scoped minimal mutation against the actual failure path, it MUST be labelled as defensive in the commit message AND retro AND not occupy the 'fix' slot in any plan until end-to-end pass is verified. For RLS failures specifically, require a transaction-scoped minimal policy mutation against a live PostgREST request (or equivalent end-to-end test) before committing the migration."

**Where to land:** Architecture Guardrails STRICT, alongside CAL-003 and CAL-004.

**Awaiting:** approval batch at next CLAUDE.md hygiene window.
