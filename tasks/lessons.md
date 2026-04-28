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

### 2026-04-26 — s003 — `auth.jwt() ->> 'sub'` is not `auth.uid()`

`auth.uid()` returns the Supabase-Auth user id, which is `NULL` when
identity is provided by Clerk (sign-in goes through Clerk; Supabase
sees only the JWT). PayChecker's `REF-DB-schema.md` originally said
`worker_id = auth.uid()` (a Supabase-Auth-default reflex). Real
RLS policies must read `auth.jwt() ->> 'sub'`, the Clerk user id
that the Clerk JWT template puts into the `sub` claim.

Pattern: a `STABLE` SQL helper `public.current_worker_id()` resolves
the JWT sub to the local `workers.id`. Every downstream policy filters
on `worker_id = (SELECT public.current_worker_id())`. The `(SELECT ...)`
wrapping lets the planner cache the helper's result per statement.

Repeat this for any third-party-auth integration (Clerk, Auth0, custom
JWT issuer): the dereference is `auth.jwt()`, not `auth.uid()`.

### 2026-04-26 — s003h3 — Audit catches plan-vs-mock drift that file names hide

`PLAN-PRJ-mvp-phases.md` said "Build worker onboarding (Layer 1 facts
capture)". The design mock's filename — `onboarding.html` — matched.
But the mock *contents* (post-it notes verbatim: "Orient, don't collect.
No employer / classification / rate / deductions forms.") explicitly
contradicted the PLAN. If the audit had only checked filenames + table-
of-contents, it would have signed off; I'd have built a 3-step Layer 1
wizard, contradicting design intent and creating worker-safety risk
(asking PALM workers for award classification before orienting them).

The skill's pitfall ("auditing only file names, not contents") is real,
not theoretical. Future-self: open every file in the audit set. Read
the post-it notes / JSX comments / leading-paragraph notes — those are
load-bearing intent annotations, not decoration.

### 2026-04-26 — s003h3 — Worker-safety reasoning belongs in the architecture

"Don't ask a PALM worker for their award classification before orienting
them" reads as a UX preference unless you've seen the regulatory + power-
asymmetry framing in `REF-PRIVACY-baseline.md`. The design system encodes
the "orient, don't collect" rule via post-it annotations on the mock.

Future-self: when a design mock has narrative annotations alongside the
visual design (post-its, comments in JSX, leading paragraphs in HTML
mocks), treat them as load-bearing constraints — they exist because
someone foresaw a regression. Don't optimize them away in translation.

### 2026-04-29 — sprint-7-smoke — Smoke tests catch architectural mismatch

Sprint 7 shipped a manual fact-entry form for the Employment Contract bucket (commit `e949ce1`) — implementing ADR-012's 5-stage pattern faithfully. The smoke-test pause before declaring done caught the bigger problem: the form-first approach contradicted PayChecker's actual product philosophy. Workers upload documents; the app reads them; workers confirm. Manual entry is the *fallback*, not the primary action. Catching this at smoke test, not in production with Apete, prevented building Sprints 8 + 9 + 10 on top of a wrong assumption — the cost would have been three more wrong patterns to retrofit + Apete losing trust because forms made him do the work the app should do.

The fix-cycle: Sprint 7.1 captured the upload-first plan as a doc; Sprint A1 promoted it to ADR-013 + amended ADR-012; Sprints A2/A3/A4 designed storage / extraction / memory; Sprint A5 wrote Migration 0011. By end of day the architecture was coherent across concept → schema → trigger → service → memory.

Future-self: the smoke-test step is not a checkbox. It's the last gate before architectural decisions calcify in code. If the smoke test surfaces "this doesn't feel right" — even when build + lint + verifications pass — pause and re-audit the spec. The cost of pausing is one sprint; the cost of building three wrong sprints is a week.

### 2026-04-26 — s003 — `PERFORM` is PL/pgSQL-only; raw SQL needs `SELECT`

The first attempt at the RLS smoke-test SQL used
`PERFORM pg_temp.record(...);` at top level (between
`SET LOCAL ROLE authenticated;` and inserts). Postgres rejected it
with `syntax error at or near "PERFORM"`. `PERFORM` is a PL/pgSQL
keyword that throws away the result of a SELECT — only valid inside
`DO` blocks or function bodies.

Workaround: at top level, use `SELECT pg_temp.record(...);` (the void
return is discarded silently by the SQL executor). Inside `DO $$ ... $$`
blocks, `PERFORM` works as expected.

Future-self: when batch-scripting a multi-step SQL audit, watch for
this transition between top-level SQL and embedded PL/pgSQL.
