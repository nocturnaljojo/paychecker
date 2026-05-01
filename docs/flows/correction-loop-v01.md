# Correction Loop — v0.1

Memory anchor for the loop that closes between BUILD-04 and
BUILD-08 (2026-05-01 → 2026-05-02). Lean by design — full
architecture lives in the per-sprint code + retros; this doc
just names the pattern so future sprints can compose against it.

## What

The "correction loop" is the path a worker walks from raw upload
to confirmed fact:

  Upload → Preview → Understand → Fix → Confirm

UX shape: **SEE → THINK → ACT.**

The worker never has to remember what they uploaded or trust the
classifier blindly. They see the document, decide what it is, and
act in the same gesture.

## Why

Without the loop:
- Worker uploads → classifier guesses → label feels arbitrary
- No way to verify → no way to correct → trust collapses
- A single misclassification becomes permanent damage

With the loop:
- Worker sees the source → recognizes the document → confirms
  or corrects in 2 steps
- Misclassifications are recoverable, not permanent
- "Other (not sure yet)" is a polite invitation, not a verdict

## Screens

- **/upload** — capture (camera / file / drag) + classify;
  case feedback panel surfaces what the system understood
- **/dashboard** — bucket overview + AttentionPanel; tappable
  "Your papers" header → /cases
- **/cases** — flat list of all cases (attention-first sort);
  card body taps open preview; "+ Add more pages" extends;
  [Change] re-labels
- **PreviewModal** — full-screen view of the source document;
  sticky header with `Change type` button; image dims to
  opacity-70 when override is layered above
- **OverrideModal** — 6 category buttons under the question
  "What is this document?"; reused across /upload, /cases, and
  inside preview

## Principles

- **Permission to think.** The worker must be allowed to SEE
  the source before being asked to classify it.
- **SEE → THINK → ACT.** Two steps to fix, not four. Never
  separate the evidence from the decision.
- **Worker intent wins.** Classifier suggests; worker confirms
  or corrects; the worker's choice is authoritative
  (`completion_status = 'confirmed'`).
- **Optimistic UI.** Snapshot → paint → RPC → revert + toast on
  failure. The UI never blocks on the network.
- **Honest wording.** "Saved" not "Ready." "Not sure yet" only
  when the classifier defaulted to Other and the worker hasn't
  weighed in. No advice voice; only what we computed.
- **Composable modals.** PreviewModal + OverrideModal stay
  separate; preview composes override via a prop, never
  duplicates it. Sibling DOM rendering keeps backdrop and
  Esc behavior clean.
- **Identity is visible.** Workers always know which account
  they're in (BUILD-05 indicator). Account mismatches are
  diagnosable in 30 seconds, not 30 minutes.

## What This Unlocks

The same primitives carry forward:

- **Failure Guidance UI (next).** When the classifier says
  "I couldn't read this":
    - Show the preview (already built)
    - Layer the question modal (already built)
    - Worker tells us what it is
    - Done — same SEE → THINK → ACT shape

- **Calc explanation.** Same dimming + layered modal pattern
  can show "this is what we computed and why" over the source
  document.

- **Multi-page reasoning.** Preview already stacks pages; the
  loop scales to documents the classifier can only partially
  understand.

## What's Missing

- Failure Guidance UI — what does a worker do when the AI
  explicitly couldn't read a document? (Next sprint candidate.)
- Image zoom / built-in PDF viewer — deferred to M1.
- Bulk corrections (re-label many at once) — deferred to M1.
- Account-switch helper near the IdentityIndicator — deferred.
- Convergence of `documents.uploaded_at` vs
  `document_cases.created_at` naming — polish backlog.

## Built By

| Sprint | Date | What it shipped |
|---|---|---|
| BUILD-04 | 2026-05-01 | /cases route + AttentionPanel — system has memory |
| BUILD-05 | 2026-05-02 | IdentityIndicator — orient the worker |
| BUILD-06 | 2026-05-02 | PreviewModal + signed URLs — permission to think |
| BUILD-07 | 2026-05-02 | Change type from inside preview — close the flow gap |
| BUILD-08 | 2026-05-02 | Image dimming + ESL copy — focus the attention |

Each commit + retro carries the implementation detail. This
doc is the memory anchor that ties them together.
