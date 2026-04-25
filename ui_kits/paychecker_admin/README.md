# PayChecker Admin — UI Kit

Desktop operator console. Open `index.html`.

## Layout

- 240px left nav · fluid content area · top bar with search + notifications
- Dashboard: 4 KPI cards · recent flags table · data health + cohort breakdown

## Files

- `index.html` — runnable demo.
- `Components.jsx` — all admin primitives (Sidebar, topbar, KPI, FlagsTable, HealthRow, CohortRow) and the Dashboard screen.

## Notes

- Same type and color tokens as the PWA — `../../colors_and_type.css`.
- Tables use Plex Mono for IDs and money; Plex Sans for labels.
- No red, no purple, no SaaS blue. All differentiation by pill labels + tone.
- Left nav persists to `localStorage` (`pc_admin_nav`).
