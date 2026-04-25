import animatePlugin from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // PayChecker design tokens — source of truth in src/styles/tokens.css.
        // Map Tailwind utilities to the CSS vars so we never duplicate values.
        'pc-navy': 'var(--pc-navy)',
        'pc-navy-hover': 'var(--pc-navy-hover)',
        'pc-navy-soft': 'var(--pc-navy-soft)',
        'pc-amber': 'var(--pc-amber)',
        'pc-amber-soft': 'var(--pc-amber-soft)',
        'pc-sage': 'var(--pc-sage)',
        'pc-sage-soft': 'var(--pc-sage-soft)',
        'pc-coral': 'var(--pc-coral)',
        'pc-coral-soft': 'var(--pc-coral-soft)',
        'pc-bg': 'var(--pc-bg)',
        'pc-surface': 'var(--pc-surface)',
        'pc-text': 'var(--pc-text)',
        'pc-text-muted': 'var(--pc-text-muted)',
        'pc-border': 'var(--pc-border)',
        'pc-border-strong': 'var(--pc-border-strong)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
        serif: ['IBM Plex Serif', 'Georgia', 'serif'],
      },
      fontSize: {
        'pc-display': ['var(--pc-size-display)', { lineHeight: 'var(--pc-leading-tight)' }],
        'pc-h1':      ['var(--pc-size-h1)',      { lineHeight: 'var(--pc-leading-snug)' }],
        'pc-h2':      ['var(--pc-size-h2)',      { lineHeight: 'var(--pc-leading-snug)' }],
        'pc-body':    ['var(--pc-size-body)',    { lineHeight: 'var(--pc-leading-normal)' }],
        'pc-caption': ['var(--pc-size-caption)', { lineHeight: 'var(--pc-leading-normal)' }],
        'pc-micro':   ['var(--pc-size-micro)',   { lineHeight: 'var(--pc-leading-normal)' }],
      },
      borderRadius: {
        'pc-input':  'var(--pc-radius-input)',
        'pc-button': 'var(--pc-radius-button)',
        'pc-card':   'var(--pc-radius-card)',
        'pc-pill':   'var(--pc-radius-pill)',
      },
      boxShadow: {
        'pc-card':  'var(--pc-shadow-card)',
        'pc-modal': 'var(--pc-shadow-modal)',
        'pc-focus': 'var(--pc-shadow-focus)',
      },
      transitionTimingFunction: {
        'pc-ease-out': 'var(--pc-ease-out)',
      },
      transitionDuration: {
        'pc-fast': 'var(--pc-dur-fast)',
        'pc-base': 'var(--pc-dur-base)',
        'pc-slow': 'var(--pc-dur-slow)',
      },
    },
  },
  plugins: [animatePlugin],
}
