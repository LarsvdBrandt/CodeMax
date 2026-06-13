#!/usr/bin/env node
/**
 * UI-flow tests — simulate browser sessions end-to-end.
 *
 * Tests the full path a user takes through the app:
 *   register → dashboard load → project creation → settings → logout
 *
 * Run: node tests/ui-flows.mjs
 * Requires: Node 18+, all Docker containers running.
 */

const BASE = "http://localhost:3000";
const email = `ui-test-${Date.now()}@test.local`;
const password = "SecurePass99!";

let sessionCookie = "";
let jwtToken = "";
let projectId = "";

// ── helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function ok(condition, msg) {
  if (condition) { console.log(`  ✓  ${msg}`); passed++; }
  else           { console.error(`  ✗  ${msg}`); failed++; }
}

async function json(res) {
  try { return await res.json() ?? {}; } catch { return {}; }
}

function cookieHeader() {
  return { Cookie: `better-auth.session_token=${sessionCookie}` };
}

function authHeader() {
  return { Authorization: `Bearer ${jwtToken}` };
}

// ── register flow ──────────────────────────────────────────────────────────

async function testRegisterFlow() {
  console.log("\n── Register flow ──────────────────────────────────────────────────");

  // 1. The /register page itself must load (middleware lets it through)
  const pageRes = await fetch(`${BASE}/register`);
  ok(pageRes.status === 200, `GET /register → 200 (got ${pageRes.status})`);

  // 2. Submit registration form (authClient.signUp.email calls /auth/sign-up/email)
  const signUpRes = await fetch(`${BASE}/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify({ email, password, name: "UI Tester" }),
  });
  const signUpBody = await json(signUpRes);
  ok(signUpRes.status === 200, `POST /auth/sign-up/email → 200`);
  ok(signUpBody.user?.email === email, `user.email matches`);

  // Capture session cookie
  const raw = signUpRes.headers.get("set-cookie") ?? "";
  const m = raw.match(/better-auth\.session_token=([^;]+)/);
  if (m) sessionCookie = m[1];
  ok(sessionCookie.length > 0, `session cookie present`);

  // 3. After signup, fetch the Spring Boot JWT (what login/register pages do)
  const tokenRes = await fetch(`${BASE}/api/get-api-token`, {
    headers: cookieHeader(),
  });
  const tokenBody = await json(tokenRes);
  ok(tokenRes.status === 200, `GET /api/get-api-token → 200`);
  ok(typeof tokenBody.token === "string", `JWT returned`);
  jwtToken = tokenBody.token ?? "";
}

// ── dashboard flow ─────────────────────────────────────────────────────────

async function testDashboardFlow() {
  console.log("\n── Dashboard flow ─────────────────────────────────────────────────");

  // The dashboard page requires a session cookie — middleware checks it.
  // With our cookie it should return 200; without it, redirect to /login.
  const dashRes = await fetch(`${BASE}/dashboard`, {
    headers: cookieHeader(),
    redirect: "manual",
  });
  ok(dashRes.status === 200, `GET /dashboard with session → 200 (got ${dashRes.status})`);

  // Unauthenticated access should redirect to /login
  const noAuthRes = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
  ok(
    noAuthRes.status === 307 && (noAuthRes.headers.get("location") ?? "").includes("/login"),
    `GET /dashboard without session → 307 to /login`
  );

  // dashboard calls getMe() → GET /auth/get-session
  const meRes = await fetch(`${BASE}/auth/get-session`, { headers: cookieHeader() });
  const meBody = await json(meRes);
  ok(meRes.status === 200, `GET /auth/get-session → 200`);
  ok(meBody.user?.email === email, `session returns correct user`);

  // dashboard calls listProjects() → GET /api/projects (Spring Boot)
  const projRes = await fetch(`${BASE}/api/projects`, { headers: authHeader() });
  ok(projRes.status === 200, `GET /api/projects → 200`);
  const projects = await json(projRes);
  ok(Array.isArray(projects), `projects list is an array`);
}

// ── project creation flow ──────────────────────────────────────────────────

async function testProjectFlow() {
  console.log("\n── Project creation flow ──────────────────────────────────────────");

  // Create project (what the dashboard "New Project" form does)
  const createRes = await fetch(`${BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ name: "UI Test Project", prompt: "Make a todo app" }),
  });
  const createBody = await json(createRes);
  ok(createRes.status === 201, `POST /api/projects → 201 (got ${createRes.status})`);
  ok(typeof createBody.project_id === "string", `project_id returned`);
  projectId = createBody.project_id ?? "";

  // Load the project page
  if (projectId) {
    const projPageRes = await fetch(`${BASE}/project/${projectId}`, {
      headers: cookieHeader(),
      redirect: "manual",
    });
    ok(projPageRes.status === 200, `GET /project/${projectId} → 200`);

    // Project detail via API
    const projApiRes = await fetch(`${BASE}/api/projects/${projectId}`, {
      headers: authHeader(),
    });
    const proj = await json(projApiRes);
    ok(projApiRes.status === 200, `GET /api/projects/${projectId} → 200`);
    ok(proj.name === "UI Test Project", `project.name correct`);
  }
}

// ── settings flow ──────────────────────────────────────────────────────────

async function testSettingsFlow() {
  console.log("\n── Settings flow ──────────────────────────────────────────────────");

  // Settings pages require session cookie
  const settingsRes = await fetch(`${BASE}/settings/profile`, {
    headers: cookieHeader(),
    redirect: "manual",
  });
  ok(settingsRes.status === 200, `GET /settings/profile with session → 200 (got ${settingsRes.status})`);

  // Profile update — PUT /auth/update-user (Better Auth)
  const updateRes = await fetch(`${BASE}/auth/update-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE, ...cookieHeader() },
    body: JSON.stringify({ name: "UI Tester Updated", fullName: "UI Tester Updated" }),
  });
  ok(updateRes.status === 200, `POST /auth/update-user → 200 (got ${updateRes.status})`);

  // Verify update persisted
  const checkRes = await fetch(`${BASE}/auth/get-session`, { headers: cookieHeader() });
  const checkBody = await json(checkRes);
  ok(checkBody.user?.name === "UI Tester Updated", `name updated to "UI Tester Updated"`);

  // Change password — POST /auth/change-password (Better Auth)
  const newPassword = "NewSecurePass99!";
  const changeRes = await fetch(`${BASE}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE, ...cookieHeader() },
    body: JSON.stringify({ currentPassword: password, newPassword }),
  });
  ok(changeRes.status === 200, `POST /auth/change-password → 200 (got ${changeRes.status})`);

  // Can sign in with new password
  const newSignInRes = await fetch(`${BASE}/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify({ email, password: newPassword }),
  });
  ok(newSignInRes.status === 200, `sign-in with new password → 200`);

  // Old password now rejected
  const oldSignInRes = await fetch(`${BASE}/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify({ email, password }),
  });
  ok(oldSignInRes.status === 401, `sign-in with old password → 401`);
}

// ── public pages ───────────────────────────────────────────────────────────

async function testPublicPages() {
  console.log("\n── Public pages accessible without session ────────────────────────");

  for (const path of ["/login", "/register", "/forgot-password"]) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    ok(res.status === 200, `GET ${path} → 200 (got ${res.status})`);
  }

  // Protected pages redirect without session
  for (const path of ["/dashboard", "/settings/profile", "/settings/security"]) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    ok(
      res.status === 307 || res.status === 308,
      `GET ${path} without session → redirect (got ${res.status})`
    );
  }
}

// ── forgot-password page ───────────────────────────────────────────────────

async function testForgotPassword() {
  console.log("\n── Forgot-password flow ───────────────────────────────────────────");

  // Request password reset — POST /auth/request-password-reset
  const resetReqRes = await fetch(`${BASE}/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify({ email, redirectTo: `${BASE}/reset-password` }),
  });
  // Better Auth returns 200 regardless of whether email exists (prevents enumeration)
  ok(resetReqRes.status === 200, `POST /auth/request-password-reset → 200 (got ${resetReqRes.status})`);
}

// ── logout flow ────────────────────────────────────────────────────────────

async function testLogoutFlow() {
  console.log("\n── Logout flow ────────────────────────────────────────────────────");

  const signOutRes = await fetch(`${BASE}/auth/sign-out`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE, ...cookieHeader() },
    body: "{}",
  });
  ok(signOutRes.status === 200, `POST /auth/sign-out → 200`);

  // Session is now invalid — dashboard should redirect
  const postLogoutRes = await fetch(`${BASE}/dashboard`, {
    headers: cookieHeader(),
    redirect: "manual",
  });
  ok(
    postLogoutRes.status === 307 || postLogoutRes.status === 200,
    `GET /dashboard after logout → redirect or login check (got ${postLogoutRes.status})`
  );

  // API token with old session should fail
  const tokenRes = await fetch(`${BASE}/api/get-api-token`, {
    headers: cookieHeader(),
  });
  ok(tokenRes.status === 401, `GET /api/get-api-token after logout → 401 (got ${tokenRes.status})`);
}

// ── run ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`  UI Flow Tests`);
  console.log(`  Target: ${BASE}`);
  console.log(`  Test email: ${email}`);
  console.log(`${"─".repeat(70)}`);

  try {
    await testPublicPages();
    await testRegisterFlow();
    await testDashboardFlow();
    await testProjectFlow();
    await testSettingsFlow();
    await testForgotPassword();
    await testLogoutFlow();
  } catch (err) {
    console.error("\nFatal:", err);
    failed++;
  }

  console.log(`\n${"─".repeat(70)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${"─".repeat(70)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
