# Architecture — confirmation flow

How a fact gets into the system, with all the gates in place. Companion to `.claude/skills/SKILL-FACT-confirmation.md`.

## The state machine

```
[ proposed ] ──confirm─→ [ confirmed ] ──edit──→ [ proposed (with prior_id) ] ──confirm─→ [ confirmed ]
       │                       │
       │                       └──revoke──→ [ revoked ]
       │
       └──discard──→ [ discarded ]
```

States in the DB:
- **proposed:** row exists, `confirmed_at IS NULL`, `provenance` set, NOT calc-eligible.
- **confirmed:** `confirmed_at IS NOT NULL`, calc-eligible.
- **edited (= proposed again):** trigger fires on UPDATE — old row to `*_history`, current row's `confirmed_at` set to NULL.
- **revoked:** `confirmed_at IS NULL` AND `revoked_at IS NOT NULL`. Permanent — re-confirming requires new row.
- **discarded:** soft-deleted via `deleted_at`. Calc never sees it. Restorable via undelete.

## Sources of "proposed" rows

| Source | Provenance label | Notes |
|---|---|---|
| Worker types directly | `worker_entered` | Most common path |
| Worker uploads doc → extractor proposes | `ocr_suggested` (pre-confirm) → `ocr_suggested_confirmed` | Worker confirm flips the label |
| Support staff enters | `assisted_entered` | Worker must sign-off via in-app prompt |
| Engine derives (e.g. weekly hours total) | `derived` | Auto-confirmed at derivation; lineage tracked |
| Bulk import (one-off, never default) | `imported_unverified` | Stays NOT calc-eligible until each row reviewed |

## UI patterns

### Pre-fill is OK; pre-confirm is NEVER
- A form may pre-populate fields from OCR.
- The "Confirm" button is the worker's affirmative act.
- Tapping "Confirm" without changing anything DOES count as confirmation — they reviewed and accepted.
- Closing the screen without tapping "Confirm" does NOT count.

### Provenance is visible
Every pre-filled value shows its source: a small label like "from your payslip" or "from last week's shift".

### Edit unsets confirmation
If a confirmed value is edited, the row goes back to "proposed" until re-confirmed. UI surfaces this: "Changes saved — please confirm to include in your next comparison."

## Why "imported_unverified" exists but isn't calc-eligible
We may need to bulk-import historical data (e.g. worker has 6 months of payslips and we set up an import flow). Those rows go into `*_facts` with `imported_unverified` and `confirmed_at = null` so the worker can review them in batches. Calc never includes them.

## Re-confirmation triggers (Layer 1)

Layer 1 facts are stable but not immutable. Re-confirm prompts fire when:
- Worker manually edits the fact.
- Worker reports a job change (separate UI flow that creates a new Layer 1 row).
- An award variation effective during the period would change the rate the worker sees — surface "the rate for your classification changed on YYYY-MM-DD; please confirm your classification is still correct."

## Audit trail

Every state transition writes to `*_facts_history` with:
- The full prior row state
- `change_type` (`insert` / `update` / `confirm` / `unconfirm` / `revoke` / `discard` / `restore`)
- `changed_at`
- `changed_by` (worker id, or admin id, or system id for derived)

History is append-only. No path mutates history rows.

## Calc-time read pattern

```sql
SELECT * FROM <fact_table>
WHERE worker_id = $1
  AND confirmed_at IS NOT NULL
  AND revoked_at IS NULL
  AND deleted_at IS NULL
  AND provenance IN ('worker_entered', 'ocr_suggested_confirmed', 'assisted_entered', 'derived')
  AND <effective range overlaps the comparison period>
```

Any code path that reads facts for calc but skips this WHERE clause is a P0 issue.

## Why this file exists
The state machine is implicit in the fact table columns. Without this doc, the implicit logic gets re-derived every time someone adds a new fact-touching feature. That's how subtle bugs land — make the implicit explicit.
