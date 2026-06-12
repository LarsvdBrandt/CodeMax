import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Quote } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { CONTENT } from '@/config/content'

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

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
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              {CONTENT.testimonials.label}
            </span>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">
              <span className="gradient-text">{CONTENT.testimonials.title}</span>
            </h2>
          </div>
        </FadeIn>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CONTENT.testimonials.items.map((t, i) => (
            <FadeIn key={t.author + i} delay={i * 0.1}>
              <Card hover className="flex flex-col h-full">
                <Quote className="h-6 w-6 text-accent mb-4" />
                <p className="text-sm text-muted leading-relaxed flex-1">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent">
                    {initials(t.author)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.author}</p>
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
