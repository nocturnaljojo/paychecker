# SKILL-PRJ-pressure-test

## Purpose

Surface failure modes before they're built into deployed code. A 30-minute pressure test in a design doc is hours cheaper than retrofitting a privacy fix, an accessibility correction, or a tone change after a real worker has been confused or harmed.

This is the "what could go wrong" gate. It runs once per non-trivial feature, between architectural fit and the actual plan.

## When to invoke

- After step 4 (architectural fit) of `SKILL-PRJ-idea-to-execution.md`, before step 5 (privacy + safety check).
- For ANY feature touching: PII, financial calculation, worker safety, Privacy Act surfaces, FWO interactions, or copy that a worker reads at a moment of stress.
- For ANY feature that would change a default the personas (`docs/product/personas.md`) currently rely on.
- Skip for: trivial bug fixes, internal refactors, dependency bumps, and dev-only surfaces.

## Hard rule

**This skill produces a written record, not a vibe check.** Output goes into the session retro under a `## PRESSURE TEST` heading. Concerns that block ship are surfaced to the user with a recommended pause; concerns that are mitigated get logged in `docs/architecture/risks.md` so future-you finds them.

## The 5 prompts

Answer each in order, in writing. Do not skip ahead — prompt 1 surfaces the failure surface that prompt 4 audits.

### 1. Break this system

List 5 concrete ways the feature could fail. For each:

- What goes wrong (1–2 sentences).
- Who is harmed (worker / advocate / operator / employer / regulator).
- Blast radius (single worker / cohort / all workers / data integrity / regulatory).
- Mitigation (current architecture or new gate required).

Aim for variety — not five variations on "the network is slow". Include at least one privacy failure, one worker-safety failure, one regulatory framing failure, one calculation/data-integrity failure, and one operator-mistake failure.

### 2. Simulate 3 personas

Walk Apete, an advocate, and the future paid-tier worker through the feature in their words. For each:

- Where do they get **confused** (a label, a flow step, a default)?
- Where do they get **frustrated** (a tap-target, a wait, a blocked path)?
- Where do they get **scared** (an unexpected screen, a number that reads as accusation, a permission prompt)?

Use `docs/product/personas.md` as the source of truth. Do not write a generic "average user" walkthrough — that's the path back to advice-tool drift.

### 3. What would Apete misunderstand

Apete is the persona most exposed to the consequences of a feature reading wrong. Pick the 2 most plausible misreadings:

- A label or word he could read literally and miss the diagnostic register ("expected vs received" → "expected by who?").
- A behaviour he could assume the system has but it doesn't (auto-sort uploaded files, push-notify when a payslip arrives).
- A worry that hits him on this screen even if the feature isn't about that worry (employer can see this; immigration can see this).
- A pressure point — a screen that reads as "you must complete this now" when skipping is fine.
- A point of hesitation — a screen where he'll close the tab and not come back.

For each misreading, propose **two concrete wording or design changes** that defuse it without changing the feature's functional intent.

### 4. Privacy Act / safety pass

Walk the feature through:

- **APP 1.** Open and transparent — is this surface documented somewhere a worker can find it (privacy policy, in-app explainer, or settings)?
- **APP 3.** Collection is for a disclosed purpose — is each new piece of data tied to a stated reason the worker can read at collection time?
- **APP 5.** Notification of collection — does the worker see "we are now collecting X because Y" *at* collection, not buried in a policy?
- **APP 6.** Use or disclosure — is the data used only for the disclosed purpose? No analytics drift, no LLM context creep, no "while we're at it" extras.
- **APP 11.** Security — is the data encrypted at rest, scoped by RLS, never in plaintext logs, never on disk beyond the worker's session?
- **R-004 worker safety check.** Could this feature make the worker's PayChecker activity visible to the abusive-employer threat model? Push notifications, employer-side anything, anything that emails a third party, anything that puts the employer's name on a screen unprompted — all require pause.

A "fail" on any of these = stop. Either fix the design or escalate to the user with the specific bullet that failed.

### 5. Reversibility

If the feature ships and we want to roll it back tomorrow:

- Can the migration roll back without data loss?
- Can a worker correct a wrong fact captured by this feature, and is that correction tracked in the relevant `*_history` table?
- Is every state change auditable (who, what, when) via the existing audit-trail pattern, or does this feature need a new audit table?
- Are there any one-way doors (data normalised in a way we can't un-normalise; contracts signed; emails sent) that we're committing to before the worker has had a chance to use this for real?

If reversibility is tight, log a CONCERN. If it's a one-way door, escalate.

## Output format

Append a section to the session retro:

```markdown
## PRESSURE TEST — {feature name}

### 1. Risks surfaced
- {1-line risk}: {who harmed} | {blast radius} | {mitigation or "new gate needed"}
- ...

### 2. Persona walkthrough
- **Apete:** confused at X | frustrated at Y | scared at Z
- **Advocate:** confused at X | frustrated at Y | scared at Z
- **Paid-tier:** confused at X | frustrated at Y | scared at Z

### 3. Apete misreadings → wording changes
- {misreading} → change A | change B
- {misreading} → change A | change B

### 4. Privacy / safety
- APP 1 / 3 / 5 / 6 / 11: PASS or FAIL with notes
- R-004 worker-safety: PASS or FAIL with notes

### 5. Reversibility
- Migration: PASS / CONCERN / ONE-WAY DOOR
- Worker correction: PASS / CONCERN / ONE-WAY DOOR
- Audit trail: PASS / CONCERN / ONE-WAY DOOR
- Other one-way doors: list or NONE
```

## What to do with the findings

- **New risks surfaced.** Add to `docs/architecture/risks.md` (`R-NNN` format). One risk per row.
- **New architectural decision required.** Add an ADR to `docs/architecture/decisions.md` (`ADR-NNN`). The ADR captures the option chosen and why.
- **Concerns blocking ship.** Pause the feature. Surface to the user with the specific concern + the proposed mitigation. Do NOT proceed to step 5 of `SKILL-PRJ-idea-to-execution.md` until the concern is addressed or explicitly accepted.
- **Wording changes only.** Apply them to the plan before writing code. Pressure-test wording fixes shouldn't be a code-review surface — they're the design.
- **Routine PASS on everything.** Note it in the retro and move on. Don't fabricate concerns to feel thorough.

## Common pitfalls

- **Treating it as a checklist to skim.** The point is concrete answers in writing. "I considered worker safety" is not an answer; "the screen would show employer name above the fold, R-004 fail, will move to detail view" is.
- **Imagining the average user.** The personas are specific for a reason. Average-user walkthroughs miss exactly the failure modes the personas exist to catch.
- **Doing the pressure test after writing the code.** Once code exists, the pressure test becomes a code review — different scope, harder to incorporate, and you've already paid for the wrong thing.
- **Logging risks but not mitigating.** If a risk is surfaced and the answer is "we'll think about it later", that's fine — but it goes into `risks.md` so we actually find it later.

## Why this exists

Every feature that has hurt a real worker in any product was reasonable on a whiteboard. The whiteboard never had Apete on it. This skill puts him on it.
