# Document Case Paradigm — PayChecker's Core Mental Model

> **Source:** ChatGPT critique 2026-05-01 (in response to Contract3.jpeg classification failure today + user insight about multi-page documents).
>
> **Status:** Ratified as **ADR-014** on 2026-05-01 (Sprint UX-FLOW-AUDIT) with two amendments — see `docs/architecture/decisions.md` §ADR-014 for the binding decision text. This document is the design/critique trail; the ADR is the contract.
>
> **Amendments at ratification:**
> 1. Calculation does NOT operate at case level — it operates at confirmed-fact level (per ADR-001). Case level applies to classification, extraction, storage organization, and label-confirmation only.
> 2. Case state machine is *orthogonal* to fact state machine. Confirming a case label does not auto-confirm extracted facts; each fact still walks the existing `proposed → confirmed` flow.
>
> **M0.5 scope locked: Option B (minimum-with-cases).** See `.claude/PLAN-PRJ-mvp-phases.md` §M0.5 for the locked checklist; `docs/planning/M0.5-spec.md` for schema + endpoints.

---

## The Paradigm Shift (One Sentence)

PayChecker is **not a document classifier**. PayChecker is a **document organizer** that helps workers build **document cases** over time, where AI suggests labels and the worker confirms or corrects. Classification is a side effect of organization.

---

## Layer 1 — Group First, Then Classify

> **A single page is NOT the unit of truth. A document group is the unit of truth.**

### Current architecture failure

```
upload → classify (per image) → route
```

Page 12 of a contract has no header, no signatures, no obvious contract markers → Haiku returns `other` with high confidence (because the page genuinely doesn't look like a contract on its own). The classifier did its job perfectly. The architecture was wrong: it asked the wrong question.

This is what happened with `Contract3.jpeg` today: a single page from a multi-page contract, classified as `other` (confidence 0.95), routed to the `other/` storage subdir. The classifier is not broken; the unit-of-classification is.

### Corrected architecture

```
upload → auto-group → suggest per group → confirm/correct → route
```

A group is the smallest semantically meaningful unit. The classifier sees several pages together, makes a much stronger call, and the worker confirms at the group level — not the page level.

---

## Layer 2 — Document Cases (Not Document Files)

A **document case** is a living object that:

- Has a `doc_type` (suggested by AI, confirmed by worker)
- Contains 1+ pages (uploaded over time, possibly weeks apart)
- Has a `completion_status` (Ready / Needs more / Can still use / Not sure)
- Tracks `worker_confirmed_label` (override of AI suggestion)
- Tracks `missing_items` (e.g., "Last page", "Total pay section")

### Why this matters — workers in real life

- Upload page 12 today, get more pages later
- Get fragments piece by piece (employer gives one page at a time)
- Sometimes don't have all pages but want to use what they have
- Build their evidence case over days/weeks

PayChecker must support this. **NEVER assume "upload session = complete document".**

---

## Layer 3 — UI Design (Apete-Level Simple)

### Main Screen: "Check Your Work Papers"

Top section:

```
Title:    Check your work papers
Subtext:  Take photos or upload. We'll help sort them.
```

Primary action (always visible, full-width):

```
[ 📸 Take Photo ]   [ 📁 Upload Photos ]
```

**NO categories at upload time. NO pre-classification.** The worker just dumps photos. Sorting is the system's job.

### Document Group Card

Each group = one document case:

```
[📄][📄][📄]   (3 pages)
Looks like: CONTRACT
Status: Needs more pages

[ ✔ Yes ]    [ ✏ Change ]
+ Add more pages
```

### Status Vocabulary — RATIFIED 2026-05-01 (revised post BUILD-02)

**Worker-facing statuses (ONLY these, ratified):**

| Worker-facing label | Internal DB enum (`completion_status`) | Meaning |
|---|---|---|
| **Saved** | `confirmed` | Worker accepted the label or overrode it; we have the document stored — but we haven't checked completeness yet. |
| **Ready** | `complete` | Enough pages confirmed; calc-eligible facts can be extracted. **Reserved for M1+** — M0.5 doesn't compute completeness, so this label won't surface in M0.5. |
| **Needs more pages** | `partial` | Confirmed but missing pages; can still use with limited result. |
| **Can still use** | `partial` (alternate render when worker chose partial-OK) | Partial info usable, with a limited result. |
| **Not sure yet** | `draft` or `suggested` | Awaiting label confirmation, or AI was uncertain. |

**Why "Saved" not "Ready" for `confirmed` (revised 2026-05-01 in M0.5-BUILD-03 post ChatGPT Round 2 critique):** the original draft conflated label-confirmation with document-completeness. M0.5 only asks the worker *"is this label right?"* — not *"do you have all the pages?"*. "Ready" implies the document is verified-complete and ready for extraction; that's a stronger claim than M0.5 makes. "Saved" is honest: we have the file, the worker confirmed what it is, and we haven't asserted anything about completeness. M1 will introduce true completeness detection; only then does the "Ready" label fire.

**Internal-only DB enum values:** `draft`, `suggested`, `confirmed`, `partial`, `complete`. The renderer (see `src/features/cases/vocabulary.ts`) maps the enum to worker-facing labels; raw enum values never surface.

**Forbidden in worker-facing surfaces (ratified):**

- ❌ Failed · ❌ Needs review · ❌ Error
- ❌ Classification · ❌ Confidence · ❌ Validation
- ❌ Document type · ❌ Match / Mismatch
- ❌ Any percentage or 0.0–1.0 score (raw confidence numbers stay operator-only per ADR-013)

**Worker action terms (ratified):** Confirm (or `✔ Yes`) · Change (or `✏ Change`) · Add more pages · Continue.

### Confirm / Override Pattern

- **`✔ Yes`** → confirms AI suggestion, moves forward silently
- **`✏ Change`** → opens override:

  ```
  What is this?
  [ Contract ]
  [ Payslip ]
  [ Bank ]
  [ Super ]
  [ Other ]
  ```

  Big buttons. No dropdowns. No text input.

### Low Confidence Card

When AI is uncertain:

```
[📄]   (1 page)
We're not sure what this is

[ Contract ]
[ Payslip ]
[ Bank ]
[ Super ]
[ Other ]
```

NOT "Failed". User just helps the system.

### Adding Pages Flow

When user uploads later:

```
Is this part of your Contract?

[ Yes, add to Contract ]
[ No, new document ]
```

Solves multi-page + over-time uploads cleanly.

### Bottom Action

When at least one document is confirmed:

```
[ Continue → Check my pay ]
```

---

## Critical Product Rules

1. **NEVER block the worker.** Even with partial documents, let them continue. Show: *"We can check some things now. More pages will make this more accurate."* That keeps trust.
2. **ALWAYS allow override.** AI suggests, worker decides. Hidden override = trust gone.
3. **NEVER force pre-classification.** Cognitive load is too high for ESL workers. AI does the heavy lifting; the worker corrects when needed.
4. **NEVER use dropdowns or text input.** Buttons only. Big targets. Mobile-friendly. ESL-friendly.
5. **NEVER use technical language.** Use *"Looks like"*, *"Not sure"*, *"Add more"*. Avoid *"classification"*, *"confidence"*, *"validation"*.

---

## M0.5 Scope (Smallest Useful)

ChatGPT recommended: ship grouping in M0.5, even crude.

### M0.5 grouping heuristic

> **Images uploaded within 10 seconds = same group.**

Crude, but solves 80% of real-world multi-page uploads (worker takes successive photos of a contract in one sitting). Visual + semantic grouping comes later.

### M0.5 features

- Bulk upload (1+ photos)
- Auto-group by 10-sec time proximity
- Per-group classification (existing `api/classify.ts`, fed grouped images)
- Confirm-or-override card UI
- Document case status (Ready / Not sure)
- "+ Add more pages" button (creates linked case)

### M0.5 deferred

- Visual similarity grouping
- Semantic continuity detection (does page 4 read as a continuation of page 3?)
- Multi-day session tracking
- Calc engine
- Reporting

---

## Backend Architecture (Sketch — Tomorrow Refines)

### NEW table: `document_cases`

| Column | Type | Notes |
|---|---|---|
| `case_id` | uuid PK | |
| `worker_id` | uuid FK → workers | |
| `doc_type` | text | AI suggestion |
| `worker_confirmed_label` | text nullable | Override of AI suggestion |
| `completion_status` | enum | `draft` / `suggested` / `confirmed` / `partial` / `complete` |
| `missing_items` | jsonb | e.g. `{"last_page": true, "total_pay_section": true}` |
| `confidence` | numeric | Latest AI classification confidence |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### CHANGES to existing `documents` table

- Add: `case_id` FK → `document_cases`
- Existing fields preserved (id, worker_id, doc_type, storage_path, original_filename, mime_type, size_bytes, uploaded_at, deleted_at, batch_id, content_hash, worker_facing_name, state, archived_at, embedding)

### CHANGES to `api/classify.ts`

- Accepts an **array** of `document_id`s (a group), not just one
- Returns per-group classification
- Falls back to per-image if group of 1

### NEW: grouping engine (server-side, on upload completion)

- 10-sec proximity grouping
- Creates `document_cases` automatically
- Links uploaded images to cases

---

## State Machine for Document Cases

### States

- **`draft`** — uploaded, not yet grouped
- **`suggested`** — AI labelled, not user-confirmed
- **`confirmed`** — user accepted AI label OR overrode
- **`partial`** — confirmed but missing pages, can still use
- **`complete`** — all expected pages present, ready for calc

### Transitions

```
draft     → suggested   (AI classifies)
suggested → confirmed   (user taps ✔)
suggested → confirmed   (user taps ✏ + selects label)
confirmed → partial     (status: needs more pages)
partial   → complete    (more pages added, status: ready)
complete  → calc-ready  (extracted, in scope for engine)
```

---

## Implications for Existing Code

### DEPRECATED (to rewrite)

- Per-image classification flow on `/upload`
- Single-document pill UI in `useUploadBatch` / `useClassifyBatch`
- Implicit document creation (one row per upload)

### PRESERVED (no change needed)

- `api/classify.ts` core (still calls Anthropic)
- Worker auth (Clerk + Supabase RLS via third-party JWKS)
- Worker-confirmation principle (now applies at case level — ADR-001 still holds)
- Routing logic (still uses `doc_type` + `confidence`)
- Privacy posture (REF-PRIVACY-baseline.md unchanged)

### REWORKED

- `/upload` page UI (becomes case-card based)
- Storage organization (folders by `case_id`, not `doc_type`)
- DB schema (add `document_cases` table; `documents.case_id` FK)

---

## ADR-014 (RATIFIED 2026-05-01)

See `docs/architecture/decisions.md` §ADR-014 for the binding text. Summary:

> PayChecker's evidence-organization model is built around `document_cases`, not individual document files. A case is a living object representing one logical document (e.g., a contract, a payslip period) which may contain pages uploaded across multiple sessions. **Classification, extraction, storage organization, and worker label-confirmation operate at the case level. Calculation continues to operate at the confirmed-fact level (ADR-001 unchanged); the case state machine is orthogonal to the fact state machine.**

## UI surface ownership (RATIFIED 2026-05-01)

- **`/upload`** — primary entry. Renders upload zone + case-card list inline. No new `/cases` route in M0.5.
- **`/upload/case/{case_id}`** — direct deep-link to a case (used by "Add more pages" returning to a specific case). Resolves to the same `/upload` page scrolled to the relevant card.
- **`/dashboard`** — bucket cards remain the entry from the dashboard. Tapping a bucket card routes to `/upload?bucket={contract|payslip|…}` (filter, not separate page).

M1 may evolve to a separate `/cases` index when case volume justifies it.

---

## Source Conversation

ChatGPT critique 2026-05-01 (3 messages in sequence):

1. Group first, then classify
2. Document case model (incomplete docs are okay)
3. Mobile UI design (Apete-level simple)

### Key quotes preserved

> "The job is NOT classification. The job is helping the worker organise their documents without thinking."

> "A document can be incomplete, but still useful."

> "Build PayChecker around living document cases."

> "Do NOT block the worker. Even with partial documents, let them continue."

> "The user should never feel tested. Only assisted and in control."
