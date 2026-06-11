/** @type {import('tailwindcss').Config} */

// Tailwind is configured to read CSS variables defined in src/styles/globals.css.
// Change colors in src/config/theme.ts — the globals.css injects them as CSS vars,
// and Tailwind maps those vars here so you can use e.g. bg-primary, text-accent etc.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Map Tailwind color names → CSS variables set in globals.css
        primary:    'rgb(var(--color-primary) / <alpha-value>)',
        secondary:  'rgb(var(--color-secondary) / <alpha-value>)',
        accent:     'rgb(var(--color-accent) / <alpha-value>)',
        surface:    'rgb(var(--color-surface) / <alpha-value>)',
        'surface-2':'rgb(var(--color-surface-2) / <alpha-value>)',
        border:     'rgb(var(--color-border) / <alpha-value>)',
        muted:      'rgb(var(--color-muted) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        error:      'rgb(var(--color-error) / <alpha-value>)',
        success:    'rgb(var(--color-success) / <alpha-value>)',
      },
      fontFamily: {
        // Change these font stacks in one place
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
