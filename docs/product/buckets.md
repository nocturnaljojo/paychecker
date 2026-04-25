# Product — the 6 data buckets

PayChecker organises everything a worker can know about their pay into 6 buckets. Each bucket has a confirmation cadence, a risk profile, and a UI surface.

## A — Identity
- Who the worker is (name, contact, visa status — for free-tier eligibility), and which household / employer relationships they're in.
- Cadence: stable. Re-confirm on change only.
- Risk: identity exposure if leaked.
- Surface: account screen.

## B — Employment terms
- Employer, classification, award reference, casual/PT/FT status, ordinary hours, base rate, allowance entitlements.
- Cadence: stable. Re-confirm at job change or pay-rise.
- Risk: wrong terms = wrong calc. Highest impact on accuracy.
- Surface: onboarding flow + "employment" tab.

## C — Time worked
- Shifts (start, end, breaks, type), allowances earned per shift.
- Cadence: per shift. Confirm at logging.
- Risk: under-logging = under-counted hours = under-stated expected pay.
- Surface: shifts log (week view + detail).

## D — Money received
- Payslip line items, bank deposits, super contributions.
- Cadence: per pay event. Confirm at upload.
- Risk: missing payslip = comparison can't run.
- Surface: payslips / bank / super tabs.

## E — Award reference
- Modern Award rates, allowances, OT rules, penalty rates, casual loading.
- Cadence: time-bounded; refreshed on FWC variation.
- Risk: stale rates = wrong expected. Highest regulatory risk.
- Surface: invisible to worker by default; "what we used" link from any comparison.

## F — Comparisons
- Immutable snapshots of a comparison run (inputs, expected, received, gap).
- Cadence: created when worker requests; never updated.
- Risk: misinterpretation by worker.
- Surface: dashboard list + report PDF.

## How buckets relate to layers

| Bucket | Layer (from `REF-FACT-model.md`) |
|---|---|
| A — Identity | Layer 1 |
| B — Employment terms | Layer 1 |
| C — Time worked | Layer 2 |
| D — Money received | Layer 3 |
| E — Award reference | (reference data — not a fact layer) |
| F — Comparisons | (snapshots — not a fact layer) |
