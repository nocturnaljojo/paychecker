# PayChecker Design System

> A calm, respectful accountant sitting with you at the kitchen table.
> Trustworthy like a bank, warm like a neighbour.
> Never alarming, never patronising, never clever for its own sake.

---

## What is PayChecker?

**PayChecker** is a personal pay-verification tool for workers. Upload your payslips, shifts, and statements; the app shows you what's coming, what you've got, and whether the numbers add up.

It is deliberately **a calculator, not a lawyer** — it presents facts and lets workers draw their own conclusions. It sits in the same regulatory category as the Fair Work Ombudsman's Pay Calculator or the ATO tax estimator.

**Two surfaces:**
1. **PayChecker PWA** — mobile-first, for workers. Free tier (PALM scheme visa workers) and $4.99/mo paid tier (Australian casuals, launching with hospitality).
2. **PayChecker Admin** — desktop dashboard for the operator (support, data health, cohort monitoring).

**Two personas, one emotional state** — confused, anxious, distrustful, hopeful-but-scared. Every screen must leave them **calmer, more in control, respected, safe**.

- **Apete, 36** — Fijian chicken catcher on a PALM visa in regional NSW. English is his second language. Shares a phone with housemates. First-time finance app user.
- **Mia, 24** — Melbourne hospitality worker, casually employed across two venues. Suspects she's underpaid on Sunday penalty rates.

---

## Sources given

- **Brief:** Written brand brief (pasted into the project at kickoff). No codebase, no Figma file, no prior deck, no logo asset.
- **Figma:** _None supplied._
- **Codebase:** _None supplied._

All visuals in this system are built from the brief's specification. If the user has existing brand assets (logo, wordmark, screenshots), they should be dropped into `assets/` and the system re-run to override the placeholder mark.

---

## Index

All design-system files live under `public/design-system/` so Vite copies them to `dist/design-system/` at build, and Vercel serves them at `/design-system/`. The React app owns `/`.

- `DESIGN-SYSTEM.md` — this file. Brand context, content & visual foundations, iconography. (Project-level docs live in `README.md` + `CLAUDE.md`.)
- `public/design-system/colors_and_type.css` — the design-system copy of the tokens. **Synced with `src/styles/tokens.css`** (React bundle); see the TOKEN SYNC NOTE at the top of either file.
- `public/design-system/fonts/` — notes on IBM Plex (Google-hosted, optional self-host path).
- `public/design-system/assets/` — logos, wordmarks, icon references.
- `public/design-system/preview/` — individual design-system cards (colors, type, spacing, components).
- `public/design-system/ui_kits/paychecker_pwa/` — mobile PWA UI kit. Open `index.html` for a clickable demo.
- `public/design-system/ui_kits/paychecker_admin/` — desktop admin UI kit. Open `index.html` for a clickable demo.

Local dev: `npm run dev` then visit `http://localhost:5173/design-system/`.
Production: `https://<domain>/design-system/` (post-deploy).

---

## CONTENT FUNDAMENTALS

PayChecker's copy is the product's most important design material. The numbers are the same whether they come from a spreadsheet or from us — the **tone** is what makes a worker feel respected.

### Voice

**Calm, direct, respectful** — a thoughtful colleague explaining something. Not a lawyer. Not a financial advisor. Not a coach.

- **Reading level:** Grade 6–8. Short sentences. Common words.
- **Person:** Second person ("you", "your"), first-person plural when the app acts ("we can't check this yet"). Never "I".
- **Casing:** Sentence case for everything — headings, buttons, pills. No Title Case. No ALL CAPS (not even for warnings).
- **Punctuation:** Full stops end sentences. No exclamation marks, anywhere, ever. Em-dashes for pauses, not hyphens.
- **Emoji:** None. Not in UI, not in notifications, not in empty states.

### Rules, with examples

| ❌ Don't write | ✅ Write |
|---|---|
| "You have been underpaid." | "Difference between expected and received: **$47.60**." |
| "Insufficient data." | "We can't check this yet — confirm your classification first." |
| "Anomaly detected." | "Something looks different this week." |
| "Contact legal counsel for advice." | "For questions, Fair Work Ombudsman: **13 13 94**." |
| "Great job! 🎉" | "Saved." |
| "Oh no! Something went wrong." | "We couldn't open this file. Try again, or upload a different one." |
| "Smart pay detection" | "Pay check" |

### Numbers

- Always in IBM Plex Mono, always tabular-nums, so columns align.
- Currency: `$1,247.60` — symbol before, two decimals always, even for whole dollars.
- Ranges when uncertain: `$280–$620` (en-dash, not hyphen). Never a point estimate dressed up as fact.
- Every calculated number is tappable → "Why this number?" shows the source chain.

### Forbidden language

"AI-powered", "smart", "intelligent", "seamless", "effortless", "unlock", "supercharge", "empower", "journey", "dive in", "let's get started", "oops", "uh oh", "congrats", "Act now", "Don't miss out", "Limited time".

---

## VISUAL FOUNDATIONS

### Color

All colors in `colors_and_type.css`. The palette has **one** primary (navy) and uses color sparingly — most of the interface is warm off-white, charcoal text, and thin warm-grey borders.

| Role | Token | Hex | Use |
|---|---|---|---|
| Primary | `--pc-navy` | `#1F3A5F` | Dominant. Buttons, links, logo, focus ring. |
| Accent / Warning | `--pc-amber` | `#E8B04B` | Needs-attention pills. Used sparingly. |
| Confirm | `--pc-sage` | `#5C8F6B` | "Matches expected." Never triumphant. |
| Error | `--pc-coral` | `#C97064` | Rare. Muted. Never a red alert. |
| Background | `--pc-bg` | `#FAF7F2` | Warm off-white, never pure white. |
| Surface | `--pc-surface` | `#FFFFFF` | Cards sit on the warm bg. |
| Text | `--pc-text` | `#1A1D24` | Charcoal, never pure black. |
| Muted | `--pc-text-muted` | `#6B7280` | Labels, captions, metadata. |
| Border | `--pc-border` | `#E5E1D8` | Soft warm grey. |

**Forbidden:** pure red, any purple, mint fintech success green, neon / electric, generic SaaS blue (`#3B82F6` family).

**Color is never the only signal** — an amber pill always has a text label too. (WCAG 2.2 AA.)

### Type

- **IBM Plex Sans** — all UI text. Weights 400 / 500 / 600 only.
- **IBM Plex Mono** — all numbers, currency, tabular data. `tabular-nums` always on.
- **IBM Plex Serif** — PDF reports only. Signals "document" vs "app screen".

Forbidden: Inter, Roboto, Open Sans, Lato, Space Grotesk, system defaults, Helvetica, Arial.

Minimum body size: **16px**. Scale jumps 1.5× or more between steps — display 32 / h1 24 / h2 20 / body 16 / caption 14 / micro 13.

### Spacing

Base unit **8px**. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96.

**Philosophy:** generous breathing room around every number. This is someone's pay — treat it with gravity, not density. When in doubt, add more space.

### Backgrounds

- Warm off-white (`#FAF7F2`) everywhere. Never pure white at the page level.
- **No gradients.** Not in backgrounds, not in buttons, not in hero sections.
- **No images as backgrounds.** No stock photos, no illustrations behind text.
- **No patterns, no textures, no grain.** Flat, calm, unadorned surfaces.

### Corners & borders

- Cards: **16px radius**, `0 1px 3px rgba(0,0,0,0.06)` shadow, 24px internal padding, white surface on warm bg, no border.
- Buttons & inputs: **12px radius**.
- Pills: **fully rounded**, 12px horizontal padding.
- Borders: **1px solid `#E5E1D8`** when used. Borders are a last resort — cards do their work with shadow + background contrast.

### Shadows

One card shadow (`0 1px 3px rgba(0,0,0,0.06)`). One modal shadow, slightly deeper. No elevated hover shadows, no coloured shadows, no inner shadows.

### Motion

- 200–300ms, `ease-out` (`cubic-bezier(0.2, 0.6, 0.2, 1)`).
- Page loads: **one orchestrated staggered reveal**, not scattered micro-interactions.
- **Forbidden:** bouncy springs, elastic effects, confetti, celebratory animations, hover wiggles, pulse animations on CTAs.
- `prefers-reduced-motion`: respect it. All transitions collapse to 0ms.

### Hover & press states

- **Hover (pointer only):** navy → `--pc-navy-hover` (10% darker). No scale. No shadow lift. No underline appearing/disappearing.
- **Press:** background darkens another step, **no shrink transform** (shrinking feels playful and we are not). Duration `--pc-dur-fast` (150ms).
- **Focus:** 2px navy outline (`--pc-shadow-focus`), always visible on keyboard focus.
- **Disabled:** 40% opacity, no interaction.

### Transparency & blur

- No backdrop blur. No translucent overlays on top of content. No glassmorphism.
- Modal scrim: solid `rgba(26, 29, 36, 0.35)`.

### Layout rules

- Mobile: single column, 16px side margins, 24px between cards.
- Desktop admin: 240px left nav, fluid content, 32px gutter, max content width 1200px.
- Sticky elements only when necessary: top status bar (PWA), top nav (admin). No floating action buttons. No sticky CTAs.
- One decision per screen. Progressive disclosure for complexity.

### Imagery

- **No illustrations of money, piggy banks, coins, dollar signs.**
- **No stock photos of workers.**
- **No branded illustration system.**
- The interface is text, numbers, and UI chrome. Anything that isn't pulling weight gets cut.

---

## ICONOGRAPHY

PayChecker uses **Lucide** icons (lucide.dev), loaded via CDN. Lucide is a fork of Feather with the same 1.5px stroke weight, rounded joins, rounded line caps — it matches the brief's "line weight 1.5, Lucide or Phosphor style, 24px default."

### Usage

- Default size: **24px**. Acceptable: 16, 20, 24, 32.
- Stroke: **1.5px** (Lucide default). Never fill. Never duotone.
- Color: **matches adjacent text color** (`currentColor`). Icons are never decorative — if an icon has no label next to it, it's a button and it has an `aria-label`.
- Never used to convey meaning on their own. The amber triangle-alert is paired with "Needs attention" text. The sage check is paired with "Matches expected" text.

### No emoji. No unicode glyphs. No custom SVG drawn by an LLM.

If a needed icon is missing from Lucide, we substitute the closest Lucide glyph and note it in code. We do not hand-draw icons.

### Approved icon set (starter)

| Concept | Lucide name |
|---|---|
| Home / dashboard | `home` |
| Upload payslip | `upload` |
| Check / matches | `check` |
| Needs attention | `alert-triangle` |
| Info / why this number | `info` |
| Details disclosure | `chevron-right` |
| Close / dismiss | `x` |
| Settings | `settings` |
| Shifts / calendar | `calendar` |
| Money / pay summary | `wallet` _(never coins or dollar-sign glyph as decoration)_ |
| Help / FAQ | `help-circle` |
| Lock / privacy | `lock` |
| Person / account | `user` |
| Search | `search` |
| Download report | `download` |
| Back | `arrow-left` |

### Logo

`assets/paychecker-logo.svg` — a simple wordmark set in IBM Plex Sans Semibold with a subtle checkmark integrated into the "k" of "Checker". Navy (`--pc-navy`) on warm bg. **This is a placeholder.** If the client has a real mark, drop it in at `assets/paychecker-logo.svg` and the system picks it up.

---
