import { auth } from "@/lib/auth";
import { prApprovedEmail, prRejectedEmail } from "@/lib/emails";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.to || !body?.prTitle || !body?.projectName || !body?.status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { to, prTitle, projectName, status, reviewerName } = body;
  const reviewer = reviewerName ?? session.user.name ?? session.user.email;

  const html =
    status === "approved"
      ? prApprovedEmail(prTitle, projectName, reviewer)
      : prRejectedEmail(prTitle, projectName);

  const subject =
    status === "approved"
      ? `Your merge request was approved — ${projectName}`
      : `Your merge request needs changes — ${projectName}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "CodeMax <onboarding@resend.dev>",
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[CodeMax notify/pr] Failed to send PR notification:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
