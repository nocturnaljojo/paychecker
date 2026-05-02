# Session 012A — Soft-delete cases (APP 11.2)

## What shipped

- **Migration 0018** — `document_cases.deleted_at timestamptz` (nullable). SELECT RLS policy replaced with `worker_id = current_worker_id() AND deleted_at IS NULL`. UPDATE policy unchanged. No index (deferred per plan).
- **`src/components/ui/ConfirmModal.tsx`** — generic destructive-confirm dialog. Mirrors existing modal pattern (body-scroll-lock, Esc-to-close, backdrop-tap-to-close); coral primary action; suppresses Esc/backdrop while a confirm is in flight.
- **`src/features/cases/useAllCases.ts`** — `softDeleteCase(caseId)` mutation (optimistic UI: snapshot → remove → UPDATE → restore on failure). SELECT now also passes `.is('deleted_at', null)` as belt-and-suspenders.
- **`src/pages/Cases.tsx`** — trash icon (lucide `Trash2`) on each row + page-level `ConfirmModal` ("Delete this paper? / You can't undo this.") + delete failure toast.

Four files, exactly. `git diff --stat HEAD~1 HEAD` verified.

Four commits in the 012A chain:
1. `6ef2d40` — `chore(claude-md): add architecture guardrails, unknowns gate, source-of-truth discipline (BUILD-11 follow-up)`
2. `f4464aa` — `chore(issues): track RPC deleted_at defense-in-depth (from 012A plan U3)`
3. `93c66b0` — `feat: soft-delete cases with confirm modal (APP 11.2 compliance)`
4. `2f3b266` — `docs(retro): session 012a — soft-delete cases (APP 11.2)` (this file's first version)

Plus a 5th close-out commit (`chore(retro): Session 012A close-out`) that adds the friction assessment + vocabulary audit + PLAN status sections below.

## Origin

This was the **first session under the new Architecture Guardrails + Unknowns Gate** (CLAUDE.md, commit `6ef2d40`). Those rules were introduced earlier in the same session in response to BUILD-11 incidents — the assumed-`payslip_facts`-shape bug and the silent-INSERT-on-CHECK-violation. The brief explicitly required the plan phase to apply those rules.

## What the new rules caught

- **Live-schema query caught a name drift.** The session brief used `cases` throughout; the actual table is `document_cases`. The Unknowns Gate's "Database schema, table relationships, column types, JSON shapes" item triggered a Supabase MCP `execute_sql` query before any code was written. The drift surfaced in §2 of the plan and was resolved before /build.
- **U3 surfaced and routed correctly.** The `extend_case_with_document` RPC (migration 0015) doesn't check `deleted_at`. This was caught by the Unknowns Gate but explicitly identified as out of session scope per the spec's hard-stops. Filed as ISS-015 (P3, OPEN) in `.claude/STATE-PRJ-issues.md`. Committed separately before the feature work, as the brief required.
- **No scope creep.** Hard-stops in the spec (extraction review screen, `payslip_facts`, `extraction_jsonb`, OCR pipeline, calc engine, Clerk, storage, `src/lib/calc/`, SEC-001) all stayed untouched. `git diff --stat HEAD~1 HEAD` shows exactly the four planned files in the feature commit.

## What the guardrails did NOT catch

Honest accounting:

- **`pc-coral-hover` token assumption.** I wrote `hover:!bg-pc-coral-hover` in ConfirmModal without first checking whether that token existed in `tokens.css`. The build broke (well, ran fine — Tailwind silently dropped the unknown class), I noticed visually-tracking that the token was missing, and switched to `hover:opacity-90`. The Architecture Guardrails say "Do NOT assume schema" but only enumerate "tables, columns, JSON shapes" — not design-token names. **Calibration suggestion:** consider extending the Guardrails wording to "tables, columns, JSON shapes, **or design-token names**" since the same class of "I assumed it exists, didn't check, it didn't exist" failure mode applies to both.
- **Premature retro commit.** I shipped `2f3b266` (the retro) before this close-out spec arrived, which created a 7-file `HEAD~3 HEAD` window instead of the spec's expected 6. Not a guardrail failure exactly — the guardrails don't speak to wrap timing — but it is a workflow miscalibration. The session brief's order-of-operations (`/build` → `/review` → manual test → feature commit → `/wrap`) was clear; I jumped to `/wrap` immediately after the feature commit instead of waiting for the close-out instruction. **Calibration suggestion:** when a session brief has multiple `/wrap`-or-similar steps, treat each as gated by user approval, not as a single sequence I run end-to-end.
- **Manual test steps 1–7 + 10.** The plan listed these as "manual test steps" but I have no browser-driver. I ran them as "ready to test" rather than passing/failing them. Not a guardrail miss; just a capability boundary worth flagging in future plans so test-step ownership is explicit.

## Friction assessment (calibration data for the new rules)

- **Unknowns Gate did NOT slow me down.** The `cases→document_cases` query took ~5 seconds via Supabase MCP and saved at least 5 minutes of "where's the table" confusion later. Net positive.
- **No false-positive STOPs.** The Unknowns Gate raised five unknowns; four were architecturally meaningful (U1 name drift; U2 FK behavior; U3 RPC defense-in-depth; U4 UPDATE-then-SELECT semantics under new policy) and one was rule-relevance check (U5 extraction_jsonb immutability — confirmed not relevant). Zero felt like noise.
- **Architecture Guardrails STRICT rules:** the "Do NOT assume schema" rule was the load-bearing one this session — it mandated the Supabase MCP query that caught the name drift. The other three (no new tables, no refactor, no multiple sources of truth) didn't fire because the spec was already scope-clean.
- **Source of Truth Discipline:** not exercised this session — soft-delete adds one new column with one canonical writer (the UPDATE call). No conflict.
- **The schema-vs-token gap noted above** is the only friction-shaped finding. The cost of catching it earlier would be one more grep-tokens.css call before claiming a class. Cheap.

## Vocabulary audit (close-out step 2 result)

Reviewed all user-facing strings introduced in commit `93c66b0`:

| String | Verdict |
|---|---|
| `aria-label={title}` (ConfirmModal) | ✓ uses passed `title` = "Delete this paper?" — worker vocabulary |
| `aria-label={cancelLabel}` | ✓ defaults to "Cancel" — generic |
| `aria-label={`Delete ${typeLabel}`}` (trash button) | ✓ uses `docTypeLabel()` output ("Payslip", "Contract", etc.) — worker-facing type label, not "case". More specific than generic; better for screen-reader disambiguation between rows. |
| Toast: "Couldn't delete that — try again." | ✓ no "case" |
| Modal title: "Delete this paper?" | ✓ "paper" |
| Modal body: "You can't undo this." | ✓ no "case" |
| Confirm button: "Delete" | ✓ generic |

The only `case` mention in the diff is in a JSDoc code comment explaining the vocabulary discipline (`"papers" not "payslip cases" in /cases)`). Internal documentation, not user-facing.

**Internal identifiers** (`caseId`, `case_id`, `pendingDeleteCaseId`, `softDeleteCase`, schema column `case_id`, etc.) correctly stay as "case" — that's the schema's name and the type-system's name.

**Verdict: no vocabulary leaks.** No changes needed.

## PLAN-PRJ-mvp-phases.md status

Phase 0 / M0.5 has no explicit soft-delete checkbox (`grep -i 'delete\|deletion\|destroy\|APP 11'` returns no matches in the plan). Nothing to tick. APP 11.2 compliance work was undocumented in the plan; if Phase 0 ever needs an APP-compliance line item, soft-delete is one of the things that satisfies it. Not actioning here.

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
