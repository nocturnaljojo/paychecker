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
- **Severity:** MED
- **Source:** audit
- **Status:** OPEN
- **Found:** 2026-04-26 by Jovi (s002 hour 1)
- **What:** Currently the team's SAML SSO gates every uncached path on production deployments (verified after Hour 1 push — `/`, `/dashboard` returned cached 200s; `/onboarding`, `/design-system/` hit the SSO gate uncached). Once Clerk auth becomes the production gate, flip Project → Settings → Deployment Protection to "Only Preview Deployments" so production is publicly accessible. **Re-rated MEDIUM 2026-04-26 s003h6: will hard-block Apete signup at Phase 0 ship. Re-rate to HIGH when Phase 0 comparison engine is complete.**
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

### INFRA-006 — REVOKE EXECUTE on `*_history` SECURITY DEFINER trigger functions
- **Severity:** LOW
- **Source:** audit
- **Status:** CLOSED
- **Found:** 2026-04-27 by Jovi (s003h7 / Sprint 2.5)
- **Closed:** 2026-04-27 by migration `0007_revoke_history_functions_from_public.sql` (Sprint 2.6). `REVOKE FROM PUBLIC` cleared all 10 advisor lints (rules 0028 + 0029); trigger semantics confirmed intact via in-DB smoke test (insert worker + employer + shift_fact, UPDATE the shift_fact, observe a row in `shift_facts_history` — 1 row written, rolled back).

### INFRA-007 — Install `poppler` / `pdftotext` for PDF extraction in research workflow
- **Severity:** MED
- **Source:** audit
- **Status:** OPEN
- **Found:** 2026-04-27 by Jovi (s003h8 / Sprint 3)
- **What:** Sprint 3 hit a hard wall trying to extract Schedule A definitions for MA000074. The FWC publishes consolidated awards as long single-page HTML that the `WebFetch` extractor truncates before reaching the Schedules; the FWC exposure-draft PDFs are image-encoded with no embedded text layer; the environment lacks `pdftoppm` / `pdftotext` (`Read` tool errors with "pdftoppm not found"). Every web-accessible path failed identically — see `docs/research/awards-ma000074-v02.md` §X for the full sourcing log.
- **Why:** Every future award research pass (`MA000059` Meat Industry — Phase 3; `MA000009` Hospitality — Phase 2; `MA000028` Horticulture — Phase 4) will hit this same wall when their Schedules need verbatim extraction. One-time tooling install unblocks all of them. Without it, every award costs an extra ~15 min of manual browser-download + paste per Schedule.
- **Effort:** S (~5 min one-time install: `poppler` package via the local platform's package manager, expose `pdftoppm` and `pdftotext` on `PATH`).
- **Closes:** the immediate gap blocking v02 Schedule A definitions for MA000074, AND unblocks all future award Schedule A research workflows.
- **Verification path once installed:** re-run Sprint 3's failed step — `WebFetch` saves the FWC PDF locally, `Read` invokes `pdftoppm`, Schedule A.1/A.2/A.3 verbatim text returns, v02 captures it. Same flow works for any subsequent award.
- **What:** Pre-existing finding caught by Supabase advisor (rules 0028 + 0029) during Sprint 2 verification: 5 `SECURITY DEFINER` trigger functions from migration 0002 (`log_bdf_history`, `log_psf_history`, `log_scf_history`, `log_sf_history`, `log_wcf_history`) are exposed via `/rest/v1/rpc/...` to anon + authenticated roles. They are trigger-only by design; never meant to be RPC-callable.
- **Why:** Defense in depth — `SECURITY DEFINER` functions intended for trigger-only invocation should not have an RPC surface, even if calling them directly would error (OLD/NEW are undefined outside trigger context). Closes the lint surface; aligns with principle of least privilege.
- **Sprint 2.5 attempt (migration 0006, applied 2026-04-27):** `REVOKE EXECUTE ON FUNCTION public.log_*_history() FROM anon, authenticated;` for all five functions. Migration applied successfully but **the advisor lints did NOT clear** — same 10 WARN entries remain.
- **Diagnosis (the Postgres trap):** function `EXECUTE` is granted to `PUBLIC` by default at function creation time. `PUBLIC` is a pseudo-role that implicitly includes every role including `anon` and `authenticated`. `REVOKE EXECUTE ... FROM anon, authenticated` is a no-op when the actual grant chain is via `PUBLIC`. The lint reports the effective callability (anon CAN call → flagged), and the effective callability is unchanged after REVOKE FROM specific roles.
- **Sprint 2.6 fix:** new migration with `REVOKE EXECUTE ON FUNCTION public.log_*_history() FROM PUBLIC;` (the canonical fix). Optionally explicit `REVOKE FROM anon, authenticated;` belt-and-braces. Re-run advisor; expect 10 lints to clear.
- **Effort:** S (~5 min — one migration with 5 REVOKE-FROM-PUBLIC statements).
- **Dependencies:** None. Trigger semantics unaffected (the trigger machinery invokes via the table owner's privileges, not via `PUBLIC`).
