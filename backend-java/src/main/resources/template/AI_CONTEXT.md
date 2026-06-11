# AI_CONTEXT.md — Full Project Map

> Feed this file as context to any AI agent that needs to understand, extend, or replace parts of this codebase. Every file is listed with its purpose, what lives inside it, and how to modify it safely.

---

## What This Project Is

A **production-ready full-stack web application template**.

- **Frontend**: Vite + React 18 + TypeScript (strict) + Tailwind CSS + Framer Motion
- **Backend**: Express + TypeScript + MongoDB Atlas (Mongoose) + Passport.js (JWT + OAuth)
- **Auth**: Local (email/password) + Google OAuth + GitHub OAuth + JWT
- **Email**: Multi-provider (Resend primary, SendGrid/Mailgun stubs, toggled by env var)
- **Example feature**: A Todo app (CRUD) to demonstrate the full authenticated resource pattern
- **Docker**: Multi-stage builds, fully dynamic config (no hardcoded IPs/ports), multiple stacks supported

Everything is a template. The **example feature** (Todo app) is intentionally simple — it shows you the pattern to follow when you replace it with your own resource.

---

## Directory Structure

```
/                           ← Frontend root (Vite)
├── src/
│   ├── config/             ← Env-aware config files
│   ├── components/
│   │   ├── ui/             ← Reusable UI components (the component library)
│   │   └── layout/         ← Navbar, Footer (shared across pages)
│   ├── sections/           ← Home-page sections (Hero, Features, etc.)
│   ├── pages/              ← Route-level components
│   ├── hooks/              ← Custom React hooks
│   ├── services/           ← API call services (one per resource)
│   ├── types/              ← Shared TypeScript types
│   ├── styles/             ← Global CSS (CSS custom properties)
│   └── lib/                ← Utilities (cn() etc.)
├── server/                 ← Express backend
│   └── src/
│       ├── config/         ← DB connection, env validation, Passport setup
│       ├── models/         ← Mongoose models
│       ├── routes/         ← Express routers (one per resource)
│       ├── middleware/      ← Auth, validation, admin guard
│       ├── services/       ← Email service
│       └── utils/          ← JWT, bcrypt helpers
├── docker/
│   ├── nginx/nginx.conf    ← Nginx SPA config (prod frontend)
│   └── mongo/init/         ← Mongo init scripts (placeholder)
├── docker-compose.yml      ← Full-stack dev environment
├── Dockerfile              ← Frontend multi-stage build
├── server/Dockerfile       ← Backend multi-stage build
├── .env.example            ← All frontend + docker env vars
├── server/.env.example     ← All backend env vars
├── COMPONENTS.md           ← Component library catalogue (one entry per component)
└── AI_CONTEXT.md           ← This file
```

---

## Frontend File Map

### `src/config/theme.ts`
**Single source of truth for all design tokens.**
- Change `accent: '99 102 241'` to change the entire colour scheme at once
- Values are RGB triples (no commas) to support Tailwind opacity modifiers (`bg-accent/50`)
- Consumed by `src/styles/globals.css` which writes them as `--color-*` CSS custom properties

```ts
// To change accent colour to teal:
accent: '20 184 166'   // teal-500
```

### `src/styles/globals.css`
Injects CSS custom properties at `:root` from `theme.ts` values, plus utility classes:
- `.glass` — glassmorphism card
- `.gradient-text` — accent gradient on text
- `.section` — standard section padding

### `tailwind.config.js`
Maps CSS vars to Tailwind colour names. This is why `bg-accent`, `text-muted`, `bg-surface`, etc. work.

Custom colours available everywhere: `background`, `foreground`, `muted`, `surface`, `surface-2`, `border`, `accent`, `success`, `warning`, `error`, `info`

### `src/config/api.ts`
**All API endpoint paths in one place.**
- `api.baseUrl` — from `VITE_API_BASE_URL` env var
- `api.timeout` — default 10 000 ms
- `api.endpoints.*` — all paths; functions for parameterised paths (e.g. `todo(id)`)

To add a new resource: add paths here first, then create a service file.

### `vite.config.ts`
- Port from `VITE_PORT` env var (default 5173)
- `host: true` so Docker can expose it
- Path alias `@/` → `src/`

---

## Component Library — `src/components/ui/`

All components are exported from `src/components/ui/index.ts`. Import from there:

```tsx
import { Button, Input, Modal, Toast, Badge } from '@/components/ui'
```

Full details on every component (props, variants, examples) are in **`COMPONENTS.md`**.

Quick reference:

| Component | File | What it does |
|-----------|------|-------------|
| `Button` | `Button.tsx` | Action button. variants: default/secondary/ghost/danger. leftIcon/rightIcon props. |
| `Input` | `Input.tsx` | Text input with label, error, optional leading icon |
| `Card` | `Card.tsx` | Surface container |
| `Modal` | `Modal.tsx` | Dialog with Portal. Sub-components: Modal.Body, Modal.Footer |
| `Toast` + `useToast` | `Toast.tsx` | Notification system. `toast.success/error/warning/info('msg')` |
| `Badge` | `Badge.tsx` | Status pill. variants: default/success/error/warning/info. dot prop |
| `Avatar` + `AvatarGroup` | `Avatar.tsx` | User avatar with fallback initials |
| `Select` | `Select.tsx` | Dropdown select with label + error |
| `Checkbox` | `Checkbox.tsx` | Controlled checkbox with label |
| `Switch` | `Switch.tsx` | Toggle switch |
| `Alert` | `Alert.tsx` | Inline status message. onDismiss makes it closeable |
| `Skeleton` | `Skeleton.tsx` | Loading placeholder. variants: text/circle/rect |
| `Tabs` | `Tabs.tsx` | Tab panel. Sub-components: TabsList, TabsTrigger, TabsContent |
| `Accordion` | `Accordion.tsx` | Collapsible sections. Sub-components: AccordionItem, AccordionTrigger, AccordionContent |
| `Tooltip` | `Tooltip.tsx` | Hover/focus tooltip |
| `Spinner` | `Spinner.tsx` | Loading spinner |
| `Divider` | `Divider.tsx` | Horizontal/vertical divider, optional centered label |
| `Pagination` | `Pagination.tsx` | Page navigator with ellipsis |
| `Table` | `Table.tsx` | Generic typed table `<Table<T> columns={...} data={...} />` |
| `ImageCard` | `ImageCard.tsx` | Image with caption, hover overlay |
| `StatCard` | `StatCard.tsx` | KPI card with icon, value, trend |
| `PricingCard` | `PricingCard.tsx` | Pricing plan card with feature list |
| `EmptyState` | `EmptyState.tsx` | Empty content placeholder with optional CTA |
| `ProgressBar` | `ProgressBar.tsx` | Animated progress bar |

---

## Layout Components — `src/components/layout/`

### `Navbar.tsx`
- Fixed top bar, blur backdrop on scroll
- `NAV_ITEMS` array at top of file — edit to add/remove nav links
- When user is logged in: shows Dashboard link + user name + Sign out
- When logged out: shows Sign in + Get started buttons
- Smooth-scrolls to section IDs on the home page; navigates home first if on another route

### `Footer.tsx`
- 3-column layout: brand/tagline, nav links, social links
- Edit `SOCIAL_LINKS` at top of file

---

## Home Page Sections — `src/sections/`

Each file exports a single section component. All are assembled in `src/pages/Home.tsx`.

| File | Section ID | What to change |
|------|-----------|----------------|
| `HeroSection.tsx` | `hero` | Headline, subheadline, CTA buttons |
| `FeaturesSection.tsx` | `features` | `FEATURES` array: icon, title, description |
| `AboutSection.tsx` | `about` | About copy, stats |
| `WorkSection.tsx` | `work` | `PROJECTS` array: image, title, description, tags |
| `TestimonialsSection.tsx` | _(none)_ | `TESTIMONIALS` array: name, role, text, avatar |
| `ContactSection.tsx` | `contact` | Contact form, submits to `/api/contact` |

To add a section:
1. Create `src/sections/MySection.tsx`
2. Give the root element `id="my-section"`
3. Import and add it in `src/pages/Home.tsx`
4. Add `{ label: 'My Section', section: 'my-section' }` to `NAV_ITEMS` in `Navbar.tsx`

---

## Pages — `src/pages/`

| File | Route | Guard | Description |
|------|-------|-------|-------------|
| `Home.tsx` | `/` | none | Assembles all sections |
| `Login.tsx` | `/login` | AuthRoute (redirect if logged in) | Email/password + OAuth |
| `Register.tsx` | `/register` | AuthRoute | Name/email/password + OAuth |
| `OAuthCallback.tsx` | `/oauth-callback` | none | Reads `?token=` from URL, logs user in |
| `Dashboard.tsx` | `/dashboard` | ProtectedRoute (redirect to /login) | **Todo app — replace this with your feature** |

To add a protected page:
1. Create `src/pages/MyPage.tsx`
2. In `src/App.tsx`: add `const MyPage = lazy(() => import('@/pages/MyPage'))`
3. Add `<Route path="/my-page" element={<MyPage />} />` inside the `<ProtectedRoute>` block

---

## Auth Flow

### Local auth (email + password)
1. User submits Register form → `POST /api/auth/register` → returns `{user, tokens}`
2. `useAuth.register()` stores token via `tokenStorage.set(token)`, sets user state
3. On subsequent requests the fetch wrapper reads `tokenStorage.get()` and adds `Authorization: Bearer <token>`

### OAuth (Google / GitHub)
1. User clicks "Continue with Google" → browser navigates to `${VITE_API_BASE_URL}/api/auth/google`
2. Google redirects back to `${APP_URL}/api/auth/google/callback` on backend
3. Backend signs JWT → redirects to `${APP_URL}/oauth-callback?token=<jwt>`
4. `OAuthCallback.tsx` reads token, strips it from history, calls `loginWithOAuth(token)`

### Hooks — `src/hooks/useAuth.ts`
```ts
const { user, isLoggedIn, loading, error, login, register, logout, loginWithOAuth } = useAuth()
```
- `user` — current user or null
- `isLoggedIn` — boolean
- `loading` — true while verifying stored token on mount
- `login(payload)` — stores token, fetches /me
- `register(payload)` — same
- `logout()` — clears token, nulls user
- `loginWithOAuth(token)` — stores token, fetches /me (used by OAuthCallback)

---

## Services — `src/services/`

### `src/services/api.ts`
Core fetch wrapper + auth services:
- `tokenStorage` — `{get, set, remove}` using localStorage
- `authService.login/register/logout/me` — auth API calls
- `contactService.submit(payload)` — contact form call
- `createResourceService<T>(basePath)` — factory for any CRUD resource

### `src/services/todos.ts`
Example authenticated resource service:
```ts
todoService.list(filters)   // GET /api/todos?completed=...&priority=...
todoService.get(id)          // GET /api/todos/:id
todoService.create(payload)  // POST /api/todos
todoService.update(id, p)    // PUT /api/todos/:id
todoService.toggle(id)       // PATCH /api/todos/:id/toggle
todoService.delete(id)       // DELETE /api/todos/:id
```

**To replace with your own resource** (e.g. "projects"):
1. Copy `todos.ts` → `projects.ts`
2. Replace `todo/Todo` with `project/Project`
3. Update endpoint keys in `src/config/api.ts`
4. Update `src/types/index.ts` with new interface

---

## Types — `src/types/index.ts`

Key interfaces:
- `User` — id, email, name, avatarUrl, role, provider, emailVerified, createdAt
- `AuthTokens` — accessToken, refreshToken?
- `LoginPayload`, `RegisterPayload`, `ContactPayload`
- `ApiResponse<T>`, `ApiError`
- `Todo`, `TodoPriority`, `CreateTodoPayload`, `UpdateTodoPayload` — the example resource
- `NavItem`

---

## Backend File Map

### `server/src/config/env.ts`
Zod-validated environment object. **Process exits on startup if a required variable is missing.**

Required vars: `PORT`, `MONGODB_URI`, `JWT_SECRET`
Optional (with defaults): `JWT_EXPIRES_IN`, `EMAIL_PROVIDER`, `APP_URL`, `NODE_ENV`
OAuth vars: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` (optional — strategies are only registered if present)

### `server/src/config/db.ts`
`connectDB()` — call once in `server/src/index.ts`.

### `server/src/config/passport.ts`
Registers four Passport strategies:
- `local` — email + password
- `jwt` — Bearer token
- `google` — OAuth upsert (creates or finds User by providerId or email)
- `github` — same pattern

Strategies are only registered if their client ID/secret env vars are set.

### `server/src/models/`

| File | MongoDB collection | Key fields |
|------|-------------------|-----------|
| `User.ts` | `users` | email, name, password (select:false), provider, providerId, avatarUrl, role, emailVerified |
| `Contact.ts` | `contacts` | name, email, subject, message |
| `Todo.ts` | `todos` | userId (indexed, ref User), title, description, completed, priority, dueDate, tags[], completedAt |

User model:
- `pre('save')` hook: bcrypt password if modified
- `comparePassword(candidate)` instance method
- `findByEmail(email)` static method
- `password` is `select: false` — never returned by default queries

Todo model:
- Every route scoped to `userId = req.user._id` — users can only see their own todos
- `pre('save')` hook: sets/clears `completedAt` when `completed` changes

### `server/src/middleware/`

| File | What it does |
|------|-------------|
| `authenticate.ts` | Verifies JWT Bearer token. Apply to protected routes |
| `requireAdmin.ts` | Checks `req.user.role === 'admin'`. Apply after authenticate |
| `validate.ts` | `validate(zodSchema)` — validates req.body, returns 400 on failure |

### `server/src/routes/`

| File | Mount path | Description |
|------|-----------|-------------|
| `auth.ts` | `/api/auth` | register, login, logout, me, google, github + callbacks |
| `users.ts` | `/api/users` | list (admin), get/update/delete by id (own or admin) |
| `contact.ts` | `/api/contact` | Submit contact form, saves to DB, sends email |
| `todos.ts` | `/api/todos` | Full CRUD scoped to logged-in user. Example authenticated resource |
| `index.ts` | `/api` | Mounts all routers + GET /api/health |

#### Auth endpoints
| Method | Path | Auth | Body/Query |
|--------|------|------|-----------|
| POST | /api/auth/register | — | `{name, email, password}` |
| POST | /api/auth/login | — | `{email, password}` |
| GET | /api/auth/logout | — | — |
| GET | /api/auth/me | JWT | — |
| GET | /api/auth/google | — | Browser redirect |
| GET | /api/auth/google/callback | — | Redirects to `/oauth-callback?token=` |
| GET | /api/auth/github | — | Browser redirect |
| GET | /api/auth/github/callback | — | Redirects to `/oauth-callback?token=` |

#### Todo endpoints (all require JWT)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/todos | List todos. Query: `completed`, `priority`, `tag`, `sort` |
| POST | /api/todos | Create todo |
| GET | /api/todos/:id | Get one todo |
| PUT | /api/todos/:id | Update todo |
| PATCH | /api/todos/:id/toggle | Toggle completed/incomplete |
| DELETE | /api/todos/:id | Delete todo |

### `server/src/services/email.ts`
Multi-driver email service. Driver selected by `EMAIL_PROVIDER` env var:
- `resend` — uses Resend SDK. Requires `RESEND_API_KEY`
- `sendgrid` — stub (logs + does not crash). Swap in real implementation when needed
- `mailgun` — stub

Exported functions:
- `sendWelcomeEmail(user)` — called after registration (fire-and-forget)
- `sendContactConfirmation(contact)` — called after contact form submit

### `server/src/utils/`
- `jwt.ts` — `signToken(payload)`, `verifyToken(token)`
- `password.ts` — `hash(plain)`, `compare(plain, hashed)` — bcryptjs, saltRounds=12

---

## Environment Variables

### Frontend / Docker — `.env` (copy from `.env.example`)

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | AppTemplate | Displayed name |
| `COMPOSE_PROJECT_NAME` | apptemplate | Prefixes all Docker container/volume names. Change to run multiple stacks |
| `FRONTEND_PORT` | 5173 | Host port for frontend |
| `FRONTEND_INTERNAL_PORT` | 5173 | Container-internal port |
| `BACKEND_PORT` | 3000 | Host port for backend |
| `BACKEND_INTERNAL_PORT` | 3000 | Container-internal port |
| `MONGO_PORT` | 27017 | Host port for Mongo |
| `MONGO_INTERNAL_PORT` | 27017 | Container-internal port |
| `MONGO_DB_NAME` | apptemplate | Database name |
| `MONGO_IMAGE_TAG` | 7 | MongoDB Docker image tag |
| `MONGO_ROOT_USER` | root | Mongo root username |
| `MONGO_ROOT_PASSWORD` | — | Mongo root password (**required**) |
| `DOCKER_TARGET` | dev | `dev` or `prod` (selects Dockerfile stage) |
| `VITE_API_BASE_URL` | http://localhost:3000 | Backend URL seen by the browser |
| `VITE_APP_NAME` | AppTemplate | App name in frontend |
| `VITE_GOOGLE_CLIENT_ID` | — | Google OAuth client ID (public, frontend-only) |

### Backend — `server/.env` (copy from `server/.env.example`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | yes | Express listen port |
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `JWT_SECRET` | yes | Signing secret — min 16 chars, use 64+ for production |
| `JWT_EXPIRES_IN` | no | Token lifetime (default: 7d) |
| `GOOGLE_CLIENT_ID` | no | Google OAuth (omit to disable Google login) |
| `GOOGLE_CLIENT_SECRET` | no | Google OAuth secret |
| `GITHUB_CLIENT_ID` | no | GitHub OAuth (omit to disable GitHub login) |
| `GITHUB_CLIENT_SECRET` | no | GitHub OAuth secret |
| `EMAIL_PROVIDER` | no | `resend` \| `sendgrid` \| `mailgun` (default: resend) |
| `RESEND_API_KEY` | no | Resend API key |
| `SENDGRID_API_KEY` | no | SendGrid API key |
| `MAILGUN_API_KEY` | no | Mailgun API key |
| `MAILGUN_DOMAIN` | no | Mailgun domain |
| `FROM_EMAIL` | no | Sender address |
| `APP_URL` | yes | Full URL of the frontend (used in OAuth callback redirects) |

---

## Docker

### Running locally
```bash
cp .env.example .env && cp server/.env.example server/.env
# Fill in MONGO_ROOT_PASSWORD and MONGODB_URI in server/.env
docker-compose up
```

Frontend: `http://localhost:${FRONTEND_PORT}`
Backend: `http://localhost:${BACKEND_PORT}/api/health`

### Running multiple stacks simultaneously
Create two env files with **different project names and different ports**:

```
# .env.staging
COMPOSE_PROJECT_NAME=apptemplate_staging
FRONTEND_PORT=5174
BACKEND_PORT=3001
MONGO_PORT=27018
```

```bash
docker-compose --env-file .env.staging up -d
```

The project name prefixes all container and volume names, so stacks don't collide.

### Service discovery
- Backend finds MongoDB via `mongodb://mongo:${MONGO_INTERNAL_PORT}` (Docker DNS — `mongo` is the service name)
- Frontend uses `VITE_API_BASE_URL=http://localhost:${BACKEND_PORT}` because the browser runs on the host, not inside Docker
- Never use IP addresses — use Docker DNS service names for inter-container communication

### Dockerfile targets
- `dev` — runs `npm run dev` with hot reload, mounts src/ as a volume
- `prod` — builds static files, serves via Nginx (frontend) or `node dist/index.js` (backend)

---

## How to Add a New Authenticated Resource

Example: replacing Todo with a `Project` resource.

### 1. Backend model — `server/src/models/Project.ts`
Copy `Todo.ts`, rename fields to match your domain. Add `userId` (indexed) for user scoping.

### 2. Backend routes — `server/src/routes/projects.ts`
Copy `todos.ts`, replace `Todo` → `Project`. All queries must filter by `userId: req.user._id`.

### 3. Mount — `server/src/routes/index.ts`
```ts
import projectsRouter from './projects'
router.use('/projects', projectsRouter)
```

### 4. Frontend types — `src/types/index.ts`
Add `Project`, `CreateProjectPayload`, `UpdateProjectPayload` interfaces.

### 5. Frontend config — `src/config/api.ts`
```ts
projects:      '/api/projects',
project:       (id: string) => `/api/projects/${id}`,
projectAction: (id: string) => `/api/projects/${id}/some-action`,
```

### 6. Frontend service — `src/services/projects.ts`
Copy `todos.ts`, update all endpoint references and type annotations.

### 7. Frontend page — `src/pages/ProjectsPage.tsx`
Copy the Dashboard pattern: load on mount, display with EmptyState fallback, show Modal for create/edit.

### 8. Route — `src/App.tsx`
```tsx
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'))
// inside ProtectedRoute:
<Route path="/projects" element={<ProjectsPage />} />
```

### 9. Navbar link — `src/components/layout/Navbar.tsx`
Add to the logged-in user section.

---

## Theming

Change the entire colour scheme in one file: **`src/config/theme.ts`**

```ts
// accent is used for buttons, links, focus rings, active states
accent: '99 102 241'   // indigo-500 (default)
accent: '20 184 166'   // teal-500
accent: '239 68 68'    // red-500
```

The chain: `theme.ts` → `globals.css` (writes CSS vars) → `tailwind.config.js` (maps to class names) → components use `bg-accent`, `text-accent`, etc.

---

## Security Notes

- **Never commit `.env` or `server/.env`** — both are in `.gitignore`
- `JWT_SECRET` minimum 16 chars. Generate: `openssl rand -base64 64`
- `User.password` has `select: false` — never returned by default queries. Access only via `.select('+password')`
- OAuth client secrets are server-side only. Only `GOOGLE_CLIENT_ID` (public) goes in the frontend env
- All API keys stay in `server/.env` only
- Todo routes (and all authenticated routes) are scoped to `req.user._id` — no cross-user data access

---

## Quick Reference: Key File Locations

| What you want to change | File |
|-------------------------|------|
| Accent / primary colour | `src/config/theme.ts` |
| API base URL | `.env` → `VITE_API_BASE_URL` |
| API endpoint paths | `src/config/api.ts` |
| Nav items | `src/components/layout/Navbar.tsx` → `NAV_ITEMS` |
| Footer links | `src/components/layout/Footer.tsx` → `SOCIAL_LINKS` |
| Home page copy | `src/sections/HeroSection.tsx`, `FeaturesSection.tsx`, etc. |
| Auth logic | `src/hooks/useAuth.ts` |
| User model fields | `server/src/models/User.ts` |
| Add a new resource | Follow the 9-step guide above |
| Email templates | `server/src/services/email.ts` |
| JWT lifetime | `server/.env` → `JWT_EXPIRES_IN` |
| Component documentation | `COMPONENTS.md` |
