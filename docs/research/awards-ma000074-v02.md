# MA000074 — Poultry Processing Award 2020 — research note v02

**Status:** DRAFT (Sprint 3, 2026-04-27 — Schedule A v02 increment).
**Scope:** Targeted close of v01 §6 gap #1 — Schedule A definitions for Levels 1–3 (Apete-shaped).
**Builds on:** [`awards-ma000074-v01.md`](./awards-ma000074-v01.md). v01 remains the authoritative aggregate research note; v02 is a delta on a single gap. Future v02.x increments close remaining v01 §6 gaps (cold-work temperature bands, span-of-hours, night-shift definition, public-holiday OT, casual + penalty stacking, Meal/Vehicle allowance amounts).
**Maintainer:** Jovi (PayChecker).
**Result of this sprint:** **gap NOT closed.** Verbatim Schedule A text could not be extracted via any web-accessible source path attempted in the 20-minute budget. Levels 1–3 sections below remain empty by design — per the sourcing discipline, paraphrased or inferred text MUST NOT be entered as if it were verbatim.

---

## §A.1 — Poultry Processing Worker Level 1

**Verbatim FWC text:** *not yet captured.* See §X — Sourcing log below.

**Working hypothesis from v01 §2** (clearly marked there as **inferred, not verbatim**):
> Entry-level positions, basic line tasks (catching, hanging, killing-line entry roles), no required training period.

This hypothesis cannot be promoted to verbatim until a clean FWC source is captured. Do **NOT** seed PayChecker UI text from the hypothesis.

---

## §A.2 — Poultry Processing Worker Level 2

**Verbatim FWC text:** *not yet captured.* See §X — Sourcing log below.

**Working hypothesis from v01 §2** (inferred, not verbatim):
> Line workers with some experience (cutting, dressing, evisceration line stations).

Do **NOT** seed UI text from the hypothesis.

---

## §A.3 — Poultry Processing Worker Level 3

**Verbatim FWC text:** *not yet captured.* See §X — Sourcing log below.

**Working hypothesis from v01 §2** (inferred, not verbatim):
> Experienced line workers, may include simple machine operation or supervision of own work.

Do **NOT** seed UI text from the hypothesis.

---

## §X — Sourcing log (what was tried, what failed, what to try next)

### Attempted source paths

| # | Source | Method | Result |
|---|---|---|---|
| 1 | `awards.fairwork.gov.au/MA000074.html` | `WebFetch` | Same as Sprint 1 v01: page is long; the content extractor truncates before reaching Schedule A. TOC entry visible (`#_Toc220404087`); body of A.1/A.2/A.3 not. |
| 2 | `awards.fairwork.gov.au/MA000074.html#_Toc220404087` | `WebFetch` with anchor | Same truncation pattern — anchor doesn't affect server-side rendering, the extractor still cuts off at clause 31 (Redundancy). |
| 3 | `library.fairwork.gov.au/award/?krn=MA000074` | `WebFetch` (alternate FWO viewer) | Same truncation — content cut at "[Content truncated due to length...]"; Schedule A listed in TOC only. |
| 4 | `awardviewer.fwo.gov.au/award/show/MA000074` | `WebFetch` (third FWO viewer found via search) | `ECONNREFUSED` — domain not accepting fetches from this client. |
| 5 | `fwc.gov.au/documents/sites/awardsmodernfouryr/ma000074-ed-draft-determination.pdf` | `WebFetch` of FWC exposure-draft PDF | PDF is image-only / no text layer extractable. PDF saved to local cache, but `Read` tool reports `pdftoppm not found` so the local PDF can't be ingested without installing `poppler` / `pdftoppm`. |
| 6 | `WebSearch` for "MA000074 Schedule A Level 1 Level 2 indicative tasks poultry processing" | search snippets | Returned what *looks* like Level 1 + Level 2 task language (e.g. "An employee remains at this level for the first 3 months or until they are capable of effectively performing the tasks required so as to enable them to progress to a higher level as a position becomes available"). However, search-result snippets may be paraphrased or LLM-summarised; cannot be used as the verbatim source per the sourcing discipline. |

### Why the standard paths fail

The MA000074 consolidated text is a long single-page HTML document. Every web-accessible viewer (`awards.fairwork.gov.au`, `library.fairwork.gov.au`) reads from the same underlying source and is rendered on a single long page that the WebFetch content extractor truncates before reaching the schedules. The exposure-draft PDF on `fwc.gov.au` is image-encoded with no embedded text layer, so HTML-to-markdown extraction returns binary/font metadata, not classification text. The local PDF readers needed to OCR or text-layer-extract the saved PDF (`pdftoppm`, `poppler`) aren't available in this environment.

### Paths to try next sprint

In rough priority order:

1. **Browser-side download of the consolidated PDF.** From `awards.fairwork.gov.au/MA000074.html`, the FWC offers a "Download as PDF" button that produces a current-consolidation PDF with embedded text. Open in a desktop PDF reader; copy Schedule A.1 / A.2 / A.3 verbatim into v02; commit. This is a manual ~15-minute task; can't be automated without browser tooling.
2. **Install `poppler` (`pdftoppm`, `pdftotext`) locally.** Then re-run Sprint 3's flow: `WebFetch` saves the FWC PDF, `Read` (which calls `pdftoppm`) ingests it. One-time tooling install; unblocks all future award PDF research.
3. **Find an alternate FWC URL that returns the full HTML.** Search for "consolidated modern award PDF download MA000074" on `fwc.gov.au` — there may be a `/documents/awards/current/MA000074.pdf` style path with embedded text rather than the image-encoded exposure draft.
4. **Targeted WebFetch of the schedule via an explicit byte-range or section parameter** if the FWC viewer supports one (none documented; speculative).
5. **Last resort — request the document by email from FWC.** Heavy-handed for a research need; only if 1–4 fail.

### What v02 explicitly does NOT do

- **Does not promote v01's hypotheses to verbatim.** v01 §2 hypotheses remain marked as *inferred*; v02 inherits that marking and adds nothing beyond.
- **Does not seed Schedule A text into PayChecker UI.** The classification picker (Sprint 3+ UI) cannot use these descriptions until a verbatim source lands. Until then, the UI must show classification *codes* (`LEVEL_1`, `LEVEL_2`, `LEVEL_3`) only, with a "definitions pending" disclaimer linking to the FWC source.
- **Does not touch v01's other open gaps** (cold-work temperature bands, span-of-hours clause, night-shift vs permanent-night-shift definition, public-holiday OT rate, casual + penalty stacking interaction, Meal/Vehicle allowance amounts). Those are scoped to future v02.x increments.

### Recommended decision before next attempt

- If the priority is closing this gap fast → install `poppler` (path 2; one-time, ~5 min, unblocks every future award).
- If the priority is staying tooling-light → manual browser download (path 1; ~15 min for this gap, repeats per future award until tooling lands).

---

## Sources (this v02 fetch session)

- Fair Work Commission consolidated MA000074 (HTML viewer): https://awards.fairwork.gov.au/MA000074.html — Schedule A truncated at fetch time.
- Fair Work Ombudsman library viewer: https://library.fairwork.gov.au/award/?krn=MA000074 — same truncation pattern.
- Fair Work Ombudsman alternate viewer: https://awardviewer.fwo.gov.au/award/show/MA000074 — ECONNREFUSED.
- Fair Work Commission exposure-draft PDF: https://www.fwc.gov.au/documents/sites/awardsmodernfouryr/ma000074-ed-draft-determination.pdf — image-only, no text layer.
- (Carried forward from v01) https://www.fairwork.gov.au/employment-conditions/awards/awards-summary/ma000074-summary, https://calculate.fairwork.gov.au/ArticleDocuments/872/poultry-processing-award-ma000074-pay-guide.pdf.aspx.
