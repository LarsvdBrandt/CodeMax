// ─────────────────────────────────────────────────────────────────────────────
// Register page — name + email + password form, wired to useAuth().register().
// Redirects to / on success.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Zap } from 'lucide-react'
import { Input }   from '@/components/ui/Input'
import { Divider } from '@/components/ui/Divider'
import { api }     from '@/config/api'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

interface FormState {
  name:     string
  email:    string
  password: string
  confirm:  string
}

export default function Register() {
  const [form,   setForm]   = useState<FormState>({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<FormState>>({})

  const { register, loading, error } = useAuth()
  const navigate = useNavigate()

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }))
      setErrors(er => ({ ...er, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const e: Partial<FormState> = {}
    if (!form.name.trim())                       e.name     = 'Name is required'
    if (!/\S+@\S+\.\S+/.test(form.email))        e.email    = 'Enter a valid email'
    if (form.password.length < 8)                e.password = 'Password must be at least 8 characters'
    if (form.confirm !== form.password)          e.confirm  = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    try {
      await register({ name: form.name, email: form.email, password: form.password })
      navigate('/')
    } catch {
      // error shown via useAuth().error
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-lg mb-8">
          <Zap className="h-5 w-5 text-accent" />
          <span className="gradient-text">AppTemplate</span>
        </Link>

        {/* Card */}
        <div className="rounded-lg border border-border bg-surface p-8 shadow-float">
          <h1 className="text-2xl font-bold text-foreground mb-1">Create an account</h1>
          <p className="text-sm text-muted mb-8">Start for free. No credit card required.</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              icon={<User className="h-4 w-4" />}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              icon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              hint="Must be at least 8 characters"
              icon={<Lock className="h-4 w-4" />}
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={set('confirm')}
              error={errors.confirm}
              icon={<Lock className="h-4 w-4" />}
            />

            {error && <p className="text-sm text-error">{error}</p>}

            <Button type="submit" isLoading={loading} className="w-full" size="lg">
              Create account
            </Button>
          </form>

          {/* OAuth divider */}
          <Divider label="or continue with" className="my-6" />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1"
              onClick={() => { window.location.href = `${api.baseUrl}${api.endpoints.oauthGoogle}` }}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </Button>
            <Button variant="secondary" className="flex-1"
              onClick={() => { window.location.href = `${api.baseUrl}${api.endpoints.oauthGithub}` }}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>

          {/* Terms fine-print */}
          <p className="mt-4 text-center text-xs text-muted">
            By registering you agree to our{' '}
            <Link to="/terms"   className="underline hover:text-foreground">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
