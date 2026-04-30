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

### POL-001 — Privacy policy v1: disclose Anthropic + Voyage as data processors
- **Severity:** HIGH
- **Source:** claude-review
- **Status:** DRAFTED — awaiting lawyer review
- **Found:** 2026-04-29 by Jovi (Sprint A3 + REF)
- **What:** Privacy policy v1 (Phase 0 finish-line per ADR-006) must list **Anthropic** AND **Voyage AI** as data processors. Disclose what content travels to each (document content for both; embeddings stored in Supabase but NOT sent back), retention bounds (Anthropic: API session; Voyage: same shape per current ToS), and worker right to refuse upload + use the manual fallback path. R-010 + R-011 in `docs/architecture/risks.md` pin the boundaries.
- **Why:** APP 1 + APP 3 + APP 5 + APP 6 + APP 8 obligations. Without this disclosure, the upload-first surface (ADR-013) ships without satisfying APP 1 ("open + transparent management") for cross-border disclosure to two new processors. Existing Phase 0 finish-line item per ADR-006; this entry adds the specifics.
- **Effort:** M (legal-adjacent copy + plain-language explainers + worker-readable surface; ~half-day with legal-adjacent review).
- **Dependencies:** None for drafting; legal review optional for Phase 0 (ASIC's "personal undertaking" model permits operator self-attestation if accurate).
- **Drafted:** 2026-04-29 by Sprint POL-001 — `docs/legal/privacy-policy-v1-draft.md`. 12 sections; APP 1/3/5/6/11/12/13 addressed; 5 processors disclosed (Clerk / Supabase / Anthropic / Voyage AI / Vercel); plain-English ESL-readable. Next step: lawyer review (9 outstanding decisions flagged in the draft's "Notes for the operator" section). Status flips to FIXED once the lawyer-reviewed version ships at the actual privacy policy URL with `privacy_policy_version` bumped to `'v1'` in the consent records.

### POL-002 — Migration 0012 candidate: FK indexes + `(SELECT auth.jwt())` wrapping on early policies
- **Severity:** LOW
- **Source:** audit
- **Status:** FIXED
- **Found:** 2026-04-29 by Jovi (Sprint A5)
- **What:** Bundle two pre-existing tech-debt fixes into a single migration (0012 candidate). (1) Add covering indexes on the 9 FK columns flagged in ISS-002 (`*_facts.source_doc_id`, `*_facts.employer_id`, `worker_classification_facts.award_id`). (2) Re-write the 7 policies flagged in ISS-003 with `(SELECT auth.jwt())` wrapping pattern (workers / employers / awards / award_rates / award_allowances).
- **Why:** Closes 16 advisor lints in one migration. Performance impact at Phase 0 is negligible; at Phase 1+ traffic, both become real. Phase 0 cost is small; deferring past Phase 1+ launch costs more.
- **Effort:** S (~30 min — DDL drafting + verification + advisor re-run).
- **Dependencies:** None. Can ship any time; ideally bundled with another migration to amortise the apply step.
- **Drafted:** 2026-04-28 by Sprint POL-002-PREP (commit `9a5e2da`).
- **Applied:** 2026-04-29 by Sprint POL-002-APPLY via Supabase MCP `apply_migration`. 9 FK indexes created; 8 RLS policies rewritten (DROP + CREATE; original NAME / COMMAND / USING/WITH CHECK shape preserved). Verified via direct `pg_indexes` + `pg_policy` queries. ISS-002 + ISS-003 closed in same sprint. Note: the `auth_rls_initplan` advisor showed stale cache (8 entries) immediately post-apply despite the policies being structurally correct — pg_policy is the truth source.

### POL-003 — Migration 0013 candidate: `payslips` bucket cleanup post-Sprint-B1
- **Severity:** LOW
- **Source:** audit
- **Status:** OPEN
- **Found:** 2026-04-29 by Jovi (Sprint A5)
- **What:** After Sprint B1 ships the `src/lib/upload.ts` constant update (`'payslips'` → `'documents'`) and verifies no production traffic still references the `payslips` bucket, drop the alias. Migration 0013 candidate: drop the 3 storage policies on `payslips`, drop the `payslips` bucket from `storage.buckets`. Fast follow-up to ISS-001's resolution.
- **Why:** Removes a misleadingly-named storage path; reduces operator confusion ("which bucket is the canonical one?"); aligns code, schema, and storage. Cheap once the dependency (Sprint B1) is satisfied.
- **Effort:** S (~10 min — small migration + verification + advisor re-run).
- **Dependencies:** ISS-001 closed (Sprint B1 ships upload.ts update).

### POL-004 — Calculation Explanation Layer
- **Severity:** HIGH
- **Source:** Apete brainstorm 2026-04-29 + ChatGPT integration critique
- **Status:** PLANNED — integration shape locked, awaits ADR-014 ratification
- **Found:** 2026-04-29 by Jovi (Sprint INTEG-001)
- **What:** Insert a new component BETWEEN Calc Engine (Sprint E) and Comparison Output. Operationalises ADR-009's §"Reporting requirement" + ADR-007's gate-3. New table `calculation_explanations` (Migration 0013 candidate) with `comparison_id` FK, `result_type`, `status` (calculator-language enum: `matches` / `difference_found` / `needs_checking` / `cannot_calculate` / `missing_information`; legal-language values forbidden per ADR-003), `reason_code`, `explanation_jsonb`, `sources_jsonb`, `checks_needed_jsonb`. Detailed integration shape lives in `docs/architecture/integration-plan-v01.md` Layer A.
- **Why:** Bare numbers reaching the worker violate ADR-003 (info not advice) at scale. ADR-009 already mandates a "How we computed this" surface but the schema doesn't structurally support it. POL-004 closes the gap: comparison cannot render without an explanation row attached.
- **Effort:** M (Phase 1+ build — ADR-014 ratification + Migration 0013 + composer logic + renderer integration).
- **Dependencies:** Sprint E ships first; Sprint E's design must adopt the **NEW DESIGN CONSTRAINT** flagged below.
- **Sprint E DESIGN CONSTRAINT (added by Sprint INTEG-001 audit):** Sprint E's output (`comparisons.expected_amounts` jsonb) MUST expose structured metadata: `inputs_used` (fact-id list + values consumed), `rules_applied` (calc-rules-v01 rule-id list), `sources_used` (award_rates / award_allowances ids + effective-from + document references), `checks_needed` (unresolved questions). Without this, POL-004 retrofit later is impossible for past comparisons (immutable per ADR-005). **Day-1 inclusion is operationally required.**

### POL-005 — Worker Context Layer
- **Severity:** MED
- **Source:** Apete brainstorm 2026-04-29 + ChatGPT integration critique
- **Status:** PLANNED — integration shape locked, awaits ADR-015 ratification
- **Found:** 2026-04-29 by Jovi (Sprint INTEG-001)
- **What:** New table `worker_context` (Migration 0014 candidate) holding self-declared identity + preference (visa status, ESL preference, explanation depth, dependency awareness, preferred address form / locale). Distinct from Layer 3 memory (`worker_extraction_preferences` is OBSERVED via EMA; Worker Context is SELF-DECLARED via Settings UI). Integration shape: pre-render adapter between Calculation Explanation Layer (POL-004) and worker UI. Detailed shape in `integration-plan-v01.md` Layer B.
- **Why:** ADR-003 framing rules (info not advice) need tone adaptation for ESL workers and PALM-cohort cultural context without ever changing the calc result. Worker Context provides that adapter input. Critical guardrail: adapts TONE, never MATH.
- **Effort:** M (Phase 1+ build — ADR-015 ratification + Migration 0014 + Settings UI + pre-render adapter logic).
- **Dependencies:** POL-004 ships first (provides input to the adapter); privacy policy v2 update (R-004 mitigation for `dependency_awareness_jsonb` data); ratification of "tone not math" as a non-negotiable in ADR-015.
- **R-004 elevation:** `worker_context.dependency_awareness_jsonb` (housing via employer, transport via employer, visa sponsorship) is a top-priority redaction target for the operator read-redacted view (Phase 1+ per R-006). Mandatory mitigation before ship.

### POL-009 — `useUploadBatch` two-parallel-sources-of-truth refactor (Phase 1+)
- **Severity:** MED
- **Source:** Codex adversarial review during Sprint B1.7
- **Status:** IMPLEMENTED — Sprint B1.8 (brought forward from Phase 1+)
- **Implemented:** 2026-04-30 by Sprint B1.8 — refactored `useUploadBatch` to explicit-parameter passing per option (a). `workerIdRef` and `batchIdRef` both eliminated; `addFiles` now returns `{ entries, batchId }` synchronously; `startUpload` takes explicit `(entries, workerId, batchId)` parameters. All setState calls use pure functional updaters with no closure side effects. Closes ISS-007 + ISS-008 simultaneously and prevents the next instance of this anti-pattern.
- **Found:** 2026-04-30 by Codex adversarial review (root-cause investigation that surfaced ISS-007)
- **What:** `src/features/upload/useUploadBatch.ts` currently maintains two parallel sources of truth: `state.workerId` mirrored by `workerIdRef.current`, and `state.batchId` mirrored by `batchIdRef.current`. They must be kept in lock-step manually with zero compiler enforcement and zero tests. ISS-007 was exactly the failure mode this pattern predicts — a writer forgot to keep the ref in sync with state, and the bug only surfaced on the first browser smoke. Refactor to one of:
  - **(a)** Pass `workerId`/`batchId` as explicit parameters to `startUpload(workerId, batchId, files)`. Drop the refs entirely. The caller (`UploadZone`) reads from `uploadState`. Stale closures become caller-visible: if React hasn't flushed yet, the values aren't there, the click cycle waits one render. No refs, no shadow state, no race.
  - **(b)** Move the entire upload-state machine into a `useReducer`. `addFiles` and `startUpload` become dispatched actions on the same state machine, processed in order. The reducer never reads from refs.
- **Why:** Either is structurally less buggy than refs-mirroring-state. Worth a Phase 1+ hardening pass with tests that exercise the click cycle, including the once-burned "first click after mount" path.
- **Effort:** M (~60-90 min — touches `useUploadBatch` + `UploadZone` caller; test additions).
- **Dependencies:** B1.7 ships first (closes the immediate bug). Refactor lands in a Phase 1 hardening sprint after SMOKE-001 confirms the surgical fix is sufficient.

### POL-010 — Distinguish worker-null vs batch-null in `startUpload` loud-fail branch
- **Severity:** LOW
- **Source:** Codex adversarial review during Sprint B1.7
- **Status:** IMPLEMENTED — Sprint B1.8 (closed by removal)
- **Implemented:** 2026-04-30 by Sprint B1.8 — the loud-fail branch (B1.5's `if (!workerId || !batchId) { ... 'Account not ready' ... }`) was removed entirely. Explicit-parameter passing in the refactored `startUpload` makes those null states unreachable from any caller path: `UploadZone`'s handlers gate on `state.workerId` before calling, and `addFiles` always returns a non-null `batchId`. Distinguishing the two cases is moot when neither is reachable. The defense-in-depth this branch was meant to provide is replaced by structural impossibility (TypeScript signature requires non-nullable `workerId: string` and `batchId: string`).
- **Found:** 2026-04-30 by Codex adversarial review
- **What:** B1.5's loud-fail branch at `useUploadBatch.ts:125-139` fires for ANY null read of either ref, conflating two distinct failure modes. After B1.7, batch-null should be impossible by invariant (the ref is set synchronously before `startUpload` reads it). POL-010: split the branch into two distinct paths:
  - `if (!workerId) → 'Account not ready — try refreshing.'` (real auth issue; user-facing copy stays as is)
  - `if (!batchId) → throw new Error('batch invariant violated')` (control-flow bug; crash loudly so the next regression in this shape is caught immediately, not papered over with a misleading user message)
- **Why:** Misleading copy is what made ISS-007 hard to diagnose — the network tab said "worker resolved" but the UI said "Account not ready". Different failure modes deserve different handling. Crashing on the impossible case turns the next regression into a fast obvious failure rather than a slow surface-level smoke.
- **Effort:** S (~15 min — split the conditional + add the throw + manual smoke).
- **Dependencies:** B1.7 ships first. POL-010 is post-B1.7 polish; can bundle with POL-009 in the same hardening sprint.

### POL-011 — Upload pipeline regression test suite (Phase 1+)
- **Severity:** MED
- **Source:** Codex adversarial review during Sprint B1.8 (ISS-008 diagnosis)
- **Status:** PLANNED — Phase 1+ once test infrastructure exists
- **Found:** 2026-04-30 by Jovi (Sprint B1.8)
- **What:** Add a smoke test that asserts a selected JPEG flowing through `useUploadBatch` produces an actual `uploadDocument()` call (not just a status pill flip to `'uploading'`). Catches future state-machine regressions in the upload hook automatically.
- **Why:** Three bugs (ISS-005 silent hang, ISS-007 first-click race, ISS-008 silent stall) in 24 hours all in `useUploadBatch`. All three would have been caught by a single integration test that asserted "given selected files + resolved worker, `uploadDocument` is invoked at least once." Manual browser smoke is expensive and only catches regressions when somebody happens to look; a test runs in milliseconds and catches them on every commit.
- **Effort:** M (~90 min — vitest + jsdom + `@testing-library/react` + Supabase client mock + the test itself).
- **Dependencies:** Test infrastructure decision (vitest vs jest); Phase 0 has none currently. ADR-018 candidate worth ratifying when scheduled.
- **Pattern note:** This would be the FIRST regression test in PayChecker. Defer until test framework ratified via ADR.
- **What this would have caught:**
  - ISS-005: would fail (worker resolution failure → upload hangs at "Waiting" → no uploadDocument call)
  - ISS-007: would fail (first click → loud-fail branch → no uploadDocument call)
  - ISS-008: would fail (uploading pill but no uploadDocument call — the assertion target)

### POL-008 — RLS-level consent enforcement on `documents` INSERT (Phase 1)
- **Severity:** MED
- **Source:** Sprint B1.5 audit + B1.6 fix
- **Status:** PLANNED — defense-in-depth for Phase 1
- **Found:** 2026-04-30 by Jovi (Sprint B1.6)
- **What:** Add an `EXISTS (SELECT 1 FROM consent_records WHERE worker_id = current_worker_id())` predicate to the `documents_self_insert` RLS policy (0002:560). Migration 0013 candidate (or 0014, depending on POL-002-style sequencing). Considered analogous tightening on `worker_classification_facts` / other `*_facts` INSERT policies in the same migration.
- **Why:** Layers (a) route guard + (c) server-side check shipped in B1.6 handle UI + application-server. RLS is the authoritative gate that survives even server-side bugs (e.g., a future regression in `api/classify.ts` that drops the check, or a new server endpoint that forgets it). Defense-in-depth matters when handling vulnerable-worker data crossing borders. ADR-001 (confirmation sacred) + the Privacy Act APP 1 / 6 / 8 obligations both push toward the strongest available enforcement mechanism, which is PostgreSQL-level RLS.
- **Effort:** S (~30 min — small migration: ALTER POLICY + advisor verify + smoke test that consent-missing INSERT errors as expected; consent-present INSERT still passes).
- **Dependencies:** B1.6 layers (a)+(c) ship first (this entry's reason for existing). Migration 0013 ratified separately as either an ADR or a simple migration note.
- **Residual risk this entry addresses:** Direct service-role DB writes that bypass application-level checks; future code-path regressions in `api/classify.ts` or any new server endpoint that touches `documents`. RLS policy is enforced at PostgreSQL level — cannot be bypassed by JavaScript bugs.
- **Verification path post-apply:** Re-run a fresh-user smoke (no consent_records row) and attempt INSERT into `documents` directly via `psql --role authenticated`; expect RLS denial. Consent-present user attempts INSERT; expect success. Advisor scan should flag no new performance regressions (the predicate is a single index lookup on `consent_records_worker_id_idx`).

### POL-006 — Sentiment / Safety Layer
- **Severity:** LOW
- **Source:** Apete brainstorm 2026-04-29 + ChatGPT integration critique
- **Status:** DEFERRED — explicit conjunctive re-trigger conditions
- **Found:** 2026-04-29 by Jovi (Sprint INTEG-001)
- **What:** A future sentiment/safety surface that monitors worker affective state and surfaces safety nudges. NOT designed today. NOT modelled today. Detailed deferral analysis in `integration-plan-v01.md` Layer C.
- **Why deferred:** Nearest the boundary between info-tool and advice-tool (ADR-003 risk). ESL classifier risk (generic English sentiment misreads ESL emotional valence). APP 6 disclosure gap (sentiment classification crosses "use only as disclosed"). Workplace dependency cascade unmodeled.
- **Re-trigger conditions (ALL conjunctive — not disjunctive):**
  1. Real-world Phase 1 data shows tone adaptation BEYOND Worker Context self-declaration is needed (concrete signal from Apete or cohort).
  2. Sentiment classifier validated on ESL text (PALM corpus or Pacific-Islander English benchmark).
  3. Privacy policy v3 update designed (sentiment-specific disclosure + worker opt-in).
  4. ADR-016 ratified with explicit "advice vs information" boundary acknowledgment.
  5. Workplace dependency consequences modelled (sentiment + employer-controlled-housing cascade).
- **If any one is missing: defer.** Until ALL hit, no design work.
- **Effort:** L (Phase 2+ — full ADR + new processor disclosure + classifier validation + UI design).

### INFRA-007 — Install `poppler` / `pdftotext` for PDF extraction in research workflow
- **Severity:** MED
- **Source:** audit
- **Status:** CLOSED
- **Found:** 2026-04-27 by Jovi (s003h8 / Sprint 3)
- **Closed:** 2026-04-28 (Sprint 4). `pdftotext` (xpdf-derived, version 4.00) was already on `PATH` in the local Git Bash environment — no install needed. The Sprint 3 wall was an extractor-pipeline mismatch (`WebFetch` content extractor read the FWC PDF as font metadata only), not an actual missing-tooling problem. `WebFetch` + `pdftotext -layout` is now the canonical research path for FWC PDFs: `WebFetch` saves the PDF to a local cache, then `pdftotext -layout <pdf> <txt>` extracts the embedded text layer with structure preserved. Closed via Sprint 4: MA000074 Schedule A.1.1 / A.1.2 / A.1.3 captured verbatim into `docs/research/awards-ma000074-v02.md`. Future award PDFs (MA000059, MA000009, MA000028) unblocked via the same pattern.
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
