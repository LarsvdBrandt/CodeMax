import { auth } from "@/lib/auth";
import { projectInviteEmail } from "@/lib/emails";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getFromEmail() {
  return process.env.EMAIL_FROM ?? "CodeMax <noreply@codemax.app>";
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.token || !body?.email || !body?.projectName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { token, email, projectName, role } = body;
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${token}`;
  const inviterName = session.user.name ?? session.user.email;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: email,
    subject: `${inviterName} invited you to ${projectName} on CodeMax`,
    html: projectInviteEmail(inviterName, projectName, inviteUrl, role ?? "observer"),
  });

  if (error) {
    console.error("[CodeMax invite] Failed to send invite email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
