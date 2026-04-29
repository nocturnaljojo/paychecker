# SKILL-PRJ-architectural-integration

## Purpose
Operationalises the principle **"no new concept enters the system as a standalone."** Forces every proposed feature, layer, or capability to integrate with the existing pipeline before it gets built. Catches the failure mode where a "new feature" duplicates an existing component, contradicts an ADR, or appends as a decorator when the actual fit is structural.

## Trigger phrases
- "let's add a new layer for X"
- "we need a sentiment / context / explanation / [responsibility] layer"
- "this is a new capability we should track"
- "new ADR candidate" (proposed concept that hasn't been audited yet)
- (auto) any improvement entry in `STATE-PRJ-improvements.md` that introduces a new concept rather than extending an existing one
- (auto) before drafting any new ADR that introduces a responsibility not already in the architecture

## Hard rule
THIS SKILL DOES NOT WRITE ADRs OR MIGRATIONS. It produces an **integration plan** — a structural audit identifying where the concept plugs in. ADR ratification + migration drafting come later, only after the integration shape is locked.

## Worked example
The complete reference run is `docs/architecture/integration-plan-v01.md` (Sprint INTEG-001, 2026-04-29). Three concepts (Calculation Explanation, Worker Context, Sentiment) audited against the existing pipeline; two locked into structural-insert positions, one deferred with explicit re-trigger conditions.

## The 4-step audit

The four steps below are the operational discipline. They are mandatory in order — don't skip ahead.

### Step 1 — Check if responsibility exists

**Rule.** Before designing a new concept, audit the existing architecture for whether the responsibility already exists. Re-read `INDEX.md`, `decisions.md` (every ADR), and the v01 architecture documents.

**Why.** New concepts are often ALREADY in the architecture in a different shape — implied by an ADR, partially specified by a v01 doc, or named in a single sentence somewhere. Skipping this step produces duplicate-concept entries that fight in production.

**Output:** for each existing component that touches the concept's surface, note what it CURRENTLY produces, what it CURRENTLY consumes, and whether it has a "reasoning" / "explanation" / "context" surface today. Use the structured form `What it produces / What it consumes / Reasoning surface` per component.

**Verdict format:** `EXISTS | PARTIAL | MISSING`. "Partial" is the most common honest answer; treat it as load-bearing — what's the gap, exactly?

### Step 2 — Check if partially handled

**Rule.** If Step 1 said `PARTIAL`, walk the partial coverage explicitly. List what each existing component COVERS vs DOESN'T COVER for the proposed concept.

**Why.** Partial coverage often means the new concept is *adjacent* to an existing one, not duplicate. Adjacency is the structurally-cheapest integration path: extend the adjacent component, don't add a new one. Duplication is the most expensive failure mode and the one this skill exists to prevent.

**Critical sub-rule — distinguish OVERLAP from ADJACENCY:**

- **Overlap:** same shape, same write path. Don't add the concept; extend the existing component.
- **Adjacency:** different shape, different write path, related semantic. Add a sibling structure; don't conflate.

**Worked-example test.** In Sprint INTEG-001, Worker Context (POL-005) initially looked like duplication of Layer 3 memory (`worker_extraction_preferences`). Step 2 surfaced the adjacency: Layer 3 = OBSERVED via EMA; Worker Context = SELF-DECLARED via Settings UI. Different write paths → adjacent, not overlapping → new table is the right shape, not column extension.

### Step 3 — Decide integration shape

**Rule.** Pick exactly one integration shape from the four below. Justify the choice. Write the rejection reason for each shape NOT chosen.

**Four shapes:**

1. **EXTEND** — plug into an existing component (extend its responsibility). Cheapest; preserves single source of truth. Use when Step 2 surfaced overlap.
2. **INSERT** — new component into the pipeline (structural change). Use when responsibility is genuinely new AND the pipeline has a clean insertion point. Prefer over APPEND when the concept gates downstream stages.
3. **APPEND** — new component after the existing pipeline (decorator pattern). Use when concept doesn't gate anything; it's a post-hoc enrichment.
4. **NEW SUBSYSTEM** — completely new path. Last resort. Only if no existing component is on the right pipeline trajectory. Almost always wrong; if you reach for this, re-do Steps 1+2.

**Why.** The decision compounds. INSERT vs APPEND looks like a small choice; in practice it determines whether the new concept gates the pipeline (INSERT does, APPEND doesn't), and that determines whether the rest of the architecture has to be aware of it.

**ChatGPT principle (load-bearing):** "Structural change to pipeline, not appended feature." Default to INSERT over APPEND when in doubt. If your audit suggests APPEND, double-check Step 1 — you may have missed an existing component the new concept should EXTEND instead.

### Step 4 — Define trigger conditions + referenceability

**Rule.** Specify in writing:

- **WHEN** does the new component run?
- **WHO** calls it?
- **WHAT** does it gate? (If APPEND, the answer is "nothing" — confirm that's correct.)
- **WHERE** is it documented? (Integration plan + future ADR ref)
- **HOW** does future-Claude / future-Jovi find it? (Index entry; cross-references; STATE entry)

**Why.** Trigger conditions are the difference between a designed concept and a folkloric concept. Without them, the integration shape is decoration; the concept either silently fails to run or runs everywhere unbidden.

**Referenceability sub-rule.** Every new concept must be reachable from `INDEX.md` (the index) and from at least one ADR or v01 document (the body). Concepts that don't get index entries become orphans that future-Claude can't find.

## Output template

The integration audit produces a structured plan document. Use this template — fill every section, including ones that come back empty.

```markdown
# Integration Plan v0N — {concept name(s)}

**Status:** Integration audit ({YYYY-MM-DD}). Specifies WHERE
new concepts plug into existing architecture. NOT a roadmap.
**Source:** {brainstorm / external critique / sprint trigger}.
**Related:** ADRs and v01 docs the concept touches.

## Why this document exists
{Brief paragraph naming the concept(s) and the principle.}

## Current pipeline (BEFORE)
{Verbatim end-to-end pipeline diagram from existing ADRs.
Note any gaps in REASONING / CONTEXT / OUTPUT shape.}

## Proposed pipeline (AFTER)
{Same diagram, with new component(s) inserted or extended.
Mark which arrows are new.}

## Layer A — {concept-1 name}
### Audit findings
- Step 1: EXISTS | PARTIAL | MISSING
- Step 2: overlap or adjacency or none
### Integration shape
- EXTEND | INSERT | APPEND | NEW SUBSYSTEM (with reasoning)
- Options NOT chosen with rejection reason
### Trigger conditions
- WHEN / WHO / WHAT it gates / referenceability
### Schema sketch (if needed)
- Migration NNNN candidate (NOT drafted in this sprint)
### Affected component DESIGN CONSTRAINTS
- Concrete required output shape from upstream components
  IF new concept ships later than the upstream — make upstream
  COMPATIBLE day 1, not retrofitted later.

## Layer B — {concept-2 name}
{same shape}

## Layer C — {concept-N or DEFERRED}
{If deferred: explicit re-trigger conditions, conjunctive list,
not vague "later".}

## Cross-references that must hold
| Reference | How each layer obeys |
|---|---|
| ADR-NNN | ... |

## Pressure test summary
5/5 cleared with mitigations.
1. BREAK
2. PERSONAS
3. APETE MISREADINGS
4. PRIVACY / SAFETY (APP + R-NNN)
5. REVERSIBILITY

## What this document does NOT cover
- Future ADRs that ratify the integration
- Migrations that implement the schemas
- UI specifics
- Anything Phase-future

## When this document changes
{Same pattern as other v01 docs}
```

## What this skill DOES NOT cover

- Writing the ADR itself (a different sprint, after the integration plan locks)
- Writing the migration SQL (a different sprint, after the ADR ratifies)
- Writing the UI for the new concept (a Phase-future build sprint)
- Estimating effort or scheduling (this skill produces shape, not schedule)

If you finish an integration plan and the user wants to ratify the ADR, that's a separate sprint with `SKILL-PRJ-idea-to-execution.md` step 5 (formal ADR ratification).

## Common pitfalls

- **Skipping Step 1.** Most "new concept" proposals are PARTIAL (existing) on first read. The skill exists because that's not obvious without an explicit check.
- **Conflating overlap with adjacency.** Sprint INTEG-001's POL-005 was nearly designed as a column on `worker_extraction_preferences` until Step 2 surfaced the adjacency. Always ask: "same write path?"
- **Defaulting to APPEND.** APPEND is the friction-free choice that produces orphan features. INSERT is the disciplined choice that produces gated pipeline stages.
- **Vague deferral.** "Defer to Phase 2+" is not a re-trigger condition. List the conjunctive conditions explicitly. POL-006 in Sprint INTEG-001 has 5; that's the floor, not the ceiling.
- **Designing the schema before locking the integration shape.** The schema sketch in the integration plan is a sketch — Migration NNNN drafts the SQL later, after the ADR ratifies. Don't drift into Migration drafting in this sprint.
- **Designing the new concept's UI.** UI is a Phase-future build sprint. The integration plan stays at the level of "what's the input contract / what's the output contract / what trigger conditions gate the run."
- **Forgetting the upstream design constraint.** If the new concept ships LATER than an upstream component, the upstream component MUST be designed COMPATIBLE day 1 — even if the new concept hasn't been built yet. POL-004's "Sprint E design constraint" is the canonical example: Sprint E ships before POL-004, so Sprint E's output shape must accommodate POL-004's input contract from day 1.

## Why this exists

PayChecker's architecture is a pipeline. New concepts that don't integrate don't merely fail to add value — they actively *fragment* the pipeline. A 30-minute integration audit prevents months of "we built X but it doesn't talk to Y" debt. The audit is also the moment the architecture's coherence gets re-tested: every Step 1 read is a free check that the existing ADRs and v01 docs still describe the live system.

The principle — **no new concept enters the system as a standalone** — is the discipline that makes this auditable. The 4-step audit is how the discipline becomes operational.
