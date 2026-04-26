# PLAN-PRJ-mvp-phases.md — PayChecker
# Locked 6-phase MVP plan. Update checkbox state ONLY when a task is verifiably done.
# Do not add new phases without an idea-to-execution review.
# Phase order is fixed — earlier phases gate later ones.

Legend: `[ ]` pending · `[~]` in progress · `[x]` complete · `[!]` blocked

---

## PHASE 0 — Apete's Calculator

**Goal:** One worker, Poultry Processing Award MA000074, manual entry only. Prove the model works end-to-end for a single human before generalising.

**User:** Apete (Fijian PALM-scheme chicken catcher, regional NSW)

### Tasks

- [x] Set up React + Vite + TypeScript + Tailwind base (s002 — at root; design system moved to `public/design-system/`)
- [x] Wire shadcn/ui and import design tokens from `colors_and_type.css` (s002 — manual base; CLI deferred to INFRA-001 due to Tailwind v4 requirement)
- [x] Set up Supabase project (Sydney region — ap-southeast-2) (project `paychecker` / `zzppuwyufloobskinehf`, ap-southeast-2; created prior to s003)
- [x] Set up Clerk auth (test mode) (s002 hour 2 — @clerk/clerk-react@^5.61, ClerkProvider + sign-in/up + ProtectedRoute + auth-aware Landing; verified end-to-end with test account "Jovilisi")
- [x] Define DB schema in `.claude/ref/REF-DB-schema.md` and apply migrations (s003 — `0002_phase0_full_schema` + `0003_payslips_storage_bucket`; 17 tables, RLS via Clerk-JWT helper, audit triggers, immutable comparisons; smoke-tested 14/14 + 2/2 defense-in-depth)
- [ ] Build educational onboarding (6 screens) + consent capture (per design mock; orient-don't-collect; captures name + optional country/language only)
- [ ] Add `country` + `preferred_language` columns to `workers` (migration 0004)
- [ ] Create `consent_records` table (immutable; per APP-1/APP-6 audit obligation)
- [ ] Build "Your data" home screen at `/dashboard` (5 worker-facing bucket stubs per `YourData.jsx`)
- [ ] Move smoke-test upload UI to `/debug` (env-gated, dev-only)
- [ ] Privacy policy v1 placeholder route at `/privacy` (real content blocks ship-to-real-worker)
- [ ] Layer 1 facts capture (employer + classification + pay terms) — manual entry inside the "Employment contract" bucket flow
- [ ] Build shift logging (Layer 2 facts) — "Shifts" bucket flow
- [ ] Build manual payslip entry (Layer 3 facts) — "Payslips" bucket flow
- [ ] Research note for MA000074 (`docs/research/awards-ma000074-v01.md` via `researcher` agent + `SKILL-AWARD-add-new.md`)
- [ ] Build Poultry Processing Award MA000074 reference data (seed `awards` + `award_rates`)
- [ ] Build comparison engine v1 (rate, hours, OT)
- [ ] Build basic PDF report (IBM Plex Serif, sentence-case)
- [ ] Privacy policy v1 — real content (research-heavy; cannot ship to a real worker without it)
- [ ] Apete uses for 4 consecutive pay periods
- [ ] Third-party reviewer (union/WWSP) confirms accuracy

**Success criterion:** Apete uses 4 consecutive pay periods. Calculations match a manual spreadsheet to the cent. Reviewer agrees the report is accurate and useful.

**Gate to Phase 1:** all tasks above checked + reviewer signoff documented in `docs/planning/phase-success-criteria.md`.

---

## PHASE 1 — Apete's Household

**Goal:** Self-serve onboarding for 4–6 workers including Apete's roommate. The onboarding flow has to survive English-as-second-language users without hand-holding.

### Tasks

- [ ] Self-serve account creation (Clerk, mobile-friendly)
- [ ] Onboarding wizard works without a support session
- [ ] FastAPI backend stood up (Fly.io, Sydney) — calc moves server-side
- [ ] Multilingual onboarding (English + Fijian / Tongan starter strings)
- [ ] Roommate referral flow
- [ ] Cohort dashboard (admin view) — shows household health
- [ ] 4–6 active users across at least 2 households
- [ ] Each user runs at least 2 comparisons without operator help

**Success criterion:** Six PALM workers self-serve onboarded in one week, each runs ≥2 comparisons unaided.

---

## PHASE 2 — Paid Tier Launches

**Goal:** Stripe subscription for Australian award-covered workers. Hospitality first because Mia-style users have the clearest "Sunday penalty rate" pain.

### Tasks

- [ ] Stripe MCP authenticated and verified on PayChecker org
- [ ] $4.99/mo subscription product
- [ ] Free PALM tier preserved (entitlement gating, not paywall switch)
- [ ] Hospitality Award MA000009 reference data
- [ ] Two-venue casual handling (Mia: works at two pubs)
- [ ] Sunday penalty rate logic
- [ ] Billing actions runbook (`docs/operations/billing-actions.md`) followed in production
- [ ] First paying user from outside Apete's network
- [ ] Refund + cancel flow tested end to end

**Success criterion:** First paying customer onboarded via organic channel; full refund/cancel flow runs without operator escalation.

---

## PHASE 3 — Second Award (Meat Industry MA000059)

**Goal:** Architecture proves it generalises — adding a second award takes a week, not a month. Reuses the Phase 0 chicken/meat overlap.

### Tasks

- [ ] `SKILL-AWARD-add-new.md` walked end-to-end for MA000059
- [ ] Award-shape diff documented in `docs/research/awards-research.md`
- [ ] No regression in MA000074 calculations
- [ ] One MA000059 worker tests end-to-end

**Success criterion:** Award added in ≤ 5 working days from kickoff to first comparison run.

---

## PHASE 4 — Horticulture (Piece Rates)

**Goal:** The hourly-rate mental model survives non-hourly pay. Piece rates are the architectural stress test — if the data model bends to fit them cleanly, it'll bend for anything later.

### Tasks

- [ ] Horticulture Award MA000028 reference data
- [ ] Piece-rate fact shape added to fact model (`.claude/ref/REF-FACT-model.md`)
- [ ] Comparison engine handles piece rates without an "hourly equivalent" hack
- [ ] One horticulture worker tests end-to-end
- [ ] Documented model-shape decisions in `docs/architecture/`

**Success criterion:** Piece-rate worker gets accurate report; data model didn't need a special-case branch in the calc engine.

---

## PHASE 5 — Richer Workflows

**Goal:** OCR, multilingual deep, offline PWA, full evidence pack.

### Tasks

- [ ] OCR pipeline for payslip uploads (`SKILL-DOC-extraction.md`)
- [ ] Claude API extraction with worker confirmation gate (NEVER authoritative)
- [ ] Offline PWA mode (workers in regional NSW with patchy data)
- [ ] Full multilingual UI (Fijian, Tongan, Vietnamese, Mandarin)
- [ ] Evidence pack PDF — bank deposits + super contributions + classification proof
- [ ] FWC update auto-monitor (`researcher` agent runs scheduled)

**Success criterion:** A worker can upload a payslip photo, have it extracted, confirm the values, and produce an evidence pack — entirely on their phone, offline-capable.

---

## Cross-phase reminders

- Every comparison stored as immutable snapshot from Phase 0 onward — don't retrofit.
- Privacy Act APP compliance is a per-feature gate, not a Phase 5 task.
- Every new award goes through `SKILL-AWARD-add-new.md` — no shortcuts even when "it's just like the last one".
