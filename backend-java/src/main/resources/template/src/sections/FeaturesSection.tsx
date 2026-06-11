// ─────────────────────────────────────────────────────────────────────────────
// FeaturesSection — icon-card grid showcasing key features.
// To add a feature: append an entry to FEATURES.
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Palette, Zap, Lock, Code2, Globe, BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/Card'

// ── Feature data ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon:  Palette,
    title: 'Theming system',
    desc:  'One config file controls every colour. Switch from dark to light — or to any brand palette — in seconds.',
  },
  {
    icon:  Zap,
    title: 'Vite + HMR',
    desc:  'Instant hot-module replacement during development. Sub-100ms rebuilds even as your codebase grows.',
  },
  {
    icon:  Lock,
    title: 'Auth built-in',
    desc:  'Login, register, and session management wired up out of the box. Swap to any OAuth provider easily.',
  },
  {
    icon:  Code2,
    title: 'Typed API layer',
    desc:  'A fetch wrapper with automatic token injection, timeout, and typed responses for every endpoint.',
  },
  {
    icon:  Globe,
    title: 'React Router v6',
    desc:  'File-based-style route layout with protected routes and redirect-after-login already configured.',
  },
  {
    icon:  BarChart3,
    title: 'Framer Motion',
    desc:  'Scroll-triggered fade-in animations and page transitions out of the box — remove if not needed.',
  },
]

// Reusable scroll-reveal wrapper
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref     = useRef<HTMLDivElement>(null)
  const inView  = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export function FeaturesSection() {
  return (
    <section id="features" className="section mx-auto max-w-6xl">
      {/* Heading */}
      <FadeIn>
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Features</span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">
            Everything you need to <span className="gradient-text">ship</span>
          </h2>
          <p className="mt-4 text-muted max-w-xl mx-auto">
            Carefully picked defaults so you stop configuring and start building.
          </p>
        </div>
      </FadeIn>

      {/* Cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <FadeIn key={f.title} delay={i * 0.07}>
            <Card hover className="h-full">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </Card>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
