// ─────────────────────────────────────────────────────────────────────────────
// TestimonialsSection — quote cards with avatar, name, and role.
// Replace TESTIMONIALS with real quotes or remove the section if not needed.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Quote } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const TESTIMONIALS = [
  {
    quote: 'This template saved me two full days of setup. The theme system alone is worth it.',
    name:  'Alex Rivera',
    role:  'Indie hacker',
    initials: 'AR',
  },
  {
    quote: 'Finally a starter that treats TypeScript as a first-class citizen, not an afterthought.',
    name:  'Sam Chen',
    role:  'Frontend lead @ Startup',
    initials: 'SC',
  },
  {
    quote: 'I cloned it, swapped the accent colour, and had a polished demo running in 20 minutes.',
    name:  'Jordan Lee',
    role:  'Product designer',
    initials: 'JL',
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

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="section bg-surface">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Testimonials</span>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">
              Loved by <span className="gradient-text">builders</span>
            </h2>
          </div>
        </FadeIn>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.1}>
              <Card hover className="flex flex-col h-full">
                <Quote className="h-6 w-6 text-accent mb-4" />
                <p className="text-sm text-muted leading-relaxed flex-1">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  {/* Avatar placeholder — swap for an <img> with a real URL */}
                  <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted">{t.role}</p>
                  </div>
                </div>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
