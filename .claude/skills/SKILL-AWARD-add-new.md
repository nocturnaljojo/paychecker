# SKILL-AWARD-add-new

## Purpose
End-to-end process for adding support for a new Modern Award. Reproducible enough that adding award #2 takes a week, not a month.

## Trigger phrases
- "add MA00NNNN"
- "support {industry} workers"
- "new award"

## Hard rule
The first source of truth is the FWC published award document, not a third-party summary. Awards change — pin the date and version.

## Steps

### 1. Research (use `researcher` agent)
- Find the current consolidated MA00NNNN PDF on fwc.gov.au.
- Note the publication date, version, and any pending variations.
- Identify: classifications, base rates, allowances, OT rules, penalty rates, casual loading, junior rates, special clauses (annualised salaries, piece rates, etc.).
- Note enterprise agreements that commonly override this award (e.g. larger employers).

### 2. Diff against existing
- Read `.claude/ref/REF-AWARDS-list.md` — what awards do we already support?
- For each rule shape, compare: does the existing model handle this, or do we need a new fact field / new rule?
- Surface architectural changes in an idea-to-execution review BEFORE writing reference data.

### 3. Reference data
- Add the award to `.claude/ref/REF-AWARDS-list.md` with: code, title, FWC publish date, our support level (full / partial), gaps.
- Save full notes to `docs/research/awards-{maNNNN}-vNN.md`.
- Encode rates / allowances / clauses as structured data in the DB. Do not encode as code.
- Every row gets: `effective_from`, `effective_to`, `source_doc_url`, `extracted_by`, `confirmed_by`.
- **Allowances and classifications seed together per FWC variation order, never separately.** A variation that updates rates also updates allowance amounts effective the same date — partial seeds risk effective-date drift between `award_rates` and `award_allowances`. The seed migration treats the variation as one atomic unit: classifications, all-purpose allowances, additive allowances, penalty-modifier allowances all carry the same `effective_from` from the same FWC variation order (PR-NNNNNN).
- **Only seed firmly-sourced rows.** Any value flagged `[SOURCE NEEDED]` in the research note stays out of the seed. Partial coverage (`PARTIAL` status in `REF-AWARDS-list.md`) is honest; fake coverage is a worker-safety risk (R-005 — worker treats output as advice; bad data is worse than no data).

### 4. Tests
- Build worked-example tests from the FWC's own examples or union-published examples.
- At least 3 cases: standard week, week with OT, week with public holiday penalty.
- Tests live next to the rule data, not in a generic test file.

### 5. Comparison engine wiring
- Reuse the engine; do not branch by award. If the engine cannot handle the award without a special case, that is an architectural finding — escalate via idea-to-execution.

### 6. Worker test
- One real worker on this award runs ≥1 comparison and reviews the report.
- Document any drift between expected and computed in `STATE-PRJ-issues.md`.

### 7. Document
- Update `REF-AWARDS-list.md` to "supported".
- Tick the relevant phase task in `PLAN-PRJ-mvp-phases.md`.

## Common pitfalls
- Hand-typing rates from a screenshot. Always cite the FWC source URL and date.
- Branching the calc engine per award. The engine should be data-driven.
- Skipping junior rates / casual loading on the assumption "Apete is full adult casual". Future workers will hit it.
- Not refreshing on FWC variation cycles (typically 1 July annually). The `researcher` agent should run scheduled.

## Why this exists
Awards drift. If we don't pin source + date + version, we'll surface stale numbers to a worker who acts on them — and that's a worker-safety failure.
