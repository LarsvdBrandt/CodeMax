// ─────────────────────────────────────────────────────────────────────────────
// HeroSection — full-viewport landing area with animated headline and CTAs.
// Replace the copy, gradient, and background pattern as needed.
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useScrollTo } from '@/hooks/useScrollTo'

// Stagger children animation helper
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}
const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export function HeroSection() {
  const navigate  = useNavigate()
  const scrollTo  = useScrollTo()

  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20"
    >
      {/* ── Background decoration ─────────────────────────────────────── */}
      {/* Radial glow behind the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[600px] w-[600px] rounded-full bg-accent/10 blur-[120px]" />
      </div>
      {/* Subtle dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize:  '32px 32px',
        }}
      />

      {/* ── Content ───────────────────────────────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto max-w-4xl text-center"
      >
        {/* Badge */}
        <motion.div variants={item} className="mb-6 inline-flex">
          <span className="rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent">
            ✦ Version 1.0 — Now available
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl"
        >
          Build faster.{' '}
          <span className="gradient-text">Ship better.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          variants={item}
          className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed"
        >
          A production-ready React + TypeScript template with auth, theming,
          and API integration — so you can focus on what makes your app unique.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={item} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={() => navigate('/register')}
          >
            Get started free
          </Button>
          <Button
            variant="secondary"
            size="lg"
            leftIcon={<Play className="h-4 w-4" />}
            onClick={() => scrollTo('features')}
          >
            See how it works
          </Button>
        </motion.div>

        {/* Social proof */}
        <motion.p variants={item} className="mt-10 text-xs text-muted">
          No credit card required · MIT licence · 5-minute setup
        </motion.p>
      </motion.div>

      {/* ── Scroll indicator ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
      >
        <span className="text-xs text-muted">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          className="h-4 w-0.5 rounded-full bg-muted"
        />
      </motion.div>
    </section>
  )
}
