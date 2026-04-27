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
