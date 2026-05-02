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

**Status:** PENDING. Not yet applied.
**Origin:** Session 012A U4 false-resolution. The Unknowns Gate item U4 ("UPDATE-then-SELECT semantics under new policy") was marked verified in the 012A plan because the SELECT policy's USING was correct. The actual failure was on the UPDATE policy's WITH CHECK predicate, which was never inspected. The bare `worker_id = current_worker_id()` form failed RLS WITH CHECK at runtime while the structurally-equivalent `(SELECT current_worker_id())` form on `payslip_facts` worked fine for the same worker in the same session.
**Proposed rule:**
> "When verifying an RLS policy as part of an Unknowns Gate resolution, ALWAYS quote both `qual` (USING) and `with_check` verbatim from `pg_policies`. A USING-only check is incomplete and gives false safety. The `qual` and `with_check` predicates may be structurally equivalent on paper but evaluated differently by Postgres at runtime — particularly when policies call functions that read session-local config (`auth.jwt()`, `current_setting()`)."
**Where to land:** Likely an addition to the `Unknowns Gate` section in CLAUDE.md (under "Architectural unknowns — STOP and ask" → expand the "Database schema, table relationships, column types, JSON shapes" bullet, or add a new bullet like "RLS policies — both USING and WITH CHECK clauses").
**Awaiting:** approval batch (matches prior CAL-001 / CAL-002 cadence — applied as a CLAUDE.md edit when the next hygiene window opens, not piecemeal).
