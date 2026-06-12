import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { CONTENT } from '@/config/content'

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
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            {CONTENT.work.label}
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">
            <span className="gradient-text">{CONTENT.work.title}</span>
          </h2>
          <p className="mt-4 text-muted max-w-xl mx-auto">{CONTENT.work.subtitle}</p>
        </div>
      </FadeIn>

      <div className="space-y-6">
        {CONTENT.work.projects.map((p, i) => (
          <FadeIn key={p.name} delay={i * 0.1}>
            <div className="group flex flex-col sm:flex-row items-start gap-6 rounded-lg border border-border bg-surface p-6 hover:border-accent/40 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                    {p.tag}
                  </span>
                  {p.year && <span className="text-xs text-muted">{p.year}</span>}
                </div>
                <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                <p className="mt-1 text-sm text-muted leading-relaxed">{p.description}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
