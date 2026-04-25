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

_None yet — first issue goes here._
