import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Better Auth handles its own routes — let them through without a session check.
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Spring Boot API calls — let them through; Spring Boot validates the Bearer JWT.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Edge-safe cookie check for browser pages.
  const session = getSessionCookie(request);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
