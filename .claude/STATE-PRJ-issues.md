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
- **Status:** OPEN
- **Found:** 2026-04-29 by Jovi (Sprint A5)
- **Phase:** 0 (Sprint B1 target)
- **Symptom:** `src/lib/upload.ts:3` hardcodes `PAYSLIPS_BUCKET = 'payslips'`. Migration 0011 created the new `documents` bucket but retained `payslips` as an alias to avoid breaking the existing Sprint 7 manual form. Once the alias is removed (a later cleanup migration after Sprint B1), the constant must already point at `'documents'` or every call in the file fails.
- **Repro:** none in current state — alias keeps things working. Fails when `payslips` bucket is dropped without updating the constant.
- **Root cause:** Sprint 7 (`e949ce1`) was designed pre-ADR-013 when `payslips` was the only bucket. ADR-013 introduced a per-type-in-path strategy under a renamed `documents` bucket; the rename + constant-update were intentionally split for safety.
- **Fix:** Sprint B1 updates `src/lib/upload.ts` constant to `'documents'` AND updates the upload path-shape to match `storage-architecture-v01.md` filename convention. After B1 ships, a follow-up migration removes the `payslips` bucket.
- **Closed:** _open_

### ISS-002 — 9× `unindexed_foreign_keys` performance advisor (pre-existing)
- **Severity:** P3
- **Status:** OPEN
- **Found:** 2026-04-29 by Jovi (Sprint A5)
- **Phase:** 0 (cross-cutting)
- **Symptom:** Supabase performance advisor flags FK columns without covering indexes on `bank_deposit_facts.source_doc_id`, `payslip_facts.employer_id`, `payslip_facts.source_doc_id`, `shift_facts.employer_id`, `shift_facts.source_doc_id`, `super_contribution_facts.source_doc_id`, `worker_classification_facts.award_id`, `worker_classification_facts.employer_id`, `worker_classification_facts.source_doc_id`. Pre-existing — NOT introduced by Migration 0011.
- **Repro:** Supabase MCP `get_advisors(type='performance')` returns 9 INFO-level rows for these FKs.
- **Root cause:** Migrations 0002 + 0005 created FK constraints without explicit covering indexes. At Phase 0 row counts (≤ tens of rows per table) the impact is negligible; at Phase 1+ scale this becomes real.
- **Fix:** see IMP-NNN — Migration 0012 candidate (FK indexes on `*_facts`).
- **Closed:** _open_

### ISS-003 — 7× `auth_rls_initplan` performance advisor (pre-existing)
- **Severity:** P3
- **Status:** OPEN
- **Found:** 2026-04-29 by Jovi (Sprint A5)
- **Phase:** 0 (cross-cutting)
- **Symptom:** Supabase performance advisor flags WARN-level entries on policies for `workers`, `employers`, `awards`, `award_rates`, `award_allowances` — these policies call `auth.jwt()` directly instead of `(SELECT auth.jwt())` so the planner re-evaluates per row. Pre-existing — NOT introduced by Migration 0011.
- **Repro:** Supabase MCP `get_advisors(type='performance')` returns 7 WARN-level entries with rule `auth_rls_initplan`.
- **Root cause:** Migrations 0002 + 0005 + 0007 wrote policies before this Supabase advisor existed; the `(SELECT ...)` wrapping pattern was adopted later (Migration 0009 + 0010 use it correctly).
- **Fix:** see IMP-NNN — Migration 0012 candidate would also re-write these 7 policies with `(SELECT auth.jwt())` wrapping. Bundle with the FK index work.
- **Closed:** _open_

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

## Closed issues

### SEC-001 — Clerk dev secret key briefly exposed in chat
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
