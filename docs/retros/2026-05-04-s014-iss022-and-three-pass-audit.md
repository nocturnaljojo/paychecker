# Session 014 Retro — ISS-022 close + three-pass docs audit + structural foundation
Date: 2026-05-04 (work spanned into 2026-05-05 UTC)
Scope: PHASE-0 / harden + structural audit + foundation commit

## What Was Done

- ISS-022 LINK_DEGRADED retry guidance UI shipped (51b83f6)
- ISS-022 closed FIXED-with-known-followups; ISS-025/026/027/028 filed (d6d6c24)
- Three-pass audit: Claude Code QA Pass 1, Codex adversarial Pass 2 (38m, 7 probes), Claude Code source-of-truth Pass 3
- Audit findings durably promoted; ISS-029 through ISS-034 filed (7566b50)
- Canonical-authority headers applied to 5 disputed-truth files (this commit)
- CLAUDE.md session-start enforcement gate added (this commit)
- Retro convention resumed — first current LATEST.md in 2 days (this commit)

## Decisions Made

- Three-layer reconciliation architecture confirmed: existing *_facts (Layer 1) → new bucket-level calculations (Layer 2) → accumulating snapshot for delta-only comparison (Layer 3). Calculations live at bucket level, not at reconciliation layer.
- Architectural anchor verified: Kimball Accumulating Snapshot Fact Table (Ch 6) and Fowler Event Sourcing — both real sources, both applicable.
- Workflow G data contract is prerequisite to building any reconciliation engine (filed as ISS-032).
- Skills resurrection approached via CLAUDE.md gate tonight; full skill rewrite + hooks evaluation deferred to future session.
- Tonight's commit is foundation work — one-time scale, not a recurring pattern. Future hygiene: small chunks per session.

## What's Open

- ISS-029 through ISS-034 filed but not resolved
- CAL-006/007/008 candidates documented in audit M4; promotion to CALIBRATION-PRJ-backlog.md deferred
- workflows.md still not read (audit M6 finding)
- decisions.md (77 KB) split into individual ADRs — deferred to hygiene sprint
- STATE-PRJ-issues.md rotation rule defined but not implemented
- Hooks-based enforcement (vs current advisory CLAUDE.md gate) — future evaluation

## Lessons / Gotchas

- Skills designed at project init can decay invisibly. SKILL-PRJ-session-start.md was used twice (sessions 001-002), then never again over 9 days. Structural problem isn't lack of design — it's lack of enforcement gates.
- Multi-model review pattern (Claude Code + Codex + ChatGPT + DeepSeek) produced fabricated company citations (Deputy/Tanda/ASIC). CAL-006 candidate reinforced.
- "I designed this and forgot" pattern repeated 3 times in 24 hours: bucket schemas, Workflow G, session skills. Surfacing existing design at session start IS what the enforcement gate is meant to address.
- Anthropic docs: CLAUDE.md is advisory, not deterministic. Hooks are the real fix. Tonight's gate is a partial measure.

## Next Session

First action: read this retro + LATEST.md to confirm context.

Recommended: ISS-029 (calc-rules cl 19.7 verification) — ~45 min, highest-leverage HIGH-severity item, affects wage compliance integrity. Prompt drafted earlier in 2026-05-04 conversation.

Alternative: continue hygiene sprint in small chunks (decisions.md split, OR remaining authority headers, OR define rotation rules — pick ONE, not all).

Do NOT attempt foundation-scale work next session. Tonight was one-time.

## Commits this session

- 51b83f6 — harden(ui): surface LINK_DEGRADED retry guidance (ISS-022)
- d6d6c24 — chore(backlog): close ISS-022 FIXED-with-known-followups
- 7566b50 — chore(audit): file three-pass docs audit findings + 6 HIGH-severity ISS entries
- THIS COMMIT — chore(structure): foundation hygiene + s014 retro
