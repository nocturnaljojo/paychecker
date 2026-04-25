# Session 002 Retro — Phase 0 Scaffold Hour 1
# Date: 2026-04-26
# Scope: PHASE-0 / scaffold

## What Was Done

Hour 1 of Phase 0 — built the operational React app at root, preserved the static design system as a sibling, wired everything to the design tokens, and verified build + preview locally. 9 commits this session.

Concretely:

1. **Moved design-system files** from repo root to `public/design-system/` via `git mv` (history preserved, all renames at 100% similarity except the two that were edited). Vite copies the folder to `dist/design-system/` at build → Vercel serves at `/design-system/` with no redirects.
2. **Scaffolded React + Vite + TypeScript** at root via a temp-dir scaffold (avoids `--force` clobbering our existing `README.md` / `.gitignore`). The latest `npm create vite@latest` defaults to React 19 + Vite 8 + TS 6, which require Node ≥20.19 (we're on 20.17) — pinned to React 18.3 + Vite 5.4 + TS 5.6 instead. The deferred upgrade is captured as INFRA-001 in `STATE-PRJ-improvements.md`.
3. **Added Tailwind v3.4** + PostCSS + Autoprefixer. `src/styles/tokens.css` duplicates `public/design-system/colors_and_type.css` (with the TOKEN SYNC NOTE header in both files). Tailwind config maps `theme.extend.colors / fontSize / borderRadius / boxShadow` to `var(--pc-*)` — values never duplicate inside the build, only the file itself.
4. **Initialised shadcn/ui base manually.** The `shadcn@latest` CLI (4.5.0) writes Tailwind v4 patterns (`oklch()` colors, `@import "tw-animate-css"`, `@base-ui/react`, `@apply border-border`) — incompatible with our v3 stack. The legacy `shadcn-ui@0.9.5` CLI now also redirects to `shadcn@latest`. Workaround: skipped the CLI, installed the runtime deps directly (`clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react@^0.469`, `tailwindcss-animate@^1.0.7`), wrote `components.json` and `src/lib/utils.ts` (the standard `cn()` helper) by hand. Future shadcn components are sourced by manual copy-paste from the docs.
5. **Folder hierarchy** — `src/{components/{ui,forms,layout},features/{onboarding,shifts,payslips,comparisons,reports},hooks,pages,types,config,lib,styles}/` with `.gitkeep` placeholders.
6. **Routing** — `react-router-dom@^6` with three placeholder pages (`Landing`, `Onboarding`, `Dashboard`), wired through `BrowserRouter` in `App.tsx`, all using design tokens via Tailwind utilities (`bg-pc-bg`, `text-pc-display`, `rounded-pc-card`, `shadow-pc-card`).
7. **Vercel config** — `framework: "vite"`, SPA rewrite that excludes `/design-system/`, `/assets/`, `/favicon.ico`, `/robots.txt` so static files remain reachable.
8. **Local verify** — `npm run build` clean (37 modules, ~1s, ~10kB CSS, ~166kB JS gzipped to 54kB). `npm run dev` serves on `localhost:5173`. `npm run preview` confirms production behaviour: `/design-system/` returns the 3170-byte landing (vs `/` which returns the 395-byte React app).

Updated docs in the same chunk: `CLAUDE.md` "Existing Repo Note" → "Repo layout"; `.claude/INDEX.md` design-system section; `DESIGN-SYSTEM.md` "## Index"; `REF-STK-stack.md` actual pinned versions; `PLAN-PRJ-mvp-phases.md` ticked the React/Vite + shadcn base tasks.

## Decisions Made

- **Design system to `public/design-system/`, not root `/design-system/`.** Standard Vite path; copied to `dist/` automatically; Vercel serves it without `vercel.json` gymnastics. Confirmed by user before move.
- **React 18 + Vite 5 + TS 5.6 + ESLint 8, deliberately.** Bleeding-edge stack (React 19 / Vite 8 / TS 6 / ESLint 10) requires Node ≥20.19 — we're on 20.17. Phase 0 is meant to be uncontroversial proven scaffolding; the upgrade is bundled as INFRA-001 for a Phase 1 dependency-upgrade sprint. Recorded the gotcha in `tasks/lessons.md`.
- **Tokens duplicated, not imported.** `src/styles/tokens.css` is a copy of `public/design-system/colors_and_type.css` — both have a TOKEN SYNC NOTE header. Hermetic React bundle (no runtime fetch of a sibling static path), at the cost of "edit two files instead of one". Accepted that trade-off because it's the only way the React build is self-contained today; Phase 1 will likely extract a shared package.
- **Skipped the shadcn CLI; manual base setup.** `shadcn@latest` 4.5 emits Tailwind v4 patterns. `shadcn-ui@0.9.5` legacy CLI now also redirects. Until INFRA-001, manual copy-paste is the canonical add path. Components when added live under `src/components/ui/` and follow shadcn's docs but with `var(--pc-*)` tokens, not the shadcn slate/oklch defaults.
- **SPA fallback excludes `/design-system/`.** Without the exclusion the `/design-system/` URL would land on the React app's 404 (or the landing page) instead of the design-system landing. Tested via `npm run preview`.

## What's Open

- **No Clerk auth** — Hour 2 (per prompt). Not in this session.
- **No Supabase** — Hour 3. Not in this session.
- **Design system in dev mode is a Vite SPA-fallback quirk** — visiting `localhost:5173/design-system/` serves the React app, not the design-system landing. `localhost:5173/design-system/index.html` works. Production via `npm run preview` and Vercel both serve `/design-system/` correctly. Not an issue worth filing — known Vite limitation.
- **No tests / lint config exercised yet.** ESLint config exists; nothing in `src/` triggers it. Phase 0 first feature work will exercise it.
- **No favicon / robots.txt.** Not adding placeholder content per the "no features beyond placeholders" rule. Will add when there's actual branding work.
- **Push not done.** As per prompt, awaiting review before push.

## Lessons / Gotchas

Two added to `tasks/lessons.md` in s002:

1. **Vite scaffold defaults outpaced plan.** `npm create vite@latest` returns React 19 + Vite 8 + TS 6 by default. Future scaffolds must read `package.json` BEFORE `npm install` rather than trust template defaults.
2. **shadcn CLI now requires Tailwind v4.** Both `shadcn@latest` and the legacy `shadcn-ui@0.9.5` write v4 patterns. Manual copy-paste is the canonical add path on Tailwind v3 + React 18.

## Next Session

**Hour 2 — Clerk auth (test mode).** Concrete first action:

1. Run `SKILL-PRJ-session-start.md` to orient — read `CLAUDE.md`, `docs/retros/LATEST.md` (this file), `STATE-PRJ-issues.md`, then the next unchecked Phase 0 task in `PLAN-PRJ-mvp-phases.md` (which is now "Set up Clerk auth (test mode)").
2. Verify Clerk MCP / dashboard access on the PayChecker account.
3. `npm install @clerk/clerk-react` — confirm React 18 compat at install time.
4. Wire `<ClerkProvider>` in `main.tsx` with the publishable key from `.env.local`.
5. Add `useAuth`-gated routes to the existing react-router setup; add a `<SignedIn>` / `<SignedOut>` split on the Landing page.

Hour 3 budget: Supabase project (Sydney region) + types + RLS-ready scaffolding.

LATEST.md updated → points at this retro.

---

# Hour 2 — Clerk Auth

## What Was Done

Phase 0 task "Set up Clerk auth (test mode)" — completed end-to-end. 7 commits.

1. Installed `@clerk/clerk-react@^5.61` (React 18 compat verified at install).
2. Created `.env.local.example` documenting the one Phase 0 env var (`VITE_CLERK_PUBLISHABLE_KEY`) plus a forbidden-section warning that secret keys must never live in this file.
3. Updated README — Status, Repo layout, Setup sections all brought up to date with the post-Hour-1 reality (React app at root, design system under `public/design-system/`); Setup ships real Phase 0 dev instructions including the Clerk dev-key sourcing step.
4. `src/config/clerk.ts` — single load-time validator: throws if `VITE_CLERK_PUBLISHABLE_KEY` is missing, throws if a value starting with `sk_` is pasted into it (catches the foot-gun where the secret ends up bundled into client JS).
5. `src/main.tsx` wraps `<App />` in `<ClerkProvider>`.
6. `src/pages/SignIn.tsx` + `src/pages/SignUp.tsx` — wrap Clerk's hosted UI components, with `routing="path"` and `forceRedirectUrl` set to `/dashboard` and `/onboarding` respectively.
7. `src/components/layout/ProtectedRoute.tsx` — guards `/dashboard`; signed-out users redirect to `/sign-in` with the original location stashed in nav state for a future post-signin redirect.
8. `src/pages/Landing.tsx` — branches on `<SignedIn>/<SignedOut>`. Signed-out shows "Create account" + "Sign in"; signed-in shows "Go to dashboard" + "Continue onboarding" + `<UserButton afterSignOutUrl="/" />`.
9. `src/pages/Onboarding.tsx` — uses `useUser()` to render "Welcome, {firstName}." with isLoaded gate (no flash of "Welcome, undefined.").

Bundle: 251 kB JS (76 kB gzipped) — Clerk SDK adds ~78 kB, acceptable for Phase 0.

## Verified end-to-end (manual, 7/7 PASS)

1. Landing signed-out — Create account + Sign in cards rendered.
2. Sign-up flow — Clerk hosted UI rendered, account created.
3. Post-signup redirect — landed on `/onboarding`.
4. Welcome message — "Welcome, Jovilisi." (firstName captured from Clerk signup form).
5. Landing signed-in — UserButton avatar appeared, cards swapped to "Go to dashboard" + "Continue onboarding".
6. Sign-out via UserButton menu — returned to default state.
7. `/dashboard` while signed in — protected route rendered the placeholder.

## Decisions Made

- **`forceRedirectUrl` not `afterSignInUrl`/`afterSignUpUrl`.** Clerk renamed these; v5 prefers `forceRedirectUrl`. Locked to that naming.
- **`routing="path"` not hash routing.** Clerk's internal sub-flows (factor-one, factor-two, password reset) navigate via React Router rather than hash — cleaner URLs, fewer collisions with our SPA fallback.
- **Validator throws on `sk_` prefix.** Concrete safeguard against the very gotcha that hit us this morning. If a future paste lands the secret key in `VITE_CLERK_PUBLISHABLE_KEY`, the app fails to start with a specific error rather than silently bundling it.
- **`.env.local.example` documents the no-secret-keys rule.** The warning sits where the next paste happens, not in a separate doc.
- **Phase 0 ships Clerk's default UI styling.** No theming customisation. Worker-facing polish is a Phase 0 polish task, not a scaffolding task.

## What's Open

- **DEV-001 — `/design-system/` blank in `npm run dev`.** Logged in `STATE-PRJ-improvements.md`. Works in `npm run preview` and Vercel production (verified Hour 1). Doesn't block Phase 0.
- **No backend, no JWT verification.** Clerk session is client-only until Phase 1 backend stands up. Phase 1 introduces a Fly.io API that validates Clerk JWTs server-side via the secret key (which goes to Fly.io secrets, not this repo).
- **No password reset / MFA / social-login customisation.** Clerk defaults are fine for Phase 0. Real users (Apete) will start with email + password; PALM workers' multilingual concerns are a Phase 1 conversation.
- **INFRA-002 (Vercel deployment protection) and INFRA-003 (password manager) logged.** INFRA-002 unblocks production access for real workers; INFRA-003 is the prerequisite for safely holding Phase 1 secrets.

## Lessons / Gotchas

Third entry added to `tasks/lessons.md`:

3. **Clerk env-var: prefix mismatch + secret key placement.** Clerk docs default to `NEXT_PUBLIC_*` (Next.js); Vite uses `VITE_*`. Always rewrite third-party env-var examples to match the bundler. AND: secret keys (`sk_*`) NEVER belong in a Vite project's `.env.local` — Vite bundles `VITE_*` vars into client JS, so a future rename leaks the secret. Phase 0 has no backend = the secret has no home in this project yet.

## Issues Closed This Hour

- **SEC-001 — Clerk dev secret key briefly exposed in chat (FIXED).** Rotated within ~10 minutes; new key never left the dashboard; `.env.local` cleaned of both wrong-prefix var name and secret; pk_-only validator added; lesson logged. No production impact (test mode, no real users, no commit reached git). Full closure detail in `.claude/STATE-PRJ-issues.md`.

## Next Session

**Hour 3 — Supabase project (Sydney) + DB schema.** Concrete first action:

1. Verify Supabase MCP authenticated to PayChecker org.
2. Create new Supabase project in `ap-southeast-2` (Sydney).
3. Apply the Phase 0 schema sketched in `.claude/ref/REF-DB-schema.md` as `supabase/migrations/0001_phase0_initial.sql`. RLS policies plus `*_history` triggers per `REF-FACT-model.md` and the calc-time read pattern in `docs/architecture/confirmation-flow.md`.
4. Wire Clerk JWT → Supabase auth on the client (Clerk template + Supabase client init using the JWT).
5. Generate TypeScript types from the Supabase schema (`supabase gen types typescript`) into `src/types/db.ts`.

Time check: Hour 2 closed at ~10:15am Canberra, inside the 10:30 hard stop.

LATEST.md still points at this retro (Hour 2 appended in place — same session, same retro file).
