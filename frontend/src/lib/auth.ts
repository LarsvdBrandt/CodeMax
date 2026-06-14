import { betterAuth } from "better-auth";
import { PostgresDialect } from "kysely";
import pg from "pg";
import { Resend } from "resend";
import { welcomeEmail, resetPasswordEmail, verifyEmailEmail } from "./emails";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getFromEmail() {
  const fromEnv = process.env.RESEND_FROM_EMAIL;
  if (fromEnv) return fromEnv;
  // Resend's pre-verified test address — works with any API key, delivers to your account email.
  return "CodeMax <onboarding@resend.dev>";
}

async function sendEmail(to: string, subject: string, html: string) {
  const { data, error } = await getResend().emails.send({
    from: getFromEmail(),
    to,
    subject,
    html,
  });
  if (error) {
    console.error(`[CodeMax email] Failed to send "${subject}" to ${to}:`, error);
  } else {
    console.log(`[CodeMax email] Sent "${subject}" to ${to} (id: ${data?.id})`);
  }
}

const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

const extraOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map(s => s.trim()).filter(Boolean)
  : [];

export const auth = betterAuth({
  secret: process.env.JWT_SECRET!,
  baseURL: appUrl,
  basePath: "/auth",
  trustedOrigins: [appUrl, "http://localhost:3000", ...extraOrigins],
  database: new PostgresDialect({
    pool: new pg.Pool({ connectionString: process.env.DATABASE_URL }),
  }),

  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },

  user: {
    modelName: "users",
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    additionalFields: {
      fullName: { type: "string", required: false, fieldName: "full_name" },
      companyName: { type: "string", required: false, fieldName: "company_name" },
      companyAddress: { type: "string", required: false, fieldName: "company_address" },
      companyCity: { type: "string", required: false, fieldName: "company_city" },
      companyCountry: { type: "string", required: false, fieldName: "company_country" },
      website: { type: "string", required: false, fieldName: "website" },
      bio: { type: "string", required: false, fieldName: "bio" },
    },
  },

  session: {
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
    },
  },

  account: {
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  verification: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  // Send welcome email when a new user signs up.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Fire and forget — don't delay sign-up response waiting for email.
          sendEmail(
            user.email,
            `Welcome to CodeMax`,
            welcomeEmail(user.name ?? user.email),
          ).catch((err) => console.error("[CodeMax email] Welcome email error:", err));
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(
        user.email,
        "Reset your CodeMax password",
        resetPasswordEmail(url),
      );
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(
        user.email,
        "Verify your CodeMax email",
        verifyEmailEmail(url),
      );
    },
  },
});

export type Session = typeof auth.$Infer.Session;
