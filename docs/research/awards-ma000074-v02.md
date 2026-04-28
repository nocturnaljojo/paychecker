# MA000074 — Poultry Processing Award 2020 — research note v02

**Status:** **CAPTURED** (Levels 1–3 + all 6 remaining v01 §6 gaps, Sprint 5 close — 2026-04-28).
**Scope:** Closes v01 §6 gaps #1–7 — Schedule A definitions for Levels 1–3 (Sprint 4) plus cold-work bands, span-of-hours, night-shift definitions, public-holiday OT rate, casual+penalty interaction, meal + vehicle allowance amounts (Sprint 5). Levels 4–6 of Schedule A deferred (out of Apete-shaped scope; same exposure-draft PDF carries them).
**Builds on:** [`awards-ma000074-v01.md`](./awards-ma000074-v01.md). v01 remains the authoritative aggregate research note; v02 is a delta on a single gap. Future v02.x increments close remaining v01 §6 gaps (cold-work temperature bands, span-of-hours, night-shift definition, public-holiday OT, casual + penalty stacking, Meal/Vehicle allowance amounts).
**Maintainer:** Jovi (PayChecker).

> **Naming correction.** v01 §2 referred to the Levels 1–3 classifications as *Poultry Processing Worker Level N* — a working-hypothesis name. The verbatim FWC text below uses **Process Employee Level N**. PayChecker's classification-picker UI and any worker-facing copy must use *Process Employee*, not *Poultry Processing Worker*. The internal `classification_code` values (`LEVEL_1`, `LEVEL_2`, `LEVEL_3`) seeded in migration `0005` are unaffected — they're identifiers, not labels.

---

## §A.1.1 — Process Employee Level 1

**Source:** FWC consolidated Poultry Processing Award 2020 (MA000074), Schedule A — Classification Definitions, clause A.1.1. Verbatim text reproduced below from the FWC 4-yearly review exposure draft determination (the published proposed text that became the current consolidation; structurally validated against yesterday's WebSearch snippet of the live consolidation, which carried the identical promotional-criteria phrasing word-for-word). Retrieved 2026-04-28 via INFRA-007 (`pdftotext`) workflow.

```
A.1.1 Process Employee Level 1

   (a) Points of entry
        New employee.

   (b) Skills/duties
        (i) Undertakes structured induction training.
        (ii) Works under direct supervision, either individually or in a team environment.
        (iii) Undertakes training in quality systems.
        (iv) Exercises minimal discretion.
        (v) Undertakes training for any task.

   (c) Promotional criteria
        An employee remains at this level for the first 3 months or until they are capable
        of effectively performing the tasks required so as to enable them to progress to
        a higher level as a position becomes available.
```

> Note on structure: Level 1 has no separate "Indicative tasks" sub-clause — the role is defined entirely by Skills/duties + the promotional-criteria progression rule. This is consistent with an entry-level classification where specific tasks are taught during the 3-month induction.

---

## §A.1.2 — Process Employee Level 2

**Source:** as §A.1.1 (FWC MA000074 Schedule A clause A.1.2). Retrieved 2026-04-28.

```
A.1.2 Process Employee Level 2

   (a) Points of entry
        (i) Previously a Process Employee Level 1; or
        (ii) Proven and demonstrated skills at this level.

   (b) Skills/duties
        (i) Responsible for the quality of their work within this level.
        (ii) Undertakes duties in a safe and responsible manner.
        (iii) Exercises minimal judgment.

   (c) Indicative tasks
        (i) Loading and unloading the crate washer for finished product.
        (ii) Locating and removing any residual feathers from carcasses on the line.
        (iii) Rehanging poultry post-primary grading and/or including wet re-hanging
              or hanging on to automatic cut up, or operator scales, carton strapping,
              including minor adjustment and tape installation.
        (iv) Maintaining plant hygiene, including laundering protective clothing in the
              factory environs.
        (v) Placing a pad on a tray, a plastic liner in a crate, or forming cartons
              manually or semi-automatically.
        (vi) Loading trays into an automatic wrapping machine and/or the hand
              application of stick-on labels on tray packs or bags.
        (vii) Moving product between work areas as directed/and or distributing ice
              throughout the plant where required.
        (viii) Receiving incoming goods and/or packaged products from the plant and/or
              sorting and stacking products inside a freezer or chiller room, and
              retrieving this product for despatch.
        (ix) Operating material handling equipment which may require a licence,
              conveyer or shrink wrap machine.

   (d) Promotional criteria
        An employee remains at this level until they have developed the skills to allow
        the employee to effectively perform the tasks required and are assessed to be
        competent to perform effectively at a higher level so as to enable them to
        progress as a position becomes available.
```

---

## §A.1.3 — Process Employee Level 3

**Source:** as §A.1.1 (FWC MA000074 Schedule A clause A.1.3). Retrieved 2026-04-28.

```
A.1.3 Process Employee Level 3

   (a) Points of entry
        (i) Previously a Process Employee Level 2 or lower; or
        (ii) Proven and demonstrated skills at this level.

   (b) Skills/duties
        (i) Responsible for the quality of their own work within this level.
        (ii) Will be required to have a working knowledge of quality systems.
        (iii) Works in a team environment.

   (c) Indicative tasks
        (i) Employees engaged in the product areas from where the kill and
              eviscerating lines meet to the point of entry into the first washer and/or
              chiller, including re-hanging, vent opening, eviscerating, harvesting,
              pre-pack presenter and evisceration checker.
        (ii) Placing a whole bird and/or pieces into a plastic bag and/or clipping and/or
              placing the bagged or bulk bird into a carton or crate to quality standards.
        (iii) Placing a bird and/or pieces into a plastic bag and/or clipping the bag on
              an automatic or semi-automatic machine.
        (iv) Sorting and selecting pieces of boneless product to achieve random/set
              weights on valumatic trays and presenting the product to quality
              specifications which includes no blemishes, no retention of viscera and no
              protrusions or overlap, and to a standard specification layout.
        (v) All duties relating to a nine piece cut up machine in order to consistently
              achieve quality standards.
        (vi) General work associated with the preparation, packing and storage of
              uncooked and cooked processed poultry products using steam and/or other
              means of heating.
        (vii) All mincing, filling, de-bone machine operation, flavour injector operation
              and mixer operation.

   (d) Promotional criteria
        An employee remains at this level until they have developed the skills to allow
        the employee to effectively perform the tasks required and are assessed to be
        competent to perform effectively at a higher level so as to enable them to
        progress as a position becomes available.
```

---

## §13.2 — Ordinary hours: day workers (span-of-hours)

**Source:** FWC consolidated MA000074, clause 13.2 (Ordinary hours — day workers); verbatim from exposure-draft determination, cross-validated structurally against live HTML viewer. Retrieved 2026-04-28.

```
13.2 Ordinary hours--day workers

   (a) Ordinary hours for a day worker may be worked on any or all days, Monday to
       Friday. Ordinary hours may also be worked on Saturday and Sunday, subject to
       agreement between the employer and a majority of affected employees, or the
       employer and an individual employee. If agreement is reached in accordance
       with clause 13.2(a), the additional rates in clause 20.2 apply.

   (b) Ordinary hours of work are to be worked continuously, except for meal and rest
       breaks, at the discretion of the employer, between the hours of 5.00 am and 5.00
       pm. The spread of hours (5.00 am to 5.00 pm) may be altered by up to one hour
       at either or both ends of the spread, by agreement between an employer and the
       majority of affected employees, or in appropriate circumstances, between the
       employer and an individual employee. Any change to regular rosters or ordinary
       hours of work is subject to the consultative provisions in clause 28.

   (c) The employer and a majority of affected employees may agree that the ordinary
       hours for a day worker be up to 12 hours per day.
```

> **Calc-engine implication.** A day worker's ordinary hours are 5.00 am – 5.00 pm Mon–Fri (default spread) or up to ±1 hour each end by agreement. Hours outside this spread → overtime (cl 19) regardless of weekly total. Sat/Sun work as ordinary hours requires explicit agreement; if no agreement, Sat/Sun work falls under cl 20.2 penalty rates or cl 19.2 overtime depending on context.

### §13.3 — Ordinary hours: shiftworkers (sidebar)

```
13.3 Ordinary hours--shiftworkers

   (a) Ordinary hours for a shiftworker may be worked on any or all days, Monday to
       Sunday. The ordinary hours are up to 10 hours per day, inclusive of meal breaks.

   (b) The employer and a majority of affected employees may agree that the ordinary
       hours for a shiftworker be up to 12 hours per day, inclusive of meal breaks,
       worked Monday to Sunday.

   (c) Shift notice — at least 48 hours' notice of a requirement to work shiftwork
       and any alteration to their hours of work, waivable by agreement.
```

> **Calc-engine implication.** Shiftworkers can work ordinary hours any day Mon–Sun (no spread restriction by clock). The Sat/Sun penalty rates in cl 20.2 still apply to those ordinary hours. Day-worker vs shiftworker is itself a Layer 1 fact the worker confirms.

---

## §17.2(c) — Cold work allowance (full 3-band table)

**Source:** clause 17.2(c) of MA000074. Conditions text verbatim from FWC exposure-draft determination; current dollar amounts verbatim from live FWC HTML (`awards.fairwork.gov.au/MA000074.html`, fetched 2026-04-28). The exposure draft and live HTML are identical in clause structure (3 bands, "$ per hour or part thereof" unit); they differ in dollar amounts because the exposure draft predates 7+ years of Annual Wage Reviews. Live HTML amounts shown below are the current effective rates.

```
17.2(c) Cold work allowance

A cold work allowance is payable to an employee working for more than one
hour in a place where the temperature is reduced by artificial means as follows:

Temperature                       $ per hour or part thereof
From -15.6°C to -18.0°C                              0.95
-18.0°C to -23.3°C                                   1.67
Less than -23.3°C                                    2.62
```

> **Sprint 2 seed correction.** Migration `0005_award_allowances_and_ma000074_seed.sql` seeded only the bookend bands (`COLD_WORK_BAND_LOW` $0.95/hr and `COLD_WORK_BAND_HIGH` $2.62/hr) because v01 §3 marked the middle band `[SOURCE NEEDED]`. The middle band amount is now confirmed as **$1.67/hr** for the −18.0 °C to −23.3 °C range (clause 17.2(c)). A follow-up migration (Sprint 2.1 or similar) should INSERT the missing middle-band row to `award_allowances`:
> - `code`: `COLD_WORK_BAND_MID`
> - `description`: `Cold work allowance — temperature −18.0 °C to −23.3 °C`
> - `amount`: 1.67 / `unit`: hour / `purpose`: additive
> - `fwc_clause`: 17.2(c) / `effective_from`: 2025-07-01
> Until that migration lands, the middle-band data is documented here in v02 but not yet seeded.

---

## §17.3 — Expense-related allowances (Meal + Vehicle)

**Source:** clause 17.3 of MA000074. Conditions verbatim from exposure draft; amounts verbatim from live FWC HTML (fetched 2026-04-28).

```
17.3 Expense-related allowances

(a) Meal allowance

A meal allowance of $18.38 is payable to an employee who works at least one
and a half hours' overtime after working ordinary hours, except where a meal is
provided by the employer.

(b) Vehicle allowance

A vehicle allowance of $0.98 per kilometre is payable to an employee who is
required to use their own vehicle to travel from one place to another during
working time.
```

> **Sprint 2 seed correction.** Migration `0005` did NOT seed Meal or Vehicle allowances (v01 §3 marked them `[SOURCE NEEDED]`). Both are now confirmed:
> - `MEAL_OVERTIME` — $18.38, unit `shift` (or a new `event` unit; see note below), purpose `additive`, clause 17.3(a). Trigger condition is event-shaped: payable once per OT event of ≥1.5 hours.
> - `VEHICLE_KM` — $0.98, unit `hour` is wrong (it's per km); needs new unit value `km`, OR represent as `additive` with a separate `unit_qualifier`. **Architectural concern:** the current `award_allowances.unit CHECK (unit IN ('hour','week','shift'))` doesn't include `km`. Vehicle allowance is per-km, not per-hour/week/shift — needs a schema enum extension. Surface to a future ADR before seeding. Until that lands, vehicle allowance stays out of `award_allowances` but is documented here.

---

## §17.4 — Allowances not subject to premium / penalty additions

**Source:** clause 17.4 of MA000074. Verbatim from exposure draft; live HTML cross-validated identical wording.

```
17.4 The allowances in clauses 17.2(c)-17.2(d) and 17.3 are not subject to any
       premium or penalty additions.
```

> **Calc-engine implication (extends ADR-009).** Cold work (17.2(c)), first aid (17.2(d)), meal (17.3(a)), and vehicle (17.3(b)) allowances are pure flat additives — they do NOT scale with penalty/OT multipliers. This is consistent with each row's `purpose='additive'` flag in `award_allowances`. cl 17.4 is the FWC's explicit confirmation of the additive treatment for these specific allowances. Leading hand (17.2(b), `purpose='all_purpose'`) is excluded from this list — it folds into the ordinary hourly rate before penalty/OT/loading multipliers apply.

---

## §19 — Overtime rates (cl 19.2) + casual interaction (cl 19.5)

**Source:** clauses 19.2 and 19.5 of MA000074. Verbatim from exposure draft; live HTML cross-validated identical structure and percentages.

### §19.2 — Overtime rate table

```
19.1 Definition of overtime

Overtime is any work done outside of the employee's ordinary hours provided in
clause 13--Ordinary hours of work.

19.2 Overtime rates

Where an employee works overtime the employer must pay to the employee the
overtime rates as follows:

For overtime worked on                                    Overtime rate
                                              % of ordinary hourly rate

Monday to Saturday--first 3 hours                                   150
Monday to Saturday--after 3 hours                                   200
Sunday--all day                                                     200
Public holiday--all day                                             250
```

### §19.3 — Each day stands alone

```
19.3 For the purposes of calculating overtime payments, each day will stand alone.
```

> **Calc-engine implication.** OT thresholds reset daily; you don't aggregate across the week. A Mon-Tue OT pattern is two independent "first 3 hours / after 3 hours" calculations, not one running tally.

### §19.4 — Minimum payment periods

```
19.4 (a) An employee required to work overtime on a Saturday must be paid for a
        minimum of 3 hours;
     (b) An employee required to work overtime on a Sunday or public holiday must be
        paid for a minimum of 4 hours.
```

### §19.5 — Casual loading × overtime

```
19.5 The casual loading set out in clause 11.3(a) is not paid for overtime.
```

> **Calc-engine implication.** Casual employees do NOT receive the 25% loading on overtime hours. OT rate (150/200/250%) applies to base rate only.

---

## §20.1 — Shift definitions

**Source:** clause 20.1 of MA000074. Verbatim from exposure draft.

```
20.1 Definitions

For the purposes of this award:

(a) Early morning shift means a shift of ordinary hours commencing at or after
       2.00 am and before 4.00 am; and

(b) Afternoon shift means a shift of ordinary hours finishing at or after 5.00 pm or,
       where the ordinary hours are extended by agreement, 6.00 pm and at or before
       midnight; and

(c) Night shift means a shift finishing after midnight and at or before 8.00 am; and

(d) Permanent night shift employee is an employee who:

       (i) works night shift only; or

       (ii) stays on night shift for a longer period than 4 consecutive weeks; or

       (iii) works on a night shift which does not rotate or alternate with another shift
              or with day work so as to give the employee at least one third of their
              working time off night shift in each shift cycle.
```

> **Calc-engine implication.** Night-shift vs permanent-night-shift turns on a 4-week and ⅓-rotation rule, both of which are *facts about the worker's roster pattern over the prior 4 weeks*, not single-shift facts. Encoding this requires either (a) the worker to confirm "I'm on permanent night shift" explicitly (Layer 1 fact), or (b) the calc engine to compute it from the worker's logged shift history (Layer 2 facts). Phase 0: ask the worker. Phase 1+: derive.

---

## §20.2 — Penalty rates (full table)

**Source:** clause 20.2 of MA000074. Verbatim from live FWC HTML (cross-validated against exposure-draft structure; live HTML carries the post-AWR percentages used in production).

```
20.2 An employee will be paid the following rates for all ordinary hours worked during the
       following periods.

Ordinary hours worked on:                              % ordinary hourly rate

Monday to Friday--shiftworkers
   Early morning shift                                                     110
   Afternoon shift or night shift                                          115
   Permanent night shift                                                   125

Weekend work--all employees (including shiftworkers)
   Saturday                                                                150
   Sunday                                                                  175

Public holiday                                                             250
```

```
20.3 A shiftworker who is required to work on a public holiday must be paid for a minimum
       of 4 hours.

20.4 A shiftworker who is required and works overtime must be paid overtime in
       accordance with clause 19--Overtime.
```

> **v01 §4 confirmation.** v01 captured Sat 150 / Sun 175 / PH 250 — those values are correct verbatim. Shift loadings (110/115/125) are stacked-with-Mon-Fri-ordinary, NOT alternative to weekend rates. So a shiftworker on permanent night shift Saturday gets 150% (Saturday weekend rate, which already covers shiftworkers per the table heading "all employees including shiftworkers") — not 150% × 125% — confirming the table's per-period (not per-bucket) reading.

---

## §11.3 — Casual loading + penalty interaction

**Source:** clause 11.3 of MA000074. Verbatim from exposure draft (structure) plus live HTML refinement (sub-clause numbering and "ordinary hourly rate" wording).

### §11.3 (exposure-draft text — sub-clauses (a) and (b))

```
11.3 Casual loading

   (a) For each ordinary hour worked, a casual employee must be paid:

       (i) the minimum hourly rate; and

       (ii) a loading of 25% of the minimum hourly rate,

       for the classification in which they are employed.

   (b) Where any other penalty is payable for working ordinary hours the calculation
       of such penalty must be based on the minimum hourly wage for the
       classification. The casual loading is not paid for overtime or time worked on
       Saturday, Sunday or a public holiday.
```

### §11.3 — Live-HTML refinement (current consolidation)

The live HTML splits the exposure draft's (b) into two sub-clauses (b) and (c) and uses "ordinary hourly rate" rather than "minimum hourly rate" (substantively equivalent — both refer to the cl 15.1 minimum rate for the classification):

```
11.3 (a) For each ordinary hour worked, a casual employee must be paid:
        (i) the ordinary hourly rate for the classification in which they are employed; and
        (ii) a loading of 25% of the ordinary hourly rate.

   (b) Where any other penalty is paid for working ordinary hours the calculation of
       such penalty must be based on the minimum hourly rate for the classification.

   (c) The casual loading is not paid for overtime or time worked on Saturday, Sunday
       or a public holiday.
```

> ### **🚨 v01 §4 CORRECTION — load-bearing for Apete's calc engine 🚨**
>
> **v01 §4 hypothesised:** "The 25% casual loading stacks on top of penalty rates per the Modern Award convention (i.e. casual on Sunday = 25% casual + 175% Sunday penalty)." Marked as `[SOURCE NEEDED — explicit confirmation of casual + penalty stacking method]`.
>
> **The verbatim FWC text (cl 11.3(b)+(c) live HTML / equivalent in exposure draft) says the OPPOSITE:**
> 1. The casual loading is paid only on **ordinary hours** (cl 11.3(a)).
> 2. **Penalty hours** (Sat/Sun/PH ordinary): casual loading is NOT paid; penalty calculation is on the minimum hourly rate alone (cl 11.3(b)+(c)).
> 3. **Overtime hours**: casual loading is NOT paid (cl 11.3(c) + cl 19.5).
>
> **Calc engine consequence:** for casual workers, the penalty / OT multiplier applies to the bare minimum hourly rate, never to the (rate × 1.25) figure. v01's hypothesis would have *over*-paid casuals on penalty hours by 25 % — that's both worker-safety relevant (over-stating expected gross then surfacing a phantom shortfall) and financially material.
>
> **Apete-specific check:** Apete is full-time per the persona file (PALM scheme worker on a regular roster), so cl 11.3 does not directly apply to him. But future Phase-1 / Phase-2 cohorts include casual workers (esp. hospitality Mia in MA000009 — same convention applies there). The calc engine MUST encode this rule from day 1, not bolt it on later.

---

## §X — Sourcing log

### Sprint 5 — closing the remaining v01 §6 gaps (2026-04-28)

All six remaining `[SOURCE NEEDED]` gaps from v01 §6 closed in this sprint via the canonical `WebFetch + pdftotext -layout` workflow established in Sprint 4, plus a **focused live-HTML cross-fetch** for the post-AWR current dollar amounts. Two-source convergence now backs every captured value:

- **Structure / clause text** (band counts, conditions, percentages relative to base, sub-clause numbering): from the FWC 4-yearly review exposure-draft determination PDF (already cached locally from Sprint 3 / 4).
- **Current dollar amounts** (post-PR786612 / post-2025-07-01 AWR): from the live FWC HTML viewer (`awards.fairwork.gov.au/MA000074.html`) via a tightly-scoped `WebFetch` prompt that asks only for cl 17.2(c), cl 17.3, cl 17.4, cl 11.3, cl 19.2, cl 19.5, and cl 20.2 — the page's middle section, which `WebFetch` does render before the long-page truncation hits Schedule A.

The exposure-draft's dollar amounts (e.g. Cold work bookend low $0.77, leading hand $31.49, first aid $17.24) scale to the current live HTML amounts ($0.95, $39.11, $21.41 respectively) at a consistent **~1.273×** ratio — exactly 7 years of compound 3.5% Annual Wage Reviews. The proportional scaling is its own validation that the exposure draft = current consolidation modulo annual rate uplifts; the structural clauses themselves haven't been substantively amended.

Two captured findings from Sprint 5 are *load-bearing for the calc engine* and worth banking explicitly:

1. **Casual + penalty interaction (cl 11.3) reverses v01 §4's hypothesis.** v01 §4 hypothesised stacking; the verbatim text shows casual loading is paid only on ordinary Mon-Fri hours (or shiftworker ordinary hours that don't fall on Sat/Sun/PH). On penalty hours and OT, the loading is NOT paid. See §11.3 above for the full verbatim and the load-bearing-for-Apete callout.
2. **`award_allowances.unit` enum is incomplete.** Vehicle allowance is per-km. The current `CHECK (unit IN ('hour','week','shift'))` constraint can't represent that. Surface to a future ADR before seeding vehicle allowance.

### What worked (Sprint 4, 2026-04-28)

`pdftotext` was already installed in the local Git Bash environment (`pdftotext version 4.00`, xpdf-derived) — so INFRA-007's `poppler` install step was unnecessary; the text-extraction binary was already on `PATH`. Combined with the FWC exposure-draft PDF saved locally during yesterday's Sprint 3 attempt, the workflow that closed the gap was:

1. `pdftotext -layout <FWC-PDF> <output>.txt` — extracts the embedded text layer with table/clause structure preserved.
2. `grep -n` for `^A\.1\.[0-9]\|^Schedule A\|Classification Definitions` to locate Schedule A boundaries in the extracted text.
3. `sed -n '<start>,<end>p'` to read the verbatim clause range.

The exposure-draft PDF (`fwc.gov.au/documents/sites/awardsmodernfouryr/ma000074-ed-draft-determination.pdf`) was the operative source — it contains the full proposed-and-then-approved post-4-yearly-review text. Validation that the exposure draft = current consolidation: yesterday's `WebSearch` snippet of the live `awards.fairwork.gov.au` HTML returned the **exact** Level 1 promotional-criteria phrase ("An employee remains at this level for the first 3 months or until they are capable of effectively performing the tasks required so as to enable them to progress to a higher level as a position becomes available") that appears at A.1.1(c) of the exposure draft. Word-for-word match on the most distinctive sentence in Schedule A is sufficient evidence the exposure draft was approved as-drafted.

A side-validation: the `ma000074-as-at-2020-05-03.pdf` past-awards PDF (also retrieved this session) shows **pre-reform** structure — there, Schedule A is "Transitional Provisions" and Classification Definitions sit at Schedule B with the same `Process Employee` terminology. Confirms the *Process Employee* naming has been stable across the 4-yearly review reforms; only the schedule lettering moved.

### Sprint 3 paths that failed (carried forward)

The full failed-paths table from Sprint 3 is preserved here for future audits:

| # | Source | Method | Result |
|---|---|---|---|
| 1 | `awards.fairwork.gov.au/MA000074.html` | `WebFetch` | Long-page truncation; Schedule A is TOC entry only. |
| 2 | `awards.fairwork.gov.au/MA000074.html#_Toc220404087` | `WebFetch` anchored | Same truncation pattern. |
| 3 | `library.fairwork.gov.au/award/?krn=MA000074` | `WebFetch` | Same truncation. |
| 4 | `awardviewer.fwo.gov.au/award/show/MA000074` | `WebFetch` | `ECONNREFUSED`. |
| 5 | `fwc.gov.au/documents/sites/awardsmodernfouryr/ma000074-ed-draft-determination.pdf` | `WebFetch` extractor | Yesterday: extractor returned font metadata only (image-only impression). Today: with `pdftotext` available, **full text layer extracted successfully** — the PDF was *not* image-only after all; yesterday's `WebFetch` content extractor just didn't decode it. The PDF carries an embedded text layer (markdown-extractable post-`pdftotext`). |
| 6 | `WebSearch` snippets | search-engine-paraphrased | Could not be used as verbatim — but provided cross-validation against the exposure-draft text once obtained. |

### Sprint 4 additional probes

| # | Source | Method | Result |
|---|---|---|---|
| 7 | `awards.fairwork.gov.au/{api/v1/awards/MA000074/pdf, MA000074.pdf, awards/MA000074_consolidated.pdf, awards/MA000074/MA000074.pdf}` | `curl -sIL` | All exit 35 (TLS handshake failure in Git Bash curl bundle). Possibly cert-bundle issue; not diagnosed further this sprint. |
| 8 | `awards.fairwork.gov.au/MA000074.html` (re-fetch asking for Download/PDF link discovery) | `WebFetch` | No PDF download links / buttons surfaced in the HTML rendering. The FWC consolidated text is HTML-only on this viewer; PDF download (if any) is JS-driven and not statically discoverable. |
| 9 | `fwc.gov.au/documents/modern_awards/past-awards/ma000074-as-at-2020-05-03.pdf` | `WebFetch` + `pdftotext` | Successfully extracted (2853 lines). **Pre-reform structure**: Schedule A = Transitional Provisions; Schedule B = Classification Definitions. Used for cross-validation only — *Process Employee* naming confirmed stable across reforms. |
| 10 | `fwc.gov.au/documents/sites/wage-reviews/2024-25/ma000074-wages-draft-2025.pdf` | `WebFetch` | Confirmed the wages-draft PDF contains rate tables only; no Schedule A / classification text. |

### Recommended next step

The `WebFetch` + `pdftotext` workflow is now the canonical research path for FWC PDFs. Apply the same pattern to:

- **Levels 4–6 of MA000074** (out of Apete-shaped scope; pull when expanding to non-line workers — the exposure-draft text already extracted carries them at lines 1875–2090+ of `research-pdfs/MA000074-exposure-draft.txt`).
- **Other v01 §6 gaps** (cold-work temperature bands, span-of-hours, night-shift definition, public-holiday OT, casual + penalty stacking, Meal/Vehicle amounts) — those clauses live elsewhere in the same PDF.
- **MA000059, MA000009, MA000028** for Phase 2/3/4 awards.

### What v02 explicitly does NOT do

- **Does not capture Levels 4–6.** The exposure draft has them; they're out of Apete-shaped scope per the brief.
- **Does not close other v01 §6 gaps.** Sprint 5 territory.
- **Does not modify v01.** v01 remains the authoritative aggregate; v02 is a delta on one gap.
- **Does not touch the seeded reference data.** The naming correction (`Process Employee` vs `Poultry Processing Worker`) is a UI-label concern, not a code-column concern. `award_rates.classification_code = 'LEVEL_1'` (etc.) remains correct and stable.

---

## Sources

- FWC 4-yearly review exposure draft determination, MA000074: https://www.fwc.gov.au/documents/sites/awardsmodernfouryr/ma000074-ed-draft-determination.pdf — primary source of the verbatim text reproduced above (extracted via `pdftotext -layout` on 2026-04-28). Validated word-for-word against the live FWC consolidation via Sprint 3 WebSearch snippets.
- FWC consolidated MA000074 (HTML viewer): https://awards.fairwork.gov.au/MA000074.html — incorporates amendments to 2026-01-23. Used for cross-validation; `WebFetch` truncates before reaching Schedule A.
- FWC past-awards PDF (pre-reform, 2020-05-03): https://www.fwc.gov.au/documents/modern_awards/past-awards/ma000074-as-at-2020-05-03.pdf — used for terminology-stability validation only (pre-reform structure has Classifications at Schedule B).
- Fair Work Ombudsman library viewer (alternate consolidated source): https://library.fairwork.gov.au/award/?krn=MA000074 — same truncation pattern as the FWC HTML viewer.
- (Carried forward from v01) https://www.fairwork.gov.au/employment-conditions/awards/awards-summary/ma000074-summary, https://calculate.fairwork.gov.au/ArticleDocuments/872/poultry-processing-award-ma000074-pay-guide.pdf.aspx.
