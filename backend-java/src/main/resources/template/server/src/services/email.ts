// ─────────────────────────────────────────────────────────────────────────────
// Email service
//
// Selects the email driver from env.EMAIL_PROVIDER:
//   resend   — Resend SDK (recommended, free tier: 3 000 emails/month)
//   sendgrid — SendGrid stub (add full implementation when needed)
//   mailgun  — Mailgun stub  (add full implementation when needed)
//
// To switch providers: change EMAIL_PROVIDER in .env and add the API key.
// To add a new email template: add a function below following the pattern of
// sendWelcomeEmail.
// ─────────────────────────────────────────────────────────────────────────────

import { env } from '../config/env'

interface SendOptions {
  to:      string
  subject: string
  html:    string
}

// ── Driver interface ──────────────────────────────────────────────────────────

interface EmailDriver {
  send(opts: SendOptions): Promise<void>
}

// ── Resend driver (primary) ───────────────────────────────────────────────────

async function getResendDriver(): Promise<EmailDriver> {
  const { Resend } = await import('resend')
  const client     = new Resend(env.RESEND_API_KEY ?? '')

  return {
    async send({ to, subject, html }) {
      if (!env.RESEND_API_KEY) {
        console.warn('⚠️  RESEND_API_KEY not set — email not sent')
        return
      }
      const { error } = await client.emails.send({ from: env.FROM_EMAIL, to, subject, html })
      if (error) throw new Error(`Resend error: ${error.message}`)
    },
  }
}

// ── SendGrid stub ─────────────────────────────────────────────────────────────
// To implement: npm install @sendgrid/mail, then replace the log with:
//   import sgMail from '@sendgrid/mail'
//   sgMail.setApiKey(env.SENDGRID_API_KEY)
//   await sgMail.send({ to, from: env.FROM_EMAIL, subject, html })

function getSendGridDriver(): EmailDriver {
  return {
    async send({ to, subject }) {
      if (!env.SENDGRID_API_KEY) {
        console.warn('⚠️  SENDGRID_API_KEY not set — email not sent')
        return
      }
      // TODO: implement with @sendgrid/mail
      console.log(`[SendGrid stub] Would send "${subject}" to ${to}`)
    },
  }
}

// ── Mailgun stub ──────────────────────────────────────────────────────────────
// To implement: use the Mailgun.js SDK or nodemailer SMTP transport.
//   https://documentation.mailgun.com/en/latest/quickstart-sending.html

function getMailgunDriver(): EmailDriver {
  return {
    async send({ to, subject }) {
      if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) {
        console.warn('⚠️  MAILGUN_API_KEY / MAILGUN_DOMAIN not set — email not sent')
        return
      }
      // TODO: implement with mailgun.js
      console.log(`[Mailgun stub] Would send "${subject}" to ${to}`)
    },
  }
}

// ── Driver factory ────────────────────────────────────────────────────────────

async function getDriver(): Promise<EmailDriver> {
  switch (env.EMAIL_PROVIDER) {
    case 'sendgrid': return getSendGridDriver()
    case 'mailgun':  return getMailgunDriver()
    default:         return getResendDriver()
  }
}

// ── HTML template helpers ─────────────────────────────────────────────────────

function layout(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:Inter,system-ui,sans-serif;color:#fafafa">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#121214;border:1px solid #27272a;border-radius:8px;padding:40px">
            <tr><td>
              <p style="margin:0 0 32px;font-size:20px;font-weight:700;color:#ffffff">⚡ AppTemplate</p>
              ${content}
              <p style="margin:32px 0 0;font-size:12px;color:#71717a">
                You received this email because you signed up for AppTemplate.<br>
                If you did not create an account you can safely ignore this email.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `
}

// ── Exported email helpers ────────────────────────────────────────────────────

export async function sendWelcomeEmail(user: { name: string; email: string }): Promise<void> {
  const driver = await getDriver()
  await driver.send({
    to:      user.email,
    subject: 'Welcome to AppTemplate!',
    html:    layout(`
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:700">Welcome, ${user.name}!</h1>
      <p style="margin:0 0 16px;color:#a1a1aa;line-height:1.6">
        Your account has been created. You can now sign in and start using AppTemplate.
      </p>
      <a href="${env.APP_URL}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
        Go to AppTemplate
      </a>
    `),
  })
}

export async function sendContactConfirmation(contact: { name: string; email: string; subject: string }): Promise<void> {
  const driver = await getDriver()
  await driver.send({
    to:      contact.email,
    subject: `We received your message: ${contact.subject}`,
    html:    layout(`
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:700">Thanks, ${contact.name}!</h1>
      <p style="margin:0 0 16px;color:#a1a1aa;line-height:1.6">
        We received your message about "<strong style="color:#fafafa">${contact.subject}</strong>"
        and will get back to you within 1 business day.
      </p>
    `),
  })
}
