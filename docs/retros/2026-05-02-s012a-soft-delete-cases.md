# Session 012A — Soft-delete cases (APP 11.2)

## What shipped

- **Migration 0018** — `document_cases.deleted_at timestamptz` (nullable). SELECT RLS policy replaced with `worker_id = current_worker_id() AND deleted_at IS NULL`. UPDATE policy unchanged. No index (deferred per plan).
- **`src/components/ui/ConfirmModal.tsx`** — generic destructive-confirm dialog. Mirrors existing modal pattern (body-scroll-lock, Esc-to-close, backdrop-tap-to-close); coral primary action; suppresses Esc/backdrop while a confirm is in flight.
- **`src/features/cases/useAllCases.ts`** — `softDeleteCase(caseId)` mutation (optimistic UI: snapshot → remove → UPDATE → restore on failure). SELECT now also passes `.is('deleted_at', null)` as belt-and-suspenders.
- **`src/pages/Cases.tsx`** — trash icon (lucide `Trash2`) on each row + page-level `ConfirmModal` ("Delete this paper? / You can't undo this.") + delete failure toast.

Four files, exactly. `git diff --stat HEAD~1 HEAD` verified.

Two commits: `chore(issues): track RPC deleted_at defense-in-depth (from 012A plan U3)` (`f4464aa`) → `feat: soft-delete cases with confirm modal (APP 11.2 compliance)` (`93c66b0`). Plus the prior CLAUDE.md guardrail commit (`6ef2d40`) that landed in the same session window.

## Origin

This was the **first session under the new Architecture Guardrails + Unknowns Gate** (CLAUDE.md, commit `6ef2d40`). Those rules were introduced earlier in the same session in response to BUILD-11 incidents — the assumed-`payslip_facts`-shape bug and the silent-INSERT-on-CHECK-violation. The brief explicitly required the plan phase to apply those rules.

## What the new rules caught

- **Live-schema query caught a name drift.** The session brief used `cases` throughout; the actual table is `document_cases`. The Unknowns Gate's "Database schema, table relationships, column types, JSON shapes" item triggered a Supabase MCP `execute_sql` query before any code was written. The drift surfaced in §2 of the plan and was resolved before /build.
- **U3 surfaced and routed correctly.** The `extend_case_with_document` RPC (migration 0015) doesn't check `deleted_at`. This was caught by the Unknowns Gate but explicitly identified as out of session scope per the spec's hard-stops. Filed as ISS-015 (P3, OPEN) in `.claude/STATE-PRJ-issues.md`. Committed separately before the feature work, as the brief required.
- **No scope creep.** Hard-stops in the spec (extraction review screen, `payslip_facts`, `extraction_jsonb`, OCR pipeline, calc engine, Clerk, storage, `src/lib/calc/`, SEC-001) all stayed untouched. `git diff --stat HEAD~1 HEAD` shows exactly the four planned files in the feature commit.

## Decisions worth remembering

- **RLS as the single enforcement point.** The SELECT policy filtering `deleted_at IS NULL` covers all three frontend SELECT call sites (`useAllCases`, `useWorkerCases`, `useCaseFeedback`) without per-hook code change. `useAllCases` also sends an explicit `.is('deleted_at', null)` filter — redundant with RLS but makes the frontend's intent visible to future readers.
- **UPDATE policy stays open on `deleted_at`.** Worker can flip `deleted_at` from null → now() because the UPDATE policy doesn't filter on `deleted_at`. After UPDATE, the SELECT policy hides the row.
- **Worker vocabulary won over literal spec copy.** The brief said "Delete this payslip case?" but the project's worker-facing vocabulary is "papers" (BUILD-04). The approved EDIT 2 swapped to "Delete this paper? / You can't undo this." — vocabulary consistency over literal compliance.
- **Storage object stays.** Soft delete only; hard-delete cron is separate work. Documented in migration 0018 header comment.
- **Coral hover via opacity, not a missing token.** I initially used `bg-pc-coral-hover` which doesn't exist in `tokens.css`. Switched to `hover:opacity-90 active:opacity-80`. Filed mentally as a polish improvement candidate for Phase 0 finish.

## Follow-ups tracked

- **ISS-015** (P3, OPEN) — `extend_case_with_document` RPC defense-in-depth. Add `deleted_at IS NULL` to the case ownership check inside the RPC body. Likely bundled into Session 012C when the provenance work touches RPCs.
- **Index deferral** — `idx_document_cases_deleted_at` (partial, `WHERE deleted_at IS NULL`) deferred per plan EDIT 3. Re-add only if `/cases` SELECT performance degrades. Tracked here, not in `STATE-PRJ-issues.md` (it's a perf hedge, not a known bug).

## Manual smoke (Jovi-driven, awaiting)

Production deploy: commit `93c66b0` pushed to `origin/main`; Vercel rebuild auto-triggered. Manual test steps 1–10 from the plan are the worker's to run on `paychecker-three.vercel.app`. Step 11 (the `git diff --stat HEAD~1 HEAD` four-file check) was completed pre-push and matched the plan exactly.

## Session 012B (next)

Per the brief's Section C — provenance model proposal. Schema inspection pass to answer:
- Where per-field provenance lives (per-row column / sidecar table / JSON map)
- Whether corrected values overwrite or sit alongside originals
- How correction interacts with `payslip_facts_history` and `confirmed_at` reset
- Whether provenance is per row or per field
- Whether correcting one field resets the confirmation state on related fields

Output is a written proposal document — review and approve, then 012B builds against it. **Do not design the provenance model inside a `/build` session.**
