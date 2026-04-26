# Architecture — decision records

**Format:** ADR-NNN | Title | Date | Status (Proposed | Accepted | Superseded | Deprecated) | Context | Options | Decision | Consequences.

ADRs are append-only. If a decision changes, mark the old one Superseded with a forward link, and write a new ADR — never edit the original.

---

## ADR-001 — Confirmation model is sacred

- **Date:** Foundational (codified pre-s001)
- **Status:** Accepted

**Context.** PayChecker has to compute a number that the worker can take to the FWO, an advocate, or the employer. If the inputs to that number aren't auditable back to a specific worker action, the number is worth nothing. The category we live in (information tool, not advice) only holds if the worker is the source of every fact the calc consumes.

**Options.**
- **(a) Single-table fact model.** Every fact is one row; no separation between "proposed" and "confirmed". Simplest schema; fastest to build. Fails the moment we add OCR — extracted-but-not-confirmed values can't be distinguished from worker-typed values without a flag, and a missing flag once = silent advice.
- **(b) Two-table fact model with explicit confirmation.** Every fact has `provenance` + `confirmed_at`. The calc engine reads only rows where `confirmed_at IS NOT NULL` and provenance is in a calc-eligible set. (Chosen.)
- **(c) Event-sourced "fact stream" with derived current state.** Most flexible; expensive to operate at our scale. Phase 4+ may need it; Phase 0 doesn't.

**Decision.** Two-table fact model. Every `*_facts` row has `provenance` (`worker_entered` / `ocr_suggested` / `ocr_suggested_confirmed` / `assisted_entered` / `derived` / `imported_unverified`) and `confirmed_at timestamptz`. A sibling `*_facts_history` table captures every state transition. The comparison engine selects only rows where `confirmed_at IS NOT NULL` and provenance is calc-eligible.

**Consequences.**
- Every fact-capture flow has to surface confirmation as a deliberate, named act ("Confirm" — never "Save" or "OK").
- LLM-extracted values land as `ocr_suggested` and stay invisible to the calc until the worker confirms (which flips them to `ocr_suggested_confirmed`).
- "Refuse to calc" is a valid output — if a comparison's inputs aren't all confirmed, the engine declines rather than falling back to unconfirmed values. Surfaces as "X facts not yet confirmed" in the UI.
- Schema cost: every fact table doubles (rows + history sibling) and every fact-capture screen needs explicit Confirm UI.

---

## ADR-002 — 3-layer fact model

- **Date:** Foundational (codified pre-s001; deep-dive in `docs/architecture/fact-model-v1.md`)
- **Status:** Accepted

**Context.** Different facts change at different cadences. Treating them all the same forces either over-confirmation (worker re-confirms classification every Monday) or under-confirmation (worker accepts pre-filled shift values without checking).

**Options.**
- **(a) Flat — every fact is just a "fact".** Confirmation cadence collapses. Discarded.
- **(b) 3-layer split by confirmation cadence:** Layer 1 stable (employer, classification, pay terms) → confirmed once + re-confirmed on change; Layer 2 period (shifts, hours) → confirmed at logging; Layer 3 payment (payslip, deposit, super) → confirmed each time uploaded. (Chosen.)
- **(c) 5-layer or finer.** More shapes, more code paths, more drift surface. Discarded for now; revisit if piece rates or annualised salaries force it.

**Decision.** Three layers. Each fact table maps to exactly one layer. Each fact has a sibling `*_history` table. Confirmation cadence matches the layer.

**Consequences.**
- Schema reflects the split: `worker_classification_facts` (L1), `shift_facts` (L2), `payslip_facts` / `bank_deposit_facts` / `super_contribution_facts` (L3), each with `_history`.
- UI patterns can be standardised per layer: Layer 1 "set once" screens, Layer 2 weekly logs, Layer 3 per-event uploads.
- Adding a new fact type requires picking a layer first; if it doesn't fit, that's an architectural finding (escalate via idea-to-execution rather than inventing Layer 4 in a hurry).

---

## ADR-003 — Information tool, not advice tool

- **Date:** Foundational (codified pre-s001)
- **Status:** Accepted

**Context.** "Worker may be underpaid by $X" is advice. "Your payslip shows $A; the award rate for this period was $B; the difference is $C" is information. The legal, regulatory, and worker-safety surface of those two sentences is wildly different. PayChecker has to be the second one, every time, by construction.

**Options.**
- **(a) Frame as a tool that finds wage theft.** Marketing-friendly; immediately positions PayChecker as adversarial to employers; legally problematic (we are not lawyers, FWO inspectors, or unions); worker-safety problematic (the framing makes the act of using PayChecker visible as accusation). Discarded.
- **(b) Frame as an information tool, same regulatory category as the FWO Pay Calculator.** The worker brings facts; we compute; we surface what we computed; the worker decides what to do. (Chosen.)
- **(c) Frame as a personal finance tracker that happens to compute award rates.** Soft-pedals the use case; loses the regulatory clarity option (b) gives us; risks scope creep into budgeting / forecasting that distracts from the comparison. Discarded.

**Decision.** Information tool, same category as the FWO Pay Calculator. Every surface that shows comparison output reinforces the framing.

**Consequences.**
- Copy uses diagnostic phrasing ("your payslip shows X / the award rate is Y / the difference is Z") and bans prescriptive phrasing ("you should…", "you may be entitled to…", "this is wage theft", "you may have been underpaid"). Enforced by lint check on user-facing strings (Phase 1+).
- Every comparison output and every PDF report carries the FWO 13 13 94 footer pointing the worker to where determinations actually happen.
- The "Verify" affordance is the worker's deliberate act, never a system-initiated push. No banner, no email, no notification volunteers a comparison the worker didn't ask for.
- If a future feature requires us to assert a fact about employment ("Apete is a casual"), it does not ship until the assertion can be re-framed as something Apete confirmed.

---

## ADR-004 — Clerk + Supabase third-party auth

- **Date:** s002 (Clerk wired) + s003 (Supabase third-party auth wired)
- **Status:** Accepted

**Context.** PayChecker needs auth that survives PALM workers signing up on cheap Android devices, supports email/password (no SMS — workers may not have an Australian number), and integrates cleanly with Supabase RLS so RLS can read the authenticated worker's identity from the JWT.

**Options.**
- **(a) Supabase Auth.** Native to Supabase — the simplest RLS story (`auth.uid()` just works). Forces us into Supabase's auth UI, password reset flow, magic-link config, etc. — a worse fit than Clerk's hosted UI for our worker-friendly needs. Discarded.
- **(b) Clerk + Clerk JWT template signed with the Supabase JWT secret.** Worked end-to-end; Clerk soft-deprecated the template in 2025. Brittle long-term, requires a shared secret to live in Clerk's dashboard. Discarded.
- **(c) Clerk + Supabase third-party auth.** Supabase trusts Clerk as a JWT issuer (JWKS-validated at Clerk's Frontend API URL). No shared secret. `getToken()` returns the vanilla Clerk session JWT; supabase-js's `accessToken` callback injects it on every request. (Chosen, s003.)

**Decision.** Clerk owns identity; Supabase owns data and trusts Clerk JWTs as a third-party auth provider. RLS reads `auth.jwt() ->> 'sub'` (the Clerk user id), not `auth.uid()` (which is empty in this model).

**Consequences.**
- `workers.clerk_user_id text unique not null` is the per-worker identity column (no `auth.users` row exists).
- All RLS policies dereference `auth.jwt() ->> 'sub'`. A `STABLE` SQL helper `public.current_worker_id()` resolves the JWT sub to a `workers.id` so policies on downstream tables can write `worker_id = (SELECT public.current_worker_id())`.
- `src/config/supabase.ts` validates URL + anon key at module load with a service-role-shape reject (loud-fail mirrors `clerk.ts`).
- Phase 1 backend will validate the same Clerk JWT server-side via Clerk's JWKS — no second auth integration needed.

---

## ADR-005 — Indexing not looping

- **Date:** Foundational (codified pre-s001; reasoning in `.claude/ref/REF-INDEXING-not-looping.md`)
- **Status:** Accepted

**Context.** Loading a worker's full history into context every comparison breaks at scale (Apete after 2 years has 500+ shifts, 50+ payslips), wastes work (we don't need 2 years of facts to compute one fortnight's pay), and degrades the privacy posture (the comparison engine sees more PII than it needs).

**Options.**
- **(a) Load full history for every comparison.** Simplest. Breaks at year 2. Discarded.
- **(b) Index facts by time + topic + comparison id; retrieve only what a given comparison needs.** Slice by time (period_start..period_end), by topic (which fact types matter for this comparison), by relevance (skip facts whose effective range doesn't overlap the comparison period). (Chosen.)
- **(c) Stream all facts through the comparison engine and let it filter.** Same blast radius as (a); marginal win on memory. Discarded.

**Decision.** The comparison engine receives a snapshot of only the relevant confirmed facts (sliced by period and fact-type relevance). Memory is summarised, tagged, and retrieved by relevance — never loaded as a full timeline.

**Consequences.**
- Every comparison stores its `inputs_snapshot` jsonb at creation time; future re-reads replay from the snapshot, not from current fact tables. Already enforced by `comparisons.inputs_snapshot` + INSERT-validation trigger (s003 hour 1).
- Adding a new fact type requires deciding what slice of it the comparison engine needs and how to index it (per-period? per-employer? per-classification?).
- LLM context windows are not the bottleneck; relevance is. Even if the model could ingest 1M tokens of facts, we still only feed it what the comparison needs.

---

## ADR-006 — Orient, don't collect

- **Date:** s003 hour 3
- **Status:** Accepted

**Context.** The PLAN said "Build worker onboarding (Layer 1 facts capture)". The design mock — produced before the PLAN was last edited — said "Orient, don't collect. No employer / classification / rate / deductions forms." Surfaced as a load-bearing drift by the pre-build audit. The Apete persona makes the mock's reading the safer one: a PALM worker on a temporary visa, ESL, distrustful of institutions, asked for "your award classification" before they understand what PayChecker is — that's the abandonment screen.

**Options.**
- **(a) Front-load Layer 1 capture in onboarding (per the PLAN line).** Faster to a usable comparison; high abandonment risk; unsafe framing for the persona. Discarded.
- **(b) Educational orientation flow (6 screens) + minimum identity capture (name, optional country/language) + affirmative consent. Layer 1 facts captured later inside per-bucket detail flows.** (Chosen.)
- **(c) Skip onboarding entirely; route straight to "Your data" after sign-in.** Loses the regulatory anchor screen ("What this app isn't"); loses the consent ceremony; loses the worker-safety framing. Discarded.

**Decision.** Six-screen educational onboarding: Welcome → What we do → What you'll share → Your control → What we aren't → Consent + name. Skip on screens 1–5 jumps to screen 6, never out — consent is never bypassed, only orientation is. Layer 1 facts capture moves to "Employment contract" bucket flow.

**Consequences.**
- New `consent_records` table (immutable, INSERT-only, audit-shaped) records every affirmative consent with `privacy_policy_version` pinned.
- `workers` gains `country` (nullable) and `preferred_language` (default `'en'`). No other Layer 1 fields.
- Re-prompting on policy version bump = a new `consent_records` row, not an update.
- Returning users with a `consent_records` row redirect to `/dashboard`; new users see the flow.
- "Your data" home screen (5 worker-facing buckets per `YourData.jsx`) replaces the dashboard placeholder. Per-bucket detail flows are subsequent Phase 0 tasks.
- Real privacy policy content is now an explicit ship-to-real-worker blocker, logged in PLAN.

---

## ADR-007 — Two gates before surfacing mismatches

- **Date:** Foundational (codified in CLAUDE.md Core Architectural Principles)
- **Status:** Accepted

**Context.** The first gap PayChecker computes will not be "Apete is owed exactly $382.17". It will be "the rate we computed differs from the rate on the payslip by some amount, with some confidence, in some context". Surfacing that without context is at best alarming and at worst dangerous to the worker (an advocate or employer reading the screen will form a view from a single number).

**Options.**
- **(a) Surface every non-zero gap.** Maximum sensitivity; minimum specificity; high false-positive rate; reads as accusation. Discarded.
- **(b) Threshold-only filter (e.g. hide gaps under $5).** Hides systematic small underpayments that compound; doesn't reason about confidence; arbitrary thresholds. Discarded.
- **(c) Two gates: re-verify inputs are still confirmed and current; classify the gap by size + frequency + confidence; only surface gaps above the classification threshold.** (Chosen.)

**Decision.** Every comparison passes through two gates before surfacing a mismatch.

- **Gate 1 — re-verify inputs.** Every fact in `inputs_snapshot` must still have `confirmed_at IS NOT NULL` and not be revoked. If any input was unconfirmed (e.g. an edit invalidated it), the comparison declines: "X facts changed since this comparison ran — please re-confirm and re-run".
- **Gate 2 — classify gap.** Compute size (absolute and relative), frequency (one-off vs systematic across periods), and confidence (how reliable were the inputs — `worker_entered` is high; `ocr_suggested_confirmed` is high; future `derived` may be lower). Below the classification threshold the gap is stored on the comparison but not surfaced; above, the worker sees it framed by classification.

**Consequences.**
- Comparison output is structured: `gap = { size, frequency, confidence, classification }` (jsonb). The worker sees the classification + the framing, not the raw threshold logic.
- Tweaking thresholds is a config change, not a code change — wired into `comparisons.gap` shape.
- Reviewer/advocate can see the underlying gap data on demand ("show me everything we computed, not just what was surfaced") via a `/your-data/comparisons/:id/full` view (Phase 0+).

---

## ADR-008 — Single Supabase project per environment

- **Date:** s003
- **Status:** Accepted

**Context.** Jovi's "Jovis Home Projects" Pro org on Supabase hosts multiple Anthropic-built side products (Dad's CareTrack AI, FuelFinder, fijifish, PayChecker). Each could share a project (cheap) or get its own (more expensive, simpler isolation).

**Options.**
- **(a) One Supabase project shared across all products, schema-namespaced (e.g. `paychecker.workers`, `fuelfinder.users`).** Cheap. Couples the products at the auth + extension + pgcrypto + RLS-policy level; cross-product schema migrations risk one product breaking another. Discarded.
- **(b) One Supabase project per product, per environment.** $25/mo Pro org base + $10/mo per active project beyond the first. Each product's schema is isolated, RLS is independently auditable, blast-radius of a bad migration is one product. (Chosen.)
- **(c) Separate orgs per product.** Bills as separate Pro orgs, four times the base cost. Discarded.

**Decision.** PayChecker = `zzppuwyufloobskinehf`, region `ap-southeast-2` (Sydney), under the "Jovis Home Projects" org. Each future Anthropic-built product gets its own project under the same org.

**Consequences.**
- Phase 0 cost: $25/mo (Pro org) + $10/mo per additional active product project. Currently 4 projects → ~$55/mo for the org.
- Migration discipline: every migration is project-scoped; we never write cross-project SQL. `supabase/migrations/` is per-project.
- Backups, point-in-time-recovery, and Supabase advisors all scope to the project — no cross-product noise.
- When PayChecker eventually has staging vs production environments (Phase 1+), each gets its own project (project-per-environment), not a database-per-environment inside one project.
- The `paused` Supabase auto-pause behaviour is per-project — non-PayChecker projects can pause without affecting our schema/data.
