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

---

## ADR-009 — Allowance purpose handling on award reference data

- **Date:** 2026-04-27 (Sprint 1.5)
- **Status:** Accepted (after pressure test — see Reasoning)

**Context.** Sprint 1's MA000074 research note (`docs/research/awards-ma000074-v01.md` §6 — "Architectural questions surfaced by the research") found that some Modern Award allowances are *all-purpose* (folded into the hourly rate when penalties, OT, leave loadings are computed) while others are *additive* (paid on top of the penalty calc, never folded). Concretely: **Leading Hand allowance** under MA000074 cl 17.2(a) is all-purpose; **Cold Work** (cl 17.2(c)) and **First Aid** (cl 17.2(d)) are additive. Without a per-allowance flag the calc engine cannot tell these apart, and Apete's penalty calc would silently under-compute when his employer correctly folds Leading Hand into the base before applying the Sunday 175 % penalty. Worst-case worker-safety failure (R-004): Apete confronts his employer with bad data and loses his job.

The current `award_rates` table (`REF-DB-schema.md:57-64`) holds *classification* rates only — allowances are not yet in the schema at all. This ADR decides the **purpose-handling shape**, not the table shape. Sprint 2 will resolve whether allowances extend `award_rates` (with a `kind` discriminator) or land in a new `award_allowances` table; the `purpose` column is identical in either case.

**Options.**
- **(a) `is_all_purpose boolean not null default false`.** Single boolean per allowance row. Cheap; covers the two MA000074 cases. Discarded — at least one further purpose type ("folds into OT base but not penalty rate") is documented in awards we'll encounter (MA000009 Hospitality has shift loadings with this interaction). Boolean forces a coarse two-state model that hides real complexity.
- **(b) `purpose text not null default 'additive' check (purpose in ('all_purpose','additive','penalty_modifier','one_off'))`.** Enum-shaped column with a check constraint. Four values: `all_purpose` (folds into base for all derived calcs — Leading Hand), `additive` (paid on top — Cold Work, First Aid), `penalty_modifier` (folds into OT base only, not the Sat/Sun/PH penalty multiplier — known case in MA000009 shift loading), `one_off` (paid only when a context predicate is met — uniform allowance, public-holiday meal). Default `'additive'` is the safest fallback because flat add-on is verifiable from a payslip line. **(Chosen.)**
- **(c) Defer; calc engine hardcodes which allowances fold vs add.** Discarded — hardcoding award knowledge in the calc engine couples the engine to today's award text. When MA000074 cl 17.2(a) changes via FWC variation order, code changes too. Violates the spirit of ADR-001 (calc must be defensible from cited reference data, not from logic embedded in the engine) and fails ADR-005 (engine should be data-driven, not award-aware).

**Decision.** Option B — text enum with check constraint. Default `'additive'` so that any unflagged or legacy row produces the verifiable-from-payslip behaviour rather than a silent fold. The column lives on whichever table holds allowance rows; Sprint 2 makes the table-shape call.

**Reasoning (pressure test summary).**

The pressure test (`SKILL-PRJ-pressure-test.md`) ran on Option B. All five prompts cleared with mitigations, no blockers.

1. **Break this system (5 ways).** (i) Developer mis-flags an allowance during seed → mitigated by `SKILL-AWARD-add-new` step 3 requiring FWC clause citation per row + reviewer signoff before INSERT. (ii) An award uses a fifth purpose type → check constraint rejects unknowns; new ADR + migration extends the enum. (iii) Calc engine sees an unknown enum value at runtime → engine MUST fail loud (`RAISE EXCEPTION` / equivalent), never silently fall back to additive — silent fallback is a worker-safety failure. (iv) FWC variation flips an allowance's purpose mid-period → existing `effective_from` / `effective_to` time-boundedness handles this; variation creates new row, old row gets `effective_to`. (v) Same purpose interacts differently across calc contexts (OT vs penalty vs leave) → require explicit unit tests per `(purpose × calc-context)` pair, sourced from FWC-published examples per `SKILL-AWARD-add-new` step 4.

2. **Personas (Apete / advocate / paid-tier).** Apete doesn't see the schema; he sees the comparison report. Mitigation: report renders the calc chain (base → all-purpose folded in → penalty multiplier → additive added on top), so he can sanity-check each step. Advocate needs to reproduce the calc cold; mitigation: every allowance line in the report cites the FWC clause that establishes its purpose. Paid-tier worker (Mia, Phase 2) has higher digital literacy and a hospitality award with `penalty_modifier` cases; the schema accommodates her award without code change.

3. **What Apete would misunderstand.** "All-purpose allowance" is not a worker concept; using the term in UI invites misreading. Two wording fixes baked into the consequences: (a) **never** use "all-purpose" in worker-facing UI — replace with plain language: *"This allowance is included when calculating your overtime and penalty rates — not paid on top."* (b) Every allowance row in the report carries an inline FWC citation (clause + URL + last-verified date) so Apete or his advocate can verify the math against the source.

4. **Privacy / safety.** APP 1, 3, 5, 6, 11: pass — schema change is invisible to workers, no new collection, RLS inherits from `award_rates`. R-004 worker-safety: Option B reduces wrong-calc risk vs Option C (data-driven beats code-driven for award knowledge). No new exposure surface.

5. **Reversibility.** Migration is one statement: `ALTER TABLE … ADD COLUMN purpose text NOT NULL DEFAULT 'additive' CHECK (purpose IN (…));`. To undo: `DROP COLUMN purpose`; one statement, no data loss; calc engine reverts to assume-additive (the safest fallback). Past comparisons unaffected — `inputs_snapshot` (per ADR-005, immutable) carries the `purpose` value as-snapshotted, so reversal does not invalidate history. No one-way doors.

**Consequences.**
- **Migration shape (Sprint 2).** `purpose text not null default 'additive' check (purpose in ('all_purpose','additive','penalty_modifier','one_off'))`. The column lands on whichever table holds allowance rows (decision deferred to Sprint 2). Default `'additive'` makes a backward-fill safe and zero-row migrations free.
- **Calc engine impact.** The "compute expected" path branches on `purpose`. `all_purpose` rows are summed into the hourly rate **before** penalty / OT / leave multipliers apply. `additive` rows are added to the period total **after** penalty / OT calc. `penalty_modifier` rows fold into the OT base but the penalty multiplier still applies to the un-folded base. `one_off` rows are paid only when their context predicate is met (e.g. uniform allowance only on shifts where uniform was required). Engine must `RAISE` on unknown purpose — silent fallback to additive is forbidden.
- **Future-proofing.** MA000059 (Meat Industry, Phase 3) likely uses `additive` for boning-room allowance. MA000009 (Hospitality, Phase 2) uses `penalty_modifier` for shift loadings interacting with OT. MA000028 (Horticulture, Phase 4) piece rates may force a fifth purpose type — that requires a new ADR (extending the enum is intentional friction, not a hot path).
- **Worker-facing copy ban.** "All-purpose allowance" must not appear in any worker-facing UI string. Plain-language equivalent only ("included in your hourly rate when …").
- **Reporting requirement.** Every comparison's "How we computed this" surface must show base → folded all-purpose allowances → penalty multiplier → additive allowances, with FWC clause citations per allowance. This is the operationalisation of ADR-001 (calc defensible from confirmed inputs + cited reference data) and ADR-007 (gate 1 includes "reference-data purpose flag is correct per cited clause").
- **Sprint 2 dependency.** This ADR unblocks the MA000074 reference-data seed sprint. Sprint 2 must (i) decide the allowance table shape, (ii) seed `awards` + classification rates, (iii) seed allowances with `purpose` populated per the cited clauses in `awards-ma000074-v01.md`, (iv) flag any allowance whose purpose isn't yet sourced (Cold Work intermediate temperature bands, meal/vehicle amounts) as `[SOURCE NEEDED]` rather than guessing.

---

## ADR-010 — Allowance table shape

- **Date:** 2026-04-27 (Sprint 1.75)
- **Status:** Accepted (after pressure test — see Reasoning)

**Context.** ADR-009 chose Option B (text-enum `purpose` column) for handling all-purpose vs additive allowances, but explicitly deferred *where* the column lives. Current `award_rates` (`REF-DB-schema.md:57-64`) holds **classification rates only** — allowances aren't in the schema yet. Sprint 2 (MA000074 reference-data seed) needs allowances to have a home before any INSERT runs. This ADR picks that home.

**Options.**
- **(Y) Extend `award_rates` with a `kind` discriminator.** `ALTER TABLE award_rates ADD COLUMN kind text NOT NULL DEFAULT 'classification' CHECK (kind IN ('classification','allowance'))`, plus per-kind nullable columns (`classification_code` becomes nullable, new nullable `allowance_code`/`purpose`/`unit`). Pros: single FK to `awards`, single effective-date query path, single-table queries for "all reference data for this award". Cons: nullable-by-kind columns are a textbook schema smell; every query must remember `WHERE kind = ?`; conflicts with PayChecker's existing discipline of one-table-per-concept (per ADR-002, the 3-layer fact model uses separate `worker_classification_facts` / `shift_facts` / `payslip_facts` tables rather than one `facts` table with a `kind` column — that pattern is the project's house style). Discarded.
- **(Z) New `award_allowances` table parallel to `award_rates`.** Independent table with FK to `awards`. Columns: `id`, `award_id`, `code`, `description`, `amount`, `unit` (`hour`/`week`/`shift`), `purpose` (per ADR-009), `fwc_clause`, `effective_from`, `effective_to`, `created_at`. Pros: clean separation, every column is meaningful for every row, RLS policy mirrors existing `award_rates` policy (one policy, one table, signed-in read), indexes are obvious, mirrors the project's house style of one-concept-per-table. Cons: two FKs to `awards` to track when a variation order touches both tables; calc engine fetches reference data via two queries (already a two-step op regardless — one for the rate, one for allowances). **(Chosen.)**

**Decision.** Option Z — new `award_allowances` table parallel to `award_rates`. The table holds the `purpose` column from ADR-009 and the standard reference-data shape (FK + code + amount + unit + effective-date pair + audit timestamps). `UNIQUE (award_id, code, effective_from)` guards against duplicate-code drift. RLS gives signed-in workers SELECT; writes via service role / migrations only (matches `award_rates` policy at `REF-DB-schema.md:156`).

**Reasoning (pressure test summary).**

The pressure test (`SKILL-PRJ-pressure-test.md`) ran on Option Z. All five prompts cleared with mitigations, no blockers.

1. **Break this system (5 ways).** (i) Two FKs to `awards` mean a single FWC variation that updates both classification rates and allowances has two-row-set surface; mitigation: `SKILL-AWARD-add-new` step 3 documents the variation as an atomic unit, both tables get rows with the same `effective_from`. (ii) Calc engine forgets to query `award_allowances` and only reads `award_rates` → silent under-pay; mitigation: `lib/calc/fetchReferenceData(awardId, classificationCode, asOfDate)` helper is the *only* read path — calc engine never reads tables directly, helper queries both. (iii) Two allowances accidentally share a `code` for the same award + period; mitigation: `UNIQUE (award_id, code, effective_from)` constraint. (iv) An allowance applies only to a subset of classifications (e.g. Cold Work for processing-line workers but not front-office staff under the same award); current shape treats every allowance as award-wide; mitigation: not a Phase 0 problem for MA000074 (Apete-shape research note in §3 confirms award-wide application of the allowances we care about); add `applies_to_classifications text[] NULL` in a future ADR if/when MA000059 forces it. (v) Effective-date drift between the two tables (`award_rates` updated to 2025-07-01 but `award_allowances` still on prior period); mitigation: seed pattern is per-variation, never per-table — `SKILL-AWARD-add-new` step 3 doesn't allow partial seeds.

2. **Personas (Apete / advocate / paid-tier).** Schema shape is invisible to all three personas; nobody queries reference data directly. Apete sees the report; advocate verifies via the report's "How we computed this" section; Mia (Phase 2) hits the same surface. Pass — no persona-level concerns.

3. **What Apete would misunderstand.** Schema is not Apete-facing, so no direct misreading risk. The implementation risk is downstream: if the calc engine queries `award_rates` only and skips `award_allowances`, Apete's expected total under-shoots his entitlement and he reads "you got paid right" when he didn't. Mitigation: integration test in `SKILL-AWARD-add-new` step 4 — seed MA000074 with Leading Hand, simulate one Sunday shift, assert expected total includes the all-purpose fold (per ADR-009). Test fails if `award_allowances` query path is missing.

4. **Privacy / safety.** APP 1, 3, 5, 6, 11: pass — both tables are reference data, no PII, RLS gives read-only to signed-in workers. R-002 (award rates stale): risk profile is identical to `award_rates` table — annual June–July sweep covers both via the researcher agent. Two RLS policies vs one is marginal surface; each is obvious in isolation, easier to audit than a `kind`-conditional policy on a wider table.

5. **Reversibility.** To undo: `DROP TABLE award_allowances` — one statement, no data loss in `award_rates` (it never held allowances). If we later discover Y was the better shape: SELECT-INSERT migrate the rows into an extended `award_rates`, then DROP. Past comparisons unaffected per ADR-005 (`inputs_snapshot` carries snapshotted allowances at comparison time, immutably). No one-way doors.

**Consequences.**
- **Migration shape (Sprint 2).** `CREATE TABLE public.award_allowances (id uuid primary key default gen_random_uuid(), award_id uuid not null references awards(id), code text not null, description text not null, amount numeric(10,2) not null, unit text not null check (unit in ('hour','week','shift')), purpose text not null default 'additive' check (purpose in ('all_purpose','additive','penalty_modifier','one_off')), fwc_clause text not null, effective_from date not null, effective_to date, created_at timestamptz not null default now(), unique (award_id, code, effective_from));`. RLS enabled with the same signed-in-read policy as `award_rates`. Plus one index on `(award_id, effective_from, effective_to)` for the calc-engine fetch path.
- **Calc engine impact.** A single `fetchReferenceData(awardId, classificationCode, asOfDate)` helper performs both queries (rate from `award_rates`, allowance set from `award_allowances`) and returns a unified shape. Calc engine never reads either table directly — the helper is the only read path. Test coverage requires the helper to be exercised, not the raw tables.
- **Seed file shape (Sprint 2).** Two INSERT statements per FWC variation — one block into `award_rates` for classification rates, one block into `award_allowances` for allowances. Each block is uniform (all rows in the block have homogeneous semantics); seeds are mechanical to review.
- **Future-proofing.** MA000059 (Meat Industry, Phase 3) — same `award_allowances` shape, plus a boning-room allowance row with `purpose='additive'`. MA000009 (Hospitality, Phase 2) — same shape, with shift-loading rows at `purpose='penalty_modifier'`. MA000028 (Horticulture, Phase 4) — piece-rate workers may force a `kind` extension on `award_rates` itself for piece units (separate ADR; doesn't change `award_allowances`). New awards add rows, not tables.
- **Reversibility.** `DROP TABLE award_allowances`; one statement; no data loss elsewhere; calc engine reverts to "rate only" (legacy state). Z → Y migration tractable as a single SELECT-INSERT pass if needed.
- **Sprint 2 dependency.** This ADR unblocks Sprint 2. Sprint 2 will (i) write migration `0005_award_allowances.sql` per the shape above, (ii) seed `awards` + `award_rates` for MA000074 from `awards-ma000074-v01.md` §2, (iii) seed `award_allowances` for the four sourced MA000074 allowances (Leading Hand 1–19 / Leading Hand 20+ / First Aid; Cold Work bookend rows pending the temperature-band table — flag the gap rather than guess), (iv) update `REF-DB-schema.md` with the new table, (v) extend `REF-AWARDS-list.md` with `Last reviewed: 2026-04-27` and a `Partial` support level (full once `[SOURCE NEEDED]` flags from `awards-ma000074-v01.md` §6 are closed in v02).
- **Documentation update.** `REF-DB-schema.md` gets a new `award_allowances` section parallel to `award_rates`. `REF-AWARDS-list.md` gains a "supports allowances" column. `SKILL-AWARD-add-new` step 3 gets a sub-step note that allowances and classifications seed together, not separately.

---

## ADR-011 — Allowance unit enum extension

- **Date:** 2026-04-28 (Sprint 5.5)
- **Status:** Accepted (after pressure test — see Reasoning)

**Context.** ADR-010 created `award_allowances` with `unit text NOT NULL CHECK (unit IN ('hour','week','shift'))`. Sprint 5 verbatim research closed the v01 §6 gaps (`docs/research/awards-ma000074-v02.md`) and surfaced two MA000074 allowances the current enum cannot represent: **vehicle allowance** ($0.98 per **kilometre**, cl 17.3(b)) and **meal allowance** ($18.38 per **meal**, payable as an event when an employee works ≥1.5 hr OT after ordinary hours and no meal is provided, cl 17.3(a)). Both must be seedable before the calc engine can compute Apete's expected gross when he drives his own car between sheds or works late enough to claim an OT meal. Awards `MA000059` (Phase 3), `MA000009` (Phase 2), and `MA000028` (Phase 4) are likely to surface additional unit shapes (call-out, broken-shift, accommodation), so this ADR also has to anticipate the next 1–2 awards without committing to every conceivable case.

**Options.**
- **(A) Extend the enum: add `'km'` and `'event'`.** `unit IN ('hour','week','shift','km','event')`. `'km'` is concrete (vehicle allowance, multiple awards). `'event'` is the umbrella for trigger-shaped allowances (meal, future broken-shift, call-out). The trigger condition (e.g. "OT ≥ 1.5 hr after ordinary, employer didn't provide meal") lives in calc-engine logic + a per-shift Layer 2 fact the worker confirms. Migration: one ALTER constraint; backwards compatible (existing rows already have valid `unit` values). **(Chosen.)**
- **(B) Replace enum with two columns: `unit` (dimension) + `condition` (trigger).** Separates measurement dimension from accrual rule. The `condition` ends up enum-shaped anyway (per-hour / per-km / per-event / per-shift / once-weekly / etc.) — same problem renamed. Discarded — adds surface area without removing the underlying decision.
- **(C) Keep current enum bounded; add `compute_basis jsonb` for special cases.** `unit` stays `('hour','week','shift')`; `compute_basis` carries `{"type":"per_km"}`, `{"type":"per_overtime_event","threshold_hours":1.5}`, etc. Discarded — `jsonb` is opaque to `CHECK` constraints, the calc engine has to validate every case at runtime, and the bounded enum's "type safety" is lost the moment you have to read `compute_basis` to know what `unit` actually means.
- **(D) Per-allowance polymorphism: separate tables (`award_allowances_hourly`, `award_allowances_per_km`, etc.).** Maximally type-safe; massively over-engineered for ~5–7 distinct allowance shapes across 4 Phase-N awards. Discarded.

**Decision.** Option A — extend the `unit` enum with `'km'` and `'event'`. Migration shape (Sprint 2.1 candidate):

```sql
ALTER TABLE public.award_allowances
    DROP CONSTRAINT award_allowances_unit_check;  -- Postgres-generated name; actual is the inline CHECK

ALTER TABLE public.award_allowances
    ADD CONSTRAINT award_allowances_unit_check
    CHECK (unit IN ('hour', 'week', 'shift', 'km', 'event'));
```

(In practice Postgres names the inline CHECK constraint `award_allowances_unit_check` or similar; Sprint 2.1 will look it up and DROP by exact name before re-adding.) Trigger conditions for `'event'`-unit allowances are encoded in the calc-engine code path keyed off the `code` column (`MEAL_OVERTIME` knows to trigger on Layer 2 fact "worked ≥1.5 hr OT, employer didn't provide meal"), not in a parallel taxonomy. Trigger rules are documented in `docs/architecture/calc-rules-v01.md` (also created this sprint).

**Reasoning (pressure test summary).**

The pressure test (`SKILL-PRJ-pressure-test.md`) ran on Option A. All five prompts cleared with mitigations.

1. **Break this system (5 ways).** (i) A future award introduces a sixth unit (`'piece'`, `'tonne'`, `'load'`) — mitigated by extending the enum via a new ADR; intentional friction prevents drift. (ii) Calc engine sees an unknown `unit` value at runtime — engine MUST `RAISE` (loud-by-design, mirrors ADR-009 unknown-purpose rule); silent fallback is a worker-safety failure. (iii) `'event'`-unit allowance fires without the corresponding Layer 2 trigger fact — calc engine refuses to add the allowance line; surfaces "this allowance applies but the trigger fact is missing — confirm the trigger to include in next comparison" UI prompt (mirrors ADR-001 "refuse to calc" pattern). (iv) `'km'`-unit allowance is paid but worker hasn't logged the km — same defensive default; allowance not paid until km Layer 2 fact is confirmed. (v) Trigger condition for `'event'`-unit allowances is hardcoded per-`code` in the calc engine, which couples calc engine to award text; if cl 17.3(a) changes to ≥2 hr OT threshold via FWC variation, calc engine code must change too — mitigated by `SKILL-AWARD-add-new` step 3 sub-rule (variation = re-research = code review of all `event`-unit triggers in scope).

2. **Personas (Apete / advocate / paid-tier Mia).** Apete doesn't see the enum; he sees the report. Vehicle allowance line should render as "Vehicle allowance — $0.98 × 47.3 km = $46.34 (cl 17.3(b))" so the math is visible and verifiable. Advocate same; the per-km math is auditable line-by-line. Mia (Phase 2 hospitality) is likely to hit `'event'`-unit allowances first (broken shift in MA000009) — schema accommodates her without code change.

3. **What Apete would misunderstand.** "Per kilometre" and "per event" are user-friendly already; no jargon translation needed. The risk is Apete forgetting to LOG the km or the OT-meal event, in which case the allowance silently doesn't fire. Two wording fixes: (a) bucket-detail UI for "Vehicle allowance" (Phase 1+) explicitly lists "you logged X km this period" before computing; if X = 0, the UI says "no km logged for this period — add a km entry to claim this allowance" rather than failing silently. (b) Same pattern for meal-allowance trigger.

4. **Privacy / safety.** APP 1, 3, 5, 6, 11: pass — schema change is invisible; no new collection. R-004 worker-safety: pass — Option A bounds the enum, which is auditable; advocates can verify every allowance's unit at a glance.

5. **Reversibility.** ALTER constraint to roll back is one statement; if any rows use `'km'` or `'event'` they'd need conversion or removal first, but that's a routine data-migration question. Past comparisons unaffected per ADR-005 (`inputs_snapshot` carries the unit at comparison time). No one-way doors.

**Consequences.**
- **Migration shape (Sprint 2.1).** Single `ALTER TABLE … DROP CONSTRAINT … ADD CONSTRAINT …` block. Same migration block can also INSERT the previously-deferred allowance rows: Cold Work middle band ($1.67/hr, `unit='hour'`); Meal allowance ($18.38, `unit='event'`, code `MEAL_OVERTIME`); Vehicle allowance ($0.98, `unit='km'`, code `VEHICLE_KM`).
- **Calc engine impact.** `fetchReferenceData(awardId, classificationCode, asOfDate)` returns rows with the new units transparently. The per-period computation branches on `unit`:
  - `hour` / `week` / `shift`: as before — multiply amount by the unit count for the period.
  - `km`: read the worker's logged km from `shift_facts` (or a future `transit_facts` Layer 2 row; out of Phase 0 scope), multiply.
  - `event`: read the relevant Layer 2 fact (e.g. "OT ≥ 1.5 hr after ordinary, no meal provided"); if confirmed, add the flat amount once per occurrence; if not confirmed, allowance is invisible to the calc per ADR-001.
  - Engine MUST `RAISE` on unknown unit; silent fallback to `additive` is forbidden.
- **Future-proofing.** MA000059 (Meat Industry, Phase 3) likely uses the same five units. MA000009 (Hospitality, Phase 2) introduces broken-shift allowance — `unit='event'`, trigger condition encoded per-code. MA000028 (Horticulture, Phase 4) piece rates are *rates* (encoded in `award_rates.pay_basis = 'piece'`, already supported by migration 0002), not allowances — out of this ADR's scope.
- **Reversibility.** Single-statement DROP/ADD CONSTRAINT to roll back. Past comparisons immutable per ADR-005.
- **Sprint 2.1 dependency.** This ADR unblocks Sprint 2.1 — the small follow-up migration that closes the seed gaps Sprint 2 left open. Sprint 2.1 spec lives in `docs/research/awards-ma000074-v02.md` §17.2(c) + §17.3 callouts.
- **Calc-rules documentation.** The trigger conditions for `'event'`-unit allowances are codified in `docs/architecture/calc-rules-v01.md` (Sprint 5.5 Part 2). That document is the source of truth for the calc engine's allowance-handling switch statement; this ADR governs the schema; ADR-009 governs the purpose flag; ADR-010 governs the table shape. Together they pin the allowance pipeline end-to-end.

---

## ADR-012 — "Add a Fact" UX pattern (stage-based)

- **Date:** 2026-04-28 (Sprint 6)
- **Status:** Accepted (after pressure test — see Reasoning)

**Context.** Sprints 7 / 8 / 9 each build a fact-capture surface — Layer 1 (employer / classification / pay terms inside the "Employment contract" bucket detail flow), Layer 2 (shift logging), Layer 3 (manual payslip entry). Without a shared UX pattern, the three screens drift, Apete sees three inconsistent "Add a Fact" experiences across one phone session, and a refactor pass becomes inevitable. Sprint 6 designs the pattern once so the three build sprints become mechanical applications. The pattern must serve Apete (PALM worker, ESL, low digital confidence, mobile-only, anxious, will not complete a 20-minute wizard in one sitting per `docs/product/personas.md`) and must be tuneable when Apete reports "I got stuck here" without compounding fixes across the whole flow.

**Options.**
- **(a) Step-by-step wizard per fact** — full-screen-per-stage. Most explicit; highest screen-count cost; treats every fact as if it were onboarding-shaped. Discarded — Layer 2 "log a shift" + accept-all-suggestions case becomes 5 screens for one tap; that violates ADR-006's friction discipline.
- **(b) Single form with inline confirmation** — one screen, all fields, all stages collapsed. Cheap to ship; fails the moment SUGGEST/INPUT diverge (which they do for Layer 3 payslip's 7+ fields with mixed prefill provenance) and fails the resume-mid-flow case (no stage boundary = no obvious resume point). Discarded.
- **(c) Stage-based composition — 5 named stages (ENTRY / SUGGEST / INPUT / CONFIRM / AFTERMATH), each with 1–3 rules, with explicit collapse rules and an adaptability contract.** Apete sees a consistent stage rhythm across Layers 1/2/3 even when stages collapse differently per layer. Tuning sprints know which stages they can change without re-testing the rest. **(Chosen.)**

**Decision.** Option C — stage-based composition. The 5 stages are:

1. **ENTRY** — what Apete sees *before* the form. Resume-safe.
2. **SUGGEST** — values offered with provenance labels (collapses cleanly when no defensible default exists).
3. **INPUT** — vertical 52 px-tall fields, plain-language hints, no auto-advance.
4. **CONFIRM** — the literal word "Confirm" (per `SKILL-FACT-confirmation`), pre-CONFIRM summary visible, button disabled with named hint until valid.
5. **AFTERMATH** — screen does NOT navigate away on success; saved values + provenance + tertiary edit/discard remain on the same screen.

Operational spec lives in `docs/architecture/add-fact-pattern.md` (1–16 sections covering: rules per stage, three Apete walkthroughs across Layers 1/2/3, stage collapse table, edge cases, copy guidelines, adaptability contract, pseudo-JSX verification, pressure test summary).

**Reasoning (pressure test summary).**

`SKILL-PRJ-pressure-test.md` 5/5 cleared with stage-mapped mitigations (full detail in `add-fact-pattern.md` §15).

1. **Break the system (5 ways).** ENTRY-stage spinner-of-doubt (mitigated: render copy from local state); CONFIRM-stage "Confirm vs Continue" ESL ambiguity (mitigated: literal word + visible summary); ENTRY-→-AFTERMATH dad-care interruption (mitigated: Rule 1.2 resume + `proposed`-state rows persisted in `*_facts` from first INPUT, not from CONFIRM); SUGGEST-→-INPUT wrong default (mitigated: Rule 2.2 editable-in-place + Rule 2.1 provenance label); AFTERMATH typo recovery (mitigated: Rule 5.1 edit tertiary returns to INPUT cycle and un-confirms).
2. **Personas (Apete / advocate / Mia).** AFTERMATH is the divergent stage; Rule 5.2 provenance + Rule 5.3 quiet-discard serve all three.
3. **Apete misreadings, by stage.** SUGGEST ambiguity, INPUT auto-advance, CONFIRM-as-Continue, AFTERMATH-as-not-saved — each maps to a specific rule.
4. **Privacy / safety.** APP 1/3/5/6/11 pass; R-004 + R-005 pass (no employer-side surface; info-not-advice copy throughout).
5. **Reversibility + adaptability contract.** §13 of the spec defines tuning scope per stage. ENTRY / AFTERMATH are independent of all others. SUGGEST / INPUT / CONFIRM have explicit linked-pairs documented. A pattern revision (rather than tuning) is signalled by changes that cross more than one row of the §13 table — that triggers a new ADR.

**Consequences.**
- **Sprint 7 / 8 / 9 implementation.** Each layer composes the 5 stages with stage-collapse choices documented in `add-fact-pattern.md` §10. Sprint 7 builds a `<FactScreen>`-shaped wrapper that subsumes `Shell.tsx`'s scaffold; Sprints 8 + 9 reuse it.
- **Pattern explicitly does NOT cover.** OCR-suggested handling (Phase 5; new ADR), `assisted_entered` provenance (Phase 1+; new ADR), multi-period payslip (future ADR if surfaces), per-fact comparison-trigger gating (calc-engine concern per ADR-007).
- **Reversibility.** A stage-rule change is bounded by the §13 adaptability contract. A whole-pattern revision triggers a new ADR; ADR-012 stays in history per ADRs-are-append-only rule. Cost: one ADR + the affected layer's implementation, not the whole layer trio.
- **Sprint 7 enforcement.** Sprint 7 must write `proposed`-state rows on first INPUT (not CONFIRM) to satisfy Rule 1.2 (resume). The schema already supports this — `*_facts` rows with `confirmed_at IS NULL` are valid per ADR-001 + `confirmation-flow.md`. No schema change required.
- **Sprint 6.x retrofit candidates (NOT in this sprint, but flagged in `add-fact-pattern.md`).** `Step6Consent.tsx` `name` prefill missing provenance label (Rule 2.1 violation). `OnboardingFlow.tsx:24` keeps wizard state in `useState` only — won't survive resume. `Step1-5` use "Continue" / "Get started" buttons rather than "Confirm" — those are orientation screens (no fact captured), so the "Confirm" rule technically doesn't apply, BUT future tuning may want to align language even there.
- **Cross-references.** ADR-001 (confirmation sacred — Rule 4 obeys), ADR-005 (indexing not looping — AFTERMATH doesn't render full history), ADR-006 (orient don't collect — ENTRY one-line carries the orientation), ADR-007 (two gates — pattern feeds the gate-1 confirmation requirement), `SKILL-FACT-confirmation` (Rule 4.1 implements its "Confirm button" mandate), `confirmation-flow.md` (Rule 2.2 + Rule 5.1 implement the proposed/confirmed/edited state machine).
- **Banked Sprint-6.x candidates.** Five worth surfacing for future polish sprints, not this one: (i) Step6Consent provenance label retrofit; (ii) OnboardingFlow `proposed`-state persistence retrofit; (iii) Step1-5 button-language audit; (iv) `Pill` 5-state taxonomy import from mock; (v) `Money` component as input variant for Sprint 9.

---

### AMENDMENT — Sprint A1 (2026-04-29)

**Status:** Amended by ADR-013.

**Source:** ADR-013 + `docs/architecture/document-intelligence-plan-v01.md`.

**What this amendment changes.**

The 5 stages defined in this ADR (ENTRY / SUGGEST / INPUT / CONFIRM / AFTERMATH) remain valid. ADR-013 adds 4 NEW pre-stages (UPLOAD / CLASSIFY / ROUTE / EXTRACT) which run BEFORE the original 5. Two of the original 5 stages have semantic shifts:

| Stage | Original semantics (this ADR) | Amended semantics (ADR-013) |
|---|---|---|
| ENTRY | "I'm going to add a {fact}" | Same — UPLOAD outcome lands here |
| SUGGEST | Values from prior context | Values from EXTRACT stage |
| INPUT | Type values from scratch | Edit extracted values; manual entry fallback |
| CONFIRM | Same | Same — now confirms extracted-or-edited values |
| AFTERMATH | Same | Same |

**What this amendment preserves.**

- All 14 rules across the 5 stages remain in force when those stages execute.
- Adaptability contract structure (independent vs linked stages) — extended with rows for the 4 new pre-stages, not replaced.
- Stage collapse rules — extended to cover extraction-success vs extraction-failure, not replaced.
- Rule 1.2 (RESUME — proposed-state on first INPUT) extends to apply at first UPLOAD touch as well; the `documents` row IS the proposed-state analogue at the upload stage.
- Trust + safety stages (ENTRY, CONFIRM, AFTERMATH) remain always-required.
- Convenience stages (SUGGEST, INPUT) can still collapse — and now collapse differently per extraction outcome.

**What this amendment requires.**

- Sprint A2: storage architecture for documents.
- Sprint A3: extraction service spec + prompts.
- Sprint A4: layered memory spec.
- Sprint A5: Migration 0011 (4 new tables).
- Sprint B1–B3: build the 4 new pre-stages.
- Sprint D: Dashboard re-routing (bucket cards → upload zone).
- ADR-013 supersedes none; both ADRs read together.

**Manual entry path.**

Sprint 7 (commit `e949ce1`) ships the manual entry form for the Employment Contract bucket. This amendment re-frames it as the FALLBACK path, accessed when:
- Worker has no document.
- Extraction fails (or returns confidence below the routing threshold).
- Worker explicitly chooses to type values via the "I don't have my contract" escape hatch on the upload screen.

The form code does not change. The Dashboard route changes in Sprint D.

---

## ADR-013 — Upload-first fact capture (Document Intelligence)

- **Date:** 2026-04-29 (Sprint A1)
- **Status:** Accepted (after pressure test — see Reasoning)

**Context.** ADR-012 specified a stage-based "Add a Fact" UX pattern under the implicit assumption that workers type fact values from scratch (or accept type-equivalent prefills from prior context). Sprint 7 (commit `e949ce1`) shipped the first production implementation of that pattern for Layer 1 employment-contract capture; the smoke test surfaced an architectural mismatch with Apete's actual behaviour.

Apete is a PALM-scheme poultry processing worker on a temporary visa, mobile-only, ESL, with low digital confidence and a borrowed phone (per `personas.md`). What he produces — and the only artefact a third-party advocate or FWO inspector can verify against — is *documents*: payslips, contracts, bank statements, super statements. Asking him to read those documents and re-type their values into a form duplicates work he already did, gates the comparison engine on his typing accuracy, and hides the document of record (the actual evidence) from PayChecker entirely. The form-first flow is Apete-hostile in proportion to the very anxieties (legalese, time, ESL, shared device) the personas file pins as load-bearing.

The corrected mental model — captured in `docs/architecture/document-intelligence-plan-v01.md` (Sprint 7.1, commit `751be1e`) — is upload-first: Apete uploads the document; PayChecker classifies it, routes it to the right bucket, extracts the values, surfaces them for confirmation. Manual entry remains as an explicit fallback for the worker who has no document or for whom extraction fails. This ADR formalises that pivot, amends ADR-012 (above), and locks down the 4 new pre-stages, the 4-layer memory architecture, and the schema additions that Sprints A2–A5 build out.

**Options.**
- **(a) Pure upload-first; manual entry deprecated entirely.** Cleanest mental model — every fact comes from a document. Discarded — Apete may legitimately have no document for a fact (employer hasn't issued a payslip yet; verbal classification only; bank statement not yet received). Removing the manual fallback strands those workers and forces them to wait, which the comparison engine cannot tolerate per ADR-001 (refuses to run on unconfirmed inputs). The fallback exists for worker-safety reasons, not engineering laziness.
- **(b) Upload-first primary + manual entry as accessible fallback.** Dashboard bucket cards route to the UPLOAD zone. Worker uploads → CLASSIFY → ROUTE → EXTRACT → ADR-012's ENTRY → SUGGEST (extracted values) → INPUT (edit extracted, or override) → CONFIRM → AFTERMATH. A visible "I don't have my {document}" tertiary on the upload screen routes to the Sprint 7 manual form. Extraction-failure inside the pipeline routes to the same manual form pre-filled with whatever low-confidence fields were extracted. **(Chosen.)**
- **(c) Manual-entry-first + upload as enhancement (Sprint 7 status quo).** Discarded — Sprint 7 smoke test invalidated this. Form-first asks Apete to be the OCR, which is exactly the work the app is supposed to save him.
- **(d) Hybrid per-bucket (upload-first for some buckets, manual for others).** Discarded — inconsistency confuses Apete (he learns one flow per bucket and can't generalise; advocate verifying his data sees five different patterns). The 5 buckets in `personas.md` design implications already share a common shape; hybrid breaks that.

**Decision.** Option (b) — upload-first primary across all 5 buckets (Employment Contract / Payslips / Shifts / Super / Bank), with manual entry preserved as an explicit fallback. The flow gains 4 NEW pre-stages — UPLOAD / CLASSIFY / ROUTE / EXTRACT — that run before ADR-012's 5 stages. SUGGEST and INPUT take their amended semantics (extraction output + edit-in-place). The 4-layer memory architecture (generic / per-employer / per-worker / cross-document reconciliation) lives in 2 new tables (`employer_extraction_patterns`, `worker_extraction_preferences`); 2 more new tables (`document_classifications`, `document_extractions`) hold pipeline state per uploaded document. ADR-007's two gates extend to three: classify gate (worker confirms understood-doc) → extract gate (worker confirms extracted values) → compare gate (worker reviews comparison output).

**Reasoning (pressure test summary).**

`SKILL-PRJ-pressure-test.md` 5/5 cleared with stage-mapped mitigations.

1. **Break the system — 5 ways the new flow fails Apete, mapped to stages.**

| # | Failure | Stage | Mitigation |
|---|---|---|---|
| (i) | Slow data — UPLOAD takes 30 s on regional Wi-Fi; Apete bounces. | **UPLOAD** | Local-state progress feedback per file; resumable from `documents.RAW` state on next session (Rule 1.2 RESUME extension). Upload retries idempotent. No spinner-of-doubt without progress. |
| (ii) | ESL — CLASSIFY confidence display reads as a judgment ("low confidence" → "I'm a bad uploader"). | **CLASSIFY** | Copy framing: "We're not sure what this is — can you tell us?" not "Low confidence: 0.42". No raw confidence numbers worker-facing. Confidence shown only as a routing decision (auto / review / manual). |
| (iii) | Caregiver interruption mid-EXTRACT. Phone locks; Apete returns later. | **EXTRACT** | `document_extractions` row persists with `extraction_status = 'pending' / 'partial'`. ENTRY shows the same resume banner Sprint 7 already implements. Rule 1.2 extends. |
| (iv) | Wrong classification — Apete uploaded a contract but classifier said "payslip". | **ROUTE** | Routing review screen lets Apete correct the bucket; correction writes to `document_classifications.routing_status = 'worker_corrected'` and feeds Layer 3 memory ("Apete's contracts come in this format"). No silent mis-routing — auto-route only above 0.85 confidence. |
| (v) | Extraction failure — model returns garbage; no manual fallback reachable. | **EXTRACT → INPUT** | On `extraction_status = 'failed'` or `'low_confidence'`, the flow drops into ADR-012's INPUT stage with the manual form pre-filled by whatever was extracted. The "I don't have my {document}" escape hatch on UPLOAD is the second reach path. Apete is never trapped. |

2. **Personas — Apete + advocate + Mia.**
- **Apete (primary):** 90 % confidence the upload-first flow saves him typing the same numbers his employer already printed. Risk: he may not realise he can override an extracted value. Mitigation: Rule 2.2 (editable in place) carries forward; UPLOAD copy makes "We extracted these. Tap any to change." literal. Pass.
- **Advocate (Apete's brother / FWO advocate):** verifies that Apete confirmed real values. Provenance per Rule 5.2 carries forward — extracted values land with `provenance = 'ocr_suggested'` (per `REF-FACT-model.md`); after CONFIRM they become `'ocr_suggested_confirmed'`. AFTERMATH labels show "from your payslip — you confirmed." Advocate can verify the calc against the original document. Pass.
- **Mia (paid-tier hospitality, Phase 2):** uploads MA000009 hospitality payslips; extraction prompts (Sprint A3) use generic ATO payslip schema, so format coverage is broader than poultry-specific. Edge cases (broken-shift allowance, casual loading interaction with penalty rates per `calc-rules-v01.md`) live in calc engine, not extraction. Pass.

3. **Apete misreadings — by stage.**

| Stage | Misreading | Mitigation |
|---|---|---|
| **UPLOAD** | "Wrong file type" reads as "I'm doing it wrong." | Accept as wide a set as plausible (PNG/JPG/PDF/HEIC); reject with plain language *"This file looks like X — try uploading a payslip / contract / statement."* never *"Invalid file type."* Per Sprint 7 manual upload pattern in `src/lib/upload.ts`. |
| **CLASSIFY** | Confidence display reads as judgment of Apete's competence. | No raw numbers worker-facing. Routing decisions framed as questions: *"Is this your payslip?"* — never as scoring. |
| **ROUTE** | Routing review feels like an exam. | Single-tap correction; no required reading; "looks right to me" tertiary skips the review. |
| **EXTRACT** | Low-confidence fields read as accusation ("we don't believe this number"). | Per Rule 2.1 + 5.2, label is *"please double-check this one"*, not *"low confidence."* Surface alongside the document image so Apete can verify against source. |

4. **Privacy / safety / APP.**
- **APP 1 (open + transparent).** New surfaces (classification, extraction, layered memory) documented in privacy policy v1 (Phase 0 finish-line; flagged below). In-app explainer at first UPLOAD: *"PayChecker reads your documents to save you typing. Your documents stay yours."* Pass with caveat — privacy policy v1 is an explicit ship-to-real-worker blocker per ADR-006.
- **APP 3 (collection for disclosed purpose).** Each new piece of data is tied to a stated reason: classification = "to know which bucket"; extraction = "to save you typing"; layered memory = "so we get better at your documents over time." Pass.
- **APP 5 (notification at collection).** Worker sees these reasons at UPLOAD, not buried. Pass.
- **APP 6 (use only as disclosed).** Document content goes to Anthropic API for classification + extraction only; never used for analytics, model training, or secondary purpose. Layer 2/3 memory is per-employer / per-worker scoped — never cross-shared between workers. Layer 4 reconciliation runs in extraction prompt context only. Pass.
- **APP 11 (security).** Document content travels: Supabase Storage → Anthropic API (TLS) → Supabase tables. Never on disk beyond worker session. RLS on all 4 new tables (signed-in worker can only see own rows; service role for the extraction service writes). Pass.
- **R-004 (worker safety vs employer).** No employer-side surface added. No push notifications, no email summaries, no third-party visibility. Document content never leaves the Anthropic API + Supabase boundary. Pass.
- **R-005 (info not advice).** Classification + extraction are info layers; they surface what was found, never what to do. Comparison output gating remains ADR-007's responsibility. Pass.
- **R-006 (Privacy Act breach via support / debugging).** New tables expand the operator's PII surface (now includes document classification confidence, extraction patterns per employer). Mitigation: same RLS-no-service-role-debug discipline as existing tables; operator-facing read-redacted view is a Phase 1 dependency (already logged). Pass with caveat.
- **NEW R-010 candidate:** Anthropic API as data processor — document content leaves Supabase boundary for the duration of each classification + extraction call. Anthropic's API terms (no training on customer data without opt-in; data retention bounded by API session) cover this; needs explicit privacy-policy disclosure. Logged for `risks.md` update in Sprint A3 (extraction service spec) — not in this ADR's scope to write the risk row, but flagged.

5. **Reversibility + adaptability contract stress test.**
- **Migration 0011 rollback:** four new tables `DROP TABLE` cleanly; existing `documents` table unaffected; Sprint 7 manual form continues to work because it never depended on extractions. Past comparisons immutable per ADR-005 (`inputs_snapshot` carries snapshotted facts).
- **Worker correction:** wrong classification → worker corrects via ROUTE review; wrong extraction → edit at INPUT stage (Rule 2.2); wrong confirmation → existing edit-unsets-confirmation trigger (Migration 0010) works unchanged.
- **Audit trail:** `document_classifications` carries `classified_at + classifier_version + routing_status`; `document_extractions` carries `extracted_at + extractor_version + extraction_status`. Layered memory tables carry `observation_count + last_observed`. No new audit tables required.
- **One-way doors:** none. The 4 new stages are purely additive on top of ADR-012; they can be feature-flagged off and the form-first path of Sprint 7 still works as a degraded fallback.
- **Adaptability contract:** the §13 table in `add-fact-pattern.md` extends with 4 new rows. UPLOAD is independent of all others (tunable in isolation). CLASSIFY is linked to ROUTE (correction path). ROUTE is linked to CLASSIFY (forward) + EXTRACT (downstream, since wrong route changes the extraction schema). EXTRACT is linked to ROUTE (upstream) + ADR-012's SUGGEST (extracted values feed it). Pattern revision (vs tuning) signaled by changes crossing more than 1 row of the extended §13 table.

**5/5 cleared. No blockers. One residual: privacy policy v1 must update before any real-worker traffic hits the upload-first flow — this is an existing Phase 0 finish-line item per ADR-006, not a new blocker.**

**Consequences.**
- **Sprint 7 disposition.** Commit `e949ce1` ships unchanged. The route `/buckets/employment-contract` continues to host the manual form. Sprint D rewires the Dashboard "Employment contract" bucket card to route to the UPLOAD zone (path TBD, Sprint A2). The form becomes accessible via (i) a tertiary "I don't have my contract" link on the upload screen, and (ii) the existing route remaining valid for direct navigation.
- **Migration 0011 schema (waits for Sprint A5).** Four new tables per `document-intelligence-plan-v01.md` §6: `document_classifications`, `document_extractions`, `employer_extraction_patterns`, `worker_extraction_preferences`. RLS mirrors `documents` (signed-in worker reads own; service role writes). Indexes on `(document_id)` + `(worker_id)` + `(employer_id, document_type)` per fetch path. Not applied this ADR.
- **Sprints 8 / 9 / 10 paused.** The Layer 2 (shift logging) and Layer 3 (manual payslip entry) build sprints originally planned next now wait until Sprints A2–A5 (design) and B1–B3 (build the pre-stages) complete. Sprint 8/9/10 will compose the upload-first flow per bucket; their original specs remain valid for the manual fallback path inside each bucket.
- **Sprint sequence (per `document-intelligence-plan-v01.md` §8).** A1 (this ADR) → A2 (storage) → A3 (extraction service + prompts) → A4 (layered memory) → A5 (Migration 0011) → B1–B3 (build pre-stages) → C+ (per-bucket extraction) → D (Dashboard retrofit) → E (comparison engine v1).
- **Cost model.** ~$0.005 / classification (Haiku), ~$0.02–0.05 / extraction (Sonnet). At Phase 0 user count (tens), monthly cost negligible (~$0.20–0.50 / worker). Re-evaluate at Phase 1 with batching + Haiku-first heuristics.
- **Privacy policy v1 update (Phase 0 finish-line).** Must disclose: document content sent to Anthropic API for classification + extraction; layered memory tables (per-employer + per-worker patterns); 7-year Privacy Act retention with deletion-on-request still binding. Already an existing Phase 0 blocker per ADR-006 — this ADR adds specifics to the disclosure list, not the blocker.
- **Cross-references.** ADR-001 (confirmation sacred — extraction lands as `'ocr_suggested'` and only becomes calc-eligible after Rule 4.1 CONFIRM); ADR-003 (info not advice — classification + extraction are info layers; framing rules apply to all worker-facing copy); ADR-005 (indexing not looping — extraction reads only the document being processed, never the worker's document history); ADR-006 (orient don't collect — UPLOAD copy carries the orient; no field-collection until CONFIRM); ADR-007 (two gates → three gates: classify / extract / compare); ADR-009 / ADR-010 / ADR-011 (allowance reference data unaffected); ADR-012 (amended above; both ADRs read together).
- **Reversibility.** Single ALTER + DROP TABLE per of the 4 Migration 0011 tables to roll back. Sprint 7's manual form continues to work without any of the new tables present. No one-way doors. Pattern revision (whole-pattern, not tuning) requires a new ADR per the adaptability contract; ADR-013 stays in history per ADRs-are-append-only.
- **What this ADR explicitly does NOT cover.** Sprint A2 storage architecture (file naming, page-split, archival policy); Sprint A3 extraction service spec + prompt templates; Sprint A4 layered-memory write/read paths; Sprint A5 migration SQL; Sprint B1–B3 UX implementation; Sprint D Dashboard re-routing; Sprint E comparison engine. Each is its own sprint with its own audit + design pass; this ADR is the architectural commitment, not the implementation.
