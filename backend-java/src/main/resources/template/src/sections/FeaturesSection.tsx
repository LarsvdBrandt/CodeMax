import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Zap, Shield, Globe, Sparkles, Lock, Palette,
  Code2, BarChart3, Star, Layers, Cpu, Database,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { CONTENT } from '@/config/content'

type IconName = typeof CONTENT.features.items[number]['icon']
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, Shield, Globe, Sparkles, Lock, Palette,
  Code2, BarChart3, Star, Layers, Cpu, Database,
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
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
      <FadeIn>
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            {CONTENT.features.label}
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">
            <span className="gradient-text">{CONTENT.features.title}</span>
          </h2>
          <p className="mt-4 text-muted max-w-xl mx-auto">{CONTENT.features.subtitle}</p>
        </div>
      </FadeIn>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CONTENT.features.items.map((f, i) => {
          const Icon = ICON_MAP[f.icon as IconName] ?? Zap
          return (
            <FadeIn key={f.title} delay={i * 0.07}>
              <Card hover className="h-full">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.description}</p>
              </Card>
            </FadeIn>
          )
        })}
      </div>
    </section>
  )
}
