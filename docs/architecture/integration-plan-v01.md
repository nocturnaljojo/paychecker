# Integration Plan v01 — Calculation Explanation, Worker Context, Sentiment

**Status:** Integration audit (2026-04-29). Specifies WHERE new concepts plug into existing architecture. NOT a roadmap.
**Source:** Apete brainstorm 2026-04-29 + ChatGPT integration critique + Sprint INTEG-001 audit.
**Related:** ADR-001 (confirmation sacred), ADR-003 (info not advice), ADR-007 (two gates), ADR-013 (upload-first), `calc-rules-v01.md`, `add-fact-pattern.md`.

## Why this document exists

Three concepts surfaced in brainstorm: **Calculation Explanation Layer** (POL-004), **Worker Context Layer** (POL-005), **Sentiment / Safety Layer** (POL-006).

Per the project's architectural discipline: **no new concept enters the system as a standalone.** Each must integrate into the existing pipeline.

This document audits the existing pipeline, identifies where each concept plugs in, defines trigger conditions, and updates affected components' design constraints. It is a structural audit, not a roadmap. ADR-015 / ADR-016 / ADR-017 ratify later (Phase 1 first sprint) once integration shape is locked here.

> **2026-05-01 renumber note.** Originally reserved ADR-014/015/016 for POL-004/POL-005/POL-006. ADR-014 was ratified on 2026-05-01 for the document-case paradigm (Sprint UX-FLOW-AUDIT, see `decisions.md` §ADR-014). The three POLs in this document shift +1 to ADR-015/016/017. Numbering tracks ratification order, not reservation order.

## Current pipeline (BEFORE)

Verbatim from existing ADRs:

```
Worker Upload (B1)
  ↓
CLASSIFY (B2) → document_classifications
  ↓
ROUTE (B3) → routing_status
  ↓
EXTRACT (C1–C5) → document_extractions + proposed-state facts
  ↓
ADR-012 5-stage pattern → confirmed facts
                         (worker_classification_facts,
                          payslip_facts, shift_facts, etc.)
  ↓
CALC ENGINE (Sprint E) → applies calc-rules-v01.md
  ↓
COMPARISON OUTPUT → numbers rendered to worker
```

**Gap analysis.** No reasoning surface between Calc Engine and Comparison Output. Bare numbers reach the worker. ADR-009 §"Reporting requirement" mandates a "How we computed this" surface with FWC-clause citations per allowance, but nothing in the live pipeline structurally produces that surface — it's an aspirational requirement on a renderer that doesn't yet exist. At scale this violates ADR-003 (info not advice): a bare $X dollar gap with no chain of inputs/rules/sources reads as accusation.

## Proposed pipeline (AFTER)

```
Worker Upload (B1)
  ↓
CLASSIFY (B2)
  ↓
ROUTE (B3)
  ↓
EXTRACT (C1–C5)
  ↓
ADR-012 5-stage pattern → confirmed facts
  ↓
CALC ENGINE (Sprint E) ───┐
  ↓                       │  (raw numerical output)
CALCULATION EXPLANATION    │  ← inputs_used, sources_used,
LAYER (POL-004)            │     rules_applied, checks_needed,
  ↓                        │     status (calculator-language),
WORKER CONTEXT ADAPTER  ←──┘     reason_code
(POL-005)                  ← worker_context (POL-005)
  ↓
COMPARISON OUTPUT → numbers + reasoning + sources + checks +
                    tone-adapted message
```

Two new components inserted **between** Calc Engine and Comparison Output. Sprint E's responsibility narrows to "produce numbers + structured metadata"; rendering becomes a downstream concern with its own table.

## Layer A — Calculation Explanation (POL-004)

### Audit findings

**Does it exist today?** NO.

**Partially handled elsewhere?** Indirectly:
- `calc-rules-v01.md` holds 9 rules with verbatim FWC-clause references — the *rule library* exists.
- `document_extractions.field_confidences` (Migration 0011) gives extraction-time reasoning per field.
- `award_rates` + `award_allowances` (Migration 0005) hold structured rate data with effective-from dates — the *sources* are queryable.
- ADR-009 §"Reporting requirement" names the format ("base → folded all-purpose allowances → penalty multiplier → additive allowances, with FWC-clause citations per allowance").

These are SOURCES the Explanation Layer composes. They are NOT a reasoning surface themselves — there's no structured trace today that says *"applied Rule 7 (cl 17.2(b)(i)) to fold Leading Hand $32.20/wk into the base rate, computing $0.85/hr added before the Sunday penalty multiplier."*

### Integration shape

**Option (a) — INSERT as new component BETWEEN Calc Engine and Comparison Output.** Chosen.

Reasoning:
- Single-responsibility separation: Sprint E's job is *numbers*; explanation is *narrative composition*. Mixing them in one Sprint E output blurs the responsibility.
- ChatGPT's principle: "structural change to pipeline, not appended feature."
- Past comparisons stay immutable per ADR-005; explanations attach via FK without mutating `comparisons`.
- Renderer becomes dumb display reading from `calculation_explanations`.

**Options NOT chosen:**
- (b) Embed in Sprint E (early audit recommendation; rejected per brief — separation is cleaner).
- (c) Append after render (would require re-running calc; brittle; same as today's gap).

### Trigger conditions (gate language matching ADR-007)

- **WHEN:** every Sprint E calc output, before any worker render. ADR-007 already has gate-1 (re-verify inputs confirmed) and gate-2 (classify gap). POL-004 inserts as **gate-3 (compose explanation)** — comparison cannot render until explanation exists.
- **WHO calls:** the comparison report renderer (Phase 1+ FastAPI service). Service-side write only.
- **INPUT:** `comparisons` row id + facts referenced + rules applied + source documents.
- **OUTPUT:** `calculation_explanations` row.
- **GATE:** comparison output cannot render without an explanation row attached. **No bare numbers shipping.**

### Schema sketch (Migration 0013 candidate — NOT drafted today)

```sql
calculation_explanations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comparison_id uuid NOT NULL REFERENCES comparisons(id) ON DELETE RESTRICT,
    result_type text NOT NULL,              -- 'gross_period' | 'super' | 'allowance_line' | etc.
    status text NOT NULL CHECK (status IN (
        'matches',
        'difference_found',
        'needs_checking',
        'cannot_calculate',
        'missing_information'
    )),
    reason_code text NOT NULL,              -- machine-stable identifier per scenario
    explanation_jsonb jsonb NOT NULL,       -- { "inputs_used": [...], "plain_english_reason": "..." }
    sources_jsonb jsonb NOT NULL,           -- citation chain (FWC clauses, award_rates ids, document ids)
    checks_needed_jsonb jsonb,              -- list of unresolved questions surfaced to worker
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
)
```

**Status taxonomy is CALCULATOR-LANGUAGE, not LEGAL-LANGUAGE** (per ADR-003):

| Allowed | Forbidden |
|---|---|
| `matches` | `breach` |
| `difference_found` | `illegal` |
| `needs_checking` | `non-compliant` |
| `cannot_calculate` | `certain breach` |
| `missing_information` | `likely breach` |

The five allowed values are intentional: they are diagnostic, not prescriptive. "Difference found" tells the worker something the worker can act on without telling the worker what to do. The five forbidden values would shift PayChecker into advice-tool territory at the schema level — making it impossible to maintain ADR-003's framing in downstream code.

### Sprint E design constraint (NEW — added by this audit)

Sprint E's output shape must include structured metadata, not just final numbers. **Required fields in Sprint E output (in `comparisons.expected_amounts` jsonb or a sibling jsonb):**

- `result number` (existing)
- `inputs_used` — list of `*_facts` row ids + the values consumed
- `rules_applied` — list of `calc-rules-v01.md` rule ids (e.g., `"calc-rules-v01#rule-7"`)
- `sources_used` — list of `award_rates`/`award_allowances` ids + `effective_from`, plus `documents.id` source-of-truth references
- `checks_needed` — list of unresolved questions ("verified rate per cl 19.7" / "shift type confirmed" / etc.)

This makes Sprint E's output **compatible with POL-004's input contract**, even if POL-004 ships later (Phase 1 first sprint).

If Sprint E ships today producing only bare numbers, POL-004 later requires a Sprint E retrofit. **Sprint E's design ratification (still pending) MUST adopt this constraint NOW.** Past `comparisons` rows are immutable per ADR-005 — they can never be re-derived. Day-1 inclusion is not optional in spirit; it is operationally required by the integration plan.

The structured metadata change to Sprint E's output is a *non-breaking schema addition* — it adds keys to `expected_amounts` jsonb (or adds a sibling jsonb column). No retroactive migration required for empty Phase-0 state.

## Layer B — Worker Context (POL-005)

### Audit findings

**Does it exist today?** PARTIALLY. There is overlap with Layer 3 memory (`worker_extraction_preferences`, Migration 0011) that needs honest analysis.

**Overlap analysis with Layer 3 memory:**

| Aspect | Layer 3 (existing) | Worker Context (POL-005) |
|---|---|---|
| Source | OBSERVED by extraction service | SELF-DECLARED by worker |
| Purpose | Improve extraction quality | Adapt communication tone |
| Worker can read? | Yes (RLS) | Yes (RLS) |
| Worker can edit? | No (observation only) | Yes (self-declared) |
| Worker can delete? | Yes (privacy right) | Yes (privacy right) |
| Confidence math | EMA per `layered-memory-v01.md` | n/a (self-declared, no inference) |

**VERDICT: NOT duplication. Layer 3 is observed inferred patterns; Worker Context is self-declared identity + preference. Different shapes, different write paths.** The two systems are *adjacent*, not overlapping — applying SKILL-PRJ-architectural-integration.md Step 2's "distinguish overlap from adjacency" rule.

### Integration shape

**New table `worker_context` (Migration 0014 candidate) + new pre-render adapter** between Calculation Explanation Layer and worker UI.

- **NOT** a new column on `worker_extraction_preferences` — observed and declared have different write paths and different operator-debug visibility, and conflating them in one table risks accidentally inferring declared values from observed signals.
- The pre-render adapter is a software component, not a table — it reads `worker_context` + `calculation_explanations` and emits the worker-facing message.

### Trigger conditions

- **WHEN:** every render of a Calculation Explanation to the worker.
- **WHAT it adapts:** TONE, FRAMING, FORMAT — never MATH (ChatGPT's load-bearing line). The numbers in `calculation_explanations.explanation_jsonb` and `comparisons.expected_amounts` are unchanged by Worker Context.
- **WHO writes:** worker self-declares via Settings UI. NO inference from any signal — no service-role writes, no observation feeding Worker Context.
- **GATE:** Worker Context cannot influence calc result; only the message wrapping the result.

### Schema sketch (Migration 0014 candidate — NOT drafted today)

```sql
worker_context (
    worker_id uuid PRIMARY KEY REFERENCES workers(id) ON DELETE CASCADE,
    visa_status text CHECK (visa_status IN (
        'palm', 'australian_citizen', 'permanent_resident',
        'temporary_visa_other', 'prefer_not_to_say'
    )),
    esl_preference boolean NOT NULL DEFAULT false,
    explanation_depth text NOT NULL DEFAULT 'plain' CHECK (explanation_depth IN (
        'plain', 'detailed', 'expert'
    )),
    dependency_awareness_jsonb jsonb,       -- { "housing_via_employer": true, "transport_via_employer": true, ... }
    preferred_address_form text,            -- 'first_name' | 'full_name' | 'none'
    preferred_locale text DEFAULT 'en-AU',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
)
```

**R-004 (worker safety) implication.** Workplace dependency data (housing via employer, transport via employer, visa sponsorship) is **HIGHLY sensitive**. An abusive employer with phone access learning that the worker has flagged "housing via employer" is a real R-004 escalation surface. Mitigations:
- RLS mandatory: `worker_id = current_worker_id()` for SELECT/UPDATE/DELETE; no INSERT path other than worker-self.
- Privacy policy **v2** disclosure mandatory before this table ships (Phase 1+ scope).
- Operator read-redacted view (Phase 1+ per R-006) MUST include this table — it is a top-priority redaction target.
- The pre-render adapter MUST NOT log any Worker Context value beyond `worker_id` + structural metadata.

## Layer C — Sentiment / Safety (POL-006) DEFERRAL

DEFERRED to Phase 2+. Not designed today. Not modelled today. Not flagged as a near-term roadmap item.

### Re-trigger conditions (must be ALL — not vague-later)

1. **Real-world Phase 1 data shows tone adaptation BEYOND what Worker Context self-declaration provides is needed.** Concretely: Apete or his cohort report situations where the rendered message did not adapt enough despite Worker Context being set. Without this real-world signal, sentiment classification is a solution looking for a problem.
2. **Sentiment classifier validated specifically on ESL text** — ideally a PALM worker corpus, or equivalent Pacific-Islander English benchmark. Generic English sentiment classifiers misread ESL emphatically (the emotional valence of "I asked but he didn't say" reads neutral to a generic classifier and is loaded to Apete). Without this, classifier output is unsafe to act on.
3. **Privacy policy v3 update designed.** Sentiment analysis crosses APP 6 (use only as disclosed) — generic disclosure won't cover it. Worker opt-in mechanism required.
4. **ADR-017 ratified** with explicit risk acknowledgment: sentiment surface is the closest PayChecker has come to advice-tool territory; the ADR must name this and define the boundary.
5. **Workplace dependency consequences modeled.** What if the sentiment surface flags distress AND the worker has flagged employer-controlled housing? The cascade matters; the design must address it.

If any one is missing, defer. The conditions are conjunctive, not disjunctive.

## Cross-references that must hold

| Reference | How each layer obeys |
|---|---|
| **ADR-001** (confirmation sacred) | POL-004 reads `comparisons` only after gate-1 (inputs confirmed). POL-005 never writes to `*_facts`. POL-006 deferred. |
| **ADR-003** (info not advice) | POL-004 status taxonomy bans legal-language. POL-005 adapts tone but cannot soften the result. POL-006 deferred precisely because it risks crossing into advice. |
| **ADR-007** (two gates → three) | POL-004 IS gate-3. POL-005 happens post-gate; doesn't gate. POL-006 deferred. |
| **ADR-013** (upload-first) | POL-004 consumes Sprint E's output, which consumes confirmed facts from the upload-first pipeline. POL-005 wraps the rendered output. POL-006 deferred. |
| **R-004** (worker safety) | POL-005 dependency data is the load-bearing R-004 escalation surface; mitigations enumerated above. POL-004 has no employer-side surface. POL-006 deferred. |
| **R-005** (info not advice) | Same as ADR-003 — all three obey or defer. |

## Pressure test summary

5/5 cleared with mitigations.

### 1. BREAK — 5 ways the integration fails

| # | Failure | Mitigation |
|---|---|---|
| (i) | POL-004 `calculation_explanations` row drifts from `comparisons.expected_amounts` (e.g., schema migrations on one but not the other) | Migration 0013 ships them in lockstep; Sprint E's prep migration adds the structured metadata to `comparisons.expected_amounts` AND creates `calculation_explanations`. FK constraint enforces presence-on-comparison. |
| (ii) | POL-005 worker_context tone adaptation accidentally changes a number (e.g., "translate amounts to USD for remittance display") | Pre-render adapter contract: emits *strings* derived from `comparisons` numbers + `calculation_explanations`. Adapter has no write path back. ADR-016's ratification text must include "tone not math" as a non-negotiable. |
| (iii) | POL-006 ships in Phase 2 without privacy policy v3, exposing sentiment classifications without disclosure | Re-trigger condition 3 explicitly gates this. Without v3, ADR-017 cannot ratify. |
| (iv) | Status taxonomy gets quietly extended with a `'breach'` value via a future migration | CHECK constraint enforces enum at the DB layer. The five forbidden values are documented here AND in calc-rules-v01.md (as future addition); CI lint can grep for them in code. |
| (v) | Worker Context dependency data leaks via operator support without redaction | R-006 already requires operator support runbook (Phase 1+); this audit elevates `worker_context` to a top-priority redaction target. |

### 2. PERSONAS — Apete + advocate + Mia

- **Apete (primary):** sees a worker-facing message like *"Your payslip shows $1,247.30; we computed $1,295.05 expected. Difference is $47.75. We checked the rate from your contract and the hours you confirmed. The award says…"* This is calculator-language; he can act or not act. POL-005 may render the address as "Bula, Apete" if he sets Fijian preference. POL-005 will not change the dollar values. Pass.
- **Advocate (Apete's brother / FWO):** opens the PDF and sees the structured `sources_jsonb` chain (FWC clauses + effective-from dates + document references). They can verify the calc cold. POL-005 doesn't change what advocates see; the same explanation underlies any tone-adapted message. Pass.
- **Mia (paid-tier hospitality, Phase 2):** higher digital literacy; sets `explanation_depth = 'detailed'` in Worker Context; sees a longer per-rule trace. Same calc, different presentation. Pass.

### 3. APETE MISREADINGS

- **"Difference found" reads as "you are owed money" → claim against employer.** Mitigation: status text alone never appears without the diagnostic frame. Renderer enforces: status + size + your-payslip-shows + we-computed + the-difference-is, in that order. ADR-003 framing rules apply to every render path.
- **Worker Context "explanation depth: detailed" reads as "expert mode for hard cases" — Apete avoids selecting it because he doesn't think of himself as an expert.** Mitigation: Settings UX uses concrete examples ("Show me more steps in the calculation" vs "Just the headline"), not abstract toggles. Sprint B-future implementation.
- **`dependency_awareness` toggle reads as a question about Apete's status that the app might share with someone.** Mitigation: privacy-policy v2 disclosure must explicitly state "this only changes how we talk to you; we never share this with anyone, ever." Operator read-redacted view confirms the storage discipline.

### 4. PRIVACY / SAFETY

- **APP 1 (open + transparent):** privacy policy v2 (POL-005 dependency) and v3 (POL-006 sentiment, deferred) cover new surfaces.
- **APP 3 (collection limited to disclosed purpose):** Worker Context fields each have a stated purpose ("we ask about ESL preference so we can use plain language", "we ask about housing via employer so we know not to send you anything that mentions your employer's name during work hours"). Each field gets a Settings-page explainer at collection time per APP 5.
- **APP 6 (use only as disclosed):** dependency_awareness data NEVER exits the worker_context table for purposes other than tone adaptation. No analytics, no logs, no model training.
- **APP 11 (security):** RLS mandatory; `worker_context` joins existing PayChecker discipline (encryption at rest/transit, no PII in logs, AU region). Pass.
- **APP 12/13 (access + correction):** worker can read + edit + delete own context. Same shape as Layer 3 memory privacy rights.
- **R-004 (worker safety):** dependency data is the most sensitive new surface. RLS + redacted operator view + privacy policy disclosure are the three required mitigations. POL-005 cannot ship without all three.
- **R-005 (info not advice):** status taxonomy enforces calculator-language at the schema level. CI lint enforces in code. Pass.
- **R-010 / R-011 (data processors):** Worker Context never travels to Anthropic or Voyage. Only the rendered message string does, and only at user request (e.g., explainer chat — Phase 2+). Pass.

### 5. REVERSIBILITY

- **POL-004 rollback:** `DROP TABLE calculation_explanations CASCADE`. `comparisons.expected_amounts` keeps its structured metadata (additive jsonb keys; no schema migration to drop). Bare-numbers rendering returns; ADR-009 reporting requirement fails again — known regression, fail-loud.
- **POL-005 rollback:** `DROP TABLE worker_context CASCADE`. Pre-render adapter degrades to default tone for all workers. No data migration required (worker_context CASCADEs with worker deletion already).
- **Sprint E structured metadata rollback:** the metadata is additive jsonb keys in `expected_amounts`. Removing them is a one-statement code change in Sprint E; no DB migration required. **No one-way door.**
- **POL-006 deferral:** by definition reversible — the only commitment is "we will not design this until 5 conditions are met."
- **Pattern revision (vs tuning):** if the integration shape itself proves wrong (e.g., POL-004 should have been embed not insert), a new ADR supersedes ADR-015; this v01 doc stays in history per ADRs-are-append-only. Cost: one ADR + the affected layer's implementation, not the whole integration model.

**5/5 cleared. No blockers.** One residual: privacy policy v2 (Phase 1+) is a hard prerequisite for POL-005 ship; v3 is a hard prerequisite for POL-006 reconsideration. Both are existing Phase-0+ finish-line items per ADR-006; this audit adds specifics.

## What this document does NOT cover

- ADR-015 / ADR-016 / ADR-017 ratification (Phase 1 first sprint).
- Migration 0013 / Migration 0014 SQL (Phase 1 execution sprints; Sprint E's prep migration handles the `comparisons.expected_amounts` structured-metadata addition).
- UI specifics for explanation rendering (Phase 1 build sprints — `add-fact-pattern.md` style spec for the explanation surface).
- Sentiment classifier choice (Phase 2+ — re-trigger condition 2).
- Pre-render adapter implementation (Phase 1+ build).
- Worker Settings UI for context input (Phase 1+ build).

## When this document changes

- An integration shape proves wrong in production → version bump (`integration-plan-v02.md`); supersede this file; cross-reference forward.
- A new concept surfaces (POL-NNN+) → audit-and-amend; either append a new "Layer D / E / …" section or version bump if the structural change is large.
- ADR-015 / 016 / 017 ratify → mark this doc with forward-references to the ADRs; v01 stays as the integration audit; ADRs are the binding decisions.
- A pressure-test failure surfaces in production → append mitigation; version bump.
