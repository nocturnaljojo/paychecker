# Operations — billing actions runbook

Runbook for billing-system actions. Phase 2+ operational doc. Lives here because billing is operations, not architecture.

## Status
**Pre-launch — placeholder.** Stripe integration begins Phase 2. This file becomes operational when Phase 2 ships.

## Pre-flight checks (before ANY billing change in production)
1. Stripe MCP authenticated to PayChecker org? Verify dashboard URL matches.
2. Webhooks active and responding? Check Stripe dashboard → Developers → Webhooks.
3. Last billing-side audit run within 7 days?

## Common actions

### Subscribe a customer (test mode)
1. Customer signs up via Clerk.
2. Webhook from Clerk → backend creates Stripe customer.
3. Backend creates subscription with the $4.99/mo price ID.
4. Webhook from Stripe → backend updates `subscriptions` table.
5. Verify: `customers.created` and `customers.subscription.created` events received within 60s.

### Refund a customer
1. Verify the request — does the customer's data show ≤ 30 days since last charge?
2. In Stripe dashboard, refund the most recent invoice (full or partial).
3. Webhook handler updates `subscriptions` row with refund event.
4. Send acknowledgement via Clerk-managed email (no marketing copy).
5. Document in `docs/retros/` with date + reason (no customer name in retro — use customer id).

### Cancel a subscription
1. Customer-initiated: app cancels at period end via API; webhook confirms.
2. Operator-initiated: only with documented reason; cancel-immediately uses `cancel_at_period_end = false`.
3. Verify: `customer.subscription.deleted` webhook received.
4. Customer's data is NOT auto-deleted on cancel — that requires a separate Privacy Act request.

### Customer requests data export (Privacy Act)
1. Verify identity via Clerk (re-auth).
2. Trigger export job — produces a JSON bundle of all worker-owned rows + storage URLs (signed, time-bounded).
3. Email signed link via Clerk.
4. Document the request + completion in an `audit_log` row.

### Customer requests data deletion (Privacy Act)
1. Verify identity via Clerk.
2. Mark `workers.deleted_at = now()` — soft delete; user immediately loses access.
3. Schedule hard-delete job for now() + 30 days. Hard-delete cascades to all `*_facts`, `documents`, `comparisons`, `extraction_staging` rows for that worker.
4. Storage: signed-URL purge + actual storage object deletion.
5. Document in `audit_log`.

## Anti-runbook (do NOT do these)
- Do NOT delete a customer's data immediately — the 30-day window protects against accidental requests and gives time for any legal-hold flag.
- Do NOT issue refunds outside the 30-day window without documented reason.
- Do NOT run any of these actions without verifying Stripe MCP is on the correct org.

## Why this file exists
A solo founder making billing decisions at 11pm should be able to read a checklist, not reconstruct policy from chat history.
