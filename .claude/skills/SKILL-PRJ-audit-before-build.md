# SKILL-PRJ-audit-before-build

## Purpose
Read-only audit pattern. Look before adding. Catches duplication, contradiction, and "I already built this last week".

## Trigger phrases
- "audit this area"
- "what's already there"
- (auto) step 3 of `SKILL-PRJ-idea-to-execution.md`
- Before any non-trivial code addition
- **Before any UI/UX modification work that references a design-system mock**

## Hard rule
THIS SKILL DOES NOT WRITE CODE. If the audit finishes and the user wants to proceed, the next step is a *plan*, not an edit.

## Steps
1. **Identify the surface.** Which folders, files, DB tables, or routes does the new work touch? Write the list.
2. **Glob + Grep.** Glob for filenames matching the topic. Grep for the key terms in code and in `docs/`.
3. **Open and read.** For every file in the result set, READ it (don't trust the filename).
4. **Map prior art.** For each finding, note: what it does, who uses it, when it was last touched (`git log`).
5. **Find contradictions.** Does the existing code already do this differently? Why? Read commits and retros.
6. **Privacy check.** Does the surface touch sensitive data? Cross-reference `REF-PRIVACY-baseline.md`.
7. **Report.** Output a structured audit report (template below). Hand it back to the user.

## Audit pattern (8 rules)

The eight rules below are the operational discipline that make the audit produce decisions the user can act on, not a wall of observations. They are proven in `docs/retros/2026-04-26-s003h3-onboarding-and-consent.md` (s003 hour 5 — UI/UX divergence audit that filtered ~30 raw findings to 10 ship-now items, all shipped clean).

### 1. Parallel read, not serial

**Rule.** When auditing live code against a reference (mock, doc, prior commit), read both files in the **same parallel tool call** before forming any judgment.

**Why.** Serial reading lets the first file anchor analysis of the second — you find what the first taught you to look for, not what the second actually says. Parallel read forces honest comparison.

**Example.** s003 hour 5 — `Dashboard.tsx` and `YourData.jsx` were read in one parallel batch alongside `Components.jsx`, `Screens.jsx`, and `colors_and_type.css`. Eight Tier-1 divergences surfaced cleanly that a serial read would have buried under "well, the live one is OK".

### 2. Post-it / annotation comments are load-bearing

**Rule.** Mock files carry intent annotations (HTML post-it notes, JSX leading comments, file-header docs, README bullets). Surface every annotation explicitly, with one of three flags:
- ✅ respected by live code
- ⚠️ violated by live code
- ❓ unclear or stale

**Why.** Filenames lie, layouts paraphrase; annotations are the closest thing to "what the designer meant". Skipping them is exactly how the s003 hour 3 PLAN/mock drift happened — `onboarding.html` filename matched the PLAN's "build worker onboarding"; the post-its inside said "Orient, don't collect" and contradicted the PLAN. The post-its were right.

**Example.** Auditing `/onboarding` requires opening every post-it in `onboarding.html` and every leading comment in `Onboarding.jsx`, then grading each: "Orient, don't collect" → ✅ live respects; "I already know — let me in skips to home" → ⚠️ live violates by routing to consent screen (intentional per ADR-006; recommend mock comment update per Pattern 6).

### 3. Always check token drift

**Rule.** When the audit touches UI, byte-compare or line-compare every duplicated token file (e.g. `src/styles/tokens.css` vs `public/design-system/colors_and_type.css`). Report the result explicitly even when there is no drift.

**Why.** Token drift is silent — it shows up as off-by-one colors and slightly-wrong type sizes weeks after the fact, with no error message. Easier to detect at audit time than to chase later. **Silence on tokens is wrong; "✅ zero drift" is right** — saying nothing leaves future audits unsure whether you checked.

**Example.** s003 hour 5 confirmed both PayChecker token files (`src/styles/tokens.css` and `public/design-system/colors_and_type.css`) are byte-equivalent and the audit said so verbatim. The TOKEN SYNC NOTE comment in both files is the operational reason the duplication exists; the audit is the recurring check.

### 4. 4-tier prioritization (mandatory)

**Rule.** After listing every divergence, partition all of them into exactly four tiers. Be honest — most findings should land in Tier 3 or 4, not Tier 1.

- **TIER 1 — visible polish, ship now.** Spacing, sizing, color, typography that changes how the app *feels*. HIGH leverage, LOW risk. Single-session fix budget (~15–30 min total).
- **TIER 2 — missing affordances or intent violations.** Each one needs a **decision** before it can ship: fix-to-mock, or update-mock-to-match-shipped-intent? Cannot ship without that decision.
- **TIER 3 — behavior / interaction polish.** Hover states, transitions, micro-interactions. Real but not blocking. Bank for "while we're at it" later.
- **TIER 4 — phase-future deferred features dressed up as divergences.** DO NOT FIX as polish. These are scope-creep traps. Note them with a Tier 4 label and *explicitly defer*.

**Why.** Without the tier discipline the audit dumps 30 findings on the user and lets "while we're at it" creep happen. The discipline is the audit's most important output: it filters ~30 raw findings to ~10 ship-now items.

**Example.** s003 hour 5 surfaced ~30 divergences. Tier 1 partitioned to 10. The user approved Tier 1 only. `UnlockedSummary` card, bottom `TabBar`, rich bucket states, and bucket-detail flows all correctly stayed in Tier 4 instead of being shipped as "polish".

### 5. Cite file:line for every divergence

**Rule.** Every divergence in the report must reference both:
- Live file path + line number (or near-line range)
- Reference (mock / prior version / doc) file path + line number

**Why.** Vague findings ("doesn't look right", "header feels off") get rejected as a category and the audit loses leverage. Specific findings ship.

**Example.** "Dashboard.tsx:148-150 header reads 'Hi, {firstName}.' / YourData.jsx:230-235 mock title is 'What's in, what's missing.'" — user can decide in seconds. The version "the dashboard header should be more diagnostic" — user has to re-audit your audit.

### 6. Mock isn't always right

**Rule.** When live code is *better* than the mock — for security, accessibility, worker safety, or plain-language clarity — call it out as a "Code better than mock" finding and recommend updating the mock comment, **not** the code.

**Why.** Audits that always defer to the reference produce regressions where the live code was deliberately the more careful version. The reference should follow the deliberate decision, not undo it.

**Example.** s003 hour 5 — mock `index.html:67` wires Skip via `onSkipAll → 'yourdata'` (bypass consent); live `OnboardingFlow.tsx:32` deliberately routes Skip to step 6 for APP-6 + worker-safety reasons (per ADR-006, ADR-007). Recommendation in the audit: update the mock annotation, leave the code. The "Code better than mock" section in every audit must be present (even if "None") so this kind of finding has a permanent slot.

### 7. Explicit approval gates

**Rule.** Every audit ends with a hard stop: **zero code edits until the user has reviewed the divergence list, approved which tiers to fix, and made any Tier 2 decisions.**

**Why.** Without the gate, "audit" becomes "audit + immediate fix-everything", which is the failure mode this skill exists to prevent.

**Example.** s003 hour 5 audit closed with "DO NOT push. I review first." plus an explicit two-item list of Tier 2 decisions awaiting user input. The user replied with `APPROVED — Tier 1 ONLY` and the exact items to execute; nothing else moved.

### 8. Time-bracket each tier

**Rule.** Estimate fix time per tier so the user can scope their session:
- Tier 1 only: ~X min
- Tier 1 + Tier 2 (with decisions): ~Y min
- Tier 3 + 4: deferred (no time given — these aren't on tonight's table)

**Why.** Without budgets, "tonight's polish" creeps from 15 minutes to two hours. The user picks the budget; Claude doesn't.

**Example.** s003 hour 5 quoted "Tier 1 only ~15–20 min". User approved Tier 1; Tier 1 shipped in 4 commits, build-clean, well inside the bracket.

## Output template

The audit produces a structured report. Use this template — fill every section, including the ones that come back empty (those still need an explicit "None" / "✅ zero drift" / "no Code-better-than-mock findings"):

```markdown
## AUDIT — {topic} — {YYYY-MM-DD}

### Inventory (Step 0)
- **Live files in scope:** ...
- **Reference files (mock / prior code / docs):** ...
- **No-counterpart cases:** {live screens with no mock | mocks with no live equivalent | "none"}

### Per-area divergences
For each pair {live ↔ reference} produce:

#### {Screen / module / area name}
- **Layout:** {file:line live} ↔ {file:line ref} — {one-line gap}
- **Typography:** ...
- **Tokens:** ...
- **Spacing:** ...
- **Components:** ...
- **Copy / wording:** ...
- **Behavior / interaction:** ...
- **Missing-from-live:** ...
- **Missing-from-mock:** ...

(Repeat per area.)

### Annotation respect (Pattern 2)
- ✅ {annotation} — respected
- ⚠️ {annotation} — violated; {recommend: fix code | update annotation | needs decision}
- ❓ {annotation} — unclear or stale

### Token drift (Pattern 3 — UI audits only)
**Result:** {✅ zero drift | drift list with file:line refs}

### Code better than mock (Pattern 6)
- {area}: live is better because {reason} — recommend updating mock comment, not code
- (or "**None.**" — but say it explicitly)

### Prioritized divergence list (Pattern 4)

**TIER 1 — visible polish (~Z min)**
- T1-{N}: {file:line} — {change}
- ...

**TIER 2 — needs decision**
- T2-{N}: {item} — **decision needed:** {options}
- ...

**TIER 3 — polish bank (defer)**
- T3-{N}: {item}
- ...

**TIER 4 — Phase-future features (DO NOT FIX as polish)**
- T4-{N}: {item} — deferred to {phase}
- ...

### Time budgets (Pattern 8)
- Tier 1 only: ~{X} min
- Tier 1 + Tier 2 (with decisions): ~{Y} min
- Tier 3 + 4: deferred

### Approval gate (Pattern 7)

HARD STOP — zero code edits made.

Awaiting:
1. Tier approval (which tiers to fix tonight)
2. Tier 2 decisions: {list each item that needs a decision}
3. Specific item approvals if any Tier 1 item is contentious

DO NOT push. I review first.
```

## Common pitfalls

- **Auditing only file *names*, not contents.** The name lies. Open every file.
- **Forgetting to read commit messages.** The *why* often lives there. `git log -p {file}` for any file with a non-obvious shape.
- **Treating the audit as the implementation.** It is the *input* to the implementation. Edits come after the approval gate (Pattern 7), not during the audit.
- **Auditing only the obvious paths.** Also check `docs/`, `.claude/`, migration history, and the design system kit (`public/design-system/`).
- **Treating Tier 4 deferred features as polish gaps.** This is the most common scope-creep failure. If the live code lacks a feature because the feature hasn't been built yet (per `PLAN-PRJ-mvp-phases.md`), it is Tier 4, not Tier 1. Note it; defer it; do not "fix" it as polish.
- **Skipping the token drift check** (Pattern 3) on UI audits because "the tokens are probably fine". The whole point of the check is that drift is silent.
- **Reading files serially when comparing live vs mock** (Pattern 1) and finding only the divergences the first file primed you for.
- **Vague divergences without file:line refs** (Pattern 5) — these get rejected, slowing the next audit pass.

## Why this exists

A 5-minute audit prevents a 2-hour duplication. Always cheaper than retroactive deletion. The tier discipline (Pattern 4) compounds the saving — most "polish" lists are 70% scope-creep traps that the audit refuses to ship.
