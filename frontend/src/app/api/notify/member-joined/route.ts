import { auth } from "@/lib/auth";
import { memberJoinedEmail } from "@/lib/emails";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.to || !body?.memberEmail || !body?.projectName || !body?.role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { to, memberEmail, projectName, role } = body;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "CodeMax <onboarding@resend.dev>",
    to,
    subject: `${memberEmail} joined ${projectName} on CodeMax`,
    html: memberJoinedEmail(memberEmail, projectName, role),
  });

  if (error) {
    console.error("[CodeMax notify/member-joined] Failed to send notification:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
