# SKILL-PRJ-session-end

## Purpose
Wrap a session cleanly so the next session can resume cold without context loss.

## Trigger phrases
- "let's wrap up"
- "session end"
- "done for today"
- "/session-end"

## Steps
1. Run `git status` and `git diff --stat` to confirm what changed this session.
2. Group changes into logical commits (feature / docs / fix / chore — never one giant commit).
3. For each commit, run a `SKILL-PRJ-audit-before-build.md` pass on what's about to be added — does it duplicate anything? If yes, stop.
4. Update `.claude/PLAN-PRJ-mvp-phases.md` — tick any tasks completed this session.
5. Update `.claude/STATE-PRJ-issues.md` if new bugs were found. Update `STATE-PRJ-improvements.md` if polish was deferred.
6. Add a `tasks/lessons.md` entry if anything tripped you up that future-you would forget.
7. Invoke `SKILL-PRJ-retro.md` to write the session retro.
8. Update `docs/retros/LATEST.md` to point at the new retro.
9. Make commits. DO NOT push unless user explicitly asks.
10. Final summary: lines changed, files touched, retro path, next-session first action.

## Output format
End-of-session report:
- N commits made (titles)
- Files touched: M
- Retro: `docs/retros/{path}`
- Next session opens with: {one concrete action}

## Common pitfalls
- Pushing without explicit user permission.
- Skipping the retro because "the diff is the retro" — the diff is *what*, the retro is *why* and *what's next*.
- Lumping unrelated changes into one commit — destroys git blame value.
- Forgetting to update `LATEST.md` (then the next session can't orient).
- Marking phase tasks complete when only partially done.
