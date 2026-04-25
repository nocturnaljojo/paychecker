# SKILL-PRJ-session-start

## Purpose
Orient at the beginning of every session in 3 minutes. Surface the right context without loading the whole repo.

## Trigger phrases
- "let's start"
- "session start"
- "what's the current state"
- (implicit) — first turn of any new conversation in this repo

## Steps
1. Read `CLAUDE.md` (project bible — non-negotiables, principles, registries).
2. Read `docs/retros/LATEST.md` (pointer file). Then read the retro it points to.
3. Read `.claude/STATE-PRJ-issues.md` — note any P0/P1.
4. Read `.claude/STATE-PRJ-improvements.md` — scan only HIGH/MED, ignore TRIVIAL.
5. Read `.claude/PLAN-PRJ-mvp-phases.md` — find the current phase + the next unchecked task.
6. Confirm to user: "Phase X, last session did Y, next task is Z. Proceed?"
7. Wait for user confirmation before starting work.

## Output format
A 4–6 line orientation message:
- Phase + session number
- What last session shipped (one line from the retro)
- Open P0/P1 issues, if any
- Proposed next action with file path
- Ask for confirmation OR redirect

## Common pitfalls
- Reading the whole `docs/retros/` history — only LATEST. Earlier retros are indexable, not loopable.
- Skipping the issues tracker — a P0 found yesterday should not be ignored today.
- Starting work before the user confirms the proposed next action.
- Confusing improvements (polish) with issues (broken). They live in different files for a reason.

## Example
```
Session 4 — Phase 0
Last session: shipped Clerk + Supabase wiring (s003).
Open issues: 1 P2 (date format on shift list).
Proposed next: build Layer 1 onboarding form per .claude/PLAN-PRJ-mvp-phases.md task 4.
OK to proceed?
```
