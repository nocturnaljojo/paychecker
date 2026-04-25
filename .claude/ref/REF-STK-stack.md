# REF-STK-stack

## Purpose
Locked stack details. Single source of truth for tech, hosting region, version pins, deploy targets.

## Frontend (actual versions as of session 002, 2026-04-26)

| Dep | Pinned | Why |
|---|---|---|
| react / react-dom | ^18.3.1 | Vite 8 / React 19 require Node ≥20.19; we're on 20.17 (see INFRA-001) |
| vite | ^5.4.0 | Same engine reason as above |
| @vitejs/plugin-react | ^4.3.0 | matches Vite 5 |
| typescript | ~5.6.0 | matches `react-jsx`, no `erasableSyntaxOnly` |
| tailwindcss | ^3.4 | shadcn-style copy/paste assumes v3 utilities |
| postcss / autoprefixer | latest | Tailwind v3 build pipeline |
| tailwindcss-animate | ^1.0.7 | shadcn animation utilities |
| react-router-dom | ^6 | the v6 API; v7 may follow with React 19 |
| eslint | ^8.57.0 | ESLint 10 requires Node ≥20.19; matches React 18 era |
| @typescript-eslint/* | ^8.0.0 | TS 5.6 compatible |
| eslint-plugin-react-hooks | ^4.6.0 | React 18 era |
| @types/node | ^20 | matches our Node major |
| clsx | ^2.1 | shadcn cn() helper |
| tailwind-merge | ^2.5 | shadcn cn() helper |
| class-variance-authority | ^0.7 | shadcn variants |
| lucide-react | ^0.469 | icon library, last React 18 compat range |

- **Language:** TypeScript (strict mode, bundler resolution, jsx: react-jsx)
- **Styling:** Tailwind v3.4 + shadcn-style components (added by manual copy-paste, not the v4 CLI — see tasks/lessons.md s002 entry)
- **Design tokens:** `src/styles/tokens.css` (React bundle) ≡ `public/design-system/colors_and_type.css` (design-system reference). Both files start with the TOKEN SYNC NOTE — edit one → edit the other. Tailwind config maps utilities to `var(--pc-*)` so values never duplicate inside the build.
- **Hosting:** Vercel — `vercel.json` declares `framework: "vite"` with an SPA rewrite that excludes `/design-system/`, `/assets/`, `/favicon.ico`, `/robots.txt`.
- **Region:** Vercel default global edge for the React app; design-system files are static and served from the same edge.

### Path alias
`@/* → ./src/*` configured in both `tsconfig.json` and `vite.config.ts`.

### Folder structure (Phase 0)
```
src/
  components/{ui,forms,layout}/   ← UI primitives, composed forms, app shell
  features/{onboarding,shifts,payslips,comparisons,reports}/
  hooks/, lib/, pages/, types/, config/, styles/
public/
  design-system/                  ← preserved static reference (was at root in s001)
```

## Backend
- **Framework:** FastAPI (Python 3.12+)
- **Phase 0:** deferred — calcs run client-side or via Supabase RPC.
- **Phase 1+:** stood up on Fly.io (Sydney region — `syd`).

## Database
- **Service:** Supabase
- **Region:** ap-southeast-2 (Sydney)
- **Auth:** Clerk (NOT Supabase Auth) — JWT exchange for RLS.
- **Storage:** Supabase Storage, encrypted at rest, AU region.
- **Migrations:** SQL files in `supabase/migrations/NNNN_description.sql`. Applied via `supabase migration up`.
- **MCP:** verify Supabase MCP authenticated to PayChecker org before any DB work.

## Auth
- **Service:** Clerk
- **Session:** Clerk session token → Supabase JWT for RLS.
- **MFA:** required for admin role; optional for worker role.

## Caching / Queue
- **Service:** Upstash Redis (Phase 1+)
- **Use:** rate limiting, FWC research result cache, OCR job queue.

## LLM
- **Provider:** Anthropic Claude API
- **Models:** Sonnet for extraction, Opus for compliance review when invoked.
- **Path restriction:** extraction + classification + research. NEVER calculation. NEVER report-text generation that asserts facts.
- **Privacy config:** no-training-on-data flag set on the API key.

## Payments
- **Service:** Stripe (Phase 2+)
- **Currency:** AUD only at launch.
- **MCP:** verify Stripe MCP authenticated to PayChecker org before any billing work.
- **Webhooks:** signed; idempotency keys mandatory.

## Monitoring / Logs
- TBD Phase 1. Likely Sentry (errors) + Logflare or Axiom (events).
- Logs MUST NOT contain unredacted payslip / bank / super content.

## Deploy targets

| Surface | Target | Region | URL pattern |
|---|---|---|---|
| Design-system preview | Vercel (existing) | global edge | `paychecker.app` (or staging URL) |
| Worker PWA | Vercel | global edge | `app.paychecker.app` |
| Admin dashboard | Vercel | global edge | `admin.paychecker.app` |
| Backend API (Phase 1+) | Fly.io | syd | `api.paychecker.app` |
| Database | Supabase | ap-southeast-2 | (Supabase managed) |

## Version pins
- Pin major versions in `package.json` once Phase 0 scaffolds. Pin Python deps in `requirements.txt` Phase 1.
- Renovate / Dependabot configured to PR weekly.

## Why this exists
Stack drift across solo-founder sessions is the #1 cause of "wait, what was this on?" Read this; don't rediscover.
