# MA000074 — Poultry Processing Award 2020 — research note v02

**Status:** **CAPTURED** (Levels 1–3, Sprint 4 close — 2026-04-28).
**Scope:** Targeted close of v01 §6 gap #1 — Schedule A definitions for Levels 1–3 (Apete-shaped). Levels 4–6 deferred (out of Apete-shaped scope).
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

## §X — Sourcing log

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
