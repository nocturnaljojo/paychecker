# MA000074 — Poultry Processing Award 2020 — research note v01

**Status:** DRAFT (Sprint 1, 2026-04-27 — ~60–70% complete; flagged gaps below).
**Scope:** Apete-shaped — poultry processing line workers (slaughter / processing / packing). Levels 1–3.
**Out of scope:** Levels 4–6 (supervisory / specialist), apprentices, junior rate detail beyond percentage scaffold, the meal/vehicle allowances (not relevant to Apete's daily work), all non-poultry coverage. Future expansion noted in §6.
**Maintainer:** Jovi (PayChecker).
**Next review trigger:** FWC Annual Wage Review variation order (annual ~1 July; current rates effective 2025-07-01).

---

## §1 — Award identification

| Field | Value |
|---|---|
| Award title | **Poultry Processing Award 2020** |
| Award code | **MA000074** |
| Issued by | Fair Work Commission (FWC) |
| Award type | Modern Award |
| Current consolidation | Incorporates all amendments **up to and including 23 January 2026** |
| Most recent FWC variation orders | PR794768, PR795698 (per consolidation header) |
| Operative rates source | **PR786612**, effective **1 July 2025** (Annual Wage Review 2024–25) |
| Coverage clause (verbatim) | "covers employers throughout Australia in the poultry processing industry, which means the killing, processing, preparation, packing, wholesaling and distribution of uncooked poultry, poultry products and poultry by-products" |
| Special incorporation | "The award incorporates the terms of Schedule E to the *Miscellaneous Award 2020* as at 1 July 2025." |
| Source URL (consolidated text) | https://awards.fairwork.gov.au/MA000074.html |
| Source URL (FWO summary) | https://www.fairwork.gov.au/employment-conditions/awards/awards-summary/ma000074-summary |
| Source URL (FWO pay guide PDF) | https://calculate.fairwork.gov.au/ArticleDocuments/872/poultry-processing-award-ma000074-pay-guide.pdf.aspx (download interstitial — not directly fetched in v01; classification rates instead pulled from clause 15.1 of consolidated text) |
| Date of this research fetch | 2026-04-27 |

> **Sourcing note.** The consolidated award text at `awards.fairwork.gov.au/MA000074.html` is the authoritative current version per the FWC. The FWO pay guide PDF is a derived summary; v02 should fetch the PDF directly (download interstitial blocked the v01 fetch) and cross-check rates against clause 15.1 below.

---

## §2 — Apete-relevant classifications

Apete is a chicken catcher / poultry-line worker (per `docs/product/personas.md`). The relevant classifications for slaughter, processing, and packing line work are **Levels 1–3** of the award's six-level classification structure.

**Source:** clause **15.1 (Minimum rates)**, varied by **PR786612**, effective **1 July 2025**. Rates are weekly (full-time, adult); hourly = weekly ÷ 38 ordinary hours per week (per clause 13.1(b)).

| Level | Weekly rate (full-time, adult) | Hourly rate (ord.) | Definition citation |
|---|---|---|---|
| Level 1 | **$952.20** | **$25.06** | Schedule A.1 |
| Level 2 | **$977.70** | **$25.73** | Schedule A.2 |
| Level 3 | **$990.60** | **$26.07** | Schedule A.3 |

**Definitions:** clause 12.1 confirms classifications are described in Schedule A. **`[SOURCE NEEDED — Schedule A.1 / A.2 / A.3 verbatim definitions]`** — the consolidated HTML page rendered Schedule A only as a table-of-contents heading on the v01 fetch; the actual A.1/A.2/A.3 text needs a targeted second pass (likely a direct anchor fetch or a clean PDF). Pending that fetch, the working assumptions for Apete's likely level are:

- **Level 1** — entry-level positions, basic line tasks (catching, hanging, killing-line entry roles), no required training period.
- **Level 2** — line workers with some experience (cutting, dressing, evisceration line stations).
- **Level 3** — experienced line workers, may include simple machine operation or supervision of own work.

These are **inferred working hypotheses** based on the Modern Award structure pattern, **not** verbatim from Schedule A. The PayChecker UI must show the FWC's actual definitions, not these hypotheses, before a worker confirms their classification.

### Junior rates (§2 sidebar)

**Source:** clause **15.4 (Unapprenticed junior minimum rates)**, varied by **PR767896**, effective **31 December 2023**.

| Age | % of adult weekly rate |
|---|---|
| Under 17 | 70% |
| 17 | 80% |
| 18+ | 100% (adult rate) |

> Apete is an adult, so junior rates do not apply to him. Documented for completeness because future PALM-cohort workers may include under-21 dependants.

---

## §3 — Allowances most likely to apply to Apete

**Source for all of §3:** clause **17.2** of the consolidated award.

### Cold work allowance (clause 17.2(c))

Most likely to apply daily — chicken catching and downstream chiller work routinely sits below 0°C ambient.

Range: **$0.95 per hour** (–15.6°C to –18.0°C band) at the warm end, up to **$2.62 per hour** (below –23.3°C band) at the cold end.

> **`[SOURCE NEEDED — full temperature-band → rate table]`.** v01 fetch gave the bookend values; the four (or so) intermediate temperature bands and their per-hour amounts need a clean pull. v02 should produce the full table because Apete's actual chiller temperature determines the rate, and it cannot be guessed.

### Leading hand allowance (clause 17.2(b)(i))

Paid as an **all-purpose allowance** (i.e. included in the rate of pay when calculating penalties, loadings, and annual leave — per clause 17.2(a)).

| Employees in charge | Weekly amount |
|---|---|
| 1–19 employees | **$39.11** |
| 20+ employees | **$65.35** |

> Likely applies to Apete only if/when he leads a small line crew. Worth surfacing in the UI as a "do you lead a crew?" prompt; if yes, this allowance is non-trivially load-bearing because it's all-purpose.

### First aid allowance (clause 17.2(d))

**$21.41 per week** to an employee who:
- has been trained to provide first aid,
- holds an appropriate first aid qualification (e.g. St John Ambulance certificate or similar), AND
- has been **appointed by the employer** to perform first aid duty.

> All three conditions must be met. The training + qualification alone does not trigger the allowance — appointment by the employer is the distinguishing requirement. Worker UI should ask both questions to avoid a false-positive entitlement.

### Public holiday work

See **§4 — Penalty rates** below. Public holiday work is paid at **250%** of the ordinary rate (clause 20.2). No separate "public holiday allowance" exists; the penalty rate is the entitlement.

### Boning room allowance — **not in this award**

The MA000074 allowance set is: **leading hand · cold work · first aid · meal · vehicle**. **No boning room allowance exists** in MA000074 (verified per the v01 fetch of clause 17.2). A boning room allowance does exist in the *Meat Industry Award MA000059* — relevant for Phase 3, not Phase 0. If Apete works in a boning room, that suggests his role may sit under MA000059 instead — flag for classification review at onboarding.

### Out of Apete-scope (mentioned for completeness, deferred)

- Meal allowance — exists in clause 17.2; rate not pulled for v01. **`[SOURCE NEEDED]`**.
- Vehicle allowance — exists in clause 17.2; rate not pulled for v01. **`[SOURCE NEEDED]`**.
- Uniform / laundry — not flagged as a discrete allowance in v01 fetch (would expect clause 17.2(e) or similar if present); v02 should confirm.

---

## §4 — Penalty rates

**Source for all of §4:** clauses **19.2 (Overtime)** and **20.2 (Penalty rates)**, current consolidation.

### Saturday / Sunday / public holiday — ordinary hours worked on these days

| Day | Penalty (% of ordinary hourly rate) |
|---|---|
| Saturday | **150%** |
| Sunday | **175%** |
| Public holiday | **250%** |

### Night shift loading

| Type | Loading |
|---|---|
| Night shift | **115%** |
| Permanent night shift | **125%** |

> **`[SOURCE NEEDED — definition of "night shift" vs "permanent night shift"]`.** v01 fetch returned the percentages only; the clause defining what hours qualify (e.g. "shift starting between X and Y") and the duration that turns "night shift" into "permanent night shift" need a clean pull. Likely defined at clause 20.1 or 20.2(a).

### Overtime (worked beyond ordinary hours)

| Day / time | Rate (% of ordinary hourly rate) |
|---|---|
| Monday–Saturday — first 3 hours of OT | **150%** |
| Monday–Saturday — after 3 hours of OT | **200%** |
| Sunday — all overtime | **200%** |
| Public holiday OT | **`[SOURCE NEEDED]`** — likely 250% per the all-day public-holiday rule but needs explicit clause confirmation |

> Apete's expected OT pattern (regional NSW poultry shed): occasional Saturday morning catch / pack to clear backlog. The first-3-hours-vs-after-3-hours threshold is the most likely driver of mis-payment for him.

### Ordinary hours of work (context for OT calculations)

**Source:** clause **13.1(b)**.

> "the ordinary hours of work for a full-time employee are an average of 38 per week; and an employee will not work more than 10 ordinary hours per day or 152 over 28 days."

> **`[SOURCE NEEDED — span of hours / spread of hours clause]`.** Most awards specify the daily window during which ordinary hours can be worked (e.g. "between 6am and 6pm Monday–Friday"); hours outside that window become overtime even if total weekly hours are under 38. v01 didn't surface this clause; v02 should pull it (likely clause 13 or 14).

### Casual loading

**Source:** clause **11.2(a)**.

> "a loading of 25% of the ordinary hourly rate"

Stacks **on top of** penalty rates per the Modern Award convention (i.e. casual on Sunday = 25% casual + 175% Sunday penalty, calculated per the award's casual penalty interaction rule). **`[SOURCE NEEDED — explicit confirmation of casual + penalty stacking method]`** — some awards apply casual loading first then penalty; others apply both to the base. v02 should pull the relevant interaction clause to confirm.

---

## §5 — Effective dates + review schedule

| Event | Date | Source |
|---|---|---|
| Current rates effective from | **1 July 2025** | PR786612 (Annual Wage Review 2024–25 variation) |
| Junior rates clause variation | **31 December 2023** | PR767896 |
| Current consolidation incorporates amendments to | **23 January 2026** | header of consolidated award text |
| Next likely rate variation | **~1 July 2026** | FWC Annual Wage Review (statutory cycle; variation order issued ~June, effective ~July) |
| Date this research note produced | **2026-04-27** | Sprint 1 / s003h7 conversation |

**FWO pay guide refresh cadence:** the FWO publishes an updated MA000074 pay guide PDF after each variation. PayChecker should re-pull the consolidated award + pay guide between **1 June and 1 July annually** (per `REF-AWARDS-list.md` cadence note + R-002 in `docs/architecture/risks.md`). The `researcher` agent should run on schedule.

---

## §6 — Open questions / gaps (what v01 does NOT cover)

### Required before MA000074 reference data can be seeded (v02 sprint)

1. **Schedule A.1 / A.2 / A.3 definitions** — verbatim text of Level 1, 2, 3 classification descriptions. Required so the PayChecker classification picker shows the FWC's actual definitions (Apete confirms what FWC says, never what we paraphrased).
2. **Cold work allowance temperature-band table** — full clause 17.2(c) table with each temperature range and its per-hour rate. Required because Apete's daily allowance depends on actual chiller temperature, not a guess.
3. **Span-of-hours / ordinary-hours window clause** — defines what counts as "ordinary hours" vs "overtime" by time of day, independent of weekly total. Likely clause 13.x.
4. **Night shift definition** — what hours qualify as "night shift" vs "permanent night shift" (clause 20.1 or 20.2 sub-clause).
5. **Public holiday OT rate** — explicit confirmation that OT on a public holiday is 250% (or whatever the correct rate is), not just penalty-rate ordinary hours.
6. **Casual + penalty interaction rule** — how the 25% casual loading stacks with Sat/Sun/PH penalties. The default Modern Award convention is "casual loading and penalty both applied to base rate", but MA000074-specific clause needs explicit citation.
7. **FWO pay guide PDF cross-check** — fetch the actual PDF and confirm clause 15.1 rates match the PDF's published table (defense against transcription drift between FWC and FWO).

### Out of Apete-scope but should be flagged for future expansion

- **Levels 4–6** (supervisory / specialist) — rates are in §2 table, but definitions deferred. Pull when expanding to non-line workers.
- **Apprentices** — clause 15.x; out of Apete-scope. Likely required for Phase 1 (Apete's household may include apprentices).
- **Annual leave loading** — clause 21 or similar; not pulled. Required for full-pay comparison (annual leave taken counts toward `payslip_facts.allowances`).
- **Personal/carer's leave** — clause 22 or similar; not pulled. Required when Apete is sick during a comparison period.
- **Public holiday substitution / payment in lieu** — variation possible by EA; default award rule not pulled.
- **Termination / redundancy** — out of Phase 0 scope entirely; pull if/when Apete leaves the employer.
- **Schedule E (Miscellaneous Award) incorporation** — the award notes Schedule E of the *Miscellaneous Award 2020* (as at 2025-07-01) is incorporated. **`[SOURCE NEEDED — what Schedule E adds]`**; likely common-clauses scaffolding (definitions, notice, etc.) that doesn't change rates but may affect interpretation.

### Architectural questions surfaced by the research

- **All-purpose vs ordinary allowances.** Leading hand is "all-purpose" (clause 17.2(a)) — included in the rate when calculating penalties, loadings, leave. Cold work and first aid are not. The `award_rates` schema currently holds rate amounts only. PayChecker needs to encode the **purpose flag** per allowance so the calc engine knows when to fold an allowance into the base rate. Surface in idea-to-execution before encoding reference data.
- **Variation tracking.** Current rates derive from PR786612 (effective 2025-07-01). Future variations will need a non-trivial "rates as at date X" lookup. Schema's `award_rates.effective_from` / `effective_to` already supports this; the data-load pattern just needs to honor it.

---

## Sources

- Fair Work Commission consolidated award (current): https://awards.fairwork.gov.au/MA000074.html — incorporates amendments to 2026-01-23.
- Fair Work Ombudsman award summary: https://www.fairwork.gov.au/employment-conditions/awards/awards-summary/ma000074-summary
- Fair Work Ombudsman pay guide PDF (download interstitial; not directly fetched in v01): https://calculate.fairwork.gov.au/ArticleDocuments/872/poultry-processing-award-ma000074-pay-guide.pdf.aspx
- FWC variation order PR786612 (Annual Wage Review 2024–25): referenced in clause 15.1 footer of consolidated text — direct PR document not fetched in v01.
- FWC variation order PR767896 (junior rates clause 15.4): referenced in clause 15.4 of consolidated text.
- FWC variation orders PR794768, PR795698: most recent variations per consolidation header — content not pulled in v01.
- FWO award viewer (alternate consolidated source): https://library.fairwork.gov.au/award/?krn=MA000074

---

## v01 → v02 follow-up checklist

- [ ] Pull Schedule A.1 / A.2 / A.3 verbatim definitions (try the FWC PDF at fwc.gov.au directly; the awards.fairwork HTML rendered Schedule A as a TOC heading only).
- [ ] Pull full cold work allowance temperature-band table (clause 17.2(c)).
- [ ] Pull span-of-hours / ordinary-hours window clause (clause 13.x).
- [ ] Pull night shift definition (clause 20.1 or 20.2).
- [ ] Confirm public holiday OT rate explicitly.
- [ ] Confirm casual + penalty interaction rule explicitly.
- [ ] Cross-check rates against the FWO pay guide PDF (download via browser if interstitial blocks `WebFetch`).
- [ ] Pull meal + vehicle allowance amounts (deferred; not Apete-daily but required for completeness).
- [ ] Pull annual leave loading clause.
- [ ] Confirm Schedule E (Miscellaneous Award) incorporation scope.
- [ ] Update `.claude/ref/REF-AWARDS-list.md` with `Last reviewed: 2026-04-27` and link to this research note.
