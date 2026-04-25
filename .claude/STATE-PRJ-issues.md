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

_None._

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
