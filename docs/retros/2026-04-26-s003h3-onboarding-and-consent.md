# Session 003 Retro — Hour 3 — Educational onboarding + consent capture
# Date: 2026-04-26
# Scope: PHASE-0 / Workflow A (Onboarding) + Workflow Z ("Your data" home stub)

## What Was Done

Built the 6-screen educational onboarding flow per the design mock, an immutable consent record table with full APP-1/APP-6 audit shape, the "Your data" bucket-stub home screen at `/dashboard`, a privacy-policy v1 placeholder route, and moved the Phase-0 smoke-test upload UI to a dev-only `/debug` route. The drift between PLAN-PRJ-mvp-phases.md and the design mock — surfaced by the pre-build audit — was reconciled in PLAN.

Concretely:

1. **Audit surfaced a load-bearing drift.** `PLAN-PRJ-mvp-phases.md` said "Build worker onboarding (Layer 1 facts capture)". `docs/product/workflows.md` said the same. But `public/design-system/.../onboarding.html` and `Onboarding.jsx` (post-it notes explicitly: "Orient, don't collect. No employer / classification / rate / deductions forms.") describe a 6-screen educational flow that captures only name + optional country/language + affirmative consent. Built off the mock, updated PLAN to match.

2. **Migration `0004_onboarding_workers_and_consent`** — applied. Adds `workers.country text` (nullable), `workers.preferred_language text NOT NULL DEFAULT 'en'`, and a new `consent_records` table (id, worker_id FK, privacy_policy_version, consented_at, user_agent, ip_address inet). Per-worker RLS via `current_worker_id()`; INSERT-only by user-role policy; `reject_consent_mutation()` trigger blocks any UPDATE/DELETE even from service role. Supabase advisors clean (zero lints).

3. **Six onboarding screens.** Translated `Onboarding.jsx` from inline-styled JSX to Tailwind + design tokens, one file per step under `src/features/onboarding/steps/`. Shared shell (`Shell.tsx`) provides the sticky-top progress bar, back/skip header, body wrapper, and footer; reusable `IconTile` + `InfoCard` primitives. Icons from `lucide-react` (already installed). New `src/components/ui/Button.tsx` with primary/secondary/tertiary variants and `block` prop. Skip on screens 1–5 jumps straight to screen 6 (consent never bypassed).

4. **Consent persistence.** `src/features/onboarding/complete.ts` exports `completeOnboarding(supabase, clerkUserId, formData)` — calls `ensureWorker`, writes `display_name`/`country`/`preferred_language`, then inserts the immutable `consent_records` row with `privacy_policy_version = 'v1'` (pinned in `src/config/privacy.ts`) and `navigator.userAgent`. `hasCompletedOnboarding(supabase)` short-circuits returning users via `count: 'exact', head: true`. `/onboarding` checks consent on mount and redirects to `/dashboard` when present.

5. **"Your data" home at `/dashboard`.** Replaced the placeholder. Five worker-facing buckets per `YourData.jsx` (Employment contract / Payslips / Shifts / Super statements / Bank deposits) rendered as cards with status pill (currently all "Empty"), capture-options caption, and a primary CTA that toasts "Phase 0, not wired yet". Header shows `<UserButton/>` for sign-out. No bucket detail flows yet — those are subsequent Phase 0 tasks.

6. **`/debug` route for the upload pipeline.** Moved the smoke-test UI off `/onboarding` into `src/pages/Debug.tsx`. Route is gated by `import.meta.env.DEV` — production builds redirect to `/dashboard`. Functionally identical to the s003 hour 1 surface (file input → ensureWorker → uploadPayslip → inline result log).

7. **Privacy policy v1 placeholder at `/privacy`.** Public route. Header pins the version (`v1 · 2026-04-26 · DRAFT`) and the body warns that the real policy is in development. Bumping the version is a one-place change in `src/config/privacy.ts`; consent_records will then re-prompt on next sign-in because the matching version isn't recorded yet.

8. **PLAN-PRJ-mvp-phases.md rewrite of the Phase 0 task list.** Replaced the single "Build worker onboarding (Layer 1 facts capture)" line with seven granular items (educational onboarding, two migration items, "Your data" stub, debug move, privacy v1 placeholder, real-content follow-up). Added the explicit "research note before reference data" task per `SKILL-AWARD-add-new.md`.

9. **REF-DB-schema.md updated** with `workers` new columns and the `consent_records` table shape. `src/types/db.ts` regenerated from the live schema via Supabase MCP.

## Decisions Made

- **Trust the design mock over the PLAN line.** The mock + post-it notes are the most concrete artefact and are explicit about intent. Front-loading Layer 1 capture on a PALM worker who's just signed up (the user the mock targets explicitly: Apete, Tonga, ESL) was always going to be a worker-safety problem; the educational framing is the mitigation.

- **Six screens, not three or four.** The design intent maps each screen to a specific orientation goal: welcome → what we do → what you'll share → your control → what we aren't → consent. Compressing skips the "what we aren't" screen, which is the regulatory anchor — we are not legal advice. That screen has to exist.

- **Skip jumps to screen 6, never out.** A signed-in user without a consent record is the privacy gap the table exists to close. The design mock's `onSkipAll` would have implied the option to skip out of consent entirely; that path doesn't exist here. Skip = "I don't need orientation, take me to consent."

- **Consent is immutable; new consent → new row.** Re-prompting on policy version change is recorded as a brand-new `consent_records` row, not an update. Triggers reject UPDATE/DELETE even for service role. Defense-in-depth pattern reused from `comparisons` (s003 hour 1).

- **Pin `PRIVACY_POLICY_VERSION` as a TS constant, not a DB row.** Versions move in lockstep with deployed code; storing them in the DB introduces drift (DB says v2, code shows v1). Constant + version-bump-as-deploy is the simplest reliable pattern.

- **`/debug` is dev-only via Vite's `import.meta.env.DEV`, not via auth check.** Production builds compile to a `<Navigate to="/dashboard">` so the route literally doesn't render Debug. Clearer security boundary than gating on a Clerk role or an env flag the worker could see.

- **Five worker-facing buckets on `/dashboard`, not six.** `YourData.jsx` shows 5 (the design's worker-controlled data); `docs/product/buckets.md` enumerates 6 (adds "Award reference" and "Comparisons" — both system-side or output-side, not worker-fillable). The home screen mirrors what the worker can act on; comparisons live elsewhere.

- **No partial onboarding state stored mid-flow.** If the worker quits at screen 3, nothing is written. State only persists at "Get started". Avoids ghost workers in the DB and a "resume your onboarding" UX we don't have a design for.

- **Lifted Step 6 form state to `OnboardingFlow`.** Originally Step 6 owned its own `consent` + form state (matching the mock). Lifted it after recognising the wrapper needs to gate `Get started` on the same state. One source of truth.

## What's Open

- **Real privacy policy content.** Logged as a Phase 0 PLAN item that blocks ship-to-real-worker. The placeholder + version-pin let everything else proceed.
- **Browser end-to-end test of the new flow.** `npm run dev` → `/onboarding` → walk all 6 screens → submit → land on `/dashboard` → check `consent_records` and `workers.country` populated. Re-sign-in should land directly on `/dashboard`.
- **Layer 1 facts capture is now a follow-up task** (manual entry inside the "Employment contract" bucket flow). MA000074 reference data still needs the research note + seeding. These are the next two PLAN items.
- **Mobile sizing not verified.** The mock targets 390×780 (PhoneFrame). Tailwind utilities scale fluidly but I didn't open a mobile viewport. Likely fine; flag if a real worker hits any layout snags.
- **No Skip-tracking metric.** Down the road we'll want to know if PALM workers consistently skip past the orientation. Out of scope this session.
- **Push not done.** Awaiting review per the user's hard stop.

## Lessons / Gotchas

Two added to `tasks/lessons.md`:

6. **Audit catches plan-vs-mock drift the file names hide.** The PLAN line said "onboarding (Layer 1 facts capture)". The mock filename `onboarding.html` matches. The mock *contents* contradict the PLAN. If the audit had only checked filenames + table-of-contents, it would have signed off and I'd have built the wrong thing. The skill's pitfall ("auditing only file names, not contents") is real; opening every file is the price of entry.

7. **Worker-safety reasoning belongs in the architecture, not in code review.** "Don't ask a PALM worker for their award classification before orienting them" is a worker-safety constraint that reads as a UX preference unless you've seen the framing. The design system encodes this via post-it notes. Future-self: when a design mock has explicit narrative annotations (post-its, comments in the JSX), treat them as load-bearing — they exist because someone caught a regression risk.

## Next Session

**Phase 0 unchecked items, in order:**
1. Layer 1 facts capture (employer + classification + pay terms) — manual entry inside the "Employment contract" bucket detail flow.
2. Research note for MA000074 (`docs/research/awards-ma000074-v01.md`) via the `researcher` agent + `SKILL-AWARD-add-new.md`.
3. Seed `awards` + `award_rates` for MA000074.
4. Shift logging (Layer 2) — "Shifts" bucket detail flow.
5. Manual payslip entry (Layer 3) — "Payslips" bucket detail flow.
6. Comparison engine v1.
7. Basic PDF report.
8. Privacy policy v1 — real content (research-heavy; ship-to-real-worker blocker).

`(1)` and `(4)`/`(5)` need an "Add a fact" UX pattern that respects `SKILL-FACT-confirmation.md` (pre-fill OK, pre-confirm never; provenance visible; confirmed_at set on explicit confirm only). Worth running idea-to-execution on that pattern as a single design decision before building three screens that share it.

LATEST.md updated → points at this retro.
