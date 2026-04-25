# Fonts

**IBM Plex Sans / Mono / Serif** — the system loads these from Google Fonts in `colors_and_type.css`.

IBM Plex is an open-source family from IBM (OFL licence), hosted officially on Google Fonts — a first-party CDN load, not a substitution. No fallback webfont is bundled in this folder because Plex is always available from `fonts.googleapis.com`.

If you want to self-host (for offline work or privacy requirements):
- Download the WOFF2 files from https://www.ibm.com/plex/ or https://fonts.google.com/specimen/IBM+Plex+Sans
- Drop them into this folder
- Replace the `@import` at the top of `colors_and_type.css` with local `@font-face` declarations

Weights used: 400 (regular), 500 (medium), 600 (semibold). No 300 / 700 / italics.
