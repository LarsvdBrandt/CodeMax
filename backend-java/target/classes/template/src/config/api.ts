// ─────────────────────────────────────────────────────────────────────────────
// API CONFIGURATION
// Central place for all API settings. Import { api } wherever you need
// to make requests — do NOT hard-code base URLs or tokens elsewhere.
//
// To connect to your backend:
//   1. Set VITE_API_BASE_URL in a .env file (see .env.example)
//   2. Add your endpoint paths to `endpoints` below
//   3. Use the typed helpers in src/services/api.ts to make calls
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  // Base URL is read from the environment so it can differ per environment
  // (local dev vs staging vs production) without code changes.
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',

  // Default headers sent with every request.
  // The Authorization header is injected dynamically by the fetch wrapper
  // in src/services/api.ts whenever a token is present in storage.
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },

  // Request timeout in milliseconds
  timeout: 10_000,

  // ── Endpoint map ─────────────────────────────────────────────────────────
  // Keep all paths here so a backend URL change is a one-liner.
  endpoints: {
    // Auth — local
    login:    '/api/auth/login',
    register: '/api/auth/register',
    logout:   '/api/auth/logout',
    me:       '/api/auth/me',

    // Auth — OAuth (browser navigates to these; they are not fetch calls)
    oauthGoogle: '/api/auth/google',
    oauthGithub: '/api/auth/github',

    // Example resource endpoints — replace with your own
    posts:    '/api/posts',
    post:     (id: string) => `/api/posts/${id}`,

    users:   '/api/users',
    user:    (id: string) => `/api/users/${id}`,

    contact: '/api/contact',

    // ── Example authenticated resource ───────────────────────────────────────
    // Replace 'todos' with your own resource name.
    // The pattern: list → /api/<resource>, single → /api/<resource>/:id
    todos:       '/api/todos',
    todo:        (id: string) => `/api/todos/${id}`,
    todoToggle:  (id: string) => `/api/todos/${id}/toggle`,
  },
} as const
