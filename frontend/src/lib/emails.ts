/**
 * CodeMax email templates — dark-themed HTML emails matching the app UI.
 *
 * Style: black background, #0d0d0d card, #1e1e1e border, white text,
 *        white CTA button, Inter/system-ui font stack.
 */

const BRAND = "CodeMax";
const BASE_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// ── shared shell ─────────────────────────────────────────────────────────────

function shell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <title>${BRAND}</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Card -->
        <table role="presentation" width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">

          <!-- Logo row -->
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#0d0d0d;border:1px solid #1e1e1e;border-radius:10px;padding:8px 14px;">
                    <span style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${BRAND}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content card -->
          <tr>
            <td style="background-color:#0a0a0a;border:1px solid #1e1e1e;border-radius:16px;padding:40px 40px 36px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#333333;line-height:1.6;">
                You received this email because you have an account with ${BRAND}.<br />
                If you didn't request this, you can safely ignore it.
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#222222;">
                © ${new Date().getFullYear()} ${BRAND}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── button component ──────────────────────────────────────────────────────────

function ctaButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 24px;">
      <tr>
        <td style="border-radius:10px;background-color:#ffffff;">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#000000;text-decoration:none;border-radius:10px;letter-spacing:-0.2px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

// ── fallback url block ────────────────────────────────────────────────────────

function fallbackUrl(url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
      <tr>
        <td style="background-color:#0d0d0d;border:1px solid #1e1e1e;border-radius:10px;padding:14px 16px;">
          <p style="margin:0 0 6px;font-size:11px;color:#444444;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Or copy this link</p>
          <p style="margin:0;font-size:12px;color:#555555;word-break:break-all;line-height:1.6;">${url}</p>
        </td>
      </tr>
    </table>`;
}

// ── divider ───────────────────────────────────────────────────────────────────

const divider = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;">
  <tr><td style="border-top:1px solid #1e1e1e;"></td></tr>
</table>`;

// ── templates ─────────────────────────────────────────────────────────────────

export function welcomeEmail(name: string): string {
  return shell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
      Welcome to ${BRAND}
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">
      Your account is ready. Start describing an app and we'll build it for you.
    </p>

    ${divider}

    <!-- Feature list -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      ${[
        ["Describe any app", "Type what you want to build in plain English — no code needed."],
        ["AI builds it instantly", "GPT-4o writes the code, sets up the database, and deploys it live."],
        ["Full code access", "Browse, edit, and download every file your app generates."],
      ].map(([title, desc]) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #111111;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:6px;padding-top:3px;vertical-align:top;">
                <div style="width:4px;height:4px;background-color:#ffffff;border-radius:50%;margin-top:5px;"></div>
              </td>
              <td style="padding-left:12px;">
                <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#ffffff;">${title}</p>
                <p style="margin:0;font-size:13px;color:#555555;line-height:1.5;">${desc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`).join("")}
    </table>

    ${ctaButton("Start building →", BASE_URL)}

    <p style="margin:0;font-size:12px;color:#333333;line-height:1.6;">
      Questions? Reply to this email — we read everything.
    </p>
  `);
}

export function resetPasswordEmail(resetUrl: string): string {
  return shell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
      Reset your password
    </h1>
    <p style="margin:0 0 4px;font-size:14px;color:#888888;line-height:1.6;">
      We received a request to reset your ${BRAND} password.
    </p>
    <p style="margin:0 0 0;font-size:13px;color:#444444;line-height:1.6;">
      This link expires in <strong style="color:#666666;">1 hour</strong>.
    </p>

    ${ctaButton("Reset password", resetUrl)}

    ${divider}

    ${fallbackUrl(resetUrl)}

    <p style="margin:20px 0 0;font-size:12px;color:#333333;line-height:1.6;">
      If you didn't request a password reset, your account is safe — you can ignore this email.
    </p>
  `);
}

export function verifyEmailEmail(verifyUrl: string): string {
  return shell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
      Verify your email
    </h1>
    <p style="margin:0 0 0;font-size:14px;color:#888888;line-height:1.6;">
      Click the button below to confirm your email address and activate your ${BRAND} account.
    </p>

    ${ctaButton("Verify email address", verifyUrl)}

    ${divider}

    ${fallbackUrl(verifyUrl)}
  `);
}

export function prApprovedEmail(prTitle: string, projectName: string, reviewerName: string): string {
  return shell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
      Merge request approved
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">
      <strong style="color:#ffffff;">${reviewerName}</strong> approved your merge request in
      <strong style="color:#ffffff;">${projectName}</strong>.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      <tr>
        <td style="background-color:#0d0d0d;border:1px solid #1e3a1e;border-radius:10px;padding:16px 18px;">
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#2d6a2d;font-weight:600;">Approved</p>
          <p style="margin:0;font-size:14px;color:#ffffff;font-weight:600;">${prTitle}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 4px;font-size:13px;color:#555555;line-height:1.6;">
      The changes from your branch have been merged into <strong style="color:#888">main</strong>. The preview has been updated.
    </p>
  `);
}

export function prRejectedEmail(prTitle: string, projectName: string): string {
  return shell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
      Merge request needs changes
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">
      Your merge request in <strong style="color:#ffffff;">${projectName}</strong> was not approved yet.
      A new task has been created on your branch so the AI agent can rework it.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      <tr>
        <td style="background-color:#0d0d0d;border:1px solid #3a1e1e;border-radius:10px;padding:16px 18px;">
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8b2020;font-weight:600;">Changes requested</p>
          <p style="margin:0;font-size:14px;color:#ffffff;font-weight:600;">${prTitle}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#555555;line-height:1.6;">
      Open the project to review the feedback and iterate on your branch.
    </p>
  `);
}

export function memberJoinedEmail(memberEmail: string, projectName: string, role: string): string {
  const roleLabel = role === "admin" ? "Admin" : role === "maintainer" ? "Maintainer" : "Observer";
  return shell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
      Someone joined your project
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">
      A team member has accepted their invitation to <strong style="color:#ffffff;">${projectName}</strong>.
    </p>

    ${divider}

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="padding:6px 0;">
          <p style="margin:0 0 3px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#333333;font-weight:600;">Member</p>
          <p style="margin:0;font-size:14px;color:#ffffff;">${memberEmail}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;">
          <p style="margin:0 0 3px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#333333;font-weight:600;">Role</p>
          <p style="margin:0;font-size:14px;color:#ffffff;">${roleLabel}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;">
          <p style="margin:0 0 3px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#333333;font-weight:600;">Project</p>
          <p style="margin:0;font-size:14px;color:#ffffff;">${projectName}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#333333;line-height:1.6;">
      You can manage team roles from inside the project.
    </p>
  `);
}

export function projectInviteEmail(
  inviterName: string,
  projectName: string,
  inviteUrl: string,
  role: string
): string {
  const roleLabel = role === "admin" ? "Admin" : role === "maintainer" ? "Maintainer" : "Observer";
  return shell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
      You're invited to a project
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:#888888;line-height:1.6;">
      <strong style="color:#ffffff;">${inviterName}</strong> has invited you to collaborate on
      <strong style="color:#ffffff;">${projectName}</strong> as a <strong style="color:#ffffff;">${roleLabel}</strong>.
    </p>

    ${ctaButton("Accept invitation →", inviteUrl)}

    ${divider}

    ${fallbackUrl(inviteUrl)}

    <p style="margin:20px 0 0;font-size:12px;color:#333333;line-height:1.6;">
      If you don't have a ${BRAND} account yet, you'll be asked to create one first.
    </p>
  `);
}
