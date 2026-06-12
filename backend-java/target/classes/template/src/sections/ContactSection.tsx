import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Send, Mail, MapPin, Clock } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { contactService } from '@/services/api'
import type { ContactPayload } from '@/types'
import { CONTENT } from '@/config/content'

const EMPTY: ContactPayload = { name: '', email: '', subject: '', message: '' }

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

const CONTACT_ROWS = [
  { icon: Mail,   label: 'Email',    value: CONTENT.contact.email    },
  { icon: MapPin, label: 'Location', value: CONTENT.contact.location },
  { icon: Clock,  label: 'Hours',    value: CONTENT.contact.hours    },
]

export function ContactSection() {
  const [form,    setForm]    = useState<ContactPayload>(EMPTY)
  const [errors,  setErrors]  = useState<Partial<ContactPayload>>({})
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [apiErr,  setApiErr]  = useState<string | null>(null)

  function validate(): boolean {
    const e: Partial<ContactPayload> = {}
    if (!form.name.trim())                      e.name    = 'Name is required'
    if (!/\S+@\S+\.\S+/.test(form.email))       e.email   = 'Valid email required'
    if (!form.subject.trim())                   e.subject = 'Subject is required'
    if (form.message.trim().length < 10)        e.message = 'Message must be at least 10 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiErr(null)
    try {
      await contactService.send(form)
      setSent(true)
      setForm(EMPTY)
    } catch (err: unknown) {
      setApiErr((err as { message?: string }).message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function set(field: keyof ContactPayload) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }))
      if (errors[field]) setErrors(er => ({ ...er, [field]: undefined }))
    }
  }

  return (
    <section id="contact" className="section mx-auto max-w-6xl">
      <FadeIn>
        <div className="mb-16 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            {CONTENT.contact.label}
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">
            <span className="gradient-text">{CONTENT.contact.title}</span>
          </h2>
          <p className="mt-4 text-muted max-w-xl mx-auto">{CONTENT.contact.subtitle}</p>
        </div>
      </FadeIn>

      <div className="grid gap-12 md:grid-cols-2 md:items-start">

        {/* ── Contact info ────────────────────────────────────────────── */}
        <FadeIn delay={0.1}>
          <div className="space-y-6">
            {CONTACT_ROWS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* ── Form ────────────────────────────────────────────────────── */}
        <FadeIn delay={0.15}>
          {sent ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-8 text-center">
              <p className="text-lg font-semibold text-foreground">Message sent!</p>
              <p className="mt-2 text-sm text-muted">{CONTENT.contact.success}</p>
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => setSent(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Name"    value={form.name}    onChange={set('name')}    error={errors.name}    placeholder="Jane Smith"       />
                <Input label="Email"   value={form.email}   onChange={set('email')}   error={errors.email}   placeholder="jane@example.com" type="email" />
              </div>
              <Input label="Subject" value={form.subject} onChange={set('subject')} error={errors.subject} placeholder="How can we help?"  />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Message</label>
                <textarea
                  value={form.message}
                  onChange={set('message')}
                  rows={5}
                  placeholder="Tell us more…"
                  className={`
                    w-full rounded border bg-surface-2 px-3 py-2 text-sm text-foreground
                    placeholder:text-muted resize-none
                    transition-colors duration-150
                    border-border focus:border-accent focus:outline-none
                    ${errors.message ? 'border-error' : ''}
                  `}
                />
                {errors.message && <p className="text-xs text-error">{errors.message}</p>}
              </div>
              {apiErr && <p className="text-sm text-error">{apiErr}</p>}
              <Button type="submit" isLoading={loading} rightIcon={<Send className="h-4 w-4" />} className="w-full">
                Send message
              </Button>
            </form>
          )}
        </FadeIn>
      </div>
    </section>
  )
}
