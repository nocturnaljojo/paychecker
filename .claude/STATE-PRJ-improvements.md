# STATE-PRJ-improvements.md — PayChecker improvements backlog
# Polish, UX nudges, small bugs, DX wins, refactor candidates. NOT for blocking issues.
# For bugs / blockers / regressions see STATE-PRJ-issues.md.

## Severity legend

- **HIGH** — visible to current users, friction-causing, should be done this phase
- **MED** — affects most users at low cost, do when in area
- **LOW** — small win, do opportunistically
- **TRIVIAL** — cosmetic / DX-only / nice-to-have

## Source codes

- `jovi-test` — caught by Jovi during dogfooding
- `founder-fb` — flagged in founder feedback / planning conversation
- `audit` — surfaced by the auditor agent
- `demo-prep` — found while preparing a demo
- `claude-review` — flagged by Claude during a review pass

## Status legend

- **OPEN** — captured, not started
- **PLANNED** — accepted, scheduled to a phase
- **IN PROGRESS** — actively being worked on
- **FIXED** — closed; commit hash + date noted
- **WONTFIX** — closed without fix; reason noted
- **DUPLICATE** — closed; refers to another improvement ID

## Format

```
### IMP-NNN — short title
- **Severity:** TRIVIAL | LOW | MED | HIGH
- **Source:** jovi-test | founder-fb | audit | demo-prep | claude-review
- **Status:** OPEN | PLANNED | IN PROGRESS | FIXED | WONTFIX | DUPLICATE
- **Found:** YYYY-MM-DD by {who} (session-NNN)
- **What:** one-sentence improvement
- **Why:** the user/dev outcome it improves
- **Effort:** S | M | L
- **Closed:** YYYY-MM-DD by commit `{hash}` (or reason)
```

---

## Open improvements

### INFRA-001 — Bundle the Node + React + Vite + TS upgrade
- **Severity:** LOW
- **Source:** audit
- **Status:** OPEN
- **Found:** 2026-04-26 by Jovi (s002)
- **What:** Upgrade Node 20.17 → 22.x, React 18.3 → 19, Vite 5.4 → 8, TypeScript 5.6 → 6 — bundle as a single Phase 1 dependency-upgrade sprint rather than four separate decisions.
- **Why:** Phase 0 deliberately pinned to mature stable majors (proven shadcn/Tailwind ecosystem, Node-engine compatible). Phase 1 will eventually want the modern stack; bundling avoids four mid-flight breakages.
- **Effort:** M
- **Dependencies:** Tailwind v3 → v4 likely required at the same time; shadcn CLI patterns will have moved on by then.
