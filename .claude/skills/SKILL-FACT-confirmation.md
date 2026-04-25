# SKILL-FACT-confirmation

## Purpose
The confirmation workflow — how facts get into the system with proper provenance. This skill is the operationalisation of architectural principle #1 (confirmation model is sacred).

## Trigger phrases
- Building any input flow (onboarding, shift logging, payslip entry, classification)
- Modifying anything that writes to a `*_facts` table
- Reviewing whether a calc has the right inputs

## Hard rule
A fact is not usable in a calculation until it has a `confirmed_at` timestamp AND a `provenance` value. No exceptions.

## The 3 layers (recap from `REF-FACT-model.md`)
- **Layer 1 — Stable facts:** employer, classification, pay terms. Confirmed once, re-confirmed on change.
- **Layer 2 — Period facts:** shifts, hours. Confirmed at logging time.
- **Layer 3 — Payment facts:** payslips, deposits, super. Confirmed each time uploaded.

## The provenance values
- `worker_entered` — typed in directly
- `ocr_suggested_confirmed` — extracted by OCR/Claude, then worker confirmed
- `assisted_entered` — entered by support staff on worker's behalf, with worker sign-off
- `derived` — computed from other confirmed facts (e.g. weekly hours from shifts)

NEVER `ocr_suggested` (without confirmation) as a calc-eligible value.

## Steps for any new fact-capture flow

1. **Define the fact shape.** Which layer? Which provenance values are valid for this fact?
2. **Pre-fill is OK; pre-confirm is not.** The UI may suggest a value; the worker must positively confirm before `confirmed_at` is set.
3. **Show provenance in the UI.** Worker sees a small label: "you entered this" / "we read this from your payslip — please confirm". No silent provenance.
4. **Re-confirmation triggers.**
   - Layer 1 facts re-confirm on edit.
   - Layer 2 facts re-confirm if a shift is edited after pay-period close.
   - Layer 3 facts always confirm at upload time, never silently.
5. **Audit trail.** Every confirm/edit/unconfirm writes a row to a fact-history table. Don't update in place without history.
6. **Calc-time gate.** The calc engine selects only rows with `confirmed_at IS NOT NULL` AND a calc-eligible provenance. Anything else is invisible to the calc.
7. **Surface unconfirmed facts to the worker.** "5 shifts this week aren't confirmed yet — confirm to include in this comparison."

## Output / UI patterns
- Confirm buttons say "Confirm" — never "Save" (which is ambiguous), never "OK" (which is dismissive).
- Pre-filled fields show the source: "from your payslip" / "from last week".
- Edits unset `confirmed_at`; re-confirm restores it.

## Common pitfalls
- Auto-confirming on save. The whole model collapses if save = confirm.
- Treating a worker's edit as a confirm. Edit + explicit confirm = confirm.
- Letting LLM-extracted values slip into calcs without confirmation. This is the cardinal sin.
- Forgetting to re-confirm Layer 1 facts when employer/classification changes.

## Why this exists
The information-tool framing rests entirely on this. If the calc runs on facts the worker didn't confirm, we are no longer running computations from worker-confirmed inputs — we are asserting facts about employment, which is advice, which we are not.
