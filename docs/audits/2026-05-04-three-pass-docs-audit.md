# Three-pass audit: PayChecker doc drift (2026-05-04)

**Audit scope:** Three architecture docs (extraction-service-v01.md, document-intelligence-plan-v01.md, calc-rules-v01.md) + source-of-truth files (CLAUDE.md, STATE-PRJ-*.md, REF-*.md, src/types/db.ts, supabase/migrations/, .claude/INDEX.md, .claude/PLAN-PRJ-mvp-phases.md, .claude/CALIBRATION-PRJ-backlog.md, docs/retros/LATEST.md).

**Method:** Pass 1 (Claude Code QA audit, 5m 41s), Pass 2 (Codex adversarial review, 38m 6s, 7 probes), Pass 3 (Claude Code source-of-truth investigation, 5m 22s).

**Status:** Findings recorded. HIGH-severity items filed as ISS-029 through ISS-034 in .claude/STATE-PRJ-issues.md (this commit).

**Origin:** Three audit passes ran 2026-05-04 producing ~30 findings. None landed in any file as ISS-NNN or backlog entries until this commit. This is the structural failure mode Pass 3 itself diagnosed (Mechanism 6: audit-output orphaning). This commit is the corrective action.

---

## Background

### The three questions Jovi asked

1. Are we drifting?
2. Drifting from what? — what files are supposed to be source of truth?
3. Which docs should be updated as context grows, and is that actually happening?

### Why the audit was run

Sunday afternoon (2026-05-04) work sequence: ISS-022 closed cleanly → bucket-schema lightbulb (Jovi remembered designing canonical schemas 5 days ago that he had forgotten) → realization that audit findings were orphaning in conversation → decision to investigate drift systematically.

The audit was triggered by an observation: every build session produces new docs (retros, proposals, ADRs) but the foundational files don't get updated to point at them or absorb their findings.

---

## Methodology

### Pass 1 — Claude Code QA audit
Read three architecture docs in full. Audited cross-references, concept locations, sprint-vs-reality alignment, folder structure. Produced 11+ findings.

### Pass 2 — Codex adversarial review
Forwarded Pass 1 report to Codex via codex:codex-rescue (--fresh thread). 38 minutes, 7 probes:
- P1: Calc rules verbatim verification
- P2: risks.md actual content
- P3: REF-DB-schema.md drift size verification
- P4: M0.5-spec.md contradiction check
- P5: Sprint vocabulary divergence severity
- P6: Prompt skeleton readiness
- P7: Pass 1 Section 4 negatives verification
- P8: Pass 1 false positives
- P9: What else Pass 1 missed structurally
- P10: Folder structure recommendations sanity check

Codex caught 3 items Pass 1 missed (calc-rules cl 19.7 nonexistent, src/types/db.ts staleness, cross-document reconciliation IS designed in workflows.md).

### Pass 3 — Source-of-truth investigation
Inventoried every file driving session-to-session behavior or claiming canonical authority. Mapped per-file drift status. Diagnosed structural mechanisms. Produced inventory + drift map + 6-mechanism diagnosis.

---

## HIGH severity findings (action required)

### H1 — calc-rules-v01.md cites nonexistent award clause
- **Rule 9** cites cl 19.7. This clause does not exist in `docs/research/awards-ma000074-v02.md` (file ends at 19.5).
- **Rule 8** cites cl 20.4. The awards file §20.4 says: "A shiftworker who is required and works overtime must be paid overtime in accordance with clause 19." This is not what calc-rules claims.
- **Impact:** Calc engine would ship against incorrect FWC citations. Wage compliance risk.
- **Source:** Pass 2, Probe 1. Verified by opening both files.
- **Filed as:** ISS-029.

### H2 — src/types/db.ts stale by 9 migrations
- Current header: "Last generated: 2026-04-29 (Sprint B1, after migrations 0011 + 0012)."
- Missing migrations 0013–0021, including: `document_cases` table, `documents.case_id`, `extend_case_with_document` RPC, `payslip_facts` extraction columns.
- TypeScript compiles against missing types — affects runtime type safety.
- **Impact:** Type safety gap in shipped code. Higher impact than REF-DB-schema staleness because it affects compilation.
- **Source:** Pass 2, Probe 9. Codex caught this; Pass 1 missed it entirely (excluded from audit boundary).
- **Filed as:** ISS-030.

### H3 — REF-DB-schema.md stale by 10 migrations
- Status line claims "Phase 0 schema — APPLIED. Migrations 0001-0011 are live."
- Migrations 0012–0021 exist in `supabase/migrations/` but are not mentioned anywhere in REF-DB-schema.md.
- Missing: FK/RLS fixes (0012), `document_cases` table (0014), `classify_with_case` RPC (0016), soft delete (0018), policy fixes (0019/0020), deleted-case attachment guard (0021).
- File's own header: "Drift between this file and supabase/migrations/ is a P1 audit finding."
- **Impact:** Self-identified P1 violation. Reference doc unusable for schema understanding.
- **Source:** Pass 2, Probe 3.
- **Filed as:** ISS-031.

### H4 — M0.5-spec.md inconsistent with its own implemented migrations
- M0.5 says "schema MUST match what is here, or this spec gets revised first."
- Migration 0014 shows `worker_confirmed_label`, `missing_items`, and case confidence columns were **deferred**, but M0.5 still lists them as required.
- M0.5 uses case states `draft/suggested/confirmed/partial/complete`. Document-intelligence docs use `raw/classifying/classified/routed/extracting/extracted/reviewed/confirmed/disputed/archived` — different state machines for different entities, but M0.5 omits the document lifecycle entirely.
- M0.5 bucket list: Contract/Payslip/Bank/Super/Other. Extraction docs include Shift as a first-class bucket. Omission without explanation.
- **Impact:** "Binding contract" contradicts what was actually implemented. Confusion for future build sessions.
- **Source:** Pass 2, Probe 4. Pass 1 called this MEDIUM; Codex upgraded to HIGH.
- **Filed as:** Carried forward in ISS-031 references; consider separate ISS if M0.5 reconciliation work is scheduled.

### H5 — document_extractions table bypassed by api/extract.ts
- Architecture docs describe `document_extractions` as load-bearing for extraction storage.
- `api/extract.ts` writes directly to `payslip_facts` and does not use `document_extractions` at all.
- No ADR documents this architectural fork. Task log records "Path A chosen: extend the existing table" but this is a daily task note, not an ADR.
- **Impact:** Documentation claims one architecture; code implements another. Future extraction work (contract, super, bank) will be confused about which table to use.
- **Source:** Pass 1, Finding #1 (HIGH). Pass 2, Probe 8a (confirmed HIGH, not a false positive).
- **Filed as:** ISS-033.

### H6 — extract-payslip-v02 deployed with no matching .md doc
- `api/extract.ts` uses `EXTRACTOR_PROMPT_VERSION = 'extract-payslip-v02'`.
- No `extract-payslip-v02.md` exists in `docs/architecture/prompts/` (or anywhere else).
- The full v02 prompt body is inlined in `extract.ts` source comments only.
- BUILD-11 retro does not contain the recoverable prompt.
- **Impact:** Production prompt is undocumented. Cannot be reviewed, versioned, or audited without reading source code.
- **Source:** Pass 1, Finding #2 (HIGH). Pass 2, Probe 8b (confirmed HIGH, not a false positive).
- **Filed as:** ISS-034.

### H7 — Workflow G (reconciliation) data contract not designed
- `docs/product/workflows.md` describes Workflow G as "Run a comparison. Surface the gap with information-tool framing. Export a PDF."
- No data contract specifies: which fields fetched from which buckets; calculations at bucket level vs reconciliation level; time-period anchoring rules; partial-bucket handling.
- Pass 1 originally said cross-document VALUE reconciliation was NOT designed. Pass 2 corrected this — reconciliation IS in product docs (Workflow G), but the architectural layer underneath is undefined.
- **Impact:** Without a data contract, reconciliation layer can't be built. Each new bucket extraction (BUILD-13 contract, future shift/super/bank) ships without knowing which fields will be consumed by reconciliation.
- **Source:** Pass 2, Probe 7. Cross-references Kimball "Data Warehouse Toolkit" 3rd ed. Chapter 6 (Accumulating Snapshot Fact Table) and Martin Fowler "Event Sourcing" (martinfowler.com/eaaDev/EventSourcing.html) — both verified real this session.
- **Filed as:** ISS-032.

---

## MEDIUM severity findings

### M1 — Sprint vocabulary divergence (A/B/C/D/E vs M0.5-BUILD-NN)
- `document-intelligence-plan-v01.md` presents A→E as "Tomorrow's sprint sequence (estimate)."
- `.claude/PLAN-PRJ-mvp-phases.md` and actual shipped work use M0.5-BUILD-NN.
- No supersedence note in document-intelligence-plan-v01.md pointing to M0.5 as source of truth.
- **Impact:** Fresh reader opens plan doc, sees stale sprint sequence, acts on outdated direction.
- **Source:** Pass 2, Probe 5. Pass 1 called this MEDIUM; Codex upgraded to HIGH. Filed here as MEDIUM per severity rubric (doc confusion, not runtime risk).
- **Filed as:** Future hygiene window.

### M2 — INDEX.md migration table 10 entries behind
- `.claude/INDEX.md` migration table stops at 0011.
- Migrations 0012–0021 not listed.
- File's own header: "If you find yourself opening five files to find one fact, the index has gone stale — fix it."
- **Impact:** Retrieval failure. Cannot find which migration added `document_cases` without scanning files manually.
- **Source:** Pass 3 inventory + file verification.
- **Filed as:** Future hygiene window.

### M3 — PLAN-PRJ-mvp-phases.md M0.5 boxes unticked
- M0.5 task list still shows `[ ]` for items shipped in BUILD-01 through BUILD-12.
- Examples: Update classify.ts to accept array of document_ids, /upload page redesign, Case-card UI — all shipped.
- **Impact:** Progress tracking inaccurate. No single source of truth for what's done.
- **Source:** Pass 3, Step 2.
- **Filed as:** Future hygiene window.

### M4 — CALIBRATION-PRJ-backlog.md missing CAL-006/007/008
CAL-001 through CAL-005 present and marked APPLIED. Three new candidates surfaced this weekend not yet in the backlog file:

- **CAL-006 candidate:** Verify quantitative production claims at source — and verify the verifiability of the data source itself. Sharpened by Vercel log retention finding 2026-05-03 (Vercel only retains ~5h, so "zero traffic in 7d" claims sourced from log queries are retention artefacts not traffic claims). Surfaced via "47 successful extensions" fabrication caught in commit 4172211 body. Currently lives in user memory file (~/.claude/projects/.../memory/feedback_cal006_candidate.md) and ISS-023 closure note (passing mention) only.

- **CAL-007 candidate:** When adding a new value to a union type or state machine, trace every consumer of that type — don't rely on TypeScript exhaustiveness alone. Semantic consumers (allClassified, dedup guards, fallback gates) often don't use Record<>. Surfaced by ISS-022 Codex review (allClassified false-positive + retry blocked by content-hash dedup guard). Currently lives in commit body of d6d6c24 only.

- **CAL-008 candidate:** Review intensity should scale with severity × production exposure × MVP-criticality — not be applied uniformly. Surfaced by ISS-022 spiral observation: 3+ hours of ISS-018-grade discipline applied to P2 cosmetic UX on a dormant code path with zero verified production traffic. Currently lives in commit body of d6d6c24 (pattern note) and conversation only.

- **Impact:** Calibration insights orphaned. Next session won't see them. Same pattern as audit findings being orphaned.
- **Source:** Pass 3, Step 2. Verified by opening CALIBRATION-PRJ-backlog.md.
- **Filed as:** Future hygiene window — promotion to CALIBRATION-PRJ-backlog.md deferred per the audit's recommended sequencing.

### M5 — LATEST.md retro pointer 2 days stale
- `docs/retros/LATEST.md` points to `2026-05-03-s013-build11-smoke-verification.md`.
- No retro files exist for May 3 evening (ISS-022 work), May 4 (audit passes), or May 4 (this document).
- **Impact:** "Read this first" pointer is stale. Convention has lapsed.
- **Source:** Pass 3, Step 2.
- **Filed as:** Future hygiene window.

### M6 — REF-PRIVACY-baseline.md missing R-010/R-011 data processor boundaries
- `docs/architecture/risks.md` has R-010 (Anthropic data processor) and R-011 (Voyage AI data processor) filed.
- REF-PRIVACY-baseline.md (2026-04-26) does not mention either.
- `document-intelligence-plan-v01.md` incorrectly states "Document content never leaves Anthropic API + Supabase boundary" — contradicts R-011.
- **Impact:** Privacy baseline doc stale. Contradiction between plan doc and filed risk.
- **Source:** Pass 2, Probe 2.
- **Filed as:** Future hygiene window.

### M7 — Prompt skeletons not ship-ready
- Four prompt files at `docs/architecture/prompts/` (contract, super-statement, bank-deposit, shift) are skeletons.
- Each contains the line "Status: Skeleton (Sprint A3, 2026-04-29). Full prompt copy lands in Sprint B2."
- OUTPUT_SCHEMA delegates to extraction-service rather than carrying complete self-contained schema.
- **Impact:** Cannot execute BUILD-13 (or any further bucket extraction work) until prompts have full design pass. Tomorrow's work is design, not execution.
- **Source:** Pass 2, Probe 6.
- **Filed as:** Pre-requisite for BUILD-13 — flag in BUILD-13 plan when scheduled.

---

## LOW severity findings

### L1 — Naming collision: memory-stack-v1.md vs layered-memory-v01.md
Two files with similar names, different concepts. memory-stack-v1.md is Claude Code session file-loading discipline; layered-memory-v01.md is the extraction service 4-layer memory architecture. Both in docs/architecture/. No cross-reference between them. Risk of confusion in future sessions.
- **Source:** Pass 1, Finding #4 (MEDIUM, downgraded here).

### L2 — v1 vs v01 inconsistency across files
fact-model-v1.md and memory-stack-v1.md use -v1; everything else uses -v01 (11 files). No documented convention.
- **Source:** Pass 1, Finding #5.

### L3 — tasks/lessons.md stale by 7 days
Last touched 2026-04-28. Multiple lessons since (POL-014 SSL hangs, BUILD-11 silent failures, RLS WITH CHECK semantics, dedup-blocks-retry pattern) not recorded. Convention has decayed; learnings go to retros instead.
- **Source:** Pass 3, Step 2.

---

## Structural diagnosis (Pass 3)

**Bottom line:** The repo isn't lacking files. It's lacking a **promotion mechanism** — a defined path from "session insight" to "durable doc."

Direct quote from Pass 3: *"Insights surface in conversation, don't land in their canonical home, and aren't visible at next session start."*

### Evidence
- CAL-006/007/008 candidates: surfaced in conversation/commits, not in CALIBRATION-PRJ-backlog.md
- Pass 1/2/3 findings: all in conversation only, zero filed as issues until this commit
- Bucket-schema lightbulb (2026-05-04 morning): conversation only
- Files updated when forced by current task; files drift when they require remembering to update them

### Mechanisms operating (ranked by impact)
1. **No promotion path from session insight to durable doc** (primary)
2. **Self-described rules with no enforcement** — REF-DB-schema.md says "P1 if drifts," drifted for 7+ days; INDEX.md says "if you open 5 files to find one fact the index has gone stale," migration table is 10 behind
3. **Ambiguous source-of-truth designation** — multiple files claim canonical for same concept (3-layer fact model, bucket schemas, sprint sequence)
4. **Files exist without maintenance contract** — tasks/lessons.md, .claude/agents/* (4 files dormant 9 days)
5. **Size budget unenforced on growing files** — STATE-PRJ-issues.md is 83 KB, past navigability threshold
6. **Audit-output orphaning** — three full-session audits in 24 hours produced ~30 findings, all in conversation only

### What this commit addresses
This commit corrects Mechanism 6 for the three-pass audit specifically:
- Audit findings: filed durably as docs/audits/2026-05-04-three-pass-docs-audit.md
- HIGH-severity items: filed as ISS-029 through ISS-034 in STATE-PRJ-issues.md
- CAL-006/007/008 candidates: documented here in M4 with full descriptions; promotion to CALIBRATION-PRJ-backlog.md deferred to next hygiene session

This is a **single instance** of the promotion mechanism — not a systematic fix. Mechanism 1 (no promotion path) remains structurally unsolved. A general-purpose mechanism would require: defining canonical homes for each finding type, adding session-end promotion gates, and updating CLAUDE.md to fire those gates. That work is itself a future hygiene window candidate.

---

## What was not audited

The following were explicitly excluded or partially checked. None affect the validity of HIGH findings, but readers should know these gaps exist:

- `src/types/db.ts` — excluded from Pass 1 audit boundary; Codex caught it in Probe 9
- `docs/legal/privacy-policy-v1-draft.md` vs APP claims in extraction-service-v01.md — not audited
- Daily task logs in `tasks/` for architectural contradictions — not audited beyond verifying tasks/lessons.md staleness
- `.claude/agents/` (4 files) — exist but not invoked in 9 days; not audited for drift against current workflow
- `STATE-PRJ-improvements.md` (44 KB) — not read in detail; possibly contains overlapping findings
- Full verification of every REF file beyond size + last-modified + cross-references
- `.claude/skills/` (11 files) — touched as "aligned by inertia" but content not deeply verified
- Pass 3's own claims that "no fabricated findings" — Pass 3 cannot verify its own claims; this audit file inherits that limitation

---

## Recommendations (NOT part of audit findings)

The following are proposed actions, distinct from the findings above. Prioritization is opinion-shaped and should be re-evaluated against current build priorities.

### Tier 1 — Before next build session
1. Resolve ISS-029 (calc-rules clause citations) — wage compliance integrity
2. Resolve ISS-030 (src/types/db.ts) — TypeScript compilation safety
3. Read `docs/product/workflows.md` (M6 finding) before designing reconciliation

### Tier 2 — Before reconciliation engine work
4. Resolve ISS-031 (REF-DB-schema.md) — reference doc accuracy
5. Resolve ISS-032 (Workflow G data contract) — reconciliation prerequisite
6. Add supersedence note to document-intelligence-plan-v01.md pointing to M0.5-BUILD-NN (M1)

### Tier 3 — Hygiene window
7. File CAL-006/007/008 in CALIBRATION-PRJ-backlog.md
8. Update INDEX.md migration table (M2)
9. Tick M0.5 boxes in PLAN-PRJ-mvp-phases.md (M3)
10. Update LATEST.md retro pointer (M5) + write retros for May 3 evening / May 4
11. Resolve M6 (REF-PRIVACY R-010/R-011)
12. Resolve ISS-033 (document_extractions architectural fork ADR)
13. Resolve ISS-034 (extract-payslip-v02 prompt doc)
14. Decide on naming convention v1 vs v01 (L2)
15. Decide tasks/lessons.md fate (revive convention or deprecate file) (L3)

### Tier 4 — Structural (highest leverage, hardest to schedule)
16. Design and apply a general-purpose promotion mechanism (Mechanism 1) — until this exists, every new audit will orphan the same way

---

## Verification methodology

- All HIGH findings were verified by opening actual files at least once during Pass 1, Pass 2, or Pass 3 — not relying on summaries alone
- Pass 2 (Codex) caught three items Pass 1 missed: H1 (calc citations broken), H2 (db.ts stale), H7 (reconciliation exists in product docs)
- Pass 3 verified source-of-truth inventory and drift status per file
- External pattern citations (Kimball, Fowler) verified via direct URL/PDF read during this session before being referenced in H7

### Known limitations
- DeepSeek's earlier research in this conversation cited specific company examples (Deputy, Tanda, ASIC RG-78, Supabase/Fly blog) that have not been independently verified; those references are NOT included in this audit file
- Pass 1 marked some cross-references as "OK" without opening the source files (caught by Codex Pass 2 Probe 1 — calc-rules cl 19.7)
- This audit file was structured by Claude in conversation; readers should not treat the structure itself as objective audit output

**Audit completed:** 2026-05-04
**Next review recommended:** After Tier 1 actions complete, or before Phase 1 ship — whichever comes first.
