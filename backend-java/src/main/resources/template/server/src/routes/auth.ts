// ─────────────────────────────────────────────────────────────────────────────
// Auth routes
//
// POST /api/auth/register       — create account
// POST /api/auth/login          — email/password login
// GET  /api/auth/logout         — informational (JWT is stateless; client drops token)
// GET  /api/auth/me             — get current user (requires Bearer token)
// GET  /api/auth/google         — start Google OAuth flow
// GET  /api/auth/google/callback
// GET  /api/auth/github         — start GitHub OAuth flow
// GET  /api/auth/github/callback
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express'
import passport from 'passport'
import { z } from 'zod'
import { User }             from '../models/User'
import { signToken }        from '../utils/jwt'
import { validate }         from '../middleware/validate'
import { authenticate }     from '../middleware/authenticate'
import { sendWelcomeEmail } from '../services/email'
import { env }              from '../config/env'
import { IUser }            from '../models/User'

const router = Router()

// ── Zod schemas ───────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name:     z.string().min(1, 'Name is required'),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function serializeUser(user: IUser) {
  return {
    id:            String(user._id).toString(),
    email:         user.email,
    name:          user.name,
    role:          user.role,
    avatarUrl:     user.avatarUrl,
    provider:      user.provider,
    emailVerified: user.emailVerified,
    createdAt:     user.createdAt,
  }
}

function makeTokens(user: IUser) {
  const accessToken = signToken({
    sub:   String(user._id).toString(),
    email: user.email,
    role:  user.role,
  })
  return { accessToken }
}

// ── POST /register ────────────────────────────────────────────────────────────

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body as z.infer<typeof registerSchema>

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' })
    }

    const user = await User.create({ name, email, password })
    const tokens = makeTokens(user)

    // Fire-and-forget — don't fail registration if email fails
    sendWelcomeEmail({ name: user.name, email: user.email }).catch(console.error)

    return res.status(201).json({ success: true, data: { user: serializeUser(user), tokens } })
  } catch (err) {
    next(err)
  }
})

// ── POST /login ───────────────────────────────────────────────────────────────

router.post('/login', validate(loginSchema), (req, res, next) => {
  passport.authenticate('local', { session: false }, (err: Error, user: IUser, info: { message: string }) => {
    if (err)   return next(err)
    if (!user) return res.status(401).json({ success: false, message: info?.message ?? 'Invalid credentials' })

    const tokens = makeTokens(user)
    return res.json({ success: true, data: { user: serializeUser(user), tokens } })
  })(req, res, next)
})

// ── GET /logout ───────────────────────────────────────────────────────────────
// JWT is stateless — no server-side session to clear. The client must discard the token.

router.get('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out — please discard your token' })
})

// ── GET /me ───────────────────────────────────────────────────────────────────

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: serializeUser(req.user as IUser) })
})

// ── Google OAuth ──────────────────────────────────────────────────────────────

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
)

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${env.APP_URL}/login?error=oauth` }),
  (req, res) => {
    const token = makeTokens(req.user as IUser).accessToken
    // Redirect to frontend — token is read from URL param by OAuthCallback page
    res.redirect(`${env.APP_URL}/oauth-callback?token=${token}`)
  },
)

// ── GitHub OAuth ──────────────────────────────────────────────────────────────

router.get('/github',
  passport.authenticate('github', { scope: ['user:email'], session: false }),
)

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${env.APP_URL}/login?error=oauth` }),
  (req, res) => {
    const token = makeTokens(req.user as IUser).accessToken
    res.redirect(`${env.APP_URL}/oauth-callback?token=${token}`)
  },
)

export default router
