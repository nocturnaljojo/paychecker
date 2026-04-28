# Calc engine rules — MA000074 (v01)

**Scope.** This document records the FWC rules the calc engine MUST encode when computing Apete's expected gross under the Poultry Processing Award 2020 (MA000074). Every rule cites the FWC clause that governs it. **This is not an ADR.** These are *documented* FWC rules, not architectural decisions with options — the FWC made the decision; the calc engine obeys it.

**Source.** Distilled from `docs/research/awards-ma000074-v01.md` and `docs/research/awards-ma000074-v02.md`. Verbatim text and clause citations live in v02; this file is the operational summary keyed for the calc engine.

**Cross-reference.**
- Schema: ADR-009 (allowance purpose), ADR-010 (allowance table shape), ADR-011 (unit enum extension).
- Architecture: ADR-001 (confirmation model), ADR-005 (indexing not looping), ADR-007 (two gates).
- This file evolves: v02 / v03 increments as additional awards (MA000059 / MA000009 / MA000028) ship.

---

## Rule 1 — Casual loading × penalty / OT interaction (cl 11.3 + cl 19.5)

The casual 25 % loading is paid **only** on ordinary Mon–Fri hours. It is **NOT** paid on weekend ordinary hours, public-holiday ordinary hours, or any overtime hours.

**Verbatim source:** v02 §11.3.

> 🚨 **Corrects v01 §4 hypothesis.** v01 §4 hypothesised stacking ("casual on Sunday = 25 % casual + 175 % Sunday penalty"). The verbatim text says the *opposite*. v01 hypothesis would have over-paid casuals on penalty hours by 25 %.

**Calc-engine pseudocode.**

```
for each shift_fact in confirmed Layer 2 facts within period:
    if employee_type == 'casual':
        if day_type in ('saturday','sunday','public_holiday') OR shift_is_overtime:
            # cl 11.3(b)+(c) and cl 19.5: penalty / OT applies to base alone
            pay = base_rate × penalty_or_ot_multiplier × hours
        else:
            # cl 11.3(a): casual loading on ordinary Mon–Fri only
            pay = base_rate × 1.25 × hours
    else:  # full-time / part-time
        # casual loading does not apply at all
        pay = base_rate × applicable_multiplier × hours
```

**Apete-specific.** Apete is full-time per `docs/product/personas.md`; cl 11.3 does not directly affect his calc. Phase 1+ casual cohorts (especially MA000009 hospitality Mia) hit this rule the moment the calc engine ships. Encode from day 1.

---

## Rule 2 — Overtime rate table + daily-reset (cl 19.2 + cl 19.3)

OT thresholds reset daily. Each day stands alone for OT calc. Don't aggregate across the week.

**Verbatim source:** v02 §19.2, §19.3.

| When the OT is worked | Rate (% of ordinary hourly rate) |
|---|---|
| Monday – Saturday — first 3 hours of OT | **150 %** |
| Monday – Saturday — after 3 hours of OT | **200 %** |
| Sunday — all OT | **200 %** |
| Public holiday — all OT | **250 %** |

**Calc note.** "Each day stands alone" (cl 19.3) means a Mon–Tue OT pattern is two independent first-3-hours / after-3-hours calculations, not one running tally. The threshold count resets at midnight (or at the day boundary the FWC defines for shift-spanning rosters; future v02.x clarifies if that surfaces).

---

## Rule 3 — Day-worker span (cl 13.2)

Day workers' ordinary hours are 5.00 am – 5.00 pm Monday–Friday by default. The spread can be altered by ±1 hour at either end by agreement. Hours **outside the spread** are **overtime** regardless of weekly total.

**Verbatim source:** v02 §13.2.

**Calc note.**
- Ordinary hours that fall inside the spread → base rate × applicable multiplier (none for Mon–Fri ordinary; cl 20.2 penalties for Sat/Sun).
- Ordinary hours that fall *outside* the spread → cl 19.2 OT rates.
- Sat/Sun ordinary hours require **explicit employer + employee agreement** (cl 13.2(a)). Without agreement, Sat/Sun work is treated as overtime (cl 19.2).
- Day worker may agree to up to 12 hours per day ordinary (cl 13.2(c)).

---

## Rule 4 — Shiftworker any-day ordinary (cl 13.3)

Shiftworkers may work ordinary hours any day Monday–Sunday, up to 10 hours per day inclusive of meal breaks (12 hours by agreement). At least 48 hours' notice of shiftwork required (waivable by agreement).

**Verbatim source:** v02 §13.3.

**Calc note.**
- "Day worker" vs "shiftworker" is itself a Layer 1 fact — the worker confirms their employment terms at onboarding (or per-period if it changes).
- A shiftworker's Sat/Sun ordinary hours are still subject to the cl 20.2 weekend penalty rates — the table heading explicitly says "all employees (including shiftworkers)" for the Saturday / Sunday rows.
- A shiftworker's Mon–Fri ordinary hours pick up the cl 20.2 shift loadings (early morning / afternoon / night / permanent night) — see Rule 6.

---

## Rule 5 — Shift definitions (cl 20.1)

Four shift types defined for penalty-rate purposes:

| Shift | Trigger |
|---|---|
| **Early morning shift** | shift of ordinary hours commencing **at or after 02:00 and before 04:00** |
| **Afternoon shift** | shift of ordinary hours **finishing at or after 17:00** (or 18:00 by agreement) **and at or before 24:00** |
| **Night shift** | shift **finishing after 24:00 and at or before 08:00** |
| **Permanent night shift employee** | (i) works night shift only; OR (ii) stays on night shift longer than 4 consecutive weeks; OR (iii) works on a night shift that does not rotate or alternate enough to give the employee at least one third of their working time off night shift in each shift cycle |

**Verbatim source:** v02 §20.1.

**Calc note.** Permanent night shift turns on the worker's roster pattern over ≥4 weeks — that's a derived fact, not a per-shift fact. Phase 0 implementation: ask the worker to confirm "I'm on permanent night shift" as a Layer 1 fact at onboarding. Phase 1+ may derive it from logged Layer 2 shift history.

---

## Rule 6 — Penalty rates for ordinary hours (cl 20.2)

Penalty multipliers for ordinary hours worked during the listed periods. These are *alternative*, not stacked, with the shift loadings — the table groups them so the right rate applies once.

**Verbatim source:** v02 §20.2.

| Ordinary hours worked on | Rate (% of ordinary hourly rate) |
|---|---|
| Mon–Fri shiftworkers — Early morning shift | **110 %** |
| Mon–Fri shiftworkers — Afternoon or night shift | **115 %** |
| Mon–Fri shiftworkers — Permanent night shift | **125 %** |
| Saturday (all employees, including shiftworkers) | **150 %** |
| Sunday (all employees, including shiftworkers) | **175 %** |
| Public holiday | **250 %** |

**Calc note.** A shiftworker on permanent night shift on a Saturday gets **150 %** (Saturday weekend rate, which already covers shiftworkers per the table heading), not 150 % × 125 %. The weekend / public-holiday rows are *all-employees* rates; they replace the shift loadings, they don't multiply.

---

## Rule 7 — Allowance treatment (cl 17.4 + ADR-009)

Per cl 17.4: cold work (17.2(c)), first aid (17.2(d)), meal (17.3(a)), and vehicle (17.3(b)) allowances are **not subject to any premium or penalty additions**. Leading hand allowance (17.2(b)) is excluded from the cl 17.4 list — it's all-purpose.

**Verbatim source:** v02 §17.4.

**Calc-engine mapping (consistent with ADR-009 + ADR-011 + the migration-0005 seed + the Sprint 2.1 follow-up):**

| Allowance | `purpose` | `unit` | Calc treatment |
|---|---|---|---|
| Leading hand 1–19 | `all_purpose` | `week` | Folds into ordinary hourly rate (÷ 38) before any penalty / OT / loading multiplier applies |
| Leading hand 20+ | `all_purpose` | `week` | Same as above |
| First aid | `additive` | `week` | Flat add per period (when employer-appointed); no multiplier ever |
| Cold work — low | `additive` | `hour` | Flat per cold-hour worked; no multiplier (cl 17.4) |
| Cold work — mid (Sprint 2.1) | `additive` | `hour` | Same |
| Cold work — high | `additive` | `hour` | Same |
| Meal allowance (Sprint 2.1) | `additive` | `event` | Flat per qualifying OT event (≥1.5 hr OT after ordinary, no employer-provided meal) |
| Vehicle allowance (Sprint 2.1) | `additive` | `km` | $0.98 × km logged for the period |

The `additive` allowances *never* scale with penalties / OT / loadings. The `all_purpose` leading-hand allowance *always* folds into the base rate before scaling. Calc engine MUST `RAISE` on unknown `purpose` or `unit` (ADR-009 + ADR-011 loud-fail rules).

---

## Rule 8 — Minimum payment periods (cl 19.4 + cl 20.3)

| Trigger | Minimum payment |
|---|---|
| Saturday OT (cl 19.4(a)) | 3 hours |
| Sunday OT (cl 19.4(b)) | 4 hours |
| Public holiday OT (cl 19.4(b)) | 4 hours |
| Public holiday shiftwork (cl 20.3) | 4 hours |

**Verbatim source:** v02 §19.4, §20.4.

**Calc note.** If the worker's actual hours for the trigger event are below the minimum, pay the minimum. This is a floor, not an addition — a 2-hour Saturday OT call still pays 3 hours of OT.

---

## Rule 9 — Rest period after overtime (cl 19.7)

Workers are entitled to 10 consecutive hours off duty between successive working days (8 hours for shiftworkers in defined cases). If the worker is required to resume before that rest, they're paid at **200 %** of ordinary hourly rate until released.

**Verbatim source:** v02 §19 (cl 19.7).

**Calc note.** This is a relatively rare path in normal pay-period calcs. For Apete's Phase 0 comparisons, it surfaces only if his roster has a < 10-hour turnaround that he was instructed (not chose) to work through. Phase 0: surface as `[NEEDS WORKER CONFIRMATION]` if shift_facts show <10 hour turnaround; Phase 1+: prompt explicitly.

---

## Open questions

- **Day boundary for OT-threshold reset.** Cl 19.3 says "each day will stand alone" but doesn't define the day boundary for shift-spanning rosters (e.g. a shift ending at 02:00 — is the 02:00 hour "yesterday" or "today" for OT-reset purposes?). [NEEDS CLARIFICATION] — most awards default to roster-day or shift-start-day; v02.x may close.
- **Public-holiday substitution rule.** Some awards allow employer/employee to substitute a different day. cl 26 likely covers this; not yet researched.
- **Casual conversion (cl 11.4).** Affects employee_type Layer 1 fact transitions but doesn't change calc rules per period. Out of Phase 0 calc-engine scope.
- **NES interactions.** Several clauses defer to the National Employment Standards (`Maximum weekly hours… are provided for in the NES`, cl 13.1(a)). NES rules are above the award; calc engine should respect both. [NEEDS REFERENCE] — link to FWC NES summary.

---

## When this file changes

- A new award ships → append new sections per-clause-equivalent for that award; don't replace MA000074 rules.
- An FWC variation order changes a rule → bump the version number to `calc-rules-v02.md`, mark superseded the old file, link forward.
- A rule turns out to be wrong in production → research note → ADR if architectural → calc-rules increment.
