// ─────────────────────────────────────────────────────────────────────────────
// AboutSection — two-column layout: headline + copy on left, stats on right.
// Replace the copy and stats with your own content.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

const STATS = [
  { value: '5 min',  label: 'Setup time'     },
  { value: '100%',   label: 'TypeScript'      },
  { value: 'MIT',    label: 'Licence'         },
  { value: '0',      label: 'Config headaches' },
]

const BULLETS = [
  'Dark-mode first with full light-mode support',
  'Accessible components (ARIA, focus rings)',
  'Mobile-first responsive layout',
  'Environment-based API configuration',
]

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export function AboutSection() {
  return (
    <section id="about" className="section bg-surface">
      <div className="mx-auto max-w-6xl grid gap-16 md:grid-cols-2 md:items-center">

        {/* ── Left: copy ───────────────────────────────────────────────── */}
        <div>
          <FadeIn>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">About</span>
            <h2 className="mt-3 text-4xl font-bold tracking-tight leading-tight">
              Built for developers{' '}
              <span className="gradient-text">who ship.</span>
            </h2>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="mt-5 text-muted leading-relaxed">
              This template removes the boilerplate friction of starting a new project.
              Auth, API wiring, theming, and component primitives are ready so your first
              commit can be your actual feature — not yet another Tailwind config.
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <ul className="mt-6 space-y-3">
              {BULLETS.map(b => (
                <li key={b} className="flex items-start gap-3 text-sm text-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                  {b}
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>

        {/* ── Right: stats grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {STATS.map((s, i) => (
            <FadeIn key={s.label} delay={i * 0.08}>
              <div className="rounded-lg border border-border bg-surface-2 p-6 text-center">
                <p className="text-3xl font-extrabold text-foreground">{s.value}</p>
                <p className="mt-1 text-xs text-muted">{s.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>

      </div>
    </section>
  )
}
