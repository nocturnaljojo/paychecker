# PayChecker PWA — UI Kit

Mobile-first PWA for workers. Open `index.html` for a clickable demo.

## Flow

Onboarding → Home (weekly summary) → Week detail (shift breakdown) → Upload payslip → "Why this number?" bottom sheet.

State persists to `localStorage` under `pc_screen` so you can refresh mid-demo without losing your place.

## Files

- `index.html` — the runnable demo (iPhone-proportioned frame, single-user flow).
- `Components.jsx` — primitives: `Icon`, `Pill`, `Button`, `Money`, `Card`, `TopBar`, `IconButton`, `TabBar`.
- `Screens.jsx` — flow screens: `OnboardingScreen`, `HomeScreen`, `WeekDetailScreen`, `UploadScreen`, `WhySheet`.

## Notes

- All numbers use `<Money>` which is IBM Plex Mono + tabular-nums + AUD formatting.
- No decorative icons — every `<Icon>` either sits next to a label or has an `aria-label`.
- 48×48 tap targets throughout. 52px input height. 16px minimum body size.
- Bottom-nav navy = active; no other state changes.
- "Why this number?" sheet shows the full calculation chain: base rate → loading → hours → difference.
