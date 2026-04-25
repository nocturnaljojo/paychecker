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

### 2026-04-26 — s002 — shadcn CLI now requires Tailwind v4

`npx shadcn@latest init` (v4.5.0) writes a Tailwind v4 config: `oklch()`
colors, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`,
`@fontsource-variable/geist`, `@base-ui/react` (replacing Radix), and
`@apply border-border outline-ring/50` utilities — none of which work
on Tailwind v3.4. The legacy `npx shadcn-ui@0.9.5 init` now also redirects
to `shadcn@latest` with a deprecation notice — the legacy CLI is gone.

Workaround for Phase 0: skip the CLI, install runtime deps directly
(`clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react@^0.469`,
`tailwindcss-animate@^1.0.7`), write `components.json` and
`src/lib/utils.ts` (the standard `cn()` helper) by hand. Future shadcn
components are sourced by copying their JSX from the docs and adapting
the imports — they work fine with Tailwind v3 + Radix + React 18 because
that's what shadcn was *originally* built on.

When INFRA-001 ships, this workaround can be removed: `shadcn@latest`
becomes the canonical add path again. Until then, prefer manual copy-paste
over `shadcn add` (the latter targets Tailwind v4 patterns).

### 2026-04-26 — s002 — Clerk env-var: prefix mismatch + secret key placement

Two related gotchas hit in one paste:

1. Clerk docs default to `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` because
   Next.js is their flagship. Vite uses `VITE_*` prefix. Always rewrite
   third-party env var examples to match your bundler. Common bundler
   prefixes: Next.js `NEXT_PUBLIC_*`, Vite `VITE_*`, CRA `REACT_APP_*`,
   SvelteKit `PUBLIC_*`.

2. Clerk secret keys (`sk_test_*`, `sk_live_*`) NEVER belong in
   `.env.local` of a Vite project. Vite bundles every `VITE_*` var into
   client JS at build time, so if a future dev renames the secret
   var "to make it work", it leaks into deployed JavaScript. Secret
   keys go in: server-side env (Fly.io / Vercel server), password
   manager during development, never in client-side env files.
   Phase 0 has no backend = secret key has no home in this project yet.

Operational rule baked in: `.env.local.example` documents what NOT to
put in the file (commented at the bottom of the example). Future-self
reading the example will see the secret-key warning before they paste.
