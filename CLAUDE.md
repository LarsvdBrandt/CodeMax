# CodeMax

AI-powered Next.js application builder with team collaboration. Users describe a web app in plain language → LLMs generate production-ready Next.js code → the app runs live in an isolated Docker container → teams can collaborate via branches, commits, and pull requests.

---

## Services

| Service | Tech | Port | Role |
|---|---|---|---|
| `frontend` | Next.js 14, TypeScript, Tailwind | 3000 | UI + Better Auth + JWT issuer |
| `backend-java` | Spring Boot 3.3, Java 21 | 8000 | REST API + Worker (AI pipeline) |
| `postgres` | PostgreSQL 16 | 5432 | Primary relational database |
| `rabbitmq` | RabbitMQ 3 | 5672 / 15672 | AI job queue |
| `nginx` | Nginx | 8080 | Reverse proxy + preview routing |
| project containers | Docker (node:20-alpine) | dynamic | Generated Next.js apps (per project/branch) |

Each service has its own `CLAUDE.md`:
- [frontend/CLAUDE.md](frontend/CLAUDE.md)
- [backend-java/CLAUDE.md](backend-java/CLAUDE.md)
- [nginx/CLAUDE.md](nginx/CLAUDE.md)

---

## Quick Start

```bash
cp .env.example .env        # fill in JWT_SECRET + API keys
docker compose up --build   # starts all services
```

- UI: http://localhost:8080
- API: http://localhost:8000
- Swagger: http://localhost:8000/swagger-ui/index.html
- RabbitMQ management: http://localhost:15672

---

## Authentication Flow

1. User registers/logs in via Better Auth on the frontend (`/auth/*` routes)
2. Better Auth sets an `__Secure-auth.session` cookie in the browser
3. Frontend calls `/api/get-api-token` (Next.js API route) → issues an HS256 JWT (7 days, same `JWT_SECRET` as Spring Boot)
4. JWT is stored in `localStorage` as `token`
5. All Spring Boot API calls include `Authorization: Bearer <token>`
6. Spring Boot's `JwtAuthorizationRequestFilter` validates the token and sets `VERIFIED_USER_ID` on the request

---

## Project & AI Build Flow

1. User describes an app on `/welcome` → GPT-4o generates a plan
2. `POST /projects` creates a project record → queues a job on RabbitMQ `ai_jobs`
3. Worker service picks up the job and runs the 12-step AI pipeline:
   - Seed template → Analyze → Plan → Codegen → DB Schema → Build → Auto-fix loop (max 5x) → Auto-commit
4. Pipeline auto-commits all generated files to the active branch
5. Spring Boot starts a Docker container; Nginx proxies `/preview/{projectId}` to it

---

## Version Control Flow (Git-like)

- Every project has a `main` branch
- Maintainers create feature branches → AI tasks commit to that branch
- Maintainer opens a Pull Request (feature → main)
- Admin approves → files copied to main, branch marked `merged`
- Admin rejects → new AI task created with feedback so the agent can rework

---

## Team Roles

| Role | Can do |
|---|---|
| Observer | Read-only access |
| Maintainer | Create branches, start preview, open PR |
| Admin | Approve/reject PRs, manage team roles |
| Owner (project creator) | Everything |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ | HS256 key shared by frontend and backend (min 32 chars) |
| `OPENAI_API_KEY` | ✅ | GPT-4o for AI pipeline |
| `ANTHROPIC_API_KEY` | optional | Alternative LLM provider |
| `GEMINI_API_KEY` | optional | Alternative LLM provider |
| `DEEPSEEK_API_KEY` | optional | Alternative LLM provider |
| `PLANNER_MODEL` | ✅ | Model for planning stage (e.g. `gpt-4o`) |
| `CODE_MODEL` | ✅ | Model for code generation (e.g. `gpt-4o`) |
| `REVIEW_MODEL` | ✅ | Model for review/fix stage |
| `RESEND_API_KEY` | ✅ | Email delivery (invite + verification emails) |
| `SPRING_DATASOURCE_URL` | ✅ | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | ✅ | DB user |
| `SPRING_DATASOURCE_PASSWORD` | ✅ | DB password |
| `SPRING_RABBITMQ_HOST` | ✅ | RabbitMQ host |
| `SPRING_RABBITMQ_USERNAME` | ✅ | RabbitMQ user |
| `SPRING_RABBITMQ_PASSWORD` | ✅ | RabbitMQ password |
| `PROJECTS_DIR` | ✅ | Filesystem path for generated project files (e.g. `/projects`) |
| `TEMPLATES_DIR` | ✅ | Next.js base template path (e.g. `/templates`) |
| `CORS_ALLOW_ORIGINS` | ✅ | Comma-separated allowed origins (e.g. `http://localhost:3000`) |

---

## Database Schema

PostgreSQL 16. All IDs are `UUID`. Managed by Flyway (10 migrations, V1–V10).

### Tables

```
users
├── id              UUID PK
├── email           VARCHAR(255) UNIQUE
├── password_hash   TEXT (nullable — Better Auth users have no hash)
├── created_at      TIMESTAMPTZ
└── (profile columns added in V2: full_name, company_name, company_address,
     company_city, company_country, website, bio)

user_api_keys
├── id          UUID PK
├── user_id     UUID FK → users
├── service     VARCHAR   (e.g. "openai", "stripe")
├── api_key     TEXT
└── created_at  TIMESTAMPTZ

projects
├── id           UUID PK
├── user_id      UUID FK → users (ON DELETE CASCADE)
├── name         VARCHAR(255)
├── description  TEXT
├── status       VARCHAR  ('idle' | 'building' | 'ready' | 'error')
├── container_id TEXT
├── preview_port INTEGER
├── answers      JSONB    (user answers from wizard — added V5)
├── created_at   TIMESTAMPTZ
└── updated_at   TIMESTAMPTZ

project_files
├── id          UUID PK
├── project_id  UUID FK → projects (ON DELETE CASCADE)
├── file_path   TEXT
├── content     TEXT
└── updated_at  TIMESTAMPTZ

tasks
├── id          UUID PK
├── project_id  UUID FK → projects (ON DELETE CASCADE)
├── branch_id   UUID FK → project_branches (nullable — added V10)
├── prompt      TEXT
├── status      VARCHAR  ('queued' | 'running' | 'done' | 'error' | 'waiting_for_key')
├── agent_log   JSONB    (array of pipeline step log entries)
├── created_at  TIMESTAMPTZ
└── updated_at  TIMESTAMPTZ

project_members
├── id            UUID PK
├── project_id    UUID FK → projects (ON DELETE CASCADE)
├── user_id       UUID FK → users (nullable until invite accepted)
├── invite_email  VARCHAR(255)
├── invite_token  VARCHAR(255) UNIQUE
├── role          VARCHAR  ('observer' | 'maintainer' | 'admin')
├── status        VARCHAR  ('pending' | 'accepted')
├── invited_by    UUID FK → users
└── created_at    TIMESTAMPTZ

project_branches
├── id               UUID PK
├── project_id       UUID FK → projects (ON DELETE CASCADE)
├── name             VARCHAR(255)
├── parent_branch_id UUID FK → project_branches (self-reference, nullable)
├── container_id     TEXT
├── preview_port     INTEGER
├── status           VARCHAR  ('active' | 'merged' | 'rejected')
├── created_by       UUID FK → users
└── created_at       TIMESTAMPTZ

project_commits
├── id          UUID PK
├── project_id  UUID FK → projects (ON DELETE CASCADE)
├── branch_id   UUID FK → project_branches (ON DELETE CASCADE)
├── task_id     UUID FK → tasks (nullable, ON DELETE SET NULL)
├── message     TEXT
├── created_by  UUID FK → users
└── created_at  TIMESTAMPTZ

project_commit_files
├── id         UUID PK
├── commit_id  UUID FK → project_commits (ON DELETE CASCADE)
├── file_path  TEXT
└── content    TEXT

project_pull_requests
├── id                UUID PK
├── project_id        UUID FK → projects (ON DELETE CASCADE)
├── source_branch_id  UUID FK → project_branches
├── target_branch_id  UUID FK → project_branches
├── title             VARCHAR(255)
├── description       TEXT
├── status            VARCHAR  ('open' | 'approved' | 'rejected')
├── created_by        UUID FK → users
├── reviewed_by       UUID FK → users (nullable)
├── reviewed_at       TIMESTAMPTZ (nullable)
├── created_at        TIMESTAMPTZ
└── updated_at        TIMESTAMPTZ
```

### Entity Relationships (simplified)

```
users ──< projects ──< project_files
                  ──< tasks
                  ──< project_members
                  ──< project_branches ──< project_commits ──< project_commit_files
                  ──< project_pull_requests
```

### Flyway Migrations

| File | What it adds |
|---|---|
| `V1__initial_schema.sql` | users, projects, project_files, tasks; enums for status |
| `V2__user_profile.sql` | Profile columns on users; user_api_keys table |
| `V3__waiting_for_key_status.sql` | `waiting_for_key` to task_status |
| `V4__varchar_status_columns.sql` | Status columns changed to VARCHAR |
| `V5__project_answers.sql` | `answers JSONB` on projects |
| `V6__better_auth_schema.sql` | Better Auth session/account/verification tables |
| `V7__password_hash_nullable.sql` | Makes password_hash nullable (Better Auth users) |
| `V8__project_members.sql` | project_members table |
| `V9__version_control.sql` | project_branches, project_commits, project_commit_files, project_pull_requests |
| `V10__task_branch_id.sql` | `branch_id` FK on tasks |

---

## Full API Reference

All endpoints require `Authorization: Bearer <jwt>` unless marked **public**.

Base URL: `http://localhost:8000`

### Auth — `/auth`

| Method | Path | Auth | Status | Description |
|---|---|---|---|---|
| POST | `/auth/register` | public | 201 | Register new user |
| POST | `/auth/login` | public | 200 | Login, returns JWT |
| GET | `/auth/me` | ✅ | 200 | Get current user profile |
| PUT | `/auth/me` | ✅ | 200 | Update profile fields |
| POST | `/auth/me/password` | ✅ | 200 | Change password |
| GET | `/auth/api-keys` | ✅ | 200 | List stored API keys |
| POST | `/auth/api-keys` | ✅ | 201 | Save new API key |
| DELETE | `/auth/api-keys/{keyId}` | ✅ | 200 | Delete API key |

### Projects — `/projects`

| Method | Path | Auth | Status | Description |
|---|---|---|---|---|
| GET | `/projects` | ✅ | 200 | List user's projects (ordered by created_at DESC) |
| POST | `/projects` | ✅ | 201 | Create project + first task, queues AI job |
| GET | `/projects/{id}` | ✅ | 200 | Get project details |
| PATCH | `/projects/{id}` | ✅ | 200 | Rename project |
| DELETE | `/projects/{id}` | ✅ | 200 | Delete project, stops container |
| GET | `/projects/{id}/status` | ✅ | 200 | Latest status + agent_log |
| POST | `/projects/{id}/prompt` | ✅ | 200 | Submit new prompt → new task + AI job |
| POST | `/projects/{id}/retry` | ✅ | 200 | Re-queue last failed task |
| GET | `/projects/{id}/files` | ✅ | 200 | List all project files |
| GET | `/projects/{id}/files/{path}` | ✅ | 200 | Get file content (path can contain slashes) |
| PUT | `/projects/{id}/files/{path}` | ✅ | 200 | Write file to disk + DB |
| POST | `/projects/{id}/stop` | ✅ | 200 | Stop Docker container |
| POST | `/projects/{id}/start` | ✅ | 200 | Start Docker container |
| GET | `/projects/{id}/logs` | ✅ | 200 | Last 150 lines of container logs |
| GET | `/projects/{id}/tasks` | ✅ | 200 | List tasks (ordered by created_at ASC) |
| POST | `/projects/{id}/provide_key` | ✅ | 200 | Provide missing API key, resumes build |
| POST | `/projects/{id}/detect_keys` | ✅ | 200 | AI-powered detection of required API keys |
| POST | `/projects/{id}/clarify` | ✅ | 200 | AI clarification response |
| POST | `/planning` | ✅ | 200 | Generate app plan from description |

### Teams — nested under `/projects`

| Method | Path | Auth | Status | Description |
|---|---|---|---|---|
| GET | `/projects/{projectId}/members` | ✅ | 200 | List team members |
| POST | `/projects/{projectId}/members` | ✅ | 201 | Invite member by email + role |
| DELETE | `/projects/{projectId}/members/{memberId}` | ✅ | 200 | Remove member |
| PATCH | `/projects/{projectId}/members/{memberId}` | ✅ | 200 | Update member role |
| GET | `/projects/{projectId}/my-role` | ✅ | 200 | Get calling user's role on this project |
| POST | `/invites/{token}/accept` | ✅ | 200 | Accept team invite via token |

### Versions — `/projects/{projectId}/versions`

| Method | Path | Auth | Status | Description |
|---|---|---|---|---|
| GET | `/projects/{projectId}/versions/branches` | ✅ | 200 | List all branches |
| POST | `/projects/{projectId}/versions/branches` | ✅ | 201 | Create branch (body: name, parentBranchId) |
| POST | `/projects/{projectId}/versions/branches/{branchId}/preview/start` | ✅ | 200 | Start Docker preview for branch |
| POST | `/projects/{projectId}/versions/branches/{branchId}/preview/stop` | ✅ | 200 | Stop branch preview |
| POST | `/projects/{projectId}/versions/branches/{branchId}/promote` | ✅ | 200 | Promote branch to main |
| GET | `/projects/{projectId}/versions/branches/{branchId}/commits` | ✅ | 200 | List commits on branch |
| GET | `/projects/{projectId}/versions/commits/{commitId}/files` | ✅ | 200 | Get file snapshot for a commit |
| GET | `/projects/{projectId}/versions/pull-requests` | ✅ | 200 | List pull requests |
| POST | `/projects/{projectId}/versions/pull-requests` | ✅ | 201 | Open PR (body: sourceBranchId, targetBranchId, title, description) |
| POST | `/projects/{projectId}/versions/pull-requests/{prId}/approve` | ✅ | 200 | Approve PR → merges files to target branch |
| POST | `/projects/{projectId}/versions/pull-requests/{prId}/reject` | ✅ | 200 | Reject PR → creates new rework task |

### Misc

| Method | Path | Auth | Status | Description |
|---|---|---|---|---|
| GET | `/health` | public | 200 | Health check `{"status":"ok"}` |

---

## Coding Standards (cross-project)

### General
- No comments unless the WHY is non-obvious
- No features beyond what the task requires
- Validate only at system boundaries (user input, external APIs)
- UUIDs everywhere — never `Long` or `String` as IDs

### API contract
- All JSON uses `camelCase` (Spring Boot `SNAKE_CASE` config converts to/from DB)
- Error shape: `{"error": "ERROR_CODE", "message": "..."}`
- Status codes: 200 (ok), 201 (created), 400 (bad input), 403 (forbidden), 404 (not found), 409 (conflict)

### Git
- Feature branches off `main`; PR to merge back
- Commit messages: imperative present tense (`add team invite endpoint`)
- Flyway migrations: additive only — never drop columns or tables
