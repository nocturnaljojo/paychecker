# REF-STK-stack

## Purpose
Locked stack details. Single source of truth for tech, hosting region, version pins, deploy targets.

## Frontend
- **Framework:** React 18+ via Vite
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui (component primitives)
- **Design tokens:** sourced from existing `colors_and_type.css` at repo root — DO NOT redefine in tailwind config; import as CSS vars.
- **Hosting:** Vercel
- **Region:** Vercel default + `vercel.json` set to AU edge region where supported.

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
