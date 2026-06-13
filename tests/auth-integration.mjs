#!/usr/bin/env node
/**
 * Integration tests for the Better Auth + Spring Boot JWT flow.
 *
 * Run from repo root:
 *   node tests/auth-integration.mjs
 *
 * Requires: Node 18+ (native fetch + crypto).
 * Requires: all Docker containers running (`docker compose up`).
 */

const BASE = "http://localhost:3000";
const email = `test-${Date.now()}@integration.local`;
const password = "TestPass123!";
let sessionCookie = "";
let jwtToken = "";
let projectId = "";

// ── helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓  ${msg}`);
    passed++;
  } else {
    console.error(`  ✗  ${msg}`);
    failed++;
  }
}

function extractCookie(headers, name) {
  const cookies = headers.getSetCookie?.() ?? [];
  for (const c of cookies) {
    if (c.startsWith(`${name}=`)) return c.split(";")[0].slice(name.length + 1);
  }
  return null;
}

async function json(res) {
  try { return await res.json() ?? {}; } catch { return {}; }
}

// ── tests ─────────────────────────────────────────────────────────────────────

async function testSignUp() {
  console.log("\n── 1. Sign up ──────────────────────────────────────────────────────");
  const res = await fetch(`${BASE}/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify({ email, password, name: "Integration Test" }),
  });
  const body = await json(res);
  assert(res.status === 200, `POST /auth/sign-up/email → 200 (got ${res.status})`);
  assert(body.user?.email === email, `user.email = ${email}`);
  assert(typeof body.user?.id === "string" && body.user.id.length > 0, "user.id is a UUID string");

  // Sign-up sets a session cookie
  const raw = res.headers.get("set-cookie") ?? "";
  const match = raw.match(/better-auth\.session_token=([^;]+)/);
  if (match) sessionCookie = match[1];
  assert(sessionCookie.length > 0, "session cookie set after sign-up");
}

async function testSignIn() {
  console.log("\n── 2. Sign in ──────────────────────────────────────────────────────");
  const res = await fetch(`${BASE}/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify({ email, password }),
  });
  const body = await json(res);
  assert(res.status === 200, `POST /auth/sign-in/email → 200 (got ${res.status})`);
  assert(body.user?.email === email, `user.email = ${email}`);
  assert(body.redirect === false, "redirect flag is false");

  const raw = res.headers.get("set-cookie") ?? "";
  const match = raw.match(/better-auth\.session_token=([^;]+)/);
  if (match) sessionCookie = match[1];
  assert(sessionCookie.length > 0, "session cookie refreshed after sign-in");
}

async function testGetSession() {
  console.log("\n── 3. Get session ──────────────────────────────────────────────────");
  const res = await fetch(`${BASE}/auth/get-session`, {
    headers: { "Cookie": `better-auth.session_token=${sessionCookie}` },
  });
  const body = await json(res);
  assert(res.status === 200, `GET /auth/get-session → 200 (got ${res.status})`);
  assert(body.user?.email === email, `session user.email = ${email}`);
  assert(typeof body.session?.id === "string", "session.id present");
}

async function testGetApiToken() {
  console.log("\n── 4. Get Spring Boot JWT ──────────────────────────────────────────");
  const res = await fetch(`${BASE}/api/get-api-token`, {
    headers: { "Cookie": `better-auth.session_token=${sessionCookie}` },
  });
  const body = await json(res);
  assert(res.status === 200, `GET /api/get-api-token → 200 (got ${res.status})`);
  assert(typeof body.token === "string" && body.token.length > 0, "JWT token returned");

  if (body.token) {
    jwtToken = body.token;
    // Decode JWT header + payload (no verification — just shape check)
    const [header, payload] = body.token.split(".").slice(0, 2).map(p =>
      JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString())
    );
    assert(header.alg === "HS256", `JWT alg = HS256 (got ${header.alg})`);
    assert(typeof payload.sub === "string" && payload.sub.length === 36, `JWT sub is UUID (got ${payload.sub})`);
    assert(payload.exp > Date.now() / 1000, "JWT not yet expired");
  }
}

async function testCreateProject() {
  console.log("\n── 5. Create project (Spring Boot) ─────────────────────────────────");
  const res = await fetch(`${BASE}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ name: "Integration Test Project", prompt: "Build a simple hello world page" }),
  });
  const body = await json(res);
  assert(res.status === 201, `POST /api/projects → 201 (got ${res.status})`);
  assert(typeof body.project_id === "string", `project_id returned: ${body.project_id}`);
  assert(typeof body.task_id === "string", `task_id returned: ${body.task_id}`);
  if (body.project_id) projectId = body.project_id;
}

async function testListProjects() {
  console.log("\n── 6. List projects (Spring Boot) ──────────────────────────────────");
  const res = await fetch(`${BASE}/api/projects`, {
    headers: { "Authorization": `Bearer ${jwtToken}` },
  });
  const body = await json(res);
  assert(res.status === 200, `GET /api/projects → 200 (got ${res.status})`);
  assert(Array.isArray(body), "response is an array");
  const found = body.some(p => p.id === projectId);
  assert(found, `created project ${projectId} is in the list`);
}

async function testGetProject() {
  if (!projectId) { console.log("\n── 7. Get project — SKIPPED (no projectId)"); return; }
  console.log("\n── 7. Get project (Spring Boot) ────────────────────────────────────");
  const res = await fetch(`${BASE}/api/projects/${projectId}`, {
    headers: { "Authorization": `Bearer ${jwtToken}` },
  });
  const body = await json(res);
  assert(res.status === 200, `GET /api/projects/${projectId} → 200 (got ${res.status})`);
  assert(body.id === projectId, `project.id = ${projectId}`);
  assert(body.name === "Integration Test Project", `project.name correct`);
}

async function testSignOut() {
  console.log("\n── 8. Sign out ─────────────────────────────────────────────────────");
  const res = await fetch(`${BASE}/auth/sign-out`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `better-auth.session_token=${sessionCookie}`,
      "Origin": BASE,
    },
    body: "{}",
  });
  assert(res.status === 200, `POST /auth/sign-out → 200 (got ${res.status})`);

  // Session should now be invalid
  const sessionRes = await fetch(`${BASE}/auth/get-session`, {
    headers: { "Cookie": `better-auth.session_token=${sessionCookie}` },
  });
  const sessionBody = await json(sessionRes);
  assert(sessionBody.session === null || sessionBody.session === undefined, "session invalidated after sign-out");
}

async function testWrongPassword() {
  console.log("\n── 9. Wrong password rejects ───────────────────────────────────────");
  const res = await fetch(`${BASE}/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify({ email, password: "wrongpassword" }),
  });
  assert(res.status !== 200, `wrong password rejected (got ${res.status})`);
}

async function testDuplicateEmail() {
  console.log("\n── 10. Duplicate email rejects ──────────────────────────────────────");
  const res = await fetch(`${BASE}/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify({ email, password, name: "Duplicate" }),
  });
  assert(res.status !== 200, `duplicate email rejected (got ${res.status})`);
}

// ── run all tests ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`  Better Auth + Spring Boot integration tests`);
  console.log(`  Target: ${BASE}`);
  console.log(`  Test email: ${email}`);
  console.log(`${"─".repeat(70)}`);

  try {
    await testSignUp();
    await testSignIn();
    await testGetSession();
    await testGetApiToken();
    await testCreateProject();
    await testListProjects();
    await testGetProject();
    await testSignOut();
    await testWrongPassword();
    await testDuplicateEmail();
  } catch (err) {
    console.error("\nFatal error:", err.message);
    failed++;
  }

  console.log(`\n${"─".repeat(70)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${"─".repeat(70)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
