# tasks/lessons.md — PayChecker
# Non-obvious gotchas learned across sessions.
# Add an entry any time something trips you up that future-you would forget.
# Each lesson is a one-paragraph nugget. Surprise + workaround = the entry.

## Format
```
### YYYY-MM-DD — sNNN — short title
{1–3 sentences. What surprised you, and what you do now.}
```

---

### 2026-04-26 — s002 — Vite scaffold defaults outpaced plan

`npm create vite@latest` returns React 19 + Vite 8 + TS 6 by default
(as of Apr 2026). These require Node ≥20.19; current is 20.17. We
pinned to React 18 + Vite 5 + TS 5.6 to match plan and current Node.

Future-self: when scaffolding any new SaaS, always check `npm create`
output before npm install. Don't trust template defaults to match
your plan. Equivalent gotchas are likely with `npm create next-app`,
`create-svelte`, etc.

Concrete checks for next time:
- Read the scaffolded `package.json` BEFORE `npm install`
- Note the engine warnings; treat EBADENGINE as a real signal not a hint
- If the scaffold has assets/, demo css, demo svgs you don't want, write
  fresh App.tsx / index.css / index.html rather than reconciling with
  scaffolder churn

For PayChecker specifically: deferred React 19 / Vite 8 / TS 6 / Node
bump as INFRA-001 in `.claude/STATE-PRJ-improvements.md` — likely
Phase 1 alongside other infrastructure upgrades.
