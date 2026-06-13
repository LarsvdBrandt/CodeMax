# CodeMax — Frontend

Next.js 14 app (App Router, TypeScript, Tailwind CSS). Handles the UI, user auth via Better Auth, and issues JWTs for the Spring Boot backend.

## Quick Start

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

In Docker: port 3000, served behind Nginx on 8080.

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| Next.js | 14.2 | React framework (App Router) |
| TypeScript | 5.7 | Type safety |
| Tailwind CSS | 3 | Utility-first styling |
| better-auth | 1.6 | Session management, email/password auth |
| Monaco Editor | latest | In-browser code editor (like VS Code) |
| Resend | latest | Email delivery (invites, verification) |
| highlight.js | latest | Syntax highlighting in chat/logs |
| postgres | latest | Direct PostgreSQL access (for Better Auth) |

---

## Directory Structure

```
src/
├── app/                     Next.js App Router pages
│   ├── layout.tsx           Root layout (dark theme: bg-black text-white)
│   ├── page.tsx             Root redirect → /dashboard or /login
│   ├── middleware.ts        Edge middleware: auth guard
│   │
│   ├── auth/[...all]/       Better Auth dynamic handler (sign-in, sign-up, callbacks)
│   │
│   ├── api/
│   │   ├── get-api-token/   Issues HS256 JWT for Spring Boot
│   │   ├── send-invite/     Sends team invite email via Resend
│   │   └── projects/planning/  Calls GPT-4o for app plan generation
│   │
│   ├── login/               Email/password login form
│   ├── register/            Sign-up form
│   ├── forgot-password/     Request password reset
│   ├── reset-password/      Set new password via token
│   ├── verify-email/        Email verification landing
│   │
│   ├── dashboard/           Project list: search, create, delete buttons
│   │
│   ├── welcome/             New project wizard (guided questions + AI plan)
│   │
│   ├── project/[id]/        Main project editor:
│   │   └── page.tsx           • Left: chat, version history, team sidebar
│   │                          • Right: iframe preview or Monaco editor + file tree
│   │                          • Bottom: console / errors / warnings tabs
│   │                          • Clarification flow before first build
│   │                          • API key collection when keys are missing
│   │
│   ├── invite/[token]/      Accept team invite + account setup
│   │
│   └── settings/
│       ├── profile/         Name, email, bio
│       ├── security/        Change password
│       ├── company/         Company name, address, website
│       ├── api-keys/        Manage stored API keys (OpenAI, Stripe, etc.)
│       └── notifications/   Notification preferences
│
├── components/
│   ├── CodeEditor.tsx       Monaco editor (read-only mode + save to backend)
│   ├── FileExplorer.tsx     File tree sidebar — click to open in editor
│   ├── FileTree.tsx         Recursive file tree node renderer
│   ├── AgentLog.tsx         Pipeline step log display (streaming build progress)
│   ├── ProjectsSidebar.tsx  Collapsible sidebar with project list
│   ├── TeamModal.tsx        Invite / manage team members, change roles
│   ├── TeamContent.tsx      Member list with invite / remove actions
│   ├── VersionHistoryModal.tsx  Branches, commits, pull request UI
│   ├── ProjectSettingsModal.tsx  Project name, description, status
│   └── RoleBadge.tsx        Visual chip: observer / maintainer / admin
│
└── lib/
    ├── auth.ts              Better Auth server config (PostgreSQL, Resend, JWT_SECRET, custom fields)
    ├── auth-client.ts       Better Auth client (signIn, signOut, signUp, useSession)
    └── api.ts               HTTP client for Spring Boot API (Bearer JWT, TypeScript interfaces)
```

---

## Auth Flow

1. User hits `/login` or `/register` → Better Auth email/password form
2. Better Auth stores session in PostgreSQL; sets `__Secure-auth.session` cookie (HttpOnly, Secure)
3. On any page load, `middleware.ts` checks for the session cookie; redirects to `/login` if missing
4. After login, frontend calls `GET /api/get-api-token` → receives HS256 JWT
5. JWT saved to `localStorage` as `token`
6. `src/lib/api.ts` reads `localStorage.token` and adds `Authorization: Bearer <token>` to every Spring Boot request

### Public paths (no auth required)
`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/*`, `/invite/*`

### Custom user profile fields (stored in PostgreSQL via Better Auth)
`fullName`, `companyName`, `companyAddress`, `companyCity`, `companyCountry`, `website`, `bio`

---

## API Client — `src/lib/api.ts`

Central HTTP client for all Spring Boot calls. Pattern:

```typescript
// All functions read JWT from localStorage and set Bearer header
const token = localStorage.getItem('token')

const response = await fetch(`${API_BASE}/projects/${id}`, {
  headers: { Authorization: `Bearer ${token}` }
})
```

Key exports (TypeScript interfaces + fetch wrappers):
- `getProjects()`, `createProject()`, `deleteProject()`
- `sendPrompt(id, prompt)`, `getProjectStatus(id)`
- `getFiles(id)`, `getFile(id, path)`, `updateFile(id, path, content)`
- `startContainer(id)`, `stopContainer(id)`, `getLogs(id)`
- `getMembers(id)`, `inviteMember(id, email, role)`, `acceptInvite(token)`
- `getBranches(id)`, `createBranch(id, name, parentId)`, `getPullRequests(id)`, `approvePr(id, prId)`, `rejectPr(id, prId)`

---

## Next.js API Routes

These run server-side in Next.js (not in Spring Boot):

| Route | Method | What it does |
|---|---|---|
| `/api/get-api-token` | GET | Reads Better Auth session → issues HS256 JWT for Spring Boot |
| `/api/send-invite` | POST | Sends team invite email via Resend |
| `/api/projects/planning` | POST | Calls GPT-4o to generate an app plan from user description |

---

## Key Components

### `VersionHistoryModal.tsx`
- Left panel: branch tree (hierarchical, root = main)
- Each branch: status badge + actions (Checkout / Request Merge / Preview / Promote)
- Right panel: commit list for selected branch + PR list
- PR cards: title, status chip, approve/reject buttons (admin only)

### `TeamModal.tsx` / `TeamContent.tsx`
- Lists all project members with role badge
- Owner can invite by email → selects role (observer / maintainer / admin)
- Owner can remove members or change their role

### `CodeEditor.tsx`
- Monaco Editor (same engine as VS Code)
- Read-only mode for observers
- Save button calls `PUT /projects/{id}/files/{path}`

### `AgentLog.tsx`
- Renders the `agent_log` JSONB array from tasks
- Shows step name + output for each pipeline stage
- Polls `/projects/{id}/status` while status is `building`

---

## Environment Variables

| Variable | Description |
|---|---|
| `JWT_SECRET` | Shared with Spring Boot — must match exactly |
| `RESEND_API_KEY` | For sending invite + verification emails |
| `BETTER_AUTH_SECRET` | Better Auth session encryption key |
| `DATABASE_URL` | PostgreSQL connection string (Better Auth reads this) |
| `NEXT_PUBLIC_API_URL` | Base URL for Spring Boot API (default: `/api` via Next.js rewrite) |

---

## Coding Standards

- **No comments** unless the WHY is non-obvious
- **TypeScript strict mode** — no `any`
- **Tailwind only** — no custom CSS files (exception: `globals.css` for base reset)
- **Dark theme by default** — root layout is `bg-black text-white`
- **Server Components by default** — add `'use client'` only when hooks or browser APIs are needed
- **`src/lib/api.ts` for all backend calls** — no raw fetch calls in components
- **Better Auth client** (`src/lib/auth-client.ts`) for all auth operations — never call `/auth/*` directly
