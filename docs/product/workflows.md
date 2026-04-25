# Product — the 7 workflows

The PWA is built around 7 workflows. Every screen belongs to one. Designs live in `ui_kits/paychecker_pwa/`.

## A — Onboarding
Capture Layer 1 facts. Worker enters / confirms identity, employer, classification, award, pay terms.
Mock: `ui_kits/paychecker_pwa/onboarding.html`

## B — Shift logging
Capture Layer 2 facts. Worker logs each shift; week view shows confirmed vs unconfirmed.
Mock: `ui_kits/paychecker_pwa/shifts.html`

## C — Payslip handling
Capture Layer 3 facts (payslip). Manual entry in Phase 0; OCR + confirm in Phase 5.
Mock: `ui_kits/paychecker_pwa/payslip.html`

## D — Bank reconciliation
Capture Layer 3 facts (deposits). Worker confirms which deposits are wage-related.
Mock: `ui_kits/paychecker_pwa/bank.html`

## E — Super reconciliation
Capture Layer 3 facts (super contributions). Worker confirms employer-source contributions.
Mock: `ui_kits/paychecker_pwa/super.html`

## F — Classification safety net
Universal upload + wrong-bucket banner — when worker uploads something we can't classify, fall back to plain explanation rather than failing silently.
Mock: `ui_kits/paychecker_pwa/classification.html`

## G — Comparison + report
Run a comparison. Surface the gap with information-tool framing. Export a PDF.
Mock: (Phase 0 deliverable — not yet mocked)

## Cross-workflow rules
- Every workflow must support resume — close the app mid-flow, come back, no data loss.
- Every workflow must show "your data" provenance for the values it touches.
- Every workflow must be operable on a shared phone (no auto-login that exposes data to the next person).
