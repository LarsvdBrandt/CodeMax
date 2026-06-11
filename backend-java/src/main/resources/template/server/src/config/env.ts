// ─────────────────────────────────────────────────────────────────────────────
// ENV VALIDATION
// Validates all required environment variables at startup using Zod.
// If a required variable is missing the server throws immediately with a clear
// error message instead of failing silently at runtime.
//
// Import `env` (not process.env) everywhere else in the server.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT:           z.string().default('3000'),
  MONGODB_URI:    z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET:     z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  GITHUB_CLIENT_ID:     z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Which email driver to use — defaults to 'resend'
  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid', 'mailgun']).default('resend'),
  RESEND_API_KEY:   z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  MAILGUN_API_KEY:  z.string().optional(),
  MAILGUN_DOMAIN:   z.string().optional(),

  FROM_EMAIL: z.string().email().default('hello@example.com'),
  APP_URL:    z.string().url().default('http://localhost:5173'),
})

const result = schema.safeParse(process.env)

if (!result.success) {
  console.error('❌  Invalid environment variables:')
  result.error.issues.forEach(i => console.error(`   ${i.path.join('.')}: ${i.message}`))
  process.exit(1)
}

export const env = result.data
