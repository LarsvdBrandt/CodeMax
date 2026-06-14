import { NextRequest, NextResponse } from "next/server";

// AI plan generation can take several minutes — override the default 120s proxy timeout.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const backendUrl =
    process.env.BACKEND_URL ?? "http://backend:8000";

  const body = await req.text();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const auth = req.headers.get("Authorization");
  if (auth) headers["Authorization"] = auth;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 290_000); // 4m50s

  try {
    const upstream = await fetch(`${backendUrl}/projects/planning`, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "TIMEOUT", message: "AI plan generation timed out. Please try again." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "UPSTREAM_ERROR", message: String(err) },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
