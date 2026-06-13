import { auth } from "@/lib/auth";
import { SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Issues a HS256 JWT for the current Better Auth session.
// Spring Boot validates this with the same JWT_SECRET (HS256, sub=userId).
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return NextResponse.json({ token });
}
