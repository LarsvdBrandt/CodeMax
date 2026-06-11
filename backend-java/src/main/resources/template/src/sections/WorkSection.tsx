// ─────────────────────────────────────────────────────────────────────────────
// WorkSection — portfolio / case-study grid.
// Replace PROJECTS with your own work, or rename this section entirely.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

const PROJECTS = [
  {
    tag:   'Web app',
    title: 'Project Alpha',
    desc:  'A SaaS dashboard with real-time analytics and team collaboration features.',
    year:  '2024',
    // Replace with an actual image path under /public
    img:   null,
  },
  {
    tag:   'Mobile',
    title: 'Project Beta',
    desc:  'Cross-platform fitness tracker built with React Native and a REST backend.',
    year:  '2024',
    img:   null,
  },
  {
    tag:   'API',
    title: 'Project Gamma',
    desc:  'Public developer API serving 10 M+ requests per month with 99.9 % uptime.',
    year:  '2023',
    img:   null,
  },
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

export function WorkSection() {
  return (
    <section id="work" className="section mx-auto max-w-6xl">
      <FadeIn>
        <div className="mb-16 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Work</span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">
            Selected <span className="gradient-text">projects</span>
          </h2>
          <p className="mt-4 text-muted max-w-xl mx-auto">
            Replace these cards with your own case studies or portfolio pieces.
          </p>
        </div>
      </FadeIn>

      <div className="space-y-6">
        {PROJECTS.map((p, i) => (
          <FadeIn key={p.title} delay={i * 0.1}>
            <div className="group flex flex-col sm:flex-row items-start gap-6 rounded-lg border border-border bg-surface p-6 hover:border-accent/40 transition-colors">

              {/* Placeholder thumbnail */}
              <div className="w-full sm:w-48 h-32 flex-shrink-0 rounded bg-surface-2 border border-border flex items-center justify-center text-muted text-xs">
                {p.img ? (
                  <img src={p.img} alt={p.title} className="h-full w-full object-cover rounded" />
                ) : (
                  '[ image ]'
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                    {p.tag}
                  </span>
                  <span className="text-xs text-muted">{p.year}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
                <p className="mt-1 text-sm text-muted leading-relaxed">{p.desc}</p>
              </div>

              <ArrowUpRight className="h-5 w-5 text-muted group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
