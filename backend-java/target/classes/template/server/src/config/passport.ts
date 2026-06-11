// ─────────────────────────────────────────────────────────────────────────────
// Passport strategies
//
// Four strategies are registered:
//   local    — email + password (used by POST /auth/login)
//   google   — OAuth 2.0 (used by GET /auth/google)
//   github   — OAuth 2.0 (used by GET /auth/github)
//   jwt      — Bearer token (used by authenticate middleware on protected routes)
//
// Google and GitHub both upsert users: if the OAuth account matches an existing
// email the accounts are merged; otherwise a new user is created.
// ─────────────────────────────────────────────────────────────────────────────

import passport from 'passport'
import { Strategy as LocalStrategy }  from 'passport-local'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { User } from '../models/User'
import { env } from './env'

// ── Local strategy ────────────────────────────────────────────────────────────
passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await (User as any).findByEmail(email)
      if (!user || !(await user.comparePassword(password))) {
        return done(null, false, { message: 'Invalid email or password' })
      }
      return done(null, user)
    } catch (err) {
      return done(err)
    }
  }),
)

// ── JWT strategy ──────────────────────────────────────────────────────────────
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.sub)
        if (!user) return done(null, false)
        return done(null, user)
      } catch (err) {
        return done(err)
      }
    },
  ),
)

// ── Google OAuth strategy ─────────────────────────────────────────────────────
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL:  `${env.APP_URL.replace('5173', '3000')}/api/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email     = profile.emails?.[0]?.value ?? ''
          const avatarUrl = profile.photos?.[0]?.value

          // Try to find existing user by OAuth id or email
          let user = await User.findOne({ $or: [{ providerId: profile.id, provider: 'google' }, { email }] })

          if (user) {
            // Update OAuth fields if the account was originally local
            if (!user.providerId) {
              user.provider   = 'google'
              user.providerId = profile.id
              if (avatarUrl) user.avatarUrl = avatarUrl
              await user.save()
            }
          } else {
            user = await User.create({
              email,
              name:          profile.displayName,
              provider:      'google',
              providerId:    profile.id,
              avatarUrl,
              emailVerified: true,
            })
          }

          return done(null, user)
        } catch (err) {
          return done(err as Error)
        }
      },
    ),
  )
} else {
  console.warn('⚠️  Google OAuth not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing)')
}

// ── GitHub OAuth strategy ─────────────────────────────────────────────────────
if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID:     env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL:  `${env.APP_URL.replace('5173', '3000')}/api/auth/github/callback`,
        scope:        ['user:email'],
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          const email     = profile.emails?.[0]?.value ?? `${profile.username}@github.local`
          const avatarUrl = profile.photos?.[0]?.value

          let user = await User.findOne({ $or: [{ providerId: profile.id, provider: 'github' }, { email }] })

          if (user) {
            if (!user.providerId) {
              user.provider   = 'github'
              user.providerId = String(profile.id)
              if (avatarUrl) user.avatarUrl = avatarUrl
              await user.save()
            }
          } else {
            user = await User.create({
              email,
              name:          profile.displayName || profile.username,
              provider:      'github',
              providerId:    String(profile.id),
              avatarUrl,
              emailVerified: true,
            })
          }

          return done(null, user)
        } catch (err) {
          return done(err as Error)
        }
      },
    ),
  )
} else {
  console.warn('⚠️  GitHub OAuth not configured (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET missing)')
}

export default passport
