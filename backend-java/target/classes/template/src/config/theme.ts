// ─────────────────────────────────────────────────────────────────────────────
// THEME CONFIGURATION
// This is the single source of truth for all design tokens.
// Change a value here and it propagates everywhere via CSS variables.
//
// Usage:
//   • Colors are written as "R G B" triples (no commas) so Tailwind can apply
//     opacity modifiers: bg-primary/50, text-accent/80, etc.
//   • After editing, the values are picked up by src/styles/globals.css which
//     injects them as CSS custom properties at :root.
// ─────────────────────────────────────────────────────────────────────────────

export const theme = {
  colors: {
    // Brand / accent — the one colour that makes the UI pop
    primary:   '255 255 255',   // white  (text on dark bg, primary buttons)
    secondary: '161 161 170',   // zinc-400 (secondary text, subtle elements)
    accent:    '99 102 241',    // indigo-500 (CTAs, highlights, links)

    // Surfaces — dark layered backgrounds
    background: '9 9 11',       // near-black page bg
    surface:    '18 18 20',     // card / panel bg
    'surface-2':'27 27 30',     // elevated surface (dropdowns, modals)

    // Borders & muted text
    border:     '39 39 42',     // zinc-800
    muted:      '113 113 122',  // zinc-500
    foreground: '250 250 250',  // almost white — default body text

    // Semantic
    error:   '239 68 68',       // red-500
    success: '34 197 94',       // green-500
  },

  // Border radius tokens
  radius:   '0.5rem',           // default (rounded)
  radiusLg: '1rem',             // rounded-lg

  // Box shadows
  shadowCard:  '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
  shadowFloat: '0 8px 32px 0 rgb(0 0 0 / 0.6)',
} as const

// ─── How to customise the colour scheme ──────────────────────────────────────
// 1. Pick a new accent, e.g. emerald: accent: '16 185 129'
// 2. Change primary/background for a light-mode variant:
//      background: '255 255 255', surface: '249 250 251', foreground: '9 9 11'
// 3. Run `npm run dev` — changes apply instantly via Vite HMR.
// ─────────────────────────────────────────────────────────────────────────────
