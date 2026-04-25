# SKILL-PRJ-retro

## Purpose
Write a session retro that the next session can read cold and pick up from.

## Trigger phrases
- "write the retro"
- "/retro"
- (auto) called from `SKILL-PRJ-session-end.md` step 7

## File naming
`docs/retros/YYYY-MM-DD-sNNN-{slug}.md`
- `YYYY-MM-DD` — calendar date the session started
- `sNNN` — zero-padded session number (s001, s002, …)
- `{slug}` — 2–4 word kebab-case topic (`apete-onboarding-flow`, `clerk-wired-up`, `mva000074-rates`)

## Steps
1. Find the next session number — check the highest `sNNN` in `docs/retros/` and add 1.
2. Write the retro using the template below.
3. Save to `docs/retros/YYYY-MM-DD-sNNN-{slug}.md`.
4. Update `docs/retros/LATEST.md` to a one-line pointer at the new file.

## Template

```markdown
# Session {NNN} Retro — {topic title}
# Date: YYYY-MM-DD
# Scope: {phase / area, e.g. PRJ-init, PHASE-0/onboarding, PHASE-2/stripe}

## What Was Done
{2–5 bullets — what shipped or moved}

## Decisions Made
{architectural / product decisions, with the why}

## What's Open
{loose threads, partial work, things deliberately left undone}

## Lessons / Gotchas
{add anything non-obvious to tasks/lessons.md AND mention here}

## Next Session
{Concrete first action for the next session — file path and step}
```

## Common pitfalls
- Listing every file touched. The diff is for that. The retro is for *intent and next move*.
- Vague "next session" entries ("continue the work") — useless to a cold start. Name the file and step.
- Skipping decisions — without "why", the next session repeats the debate.
- Writing the retro AFTER committing — write it before, so it can mention the commit hashes.
