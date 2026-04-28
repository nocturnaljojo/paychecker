# "Add a Fact" — operational pattern (v01)

**Status:** Accepted (Sprint 6, 2026-04-28). Source of truth for Sprint 7 (Layer 1), Sprint 8 (Layer 2), Sprint 9 (Layer 3).
**Decision record:** `docs/architecture/decisions.md` — ADR-012.
**Obeys:** ADR-001 (confirmation sacred), ADR-005 (indexing not looping), ADR-006 (orient don't collect), ADR-007 (two gates before mismatches), `SKILL-FACT-confirmation`, `confirmation-flow.md`, `personas.md` (Apete).

## Status update — 2026-04-29

This pattern is AMENDED by ADR-013 (upload-first fact capture). The 5 stages described below remain valid; ADR-013 adds 4 pre-stages (UPLOAD / CLASSIFY / ROUTE / EXTRACT) which run before this pattern's stages execute.

For build sprints implementing fact capture, read ADR-013 first, then return to this document for the original 5-stage spec.

The manual-entry path described in this document remains valid as the FALLBACK path (when worker has no document or extraction fails).

This is **not** the JSX. It is the spec the JSX must satisfy. Build sprints (7/8/9) compose the 5 stages below; each layer picks which stages are visible and which collapse.

---

## 1. The 5 stages

A single "Add a Fact" interaction is a **composition** of five named stages. Stages are not always equally visible — see §6 (Stage Collapse). Stages have explicit boundaries so a future tuning sprint can change one without breaking the others (the **adaptability contract** — §9).

| # | Stage | One-line purpose |
|---|---|---|
| 1 | **ENTRY** | Apete arrives at "I'm going to add a {fact}." He sees what he's about to do, why, and what he can leave behind if he's interrupted. |
| 2 | **SUGGEST** | The screen offers values *before* Apete types. Prefills, defaults, "we think this is X — keep or change". Provenance of every suggestion is visible. |
| 3 | **INPUT** | Apete provides his answer when there's no good default OR he wants to override a suggestion. ESL-friendly inputs, mobile-first, 52 px tap height. |
| 4 | **CONFIRM** | Apete explicitly commits this fact. Per ADR-001 this is the moment `confirmed_at` is set. Pre-fill OK; pre-confirm NEVER. |
| 5 | **AFTERMATH** | Apete sees that the fact saved, knows where to find it again, and has a path to undo / edit. The screen does not just navigate away. |

---

## 2. Stage 1 — ENTRY

### Rule 1.1 — One-line "what we're adding" + "why we're asking"

Every "Add a Fact" surface opens with a single sentence stating *what* fact is being added and *why* PayChecker needs it.

- **Precedent.** ADR-006 (orient, don't collect) — friction is the failure mode; context is the antidote. `Onboarding.jsx` post-it ("Orient, don't collect").
- **Apete rationale.** Apete won't tap into an unfamiliar form without first knowing what he's about to give and what it costs him. ESL → one short sentence, year-9 reading.
- **Counter-example.** Page header "Add Employment Contract" + jumps straight to a form with 6 empty fields. Apete bounces.

### Rule 1.2 — Resume-safe entry

If Apete left mid-flow, the ENTRY stage shows what he's already confirmed for this fact-shape and where he stopped, with a single "Pick up where you left" affordance.

- **Precedent.** `personas.md` — "Will not complete a 20-minute wizard in one sitting"; "Won't return to a flow that doesn't show progress." `confirmation-flow.md` state machine — `proposed` rows persist between sessions; ENTRY reads them.
- **Apete rationale.** Dad needs help; phone goes to 5 %; bus arrives. If returning starts him from zero he doesn't return.
- **Counter-example.** A wizard that resets `useState` on remount. (Currently the case in `OnboardingFlow.tsx:24` — that's a Sprint 6.x retrofit candidate, NOT a Sprint 6 design fix.)

---

## 3. Stage 2 — SUGGEST

### Rule 2.1 — Every prefill carries a provenance label

Every value the screen offers Apete *before* he types carries a small visible label naming its source: "from your payslip", "from last shift", "from your contract", "we computed this from your hours".

- **Precedent.** `SKILL-FACT-confirmation:31` — "Show provenance in the UI"; `confirmation-flow.md` — "Pre-fill OK; pre-confirm NEVER" + "Provenance is visible".
- **Apete rationale.** Apete must be able to tell at a glance which numbers came from a document he uploaded vs which came from PayChecker's defaults. Without labels, suggested values look identical to confirmed ones.
- **Counter-example.** Step6Consent today: `name` is prefilled from Clerk but no label says "we got this from your sign-up". (Sprint 6.x retrofit candidate.)

### Rule 2.2 — Suggestion is editable in place; editing does NOT confirm

A suggested value is rendered as **editable in place**. Tapping the value opens edit mode (transitions to Stage 3 INPUT). Editing alone does not confirm — Stage 4 still required.

- **Precedent.** `SKILL-FACT-confirmation:43` — "Edits unset `confirmed_at`; re-confirm restores it." `confirmation-flow.md:18` — "trigger fires on UPDATE — old row to *_history, current row's confirmed_at set to NULL".
- **Apete rationale.** Apete edits because the suggestion is wrong — he should not need a separate "I want to edit" mode-switch.
- **Counter-example.** A read-only suggestion with a "tap to edit" pencil icon that opens a modal. Two taps where one would do.

### Rule 2.3 — No suggestion = SUGGEST collapses cleanly

When PayChecker has no defensible suggestion for a field (e.g. the worker's first shift logged), SUGGEST renders nothing — not a loading spinner, not "no data" placeholder. The screen flows straight to INPUT with the field's label and a hint.

- **Precedent.** `personas.md` — "Won't return to a flow that doesn't show progress" → no spinners-of-doubt. `REF-INDEXING-not-looping` — index, don't loop; absence is information.
- **Apete rationale.** "No suggestion yet" is a worse experience than "just show me the field to fill". Don't spend pixels on nothing.
- **Counter-example.** "We're loading suggestions for you…" placeholder that resolves to empty. (See Stage Collapse §6 for which layers naturally hit this.)

---

## 4. Stage 3 — INPUT

### Rule 3.1 — One field per moment, vertically stacked, 52 px tap height

INPUT renders one editable field at a time, vertically stacked at 52 px input height (per `tokens.css` `--pc-input-h`). No multi-column layouts. No grouping that requires Apete to scroll horizontally.

- **Precedent.** `tokens.css:94` `--pc-input-h: 52px`. `Components.jsx` README — "52px input height. 16px minimum body size. 48×48 tap targets". `personas.md` — mobile-first, regional NSW shared phones.
- **Apete rationale.** Apete is on a cheap Android with patchy data and (probably) borrowed glasses. Big targets, vertical scroll, one thing at a time.
- **Counter-example.** Side-by-side date / time fields that wrap awkwardly at 360 px wide.

### Rule 3.2 — Validation as plain-language hints, never red errors

INPUT validation appears as a soft hint below the field ("Enter at least 4 digits") — not a red error toast and not a blocking modal. The field stays editable; CONFIRM stays disabled until valid.

- **Precedent.** `personas.md` — "legalese reads as threat"; warm tones over alarm tones. `colors_and_type.css` — coral is reserved for error-rare-cases.
- **Apete rationale.** Red text reads as "you did something wrong" and freezes anxious users.
- **Counter-example.** Inline red banner: "Invalid input. Please correct and try again." Apete walks away.

### Rule 3.3 — INPUT does not auto-advance

After Apete types, the screen does NOT auto-progress to the next stage. The CONFIRM affordance stays in the footer, visible, until Apete taps it.

- **Precedent.** `SKILL-FACT-confirmation:11` — "A fact is not usable in a calculation until it has a `confirmed_at` timestamp."
- **Apete rationale.** Auto-advance teaches Apete that "typing = saved" — the cardinal misunderstanding ADR-001 exists to prevent.
- **Counter-example.** Onblur navigates to the next field; Apete thinks his answer was saved.

---

## 5. Stage 4 — CONFIRM

### Rule 4.1 — The button says "Confirm" — never "Save", "OK", "Continue", or "Next"

The primary affordance at the CONFIRM stage uses the literal word **"Confirm"**, optionally with a fact name ("Confirm employer", "Confirm shift", "Confirm payslip values").

- **Precedent.** `SKILL-FACT-confirmation:41` — "Confirm buttons say 'Confirm' — never 'Save' (which is ambiguous), never 'OK' (which is dismissive)."
- **Apete rationale.** Plain language; matches the schema concept; tells Apete what he's about to do without ambiguity. ESL-safe.
- **Counter-example.** "Save" / "OK" / "Continue" — all currently in production; all violate the skill rule.

### Rule 4.2 — Pre-CONFIRM summary shows the full row Apete is committing

Before Apete taps Confirm, the screen shows him every field's final value (after any edits) in plain rows: label + value + tiny provenance label. This is the audit-trail surface Apete sees with his own eyes.

- **Precedent.** ADR-001 — calc reads only confirmed; therefore CONFIRM is the *only* moment Apete is responsible for. ADR-007 — gate 1 requires inputs to be defensible; the summary is Apete's gate-1 sanity check.
- **Apete rationale.** Apete confirms what he can see. If a field is hidden behind a chevron, it isn't confirmed in spirit.
- **Counter-example.** "Confirm" button at the bottom of a 200-row list scrolled out of view. Confirms what?

### Rule 4.3 — CONFIRM is disabled until every field is filled or has a confirmed-prefill

The button is rendered visible-but-disabled until Apete has either typed each field OR explicitly accepted each suggested value. Disabled-button tooltip / hint says exactly which field still needs attention (in plain language).

- **Precedent.** `Step6Consent.tsx:56` — already does this for `consent && data.name.trim().length > 0`. ADR-001 — pre-confirm never.
- **Apete rationale.** Apete should never tap a Confirm that fails. The hint tells him *what* to fix.
- **Counter-example.** Greyed-out button with no explanation. Apete taps three times and gives up.

---

## 6. Stage 5 — AFTERMATH

### Rule 5.1 — The screen does not navigate away on success

After CONFIRM, the same screen shows a sage success state with: the saved values, a "What's next" pointer (e.g. "Next: log a shift"), and a tertiary "edit" affordance that returns to a fresh INPUT cycle (which un-confirms per `confirmation-flow.md` rules).

- **Precedent.** `personas.md` — "Won't return to a flow that doesn't show progress." `confirmation-flow.md:43-44` — edit returns to proposed; UX must surface this. Hour-3 retro `What's Open` — "No 'what got saved' AFTERMATH visible to Apete (Step6 just navigates to /dashboard)".
- **Apete rationale.** Apete needs to see his fact landed. Navigating away looks like the app forgot. Edit-in-place lets him correct a typo without re-doing ENTRY/SUGGEST.
- **Counter-example.** `OnboardingFlow.tsx:45` — `navigate('/dashboard', {replace:true})` on success. (Sprint 6.x retrofit candidate; today's Sprint 6 ADR locks the rule, Sprint 7 enforces it for new flows.)

### Rule 5.2 — Provenance label persists in AFTERMATH

The saved values continue to carry their provenance label ("from payslip 2025-08-12 / confirmed by you, 2026-04-28"). Apete sees not just *what* was saved but *what kind of confirmation* it carries.

- **Precedent.** `SKILL-FACT-confirmation:31` — provenance always visible. `REF-FACT-model.md` provenance enum.
- **Apete rationale.** Future-Apete returning to verify needs to remember "did I type this myself or did the OCR suggest it?".
- **Counter-example.** A clean values list with no source labels. Apete second-guesses every number.

### Rule 5.3 — Path to discard / unconfirm is visible but not loud

A tertiary "Remove this {fact}" or "I made a mistake" affordance is visible in AFTERMATH, but presented as a small text-link, not a destructive button. Tapping it routes through a one-step confirm-the-discard prompt and writes the discard to `*_history` per `confirmation-flow.md:60-62`.

- **Precedent.** `confirmation-flow.md:13` discard / revoke states; `REF-FACT-model.md` — soft-delete via `deleted_at` only.
- **Apete rationale.** Apete is anxious about commitment; if he can't undo cheaply, he won't confirm in the first place.
- **Counter-example.** A red "DELETE" button with no confirmation step. Or no undo path at all.

---

## 7. Apete walkthrough — Layer 1 (employer fact)

**Scenario.** Apete adds his employer fact: legal name *Acme Poultry Pty Ltd*, ABN unknown, classification *Process Employee Level 2*, hourly rate *$25.73*. He's in his bedroom, after a 10-hour shift, on a borrowed phone.

**Stage 1 — ENTRY.** Apete taps the "Employment contract" bucket on `/dashboard`. Screen opens with header **"About your employer."** and one-sentence body: *"PayChecker needs to know who pays you and what level you're on so we can compare your pay to the right award rate."* Below: a small grey card if a partial draft exists ("You started this on Tuesday — 1 of 4 fields filled. Pick up where you left."), otherwise nothing.

**Stage 2 — SUGGEST.** Empty for first-time entry — no defensible defaults available (`Rule 2.3` collapse). Layer 1 first-fact: SUGGEST renders nothing.

**Stage 3 — INPUT.** Four fields stacked vertically, 52 px tall:
1. **Employer legal name** — text. Hint: "How it appears on your payslip."
2. **ABN** — text, optional. Hint: "11 digits if you have it. Leave empty if not."
3. **Classification** — picker. Tap → modal lists *Process Employee Level 1 / 2 / 3 / 4 / 5 / 6* with the verbatim Schedule A definition under each (per `awards-ma000074-v02.md` §A.1.x).
4. **Hourly rate** — auto-fills from the chosen classification ($25.73 for Level 2 per `award_rates.amount`). Visible provenance label: *"from the Poultry Processing Award, current as at 1 July 2025."*

**Stage 4 — CONFIRM.** Footer button: **"Confirm employer"** (disabled until name + classification picked; ABN optional). Above the button, a dense summary card shows all 4 values + their provenance labels. The hint when disabled: *"Pick a classification before you confirm."*

**Stage 5 — AFTERMATH.** Same screen, sage tint. Heading: *"Confirmed. We have your employer."* Values restated. Provenance label per row. Tertiary at the bottom: *"Edit"* (returns to a fresh INPUT cycle, un-confirms per `confirmation-flow.md`). Tertiary lower: *"Remove employer"* — small text-link with a confirm-the-discard step. "What's next" pointer: *"Next: add a payslip when you have your first one."*

---

## 8. Apete walkthrough — Layer 2 (shift fact)

**Scenario.** Apete logs a shift: Sunday 2025-08-10, 06:00–14:30, ordinary, evisceration line. He's on the bus.

**Stage 1 — ENTRY.** Apete taps "Log a shift" on `/dashboard`. Screen opens: **"Log a shift."** Body: *"Tell us when you worked. We'll match it to your pay later."* If he logged 3 shifts in the last week, a small banner: *"You've logged 3 shifts this week. Need to log another?"*

**Stage 2 — SUGGEST.** Last shift's date + 1 day prefilled (default = "yesterday"). Last shift's start/end times prefilled. Provenance: *"from last shift logged."* Apete can keep all four values with a single tap, or change any of them inline.

**Stage 3 — INPUT.** If Apete edits the date (e.g. Sunday 2025-08-10 instead of yesterday), the prefilled times stay until he edits them. Each field is one-at-a-time: tap a value → opens a date picker / time wheel / shift-type chips (`ordinary` / `overtime` / `public_holiday` / `weekend_penalty` per the `shift_facts.shift_type` enum).

**Stage 4 — CONFIRM.** Footer button: **"Confirm shift"**. Summary card: date, start, end, shift_type, with shift duration computed and shown ("8.5 hours").

**Stage 5 — AFTERMATH.** Sage tint, *"Confirmed. We've got your Sunday shift."* Tertiary: *"Edit"* / *"Remove shift"*. "What's next": *"Log another?"* (loops back to Stage 1 ENTRY pre-filled with this shift's date + 1 day; common pattern for end-of-week catch-up).

---

## 9. Apete walkthrough — Layer 3 (payslip fact)

**Scenario.** Apete enters payslip values manually (Phase 0 — no OCR yet): period 2025-08-10 to 2025-08-23, gross $1,247.30, hours 76, super $143.44, tax $245.10. He's at the kitchen table with the paper payslip in his other hand.

**Stage 1 — ENTRY.** Apete taps "Add payslip" on `/dashboard`. Screen opens: **"Add a payslip."** Body: *"Type the numbers from your payslip. Take your time."* If he's mid-typing-resume: *"You started this on Tuesday — 4 of 7 fields filled. Pick up where you left."*

**Stage 2 — SUGGEST.** Period start = day after last payslip's period end (if any). Period end = period_start + 14 days (default fortnight). Both labeled *"from last payslip."* No suggestions for monetary values — those are payslip-specific.

**Stage 3 — INPUT.** 7 fields stacked vertically:
1. Period start (date, prefilled, editable)
2. Period end (date, prefilled, editable)
3. Gross pay ($, mono numeric input — `Money` component)
4. Ordinary hours (numeric)
5. Tax ($)
6. Super ($)
7. Net pay ($, auto-computed from gross − tax with edit override; provenance label *"computed; edit if your payslip says different."*)

**Stage 4 — CONFIRM.** Footer: **"Confirm payslip"**. The summary card here is **dense** — 7 rows. Per Rule 4.2, every row must be visible above the button (the screen scrolls if needed; confirm button is always footer-pinned per `Shell.tsx`). Provenance per field. Hint when disabled: *"3 fields still need attention: gross pay, hours, tax."*

**Stage 5 — AFTERMATH.** Sage tint, *"Confirmed. We have your payslip from 10–23 August."* All 7 rows restated with provenance. Tertiary "Edit" / "Remove payslip". "What's next": *"You can run a comparison now"* (only visible if shifts + employer + this payslip all confirmed for the period — gate-1 per ADR-007).

---

## 10. Stage collapse — which stages can be empty per layer

| Layer | ENTRY | SUGGEST | INPUT | CONFIRM | AFTERMATH |
|---|---|---|---|---|---|
| **Layer 1 — employer** (first time) | required | empty (no prior shifts; rate prefills from award_rates after classification picked) | required | required | required |
| **Layer 1 — employer** (edit) | required | full (existing values prefilled) | required | required | required |
| **Layer 2 — shift** (first ever) | required | empty (no prior shift) | required | required | required |
| **Layer 2 — shift** (subsequent) | required | full (prior shift's date+1, times) | optional (Apete may keep all suggestions) | required | required |
| **Layer 3 — payslip** (first ever) | required | partial (period dates only) | required | required | required |
| **Layer 3 — payslip** (subsequent) | required | partial (period dates) | required | required | required |

**Required = always visible.** **Empty = collapses cleanly per Rule 2.3 (no spinner, no placeholder, screen flows to next stage).** **Optional = stage may render zero affordances if the worker accepts every suggestion (Apete taps Confirm directly from SUGGEST in the Layer 2 subsequent-shift "log another" path).**

ENTRY, CONFIRM, AFTERMATH are **always** required. SUGGEST and INPUT may collapse based on layer + state.

---

## 11. Edge cases

### Pattern handles directly

- **Apete leaves mid-flow and returns** — Rule 1.2 + a `proposed`-state row in `*_facts` (per `confirmation-flow.md`).
- **Apete edits a confirmed fact** — `confirmation-flow.md:18` trigger writes the old row to `*_history` and clears `confirmed_at`; AFTERMATH shows the edit cycle visibly.
- **Apete needs to undo immediately** — Rule 5.3 tertiary discard path with one-step confirm.
- **No suggestion available** — Rule 2.3 collapses SUGGEST entirely; no "loading" state.

### Sprint 7 / 8 / 9 must solve INSIDE the pattern

- **Layer 1 classification picker UI.** Sprint 7 builds the modal list with verbatim Schedule A definitions per `awards-ma000074-v02.md` §A.1.x. Hint: render each level's `(b) Skills/duties` and `(c) Indicative tasks` as a tappable card; selection sets `worker_classification_facts.classification_code`.
- **Layer 2 shift-time entry on a phone.** Sprint 8 picks the time-input UX (wheel vs typed vs preset chips). Hint: preset chips for common starts (06:00 / 14:00 / 22:00 — typical poultry-line shifts) + a "Custom" path. ESL-safe.
- **Layer 3 dollar input on Plex Mono.** Sprint 9 wires the `Money` component as the input variant (currently it's only display). Tabular-nums alignment, automatic AUD prefix, decimal forced.
- **AFTERMATH "What's next" pointer.** Each layer picks its own next-action copy (Layer 1 → "add payslip when you have one"; Layer 2 → "log another shift?"; Layer 3 → "run comparison if you have shifts + employer too"). Pattern provides the shape; layer provides the copy.

### Future ADRs (out of Sprint 6 scope)

- **OCR-suggested-confirmed handling.** When Phase 5 OCR ships, SUGGEST stage gets a *new* provenance label ("from your payslip — please check"); INPUT must surface the original document image so Apete can verify. New ADR.
- **`assisted_entered` provenance.** When Phase 1 introduces support-staff entry, SUGGEST + AFTERMATH need an "entered by support, confirmed by Apete" double-label. New ADR.
- **Multi-period payslip.** Some payslips cover multiple periods (catch-up pay). Layer 3 currently assumes one period per payslip. New ADR if/when this surfaces.
- **Resume-mid-flow persistence layer.** Rule 1.2 needs `*_facts` rows in `proposed` state to survive between sessions. Currently `OnboardingFlow.tsx:24` keeps state in `useState` only — fact-flows must use `*_facts` rows from the start (write `proposed` row on first INPUT, update on edit, set `confirmed_at` on CONFIRM). Sprint 7 implements; no new ADR required (the fact tables already support this).

---

## 12. Copy guidelines

**Tone.** Plain. Year-9 reading level. No idioms ("piece of cake"). No legalese ("entitlements", "in accordance with"). No abbreviations Apete might not know (PR* = no; FWC = expand on first use; AWR = avoid).

**Vocabulary.**
- **Use:** "Confirm". "What you saved." "We got this from your payslip." "Tap here to change."
- **Avoid:** "Submit". "Save". "Process". "Validate". "Acknowledge". "Acknowledged" (mock has it; reads as legalese — use "I've added everything I have" or similar).
- **Banned:** "wage theft" (per ADR-003). "owed" / "you may be entitled to" (advice framing). "your boss" (asymmetric). Dollar-precision claims ("you've been underpaid by $X.XX") — use diagnostic framing ("we computed $X. Your payslip shows $Y. The difference is $Z.").

**Apete grammar checks before any copy ships.**
- Idiom check: read aloud as if English isn't first language. If anything reads sideways, rewrite.
- Cost check: every word the worker reads is a tax. Cut the third sentence.
- Anxiety check: would this read as a threat to a worker on a temporary visa? If even maybe → rewrite.

**Money rendering.** Always `Money` component (Plex Mono + tabular-nums + AUD). Always cents. Never abbreviated ("$1.2k" — banned). Always `$1,247.30`, never `$1247.3`.

**Dates.** ISO-like in technical contexts (`2026-04-28`); long-form for worker-facing copy (*"10 to 23 August"*). Never `08/10/26` (US/AU ambiguity).

---

## 13. Adaptability contract

The whole point of stage-based design: when Apete (or his brother sitting next to him) reports "I got stuck", the report maps to a stage's observation point, and the fix is scoped to that stage's tuning surface.

| Stage | Independent of | Linked to | Example tuning |
|---|---|---|---|
| **ENTRY** | All others | None | Change the one-line copy without re-testing CONFIRM. |
| **SUGGEST** | INPUT (suggestion form ≠ input form), AFTERMATH | CONFIRM (because summary may show suggestion provenance) | Add a new prefill source. Verify CONFIRM summary still renders the new provenance label. |
| **INPUT** | SUGGEST, AFTERMATH | CONFIRM (validation gates the button) | Change time-picker UX. Verify CONFIRM hint still names the right field. |
| **CONFIRM** | ENTRY, SUGGEST | INPUT (validation), AFTERMATH (must show confirmed values) | Change button copy from "Confirm" to "Confirm shift". Verify AFTERMATH success heading still matches. |
| **AFTERMATH** | ENTRY, SUGGEST, INPUT | CONFIRM (must reflect what was confirmed) | Add a "What's next" pointer per layer. No other stage affected. |

**Rule of thumb:** if a tuning sprint changes more than 1 row of this table, it's a pattern revision (new ADR), not a tuning.

---

## 14. Verification — Layer 1 pseudo-JSX

```jsx
// PSEUDO-JSX — NOT FOR PRODUCTION
// Sprint 6 Part 3 verification only.
// Apete adding employer fact, all 5 stages visible.
// Zero real React imports, zero real component names from src/,
// zero real Tailwind classes — just enough structure to prove
// the pattern is implementable AND stages are separable.

<FactScreen layer="1" factCode="EMPLOYER">

  {/* === STAGE 1: ENTRY === */}
  <EntryHeader
    title="About your employer."
    body="PayChecker needs to know who pays you and what level you're on
          so we can compare your pay to the right award rate."
    resumeBanner={proposedRow ? <ResumeFromProposed row={proposedRow}/> : null}
  />

  {/* === STAGE 2: SUGGEST ===
      Layer 1 first-time: empty per Rule 2.3 (no prior shifts to draw from).
      Layer 1 edit: SUGGEST is full; rendered as editable rows. */}
  {hasPriorEmployer && (
    <SuggestStack provenance="from your last confirmed employer">
      <SuggestRow field="legal_name" value={prior.legal_name}/>
      <SuggestRow field="abn"        value={prior.abn}/>
      <SuggestRow field="class_code" value={prior.class_code}/>
      <SuggestRow field="hourly_rate" value={prior.hourly_rate}
                  provenance="from the award; current as at 2025-07-01"/>
    </SuggestStack>
  )}

  {/* === STAGE 3: INPUT ===
      Vertically stacked, 52 px each, label + hint + control. */}
  <InputStack>
    <InputField field="legal_name"
                hint="How it appears on your payslip." />
    <InputField field="abn" optional={true}
                hint="11 digits if you have it. Leave empty if not." />
    <ClassificationPicker field="class_code"
                          award="MA000074"
                          schedule={SCHEDULE_A_LEVELS_1_TO_3} />
    <ComputedField field="hourly_rate"
                   computedFrom="class_code → award_rates"
                   provenance="from the Poultry Processing Award, current as at 1 July 2025"
                   editable={true} />
  </InputStack>

  {/* === STAGE 4: CONFIRM === */}
  <ConfirmSummary
    rows={[
      { label: "Employer", value: form.legal_name, provenance: "you typed this" },
      { label: "ABN",      value: form.abn || "(not provided)", provenance: "you typed this" },
      { label: "Level",    value: form.class_code,
                            provenance: "you picked this from the FWC schedule" },
      { label: "Rate",     value: <Money amount={form.hourly_rate}/>,
                            provenance: "from the award; you accepted" },
    ]}
  />
  <ConfirmButton
    label="Confirm employer"
    disabled={!isComplete(form)}
    disabledHint={firstMissingField(form)
      ? `Pick a ${firstMissingField(form)} before you confirm.`
      : null}
    onConfirm={() => writeFact({ provenance: 'worker_entered', confirmed_at: now() })}
  />

  {/* === STAGE 5: AFTERMATH === */}
  {wasConfirmed && (
    <AftermathPanel tone="sage"
                    heading="Confirmed. We have your employer.">
      <ConfirmedRows rows={confirmedRows} provenanceVisible={true}/>
      <Tertiary onTap={returnToInputCycle}>Edit</Tertiary>
      <Tertiary onTap={discardWithConfirmStep} variant="quiet">
        Remove employer
      </Tertiary>
      <WhatsNext text="Next: add a payslip when you have your first one."/>
    </AftermathPanel>
  )}

</FactScreen>
```

> **What this sketch proves.** The 5 stages have clear seams (each `STAGE` comment block is independently swappable). Stage 2 collapses cleanly (the `{hasPriorEmployer && …}` short-circuit is a one-line implementation of Rule 2.3). The CONFIRM button label is `"Confirm employer"` per Rule 4.1. The pre-CONFIRM summary shows every field with provenance per Rule 4.2. AFTERMATH does not navigate away per Rule 5.1. The discard affordance is tertiary-quiet per Rule 5.3. **Implementable in real React inside Sprint 7 without changes to the pattern.**

---

## 15. Pressure test summary

Per `SKILL-PRJ-pressure-test.md`. All five prompts cleared with mitigations.

### 1. Break this system — 5 ways Apete fails, mapped to stages

| # | Failure | Stage | Mitigation |
|---|---|---|---|
| (i) | Slow data — bucket detail screen takes 4 s to load. Apete bounces. | **ENTRY** | Render ENTRY copy from local state immediately; `proposed`-row resume banner can lazily load (Rule 1.2). No spinner-of-doubt at ENTRY. |
| (ii) | ESL — Apete reads "Confirm payslip" but isn't sure if "Confirm" means "yes I'm done" or "I'm starting now". | **CONFIRM** | Rule 4.1 + Rule 4.2: Confirm copy + visible summary above the button. Apete taps after seeing the values, not before. |
| (iii) | Dad-care interruption mid-flow. Apete's son needs help with homework. He locks the phone. Returns 90 minutes later. | **ENTRY → AFTERMATH** | Rule 1.2 (resume) + rows persisted in `proposed` state per `confirmation-flow.md`. The Sprint-7 implementation must write a `proposed` row on first INPUT (not on CONFIRM). Pattern handles; Sprint 7 enforces. |
| (iv) | Wrong default — SUGGEST proposes a Tuesday shift but Apete actually worked Sunday. | **SUGGEST → INPUT** | Rule 2.2: suggestions are editable in place. Rule 2.1: provenance label tells Apete *why* the screen guessed Tuesday, so he knows where to override. |
| (v) | Apete confirms then realises he typo'd the ABN. | **AFTERMATH** | Rule 5.1: AFTERMATH renders an "Edit" tertiary that returns to a fresh INPUT cycle and un-confirms per `confirmation-flow.md` triggers. No Discard required for a typo fix. |

### 2. Personas — Apete + advocate + Mia, focus on AFTERMATH

- **Apete (primary):** AFTERMATH must show the saved values + provenance (Rule 5.2) and a non-loud Discard path (Rule 5.3). Sage tint reads as "we got it" without celebration. Pass.
- **Advocate (Apete's brother).** Verifies that Apete confirmed real values, not auto-filled junk. Provenance labels in AFTERMATH let him see "Apete typed this" vs "from the award" at a glance. Pass.
- **Mia (paid-tier hospitality, Phase 2).** Higher digital literacy; expects to edit a confirmed fact in 2 taps. Rule 5.1 "Edit" tertiary delivers — no extra modal. Pass. (Mia hits casual-loading rules in calc, not "Add a Fact"; cl 11.3 lives in `calc-rules-v01.md`, not here.)

### 3. What would Apete misunderstand — by stage

| Stage | Misreading | Mitigation |
|---|---|---|
| **SUGGEST** | "We suggest" reads as "this is what you said before" → he confirms a wrong value. | Rule 2.1: provenance label explicit. Rule 2.2: editable in place removes ambiguity (if he hesitates, he taps and corrects without a separate edit-mode). |
| **INPUT** | Auto-advance feels like saved. | Rule 3.3: no auto-advance. CONFIRM button stays in footer until tapped. |
| **CONFIRM** | "Confirm" looks like "Continue" → he's still navigating, not committing. | Rule 4.1 mandates the literal word "Confirm". Rule 4.2 summary makes the commit moment unmistakable. |
| **AFTERMATH** | Navigating away looks like "the app didn't save it." | Rule 5.1: stay on the screen, render the saved state. |

### 4. Privacy / safety / APP

- **APP 1 (open + transparent).** Provenance labels at every stage make collection purpose visible. Pass.
- **APP 3 (collection for disclosed purpose).** ENTRY one-line ties every "Add a Fact" to a stated purpose. Pass.
- **APP 5 (notification at collection).** ENTRY copy IS the notification. Pass.
- **APP 6 (use only as disclosed).** Pattern doesn't speak to use; calc engine + report do. Out of pattern scope.
- **APP 11 (security).** Pattern doesn't introduce new collection paths; existing RLS handles it. Pass.
- **R-004 (worker safety vs employer).** No stage exposes Apete's PayChecker activity to the employer. AFTERMATH does not email anyone. Confirm acts are local to Apete + Supabase. Pass.
- **R-005 (info not advice).** Rule 4.1 + copy guidelines (§12) ban "owed" / "entitled to" / "wage theft" framing. Pattern is information-shaped throughout. Pass.

### 5. Reversibility + adaptability contract stress test

- **Sprint 7 reveals a stage is broken (e.g. CONFIRM button copy is wrong for Layer 1 in production with real Apete).** Adaptability contract (§13) says CONFIRM is independent of ENTRY/SUGGEST and linked only to INPUT (validation) + AFTERMATH (heading). Fix lives in CONFIRM stage; tests verify INPUT validation + AFTERMATH heading still cohere. **Tuning, not refactor.**
- **Sprint 8 reveals the SUGGEST default for shift times is wrong.** SUGGEST is independent of CONFIRM/AFTERMATH and linked to INPUT (override path). Fix lives in SUGGEST stage; INPUT override behaviour validates the new default. **Tuning, not refactor.**
- **Sprint 9 reveals the AFTERMATH "What's next" pointer should link to the comparison engine.** AFTERMATH is independent of all upstream stages; copy + link change in AFTERMATH alone. **Tuning, not refactor.**
- **Sprint 7 reveals stages can't be cleanly separated for Layer 1 first-time entry.** Pattern revision required → new ADR (ADR-013). Cost: **one ADR + the Layer 1 implementation, not the whole pattern.**

**5/5 cleared. No blockers. Pattern is adaptable per the §13 contract.**

---

## 16. When this doc changes

- **A new layer is added** (e.g. Layer 4 piece-rate horticulture, Phase 4 PLAN). Add a walkthrough section parallel to §7-9; update §10 stage-collapse table; commit alongside the layer's build sprint.
- **A stage's rule set changes.** Bump version (`add-fact-pattern-v02.md`); supersede this file; cross-reference forward; old file stays for audit per ADR-005 immutability spirit.
- **A new ADR supersedes ADR-012.** Same as above; new ADR explicitly marks ADR-012 *Superseded* with a forward link.
- **A pressure-test failure surfaces in production.** Append to §15 with the new mitigation; update the rule that failed; bump version.
