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
- `research` — surfaced by an external research note or competitive scan

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

### INFRA-002 — Flip Vercel Deployment Protection to "Only Preview"
- **Severity:** LOW
- **Source:** audit
- **Status:** OPEN
- **Found:** 2026-04-26 by Jovi (s002 hour 1)
- **What:** Currently the team's SAML SSO gates every uncached path on production deployments (verified after Hour 1 push — `/`, `/dashboard` returned cached 200s; `/onboarding`, `/design-system/` hit the SSO gate uncached). Once Clerk auth becomes the production gate, flip Project → Settings → Deployment Protection to "Only Preview Deployments" so production is publicly accessible.
- **Why:** PALM workers can't sign up if production requires Vercel SSO. Gate decision must come from Clerk (worker-facing), not Vercel SSO (operator-facing).
- **Effort:** S (single dashboard toggle)
- **Dependencies:** Clerk auth shipped (now done, s002 hour 2).

### INFRA-003 — Password manager setup before Phase 1 backend deploy
- **Severity:** LOW
- **Source:** audit
- **Status:** OPEN
- **Found:** 2026-04-26 by Jovi (s002 hour 2)
- **What:** Set up a password manager (Bitwarden, 1Password, or similar) and migrate operational secrets there before Phase 1 backend deploys. SEC-001 highlighted that there's currently no secure store for production secrets — they live in screenshots, chats, or ad-hoc files.
- **Why:** Phase 1 introduces real secrets that need persistent storage (Clerk `sk_live_`, Supabase service role, Stripe keys later). Password manager is the canonical source; Fly.io / Vercel project env is the runtime delivery; this project never holds them.
- **Effort:** S (account + initial vault).
- **Dependencies:** None.

### DEV-001 — /design-system/ shows blank in `npm run dev`
- **Severity:** LOW
- **Source:** jovi-test
- **Status:** OPEN
- **Found:** 2026-04-26 by Jovi (s002 hour 2 verify)
- **What:** Visiting `http://localhost:5173/design-system/` in `npm run dev` mode renders a blank page. `npm run preview` (and Vercel production) serve the design-system landing correctly at the same URL — confirmed in s002 hour 1.
- **Why:** Likely Vite dev-server SPA fallback intercepting `/design-system/` before resolving the static `public/design-system/index.html`. React Router does NOT catch it (no route matches `/design-system/`). Workaround for now: hit `/design-system/index.html` directly, or use `npm run preview`.
- **Effort:** S — likely a `vite.config.ts` middleware / `appType: 'mpa'` flag, or a small dev-only Express middleware. Worth a 30-minute investigation.
- **Dependencies:** None — doesn't block any Phase 0 work because the design system isn't actively edited from the React dev loop.

### RES-001 — "Live App Wiki" / claims-citations layer (Phase 5+ research)
- **Severity:** LOW
- **Source:** research
- **Status:** OPEN
- **Found:** 2026-04-26 by Jovi (s003h4)
- **What:** Investigate a "Live App Wiki" / claims-citations layer. Pattern: auto-summarised narrative pages built from `confirmed_facts`; RAG retrieval over those summaries when the worker asks "why does the report say X?"; every claim cites back to the source document(s) and confirmed facts that produced it.
- **Why:** Validates against ADR-001 (citations preserve provenance — the LLM remains a synthesiser, never authoritative) and ADR-005 (narrative summaries are themselves an index, not a full-history dump). Could materially improve readability for the advocate persona who reads a comparison report cold. Defer until Phase 0 is in real-worker hands so the design is informed by actual usage rather than a hypothesis.
- **Effort:** L (research-heavy investigation; not a build task yet)
- **Dependencies:** Phase 0 ships and Apete uses for ≥4 pay periods — gates the design with real surface area.

### INFRA-004 — Account recovery plan for solo-founder operational accounts
- **Severity:** LOW
- **Source:** audit
- **Status:** OPEN
- **Found:** 2026-04-26 by Jovi (s003h4)
- **What:** Document where Clerk, Supabase, Vercel, and GitHub credentials live (password manager once INFRA-003 ships); enable 2FA on each; confirm recovery email is current; print recovery codes and store in a safe place.
- **Why:** Solo founder = single point of failure. Losing access to any one of the four = a production outage that's hard to recover from quickly, with no second person to fall back on. Cheap insurance; the runbook protects future-Jovi from a forgotten phone or a stolen laptop.
- **Effort:** S (one operations runbook + actual setup of 2FA recovery codes; ~1 hour).
- **Dependencies:** INFRA-003 (password manager). Recovery codes belong in the manager, not in screenshots.

### INFRA-005 — PWA manifest + offline shell (installable on mobile home screen)
- **Severity:** LOW
- **Source:** audit
- **Status:** OPEN
- **Found:** 2026-04-26 by Jovi (s003h4)
- **What:** Add a Web App Manifest + a basic service worker so PayChecker is installable on a worker's mobile home screen with an offline shell. "Real mobile app feel" without app-store deployment.
- **Why:** Apete-shaped: regional NSW, patchy data, an installed-on-home-screen PWA reads as a "real app" and survives intermittent connectivity for the read-only shell. Full offline sync (write-while-disconnected) is the Phase 5 ask in `PLAN-PRJ-mvp-phases.md`; this entry is the smaller wedge — install + offline shell only — that lands pre-Apete-handoff.
- **Effort:** S (manifest + minimal service worker for offline shell; ~half-day).
- **Dependencies:** None.
