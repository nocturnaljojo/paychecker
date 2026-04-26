# Product — personas

## Why this exists

Every PayChecker decision — copy, default, edge case, error message, calc rounding, when to surface a number, when to swallow it — is downstream of "who is this for". When two paths look equally reasonable on a whiteboard, the persona is what breaks the tie. This file pins the humans so the decisions stop drifting.

These personas aren't marketing avatars. They're constraints. If a feature reads well to a senior engineer but reads as a threat to Apete, the engineer's read does not win.

## Apete — primary Phase 0 persona

A single real person, whose actual experience scopes Phase 0 success. Treat as load-bearing, not illustrative.

- **Background:** Pacific Islander, Fijian, mid-30s. PALM-scheme worker on a temporary visa. Working at a regional NSW poultry processor under the **Poultry Processing Award MA000074**. Sends most of his pay home.
- **English:** second language. School-leaving English, conversational, but reads carefully. Misses idioms. Legalese reads as threatening even when neutral.
- **Power dynamics:** The employer also controls his accommodation and is the named sponsor on his visa. Concerns about pay are concerns about housing, immigration, and food in the same breath. There is no neutral way to ask "is your boss underpaying you" — the question itself is dangerous to be seen asking.
- **Trust posture:** Distrusts institutions by default. Has been told one thing and seen another from labour-hire agents, banks, and government. Trusts people he can name (a cousin, a church elder, an FWO advocate who showed up in person). Software has to earn what people lend automatically.
- **Devices:** Smartphone-first, cheap Android. Patchy data in the regional area, often relies on shared employer Wi-Fi (which he has reason to believe is logged). May share the device with a roommate. Battery anxiety is real.
- **Time and attention:** Long shifts, tired evenings. Reads PayChecker on the bus or in 5-minute breaks. Will not complete a 20-minute wizard in one sitting. Will not return to a flow that doesn't show progress.
- **Emotional state:** Anxious. Wants to know whether his pay is right but doesn't want to discover it's wrong. The act of checking is itself stressful; the UI carries that weight whether we acknowledge it or not.

## Apete's household — Phase 1 persona

Apete's roommate, plus the next 4–6 PALM workers in his network. Mostly cousins / village contacts / churchmates. Word-of-mouth onboarding — Apete texts them the URL. Mix of awards (poultry, meat, horticulture) but mostly the same employer pool.

- May share a single phone between two workers; the app must operate without auto-logging anyone in.
- May onboard with a friend or relative literally walking them through screen by screen — the flow has to survive a "buddy onboarding" pattern without leaking the buddy's data into the new account.
- Some are female — the current language and visual defaults must not read as male-only.
- Anchored by the same emotional + power-asymmetry constraints as Apete. Solving for Apete generally solves for the household; solving only for "PALM workers in general" loses Apete.

## Future paid-tier worker — Phase 2 persona

Australian, award-covered, often hospitality (Mia at the pub) or care, casualised, on AUD wages. Pays $4.99/mo because the FWO calculator + employer payslip + spreadsheet workflow takes them 90 minutes a fortnight.

- Higher digital literacy than Apete. Comfortable with banking apps, super-fund logins, MyGov.
- May have HR experience or union background — reads "expected vs received" with adult eyes and is offended by hand-holding copy.
- More likely to push back if numbers look wrong — escalates by emailing PayChecker, posting in a union Slack, or going to FWO directly. The same UI signals that calm Apete read as patronising to this persona; aim for the band that serves both.
- Privacy posture: assumes the app is fine, doesn't read policies, but punishes us severely if a breach hits the news.
- Will pay; will churn for any reason. The app earns the subscription every fortnight, not at sign-up.

## Apete's friend / advocate — secondary persona

The person who sees the PDF report or shares the comparison screen without ever holding an account. Could be:

- A church elder or community leader Apete trusts to look at the numbers.
- An FWO advocate or community legal worker (a single visit, mid-conversation).
- A union rep at a regional organising visit.
- A pro-bono lawyer, in 90 seconds before the case manager pulls them.

Designs that depend on the reader knowing the app are a fail-state. The PDF and any shared screen must self-explain: what was compared, what facts were used, when, and the FWO 13 13 94 line. No advocate should have to ask "what is this app".

## Design implications

### Tone

- **Plain language.** Year-9 reading level. No legal terms, no Latin, no acronyms without expansion the first time they appear. ESL-readable as the default, not a setting.
- **Numbers prominent, prose secondary.** When the screen is about money, the dollar figure is the largest type on the screen.
- **"This is what we found", never "you should…"**. Diagnostic, not prescriptive. We compute; the worker decides. Phrasings to keep: "your payslip shows", "the award rate for this period was", "the difference is". Phrasings banned: "you may be underpaid", "you should claim", "this is wage theft".
- **No alarm bells unless the worker pulled them.** The system surfaces a gap when the worker asks for a comparison — never as a push notification, banner, or login surprise. Apete deciding to look is a deliberate emotional act; the app doesn't get to volunteer it.
- **Neutral when the answer is "your numbers match"** — don't celebrate compliance. Some workers will read "looks fine" as "we missed something".

### Defaults

- **Privacy-first.** Smallest plausible collection. Country and language at onboarding are optional. Bank account stored as last-4 + bank name, never the full number. No third-party analytics on screens showing dollar values.
- **Mobile-first.** Every flow has to work on a 360–390px wide phone in portrait. Tap targets ≥48px. No hover affordances; no flows that require a second monitor.
- **Pacific Islander cultural lens.** Examples in copy use Pacific names where examples are needed, not "John Smith". Currency is AUD by default but the option exists to add a remitted-amount column on reports. Religious practice is not a bug — public-holiday penalty handling treats a Sunday shift as a Sunday shift, not as "weird that someone worked Sunday".
- **No streak / gamification / progress-as-engagement.** Apete won't be motivated by streaks; he's motivated by "did I get paid right". Streaks belong in fitness apps.

### Edge cases the design must handle

- **Employer is in the same community as the worker.** Onboarding screens must not display the employer's name or ABN unprompted; the worker may be reading on a shared phone or with a relative looking. Identifiers reveal at intent ("show me my employer info"), not at default.
- **Shared device.** Quick-lock on financial screens. Default to "remember nothing" beyond Clerk session; auto-clear sensitive screens after N minutes of inactivity (Phase 1+).
- **No Medicare / TFN.** New PALM arrivals may not have either when they sign up. The flow cannot block on these. Ask later, ask optionally, never lock the comparison engine on them.
- **No Australian phone number.** Use email + Clerk session, never SMS-required.
- **Data retention vs visa risk.** A worker may want to delete their data if they suspect the employer has been notified that they're using PayChecker. Soft-delete same-day, hard-delete + storage purge within 30 days, no retention beyond compliance minimum. Document the timeline plainly.
- **Output read by an advocate who can't ask follow-ups.** The PDF is self-contained: it shows what was compared, the source facts (with provenance), the period, the award reference, and the FWO 13 13 94 line. Any reader should be able to act on it without the app open.
- **The worker is wrong about their classification.** We compute from what they confirm. We do not arbitrate classification. Reports are explicit about what was assumed so a reviewer can spot the error.
- **Friend buddy-onboarding.** A second person reading along during sign-up must not leak into the account. The flow stays single-user; if the friend wants to use PayChecker themselves, they sign up separately on their own device.

## What changes about Apete

This file describes the persona at Phase 0 launch. As Apete's literacy with the app grows over months, what's load-bearing shifts. Don't lock the design to the version of Apete who's never seen a payslip comparison; review this file when his actual usage starts producing surprises.
