// ─────────────────────────────────────────────────────────────────────────────
// Login page — email + password form, wired to useAuth().login().
// Redirects to / (or the page the user came from) on success.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Zap } from 'lucide-react'
import { Input }   from '@/components/ui/Input'
import { Button }  from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { useAuth } from '@/hooks/useAuth'
import { api }     from '@/config/api'
import { CONTENT } from '@/config/content'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [errors,   setErrors]   = useState<{ email?: string; password?: string }>({})

  const { login, loading, error } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  // After login, redirect to where the user came from (or home)
  const from = (location.state as { from?: string })?.from ?? '/'

  function validate(): boolean {
    const e: typeof errors = {}
    if (!/\S+@\S+\.\S+/.test(email)) e.email    = 'Enter a valid email'
    if (password.length < 6)          e.password = 'Password must be at least 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    try {
      await login({ email, password })
      navigate(from, { replace: true })
    } catch {
      // error is surfaced via useAuth().error
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
          <span className="gradient-text">{CONTENT.brand.name}</span>
        </Link>

        {/* Card */}
        <div className="rounded-lg border border-border bg-surface p-8 shadow-float">
          <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-sm text-muted mb-8">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: undefined })) }}
              error={errors.email}
              icon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: undefined })) }}
              error={errors.password}
              icon={<Lock className="h-4 w-4" />}
            />

            {/* Forgot password link */}
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-muted hover:text-foreground transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* API-level error */}
            {error && <p className="text-sm text-error">{error}</p>}

            <Button type="submit" isLoading={loading} className="w-full" size="lg">
              Sign in
            </Button>
          </form>

          {/* OAuth divider */}
          <Divider label="or continue with" className="my-6" />

          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => { window.location.href = `${api.baseUrl}${api.endpoints.oauthGoogle}` }}
            >
              {/* Google icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => { window.location.href = `${api.baseUrl}${api.endpoints.oauthGithub}` }}
            >
              {/* GitHub icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Continue with GitHub
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
