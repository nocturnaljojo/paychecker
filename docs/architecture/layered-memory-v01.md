# Layered Memory v01

**Status:** Design (Sprint A4, 2026-04-29).
**Implements:** ADR-013 layered memory commitments.
**Implementation lands in:** Migration 0011 (Sprint A5) + Sprint A3 (extraction service composes these layers in prompts).
**Related:** ADR-013, `document-intelligence-plan-v01.md` §4 + §5, `storage-architecture-v01.md` (RLS pattern), ADR-005 (indexing not looping), R-004, R-006.

## Why this document exists

ADR-013 commits to a 4-layer memory architecture (generic patterns / per-employer / per-worker / cross-document reconciliation). The plan describes WHAT each layer holds. This document specifies the BEHAVIOUR — when each layer is read, when it's written, how confidence updates, how layers compose into a single extraction call, and what crosses worker / employer / operator boundaries.

This document does NOT write SQL (Sprint A5) and does NOT write extraction prompts (Sprint A3). It writes the contracts those sprints implement against.

## Layer 1 — Generic patterns (in-prompt, immutable)

System-level knowledge that applies to all workers, all employers, all documents.

**Examples:**
- Australian payslip layout conventions (gross / net / hours / period / employer name; ATO standard).
- ABN regex (`^\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$` after whitespace normalisation).
- MA000074 classification enum (`PE_LEVEL_1` through `PE_LEVEL_6`).
- Date format priors (ISO 8601 preferred; `DD/MM/YYYY` Australian default with US `MM/DD/YYYY` flagged for re-check).
- AUD currency format (`$X,XXX.XX`; never `$X.Xk`).

### Read path
- **WHEN:** every classification + extraction call.
- **HOW:** the prompt template (Sprint A3) hardcodes Layer 1 context into the system prompt.
- **WHO reads:** extraction service only.

### Write path
- **WHEN:** never at runtime. Layer 1 is hardcoded in the prompt template.
- **WHO writes:** humans, via prompt-template version bumps in the repo (`prompts/classify-prompt-vN.md`, `prompts/extract-payslip-vN.md`, etc., per plan §5).
- **Update is a code change**, with the corresponding prompt-template version recorded in `documents.classifier_version` / `extractor_version` (column names per plan §6).

### Privacy
- No PII; system patterns only. Visible in the repo and to anyone reading prompt templates.

### Composition with other layers
Layer 1 is always present. Layers 2–4 augment Layer 1 with worker-specific or employer-specific context.

## Layer 2 — Per-employer patterns

Patterns about how a specific employer formats its documents. Examples from plan §4: *"Acme Poultry payslips: gross at top-right, period in header"*; *"This employer cites cl 17.3(b) on contracts"*; *"Their classification letters use 'Process Worker Grade X'"*.

### Read path
- **WHEN:** classification + extraction calls **where `employer_id` is known**.
  - At classification time, employer is often unknown (the document is what tells us). In that case Layer 2 is skipped on the first pass and consulted on the second pass after type + employer are tentatively identified.
  - At extraction time, employer is always known (it was set at routing).
- **WHAT:**
  ```sql
  SELECT pattern_jsonb, confidence
  FROM employer_extraction_patterns
  WHERE employer_id = ?
    AND document_type = ?
  ORDER BY confidence DESC, observation_count DESC
  LIMIT 5;
  ```
- **HOW USED:** top-5 patterns concatenated into the extraction prompt under a section header `# Employer-specific context` with each pattern's confidence as a `(0.87)` annotation. Sprint A3 commits the exact concatenation format.
- **WHO reads:** extraction service (service role).

### Write path
- **WHEN:**
  - First successful extraction for `(employer_id, document_type)` → INSERT new pattern row.
  - Subsequent successful extractions match an existing pattern → UPDATE `observation_count + 1`, `last_observed = now()`, recompute `confidence` (formula below).
  - Worker corrects classification or extraction at REVIEW stage → INSERT/UPDATE the corrected pattern AND mark the original pattern as a counter-example (`pattern_jsonb` carries `{"corrected_from": "old_value", "corrected_to": "new_value", "type": "negative"}`).
- **WHO writes:** service role only (extraction pipeline).

### Confidence formula
Exponential moving average:

```
new_confidence = 0.7 × old_confidence + 0.3 × observation_score
```

where `observation_score` is the per-call extraction quality signal (1.0 = clean parse, no worker correction; 0.5 = partial fields extracted; 0.0 = worker rejected the extraction at REVIEW). The first observation seeds `confidence = observation_score` directly.

The 0.7 / 0.3 weighting is biased toward stability so a single noisy extraction doesn't flip a well-established pattern. Sprint A3 may tune the constants based on early observations; the formula shape stays.

### Pattern aging
- Rows with `last_observed < now() - interval '12 months'` get a quarterly decay: `confidence ← confidence × 0.9` per quarter past the 12-month window.
- When `confidence < 0.20`, the row is **archived** (a future column `archived_at` matching the `documents` pattern; out-of-A4 scope to add — Sprint A5 decides).
- Archived patterns are excluded from the read query but never deleted (audit trail).

### Privacy
- **Operator-only reads.** RLS pattern from `storage-architecture-v01.md`: no policy admits worker-role reads.
- **Reasoning:** Layer 2 patterns about employer X are not actionable to worker Y who happens to also work at X. Surfacing patterns to a worker risks leaking information about other workers' uploads (e.g., "this employer's payslips usually mention overtime" — true for one worker but irrelevant to another).
- **Worker correction triggers a write but doesn't surface the underlying pattern.** Apete sees: *"We'll remember this for next time."* He doesn't see: *"Updated employer-pattern PE_LEVEL_2_LABEL from 0.84 to 0.79."*

### Composition with other layers
- Layer 1 (system) + Layer 2 (employer) = "2-tier prompt context" — used for any known employer.
- Layer 2 reads are bounded by `LIMIT 5` to keep the prompt context tractable and avoid drift from low-confidence patterns.

## Layer 3 — Per-worker patterns

Patterns about how a specific worker uses PayChecker. Examples from plan §4: *"Apete uploads landscape screenshots"*; *"Apete's super statements come from AustralianSuper quarterly"*; *"Apete's payslips arrive 1st and 15th of each month"*.

### Read path
- **WHEN:** every classification + extraction call (worker context is always known once they're signed in).
- **WHAT:**
  ```sql
  SELECT preference_key, preference_value
  FROM worker_extraction_preferences
  WHERE worker_id = ?
  ORDER BY last_observed DESC
  LIMIT 10;
  ```
- **HOW USED:** top-10 preferences concatenated into the extraction prompt under `# Worker-specific context` with the same `(observation_count)` annotation.
- **WHO reads:** extraction service (service role) at runtime; worker can read own rows via RLS.

### Write path
- **WHEN:**
  - Upload behaviour observed (file format / orientation / time-of-day patterns).
  - Document arrival pattern (e.g., fortnightly payslips on Tuesdays — fires after 3 confirmed observations, not on first sighting; avoids over-fitting).
  - Employer roster update (e.g., "Apete now has 2 employers" — fires when a second `worker_classification_facts` row appears).
  - Worker correction at REVIEW (e.g., "Apete prefers the display label 'Process Worker' over 'Process Employee'").
- **WHO writes:** service role only.
- **HOW:** same observation-count + last-observed pattern as Layer 2.

### Confidence formula
Same shape as Layer 2 (`0.7 × old + 0.3 × observation_score`), but Layer 3 patterns don't have a confidence column in the plan §6 spec — the plan uses `observation_count` + `last_observed` only. Sprint A4 amends this: **Sprint A5 SQL adds `confidence numeric(3,2) NULL DEFAULT NULL`** to `worker_extraction_preferences`. NULL = "not yet computed" (insufficient observations); populated after the third observation.

Pattern aging mirrors Layer 2 (12-month window, quarterly decay, archive at < 0.20).

### Privacy
- **Worker can read own preferences via RLS** (per `storage-architecture-v01.md`: `worker_extraction_preferences` is own-only).
- **Worker can DELETE own preferences** — explicit privacy right under APP 12 (right to access + correct) and APP 13 (right to deletion in jurisdictions where applicable). Sprint A5 SQL adds a worker-DELETE policy; this is a deliberate departure from the otherwise-no-DELETE pattern in PayChecker schemas.
- **Account deletion CASCADEs** to delete all Layer 3 rows (Sprint A5 SQL).
- **Operator can read for support / debug** under existing service-role policy. Operator support runbook (Phase 1+ per R-006) must include: "do not screenshot Layer 3 reads outside the support thread."

### Composition with other layers
- Layer 1 + Layer 2 (if employer known) + Layer 3 = full prompt context for the call.
- Layer 3 always present; Layer 2 sometimes absent (unknown employer first-classification pass).

## Layer 4 — Cross-document reconciliation

Vector-similarity-driven detection of duplicates, page-joins, and cross-document context (e.g., "page 2 of upload-X is page 1 of contract-Y from last week").

### Read path
- **WHEN:** every classification call AFTER initial type identification (so the embedding is computed from a typed document).
- **WHAT:** vector similarity search via pgvector cosine distance against the worker's last 20 classified documents:
  ```sql
  SELECT d.id, 1 - (d.embedding <=> ?) AS similarity
  FROM documents d
  WHERE d.worker_id = ?
    AND d.id != ?
    AND d.embedding IS NOT NULL
  ORDER BY d.embedding <=> ?
  LIMIT 20;
  ```
- **HOW USED:** ranked list of `(document_id, similarity_score)` pairs returned to the routing service. Thresholds:
  - **≥ 0.95** → likely duplicate (same content). Routing review surfaces "looks like a re-upload" with a tertiary to keep both or skip the new one.
  - **0.85 – 0.95** + temporally adjacent (within 7 days) → likely page-join. The new `document_classifications` row sets `parent_doc_id` to the older document with a `page_range` extending it.
  - **< 0.85** → independent document. No special handling.
- **WHO reads:** extraction service (service role).
- Returns at most 20 candidates; cosine distance threshold filters down before threshold-bucketing.

### Storage of embeddings — DECISION

**Option (a) — `embedding vector(N)` column on `documents` table via pgvector. (Chosen.)**

Reasoning:
- pgvector is mature on Supabase (extension `vector`, available since Postgres 15+).
- Single-table scan is cheap for N ≤ 20 per worker per call.
- One column on the existing table is simpler than a separate table — embeddings are 1:1 with documents and have the document's lifecycle (delete-on-document-hard-delete is automatic).
- ADR-005 (indexing not looping) honoured: scan is bounded by `worker_id` index + `LIMIT 20`.

**Options considered:**
- **(a) New column on `documents`.** **Chosen.**
- **(b) Separate `document_embeddings` table.** Discarded — adds a table and an FK with no operational benefit; 1:1 relation with `documents`.
- **(c) Computed on-demand, never stored.** Discarded — re-embedding on every classification call doubles cost and re-derivation breaks the audit trail (an embedding produced today by model v2 is not the same as one produced yesterday by model v1).

**Embedding model:** Sprint A3 specifies. Strong-default candidate: same Sonnet vision call returns an embedding alongside the classification (one round-trip). Fallback: separate Voyage AI / OpenAI embedding call. Sprint A3 picks based on cost + latency benchmarks. The embedding column dimensionality is set when Sprint A3 picks the model; Sprint A5 SQL uses `vector(N)` with N from A3's choice.

### Write path
- **WHEN:** every successful EXTRACT writes the embedding to `documents.embedding`.
- **WHO writes:** service role only (extraction pipeline).
- **Re-embedding on document edit:** the worker can edit `worker_facing_name` etc. without changing content — embedding stays. The worker cannot edit the file content (no UPDATE policy on storage objects beyond the move-from-_unclassified case). Therefore the embedding is computed once and stable.

### Reconciliation outcomes
| Similarity bucket | Outcome | UI behaviour |
|---|---|---|
| ≥ 0.95 | Duplicate detected | Routing review surfaces "looks like a re-upload"; worker chooses keep-both or skip-new. Layer 4 finding logged in `document_classifications.notes`. |
| 0.85 – 0.95 + ≤ 7 days apart | Page-join detected | `document_classifications.parent_doc_id` points at older document; `page_range` extends. Worker confirms the join at REVIEW. |
| 0.85 – 0.95 + > 7 days apart | Similar but independent | No special handling; standalone classification. |
| < 0.85 | Independent | No special handling. |

### Privacy
- Embeddings are stored per-document; gated by the `documents` RLS policy (worker reads own).
- **Cross-worker reconciliation does NOT happen.** The query is always `WHERE worker_id = ?` — Apete's documents are never compared against any other worker's. This is enforced at the query shape, not at the data shape.
- Embeddings travel: extraction service → Anthropic API call (during classification) → returned to PayChecker → stored in Supabase. Anthropic API call is per ADR-013's APP 6 disclosure.

### Disable safety
- If the embedding model is found to be biased / leaking / otherwise unsuitable, Layer 4 can be disabled by setting all embeddings to NULL and short-circuiting the read query. The pipeline degrades to no-reconciliation; duplicates would slip through but classification + extraction continue working. Sprint A5 SQL leaves the column nullable specifically for this off-switch.

## Composition: a worked example

**Scenario.** Apete uploads a payslip from Acme Poultry. He has 3 prior confirmed payslips from the same employer.

**Step 1 — Classification call (no employer known yet).**
- Prompt context = Layer 1 (system) + Layer 3 (top-10 worker preferences: "uploads landscape", "fortnightly payslips on Tuesdays", "Acme Poultry employer roster").
- Classifier returns: `type = 'payslip'`, confidence 0.92, employer guess = `Acme Poultry` (UUID resolved via Layer 3 hint).

**Step 2 — Layer 4 reconciliation.**
- Embedding generated for the new document.
- Cosine similarity vs Apete's last 20 documents: prior payslip from 2 weeks ago = 0.91 similarity (similar layout, different period). Below 0.95 = not duplicate; above 0.85 + within 7 days = check page-join. Date check: 14 days apart > 7 days → not page-join. **Bucket: similar but independent.** No special handling.

**Step 3 — Routing decision.**
- 0.92 confidence ≥ 0.85 threshold → auto-route to `payslip` bucket.

**Step 4 — Extraction call (employer now known).**
- Prompt context = Layer 1 (system) + Layer 2 (top-5 Acme Poultry payslip patterns: "gross at top-right", "period in header", "BSB format X") + Layer 3 (top-10 worker preferences).
- Extractor returns: `gross_pay = 1247.30`, `period_start = 2026-04-15`, etc., with `confidence_per_field` JSON.

**Step 5 — Memory updates after worker confirms (REVIEW → CONFIRMED).**
- Layer 2 (Acme Poultry, payslip): observation_count++, confidence updated via EMA, last_observed = now().
- Layer 3 (Apete preferences): existing "fortnightly payslips" pattern reinforced; observation_count++.
- Layer 4: embedding stays.

**If worker corrects extraction at REVIEW** (e.g., changes period_start from `2026-04-15` to `2026-04-08`):
- Layer 2 records the original-pattern correction (`{"corrected_from": "2026-04-15", "corrected_to": "2026-04-08", "type": "negative"}`); confidence on the original pattern decays (observation_score = 0.5 partial-correctness).
- Layer 3 records "Apete corrects period_start fields" preference (observation_count = 1; not yet a confidence-bearing pattern but tracked).

## Pattern lifecycle

```
new (1st observation) ─→ active (≥3 observations, confidence ≥ 0.40)
                                │
                                ├─→ aging (last_observed > 12 months ago)
                                │       │
                                │       ├─→ archived (confidence < 0.20)
                                │       │
                                │       └─→ revived (new matching observation resets last_observed)
                                │
                                └─→ active (continues with each new observation)
```

- **new:** row exists; confidence = first observation_score.
- **active:** row reads into prompt context.
- **aging:** still reads but with quarterly confidence decay.
- **archived:** does NOT read into prompt; kept for audit; can be revived if a new matching observation comes in.

## Privacy summary

| Layer | Worker reads? | Worker deletes? | Cross-worker visible? | Operator reads? |
|---|---|---|---|---|
| 1 (system) | n/a (in-prompt) | n/a | n/a (no PII) | yes (prompts in repo) |
| 2 (per-employer) | no (operator-only) | no | no (per-employer scoped, not cross-shared) | yes |
| 3 (per-worker) | yes (own RLS) | yes (privacy right) | no (per-worker scoped) | yes (under support runbook) |
| 4 (embeddings) | implicit via outcomes | recomputed (delete document → embedding gone via FK) | no (`worker_id =` filter) | yes (embeddings on documents) |

## Account deletion flow

When a worker requests account deletion:
1. **Layer 3:** `DELETE FROM worker_extraction_preferences WHERE worker_id = ?` — Sprint A5 SQL adds CASCADE on the `worker_id` FK.
2. **Layer 4:** embeddings on `documents` are deleted when the documents themselves are hard-deleted (30-day grace per `storage-architecture-v01.md`). Until then, embeddings remain but are RLS-scoped to the deleted worker — invisible to operator reads via worker-role queries.
3. **Layer 2:** rows REMAIN. Reasoning: per-employer patterns are not worker-PII; they describe an employer's document layout. Removing them on worker-account-deletion would degrade extraction quality for the next worker at the same employer without a privacy benefit (no PII in the pattern shape).
4. **Layer 1:** unaffected (system-level prompts in the repo).

A privacy-policy v1 disclosure (Phase 0 finish-line) must explain this: *"When you delete your account, we delete your personal data and your document embeddings. We keep generic patterns about your employer's document format because they don't contain anything personal to you."*

## Operator support / debug surface

Operator (Jovi or future support staff) reads Layer 2 and Layer 3 rows during debug, never Layer 1 (in code) or Layer 4 (raw embeddings are not human-interpretable).

R-006 mitigation requires:
- No screenshots of Layer 2/3 reads outside the support thread.
- No copy-paste of Layer 3 rows to Slack / external systems.
- A future Phase 1 operator-facing read-redacted view that shows pattern keys without raw `pattern_jsonb` values when the operator's reason-code doesn't require them.

These are runbook items (Phase 1+); Sprint A4 documents the obligation, doesn't enforce it.

## Pressure test summary

`SKILL-PRJ-pressure-test.md` 5/5 cleared with mitigations.

**1. Break this system — 5 ways layered memory fails.**

| # | Failure | Mitigation |
|---|---|---|
| (i) | Stale Layer 2 pattern misclassifies after employer changes payslip software (e.g., Acme switches from MYOB to Xero — old layout pattern is now wrong). | Pattern aging + worker correction at REVIEW + EMA confidence formula together: a wrong pattern decays as new observations contradict it. Confidence drops below 0.20 → archived. Mean-time-to-correct: ~5–10 incorrect extractions before the pattern is suppressed. Sprint A3 prompt design surfaces low-confidence fields prominently for worker re-check. |
| (ii) | Embedding model drift: Anthropic ships a new vision model; embeddings produced before vs after are no longer comparable. | Sprint A3 records `extractor_version` per call; cross-version similarity comparison is suppressed (added as a query filter: `WHERE extractor_version = current_version`). Old embeddings can be re-computed or archived. |
| (iii) | Worker correction at REVIEW doesn't propagate to Layer 2 because the correction wasn't tagged as a counter-example. | Sprint A3 prompt explicitly asks the worker "is this right?" per field at REVIEW; correction events fire Layer 2 + Layer 3 writes via the extraction service. Sprint A4 commits the write trigger; A3 wires it. |
| (iv) | Cross-worker leak via Layer 2: pattern about employer X reveals something about another worker at X (e.g., "this employer always reports overtime as zero"). | Layer 2 patterns store layout + structural info (where fields are, how they're labelled), not values. Sprint A3 prompt-engineering enforces: pattern keys are about FORMAT, not CONTENT. Audit reviewable: every Layer 2 row's `pattern_jsonb` is operator-readable; bad patterns get manually sanitised. |
| (v) | Layer 4 embedding leakage: Anthropic API stores embeddings or trains on them. | Anthropic API terms (per ADR-013 APP 6 disclosure): no training without opt-in; data retention bounded by API session. Privacy policy v1 discloses the API call. Disable Layer 4 (set embeddings to NULL) is the kill switch if the API terms ever change. |

**2. Personas — Apete + advocate + Mia.**
- **Apete (primary):** never sees Layer 1 (in code), Layer 2 (operator-only), or raw Layer 4 (embeddings). Sees Layer 3 only via "manage your data" surface (Phase 1+). Pass.
- **Advocate (Apete's brother):** sees the comparison report, which carries provenance per ADR-012 Rule 5.2. Layer-specific memory is not surfaced. Pass.
- **Mia (paid-tier hospitality):** multi-employer scenario. Layer 2 patterns scope per `(employer_id, document_type)` — Mia's two employers each get independent patterns. Layer 3 records "Mia has 2 employers" preference. Pass.

**3. Privacy / safety / APP.**
- **APP 1.** Privacy policy v1 (Phase 0 finish-line) discloses the layered memory: what's stored, where, who reads.
- **APP 3.** Collection purpose disclosed at upload: "we remember how your documents look so we get better at reading them."
- **APP 5.** Same as APP 3 — collection notification at the upload screen.
- **APP 6.** Memory used only for extraction quality. Never analytics, never model training (Anthropic API terms cover this).
- **APP 11.** RLS on Layer 2 (operator-only) + Layer 3 (own + operator); Layer 4 inherits document RLS. Service role writes; never plaintext logs.
- **R-004.** No employer-side surface. Layer 2 about employer X is invisible to employer X (operator-only, not employer-readable). Pass.
- **R-006.** Operator reads gated by support-runbook (Phase 1+). Pass with caveat.

**4. Adaptability — can layers be tuned independently?**
- Layer 1: prompt template version bump (Sprint A3 governs).
- Layer 2: confidence formula constants tunable in extraction-service code; no schema change.
- Layer 3: same as Layer 2.
- Layer 4: similarity thresholds (0.95 / 0.85 / 7 days) tunable in code.
- **Verdict:** four independent tuning surfaces. A pattern revision (changing the structure of a layer, not its constants) requires a new ADR per the same adaptability discipline as ADR-012 §13.

**5. Reversibility — can a layer be disabled without breaking the pipeline?**
- Layer 1 disable: not meaningful (system prompts are the foundation).
- Layer 2 disable: extraction service skips the SELECT; degraded extraction quality but pipeline continues.
- Layer 3 disable: same shape — skip SELECT; degraded but functional.
- Layer 4 disable: set all embeddings to NULL; short-circuit the similarity query; lose duplicate detection but classification + extraction continue.
- **All four layers are independently disabletable without code-path breakage.** The pipeline degrades gracefully; this is the kill-switch design ADR-013 reversibility committed to.

**5/5 cleared.** No blockers. Residuals: privacy policy v1 disclosure (Phase 0 finish-line, existing) + operator support runbook (Phase 1+, existing per R-006).

## What this document does NOT cover

- Migration 0011 SQL (Sprint A5).
- Extraction prompt templates that use these layers (Sprint A3).
- pgvector extension enable + vector column dimensionality (Sprint A3 picks model; Sprint A5 SQL enables extension and adds column).
- Specific embedding model choice (Sprint A3).
- Operator-facing read-redacted view (Phase 1+ per R-006).
- Worker-facing "manage your data" UI for Layer 3 (Phase 1+).

## When this document changes

- Confidence formula constants change → version bump (`layered-memory-v02.md`).
- A new layer is added (e.g., Layer 5 cross-employer aggregate patterns) → version bump.
- Privacy boundary shifts (e.g., Layer 2 becomes worker-readable) → new ADR + version bump.
- Layer 4 storage decision changes (e.g., move embeddings to dedicated table for sharding) → version bump.
- A pressure-test failure surfaces in production → append mitigation; version bump.
