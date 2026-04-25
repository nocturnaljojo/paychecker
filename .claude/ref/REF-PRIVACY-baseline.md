# REF-PRIVACY-baseline

## Purpose
Australian Privacy Act (Australian Privacy Principles, "APP") baseline that every PayChecker feature must meet. This is the minimum, not the target.

## What we collect

PayChecker collects "personal information" and, for some users, "sensitive information" under the Privacy Act:
- Identifiers: name, email, phone (Clerk-managed).
- Employment: employer, classification, shifts, hours.
- Financial: payslip line items, bank deposit data, super contributions.
- Documents: payslips, contracts, super statements, bank exports.

## APP obligations summary (informational — not legal advice)

| APP | Plain summary | How we comply |
|---|---|---|
| APP 1 | Open + transparent management | Public privacy policy; this file; collection notice on every sensitive form |
| APP 3 | Collection of solicited personal info | Collect only for the disclosed purpose; consent for sensitive info is affirmative |
| APP 5 | Notification of collection | Plain-language collection notice when each new data class is asked for |
| APP 6 | Use or disclosure | No secondary use without separate consent (no marketing, no analytics on financial data) |
| APP 8 | Cross-border disclosure | All data hosted in AU region (Supabase ap-southeast-2). LLM calls (Anthropic) are disclosed in collection notice; no-training-on-data flag set |
| APP 11 | Security | Encryption at rest + transit; per-user RLS; no plaintext financials in logs |
| APP 12 | Access | Worker can view all their data via "your data" screen + export |
| APP 13 | Correction | Worker can edit any fact row (which unsets `confirmed_at`) |

## Hard rules for engineers

1. **No PII in logs.** Logs may contain `worker_id` (uuid). They MUST NOT contain names, emails, payslip line items, bank narrations, super amounts. Audit `console.log`, `print`, structured-logging calls in every PR.
2. **No client-side LLM calls with PII.** Every LLM call goes through the backend extractor agent which strips identity before sending text.
3. **No third-party analytics on financial screens.** No Google Analytics, no PostHog, no Sentry session replay on any screen showing $ values.
4. **Deletion within 30 days of request.** `DELETE /me/data` triggers soft-delete immediately + hard-delete + storage-purge job within 30 days. Document the deletion timestamp in an audit row.
5. **Export within 7 days of request.** Worker can self-export from "your data" screen (immediate). For programmatic data subject requests, respond within 7 days with a JSON bundle.
6. **Consent is affirmative.** No pre-ticked checkboxes. No "by continuing you agree". Each new data class needs its own consent UI.
7. **Worker safety overrides convenience.** If a feature could expose the worker to retaliation (employer sees their PayChecker activity), it does not ship until the safeguard is in place.

## Per-feature checklist

When building any feature that touches Layer 3 facts or documents, answer in writing:
- What is collected?
- What's the disclosed purpose? Is it shown at collection time?
- Where is it stored? (Must be AU region.)
- Who can read it? (Must be the owning worker + audit role only.)
- When is it deleted? (Must align with 30-day deletion window.)
- Is consent affirmative?
- Are there logging paths that could leak it?
- Does the LLM see it? If yes, is identity stripped?

If any answer is "I don't know", do not ship.

## Worker-safety risk surface
Specific PayChecker risks beyond standard APP:
- **Shared phones / households.** PWA must support quick-lock + per-session re-auth on financial screens.
- **Employer subpoena / discovery.** Worker controls export; we do not retain anything past the deletion window.
- **PALM scheme power asymmetry.** Workers on temporary visas may fear retaliation. Default UI should not surface "you may be underpaid" framing; only "expected vs received" framing.
- **English-as-second-language.** Privacy notices and consent UIs must be plain-language, ideally translated.

## Why this exists
Privacy is not an afterthought. The category we live in (information tool) only holds if the worker is in control of their data. This file is the operational floor.
