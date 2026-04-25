# SKILL-PRJ-audit-before-build

## Purpose
Read-only audit pattern. Look before adding. Catches duplication, contradiction, and "I already built this last week".

## Trigger phrases
- "audit this area"
- "what's already there"
- (auto) step 3 of `SKILL-PRJ-idea-to-execution.md`
- Before any non-trivial code addition

## Hard rule
THIS SKILL DOES NOT WRITE CODE. If the audit finishes and the user wants to proceed, the next step is a *plan*, not an edit.

## Steps
1. **Identify the surface.** Which folders, files, DB tables, or routes does the new work touch? Write the list.
2. **Glob + Grep.** Glob for filenames matching the topic. Grep for the key terms in code and in `docs/`.
3. **Open and read.** For every file in the result set, READ it (don't trust the filename).
4. **Map prior art.** For each finding, note: what it does, who uses it, when it was last touched (git log).
5. **Find contradictions.** Does the existing code already do this differently? Why? Read commits and retros.
6. **Privacy check.** Does the surface touch sensitive data? Cross-reference `REF-PRIVACY-baseline.md`.
7. **Report.** Output a structured audit report (template below). Hand it back to the user.

## Output template

```markdown
## Audit: {topic}

### Existing surface
- {file/table/route}: {one-line purpose}
- ...

### Overlap
- {idea} vs {existing}: {compatible | conflict | duplicate}

### Privacy / safety touchpoints
- {component} touches {data class} — {gating present? yes/no}

### Recommendation
- {extend existing X | replace X with Y | net-new in Z | redundant — drop the idea}
```

## Common pitfalls
- Auditing only file *names*, not contents. The name lies.
- Forgetting to read commit messages — the *why* often lives there.
- Treating the audit as the implementation. It is the *input* to the implementation.
- Auditing the obvious paths only — also check `docs/`, `.claude/`, and migration history.

## Why this exists
A 5-minute audit prevents a 2-hour duplication. Always cheaper than retroactive deletion.
