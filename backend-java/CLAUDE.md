# CodeMax Backend — Java

AI-powered Next.js application builder. Receives user prompts, orchestrates LLM agents to generate and deploy Next.js apps inside Docker containers, persists everything in PostgreSQL.

## Quick Start

```bash
# From repo root
docker compose down -v && docker compose up --build
# API:     http://localhost:8000
# Swagger: http://localhost:8000/swagger-ui/index.html
# Health:  http://localhost:8000/health
```

## Build

```bash
mvn package -DskipTests   # build JAR
mvn test                  # run tests
mvn verify                # build + test
```

---

## Architecture

Two services from the same JAR, selected by Spring profile:

| Service | Profile | Role |
|---|---|---|
| `backend` | `api` (default) | REST API on port 8000 |
| `worker` | `worker` | RabbitMQ consumer — runs the AI pipeline |

### Domain Layout

```
src/main/java/com/reuzenpanda/codemax/
├── CodeMaxApplication.java
├── common/
│   ├── amqp/          AmqpConfig (ai_jobs queue declaration)
│   ├── config/        SecurityConfig, CodeMaxProperties
│   ├── docker/        DockerService (Docker SDK wrapper)
│   ├── exceptions/    GlobalExceptionHandler + NotFoundException, ForbiddenException,
│   │                  BadRequestException, ConflictException
│   ├── health/        HealthController
│   ├── openai/        OpenAI WebClient
│   └── security/      JwtAuthorizationRequestFilter, JwtService
│
├── auth/              User + UserApiKey domain
├── projects/          Project + ProjectFile domain
├── tasks/             Task domain + AI pipeline (worker)
├── teams/             ProjectMember domain (invites, roles)
└── versions/          ProjectBranch, ProjectCommit, ProjectPullRequest domain
```

Each domain follows this standard layout:

```
<domain>/
├── entities/          JPA entities (no business logic)
├── dtos/              Data Transfer Objects (MapStruct output)
├── controllers/       REST controllers (request/response classes inline)
├── services/          IXxxService interface + XxxService implementation
├── repositories/      IXxxRepository interface + XxxRepository implementation
└── mappers/           XxxMapper (MapStruct interface)
```

---

## Domains

### `auth/` — Users & API Keys

| Entity | Table | Key fields |
|---|---|---|
| `User` | `users` | id, email, password_hash, profile fields |
| `UserApiKey` | `user_api_keys` | id, user_id, service, api_key |

**AuthController** (`/auth`): register, login, profile CRUD, password change, API key CRUD

### `projects/` — Projects & Files

| Entity | Table | Key fields |
|---|---|---|
| `Project` | `projects` | id, user_id, name, description, status, container_id, preview_port, answers |
| `ProjectFile` | `project_files` | id, project_id, file_path, content |
| `ProjectStatus` | enum | `idle`, `building`, `ready`, `error` |

**ProjectController** (`/projects`): full CRUD, file management, container start/stop/logs, task management, AI key detection

### `tasks/` — Build Tasks & AI Pipeline

| Entity | Table | Key fields |
|---|---|---|
| `Task` | `tasks` | id, project_id, branch_id, prompt, status, agent_log (JSONB) |
| `TaskStatus` | enum | `queued`, `running`, `done`, `error`, `waiting_for_key` |
| `AgentLogEntry` | (JSONB in tasks) | step, output, timestamp |

**TaskController**: task list, clarify, detect required API keys, provide API key

**Pipeline** (`tasks/pipeline/`): 12-step AI code generation — see [AI Pipeline](#ai-pipeline) section

### `teams/` — Team Members & Roles

| Entity | Table | Key fields |
|---|---|---|
| `ProjectMember` | `project_members` | id, project_id, user_id, invite_email, invite_token, role, status |
| `MemberRole` | enum | `observer`, `maintainer`, `admin` |
| `MemberStatus` | enum | `pending`, `accepted` |

**TeamController**: list/invite/remove/update-role members, get my role, accept invite

**Role permissions:**
- `observer` — read-only
- `maintainer` — create branches, start preview, open PR
- `admin` — approve/reject PRs, manage team roles
- project owner (user_id on project) — full control

### `versions/` — Branches, Commits, Pull Requests

| Entity | Table | Key fields |
|---|---|---|
| `ProjectBranch` | `project_branches` | id, project_id, name, parent_branch_id, container_id, preview_port, status, created_by |
| `BranchStatus` | enum | `active`, `merged`, `rejected` |
| `ProjectCommit` | `project_commits` | id, project_id, branch_id, task_id, message, created_by |
| `ProjectCommitFile` | `project_commit_files` | id, commit_id, file_path, content |
| `ProjectPullRequest` | `project_pull_requests` | id, project_id, source_branch_id, target_branch_id, title, status, created_by, reviewed_by |
| `PullRequestStatus` | enum | `open`, `approved`, `rejected` |

**VersionController** (`/projects/{projectId}/versions`): branch CRUD, branch preview start/stop, promote branch to main, commit list, commit file snapshot, PR CRUD, PR approve/reject

**PR approve flow:**
1. Copy latest commit files from source branch
2. Create merge commit on target branch with those files
3. Update `project_files` + disk (hot reload in main container)
4. Stop branch preview if running
5. Mark branch as `merged`

**PR reject flow:**
1. Mark PR as `rejected`
2. Create a new `Task` on the branch with feedback prompt so agent can rework

---

## REST API Reference

See [root CLAUDE.md](../CLAUDE.md) for the full API table. Summary:

| Controller | Base path | # endpoints |
|---|---|---|
| AuthController | `/auth` | 8 |
| ProjectController | `/projects` | 19 |
| TeamController | `/projects/{id}/members` + `/invites` | 6 |
| VersionController | `/projects/{id}/versions` | 11 |
| HealthController | `/health` | 1 |
| **Total** | | **45** |

---

## Coding Standards

### Naming

| Thing | Convention | Example |
|---|---|---|
| Service interface | `I` prefix | `IAuthService` |
| Service implementation | plain | `AuthService` |
| Repository interface | `I` prefix | `IUserRepository` |
| Repository implementation | plain | `UserRepository` |
| DTO | `Dto` suffix | `UserDto` |
| Request body | `Request` suffix | `CreateProjectRequest` |
| Response body | `Response` suffix | `ProjectResponse` |
| Mapper | `Mapper` suffix | `UserMapper` |
| RabbitMQ listener | `Listener` suffix | `TaskListener` |
| Listener service | `ListenerService` suffix | `TaskListenerService` |

### Entities

```java
@Entity
@Table(name = "users")
@Data @NoArgsConstructor @AllArgsConstructor
public class User {
    @Id UUID id;   // UUID always — never Long or String
}
```

- Lombok `@Data @NoArgsConstructor @AllArgsConstructor` on every entity
- `@Enumerated(EnumType.STRING)` for enum columns
- No business logic in entities

### DTOs

```java
@Data @NoArgsConstructor @AllArgsConstructor
public class UserDto {
    private UUID id;
    private String email;
    // camelCase — matches frontend TypeScript interfaces
}
```

### MapStruct Mappers

```java
@Mapper
public interface UserMapper {
    UserDto toDto(User entity);
    User toEntity(UserDto dto);
    List<UserDto> toDtos(List<User> entities);
}
```

- One mapper per domain entity
- Injected into **controllers** — controllers own the DTO/entity boundary, not services

### Repositories

```java
public interface IUserRepository {
    User save(User user);
    Optional<User> findById(UUID id);
    Optional<User> findByEmail(String email);
}

@Service
public class UserRepository implements IUserRepository {
    // wraps Spring Data JpaRepository internally
}
```

- Interface + implementation — controllers/services never use JpaRepository directly
- Never update by saving a full entity — use targeted `@Modifying @Query` updates

### Services

```java
@Service
@RequiredArgsConstructor(onConstructor_ = @__({@Autowired}))
public class AuthService implements IAuthService {
    private final IUserRepository userRepository;
    // Business logic here. No mappers, no HTTP concerns.
}
```

- All business logic lives in services
- No mapper calls in services — that's the controller's job

### Controllers

```java
@RestController
@RequestMapping("/auth")
@Tag(name = "Auth", description = "Registration, login, profile")
@RequiredArgsConstructor(onConstructor_ = @__({@Autowired}))
public class AuthController {

    private final IAuthService authService;
    private final UserMapper userMapper;

    @PostMapping("/register")
    @Operation(summary = "Register", operationId = "register")
    public ResponseEntity<TokenResponse> register(@RequestBody @Valid RegisterRequest body) {
        if (body == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.status(201).body(authService.register(body));
    }
}
```

- `@Tag` on every controller class
- `@Operation(summary, operationId)` on every endpoint
- Return type always `ResponseEntity<XxxResponse>`
- Null-check body → 400 before calling service
- Get `userId` from request attribute: `(UUID) request.getAttribute(VERIFIED_USER_ID)`

### Security (JWT)

```
Request → JwtAuthorizationRequestFilter (OncePerRequestFilter)
           validates HS256 JWT, sets request.setAttribute(VERIFIED_USER_ID, uuid)
           → controller reads: UUID userId = (UUID) request.getAttribute(VERIFIED_USER_ID)
```

```java
// Sign
String token = Jwts.builder()
    .subject(userId.toString())
    .expiration(new Date(now + properties.getJwtExpirationMs()))
    .signWith(Keys.hmacShaKeyFor(secret.getBytes(UTF_8)))
    .compact();
```

- HS256 only; 7-day expiry; secret from env var `JWT_SECRET`
- BCrypt strength 12 for password hashing (`BCryptPasswordEncoder(12)`)

### RabbitMQ

```java
// Publish (in service)
rabbitTemplate.convertAndSend(AmqpConfig.AI_JOBS_QUEUE, new JobMessage(taskId, projectId, prompt));

// Consume (worker profile only)
@RabbitListener(queues = AmqpConfig.AI_JOBS_QUEUE)
public void onMessage(JobMessage message) { taskListenerService.process(message); }
```

Queue name: `ai_jobs`

### Exception Handling

| Exception | HTTP | When |
|---|---|---|
| `NotFoundException` | 404 | Resource doesn't exist |
| `ForbiddenException` | 403 | User lacks permission |
| `ConflictException` | 409 | Business rule violation |
| `BadRequestException` | 400 | Invalid input |

Response shape: `{"error": "ERROR_CODE", "message": "..."}` — via `GlobalExceptionHandler`.

### OpenAPI

- `@OpenAPIDefinition` on `CodeMaxApplication`
- `@Tag(name, description)` on every controller
- `@Operation(summary, operationId)` on every endpoint

---

## Database

PostgreSQL 16, Spring Data JPA + Flyway. See [root CLAUDE.md](../CLAUDE.md) for full schema.

Flyway migrations in `src/main/resources/db/migration/`:

| File | Content |
|---|---|
| `V1__initial_schema.sql` | users, projects, project_files, tasks + enums |
| `V2__user_profile.sql` | User profile columns; user_api_keys table |
| `V3__waiting_for_key_status.sql` | `waiting_for_key` added to task_status |
| `V4__varchar_status_columns.sql` | Status columns converted to VARCHAR |
| `V5__project_answers.sql` | `answers JSONB` on projects |
| `V6__better_auth_schema.sql` | Better Auth tables (sessions, accounts, verifications) |
| `V7__password_hash_nullable.sql` | password_hash nullable (Better Auth users) |
| `V8__project_members.sql` | project_members table |
| `V9__version_control.sql` | project_branches, project_commits, project_commit_files, project_pull_requests |
| `V10__task_branch_id.sql` | branch_id FK on tasks |

Rules:
- Additive only — never drop columns or tables
- New columns: nullable or with a DEFAULT
- Index every FK and frequently-queried column

---

## AI Pipeline (Worker)

The pipeline runs per task when the worker profile is active (`PipelineService.runPipeline()`). It has two execution paths:

### Pack-based path (most prompts)

`PackSelector` (planner model) chooses a pack; `EntityExtractor` extracts entity + branding in one LLM call; `PackInstaller` renders Handlebars templates.

| Step | What happens |
|---|---|
| Seed template | Copy classpath `template/` into project dir |
| Env vars | Write `.env` files, generate JWT secret |
| Knowledge scan | Scan template for available UI components |
| Pack select | LLM picks best pack(s): `crud-table`, `kanban-entity`, `crm-pipeline`, `stats-dashboard` |
| Entity extract | LLM extracts entity name, extra fields, hero headline, tagline, feature items |
| Pack install | Render `.hbs` templates with entity tokens (including dynamic form fields + table columns) |
| Branding | Write `src/config/content.ts` with LLM-generated hero/tagline/features from entity extraction |
| Build | Docker container start; auto-fix loop (max 5 rounds) |
| Auto-commit | Snapshot all files |

**Pack template tokens** (used in `.hbs` files):

| Token | Example value |
|---|---|
| `{{EntityName}}` | `Product` |
| `{{Entities}}` | `Products` |
| `{{entityName}}` | `product` |
| `{{entities}}` | `products` |
| `{{extraFormState}}` | `, price: 0, category: '', imageUrl: ''` |
| `{{extraFormFields}}` | `<Input label="Price" type="number" .../>` JSX for all extra entity fields |
| `{{extraTableColumns}}` | `{ key: 'price', header: 'Price', render: ... }` Column entries |
| `{{fieldDefs}}` | Mongoose schema extra field block |
| `{{tsDefs}}` | TypeScript extra field declarations |

### V3 fallback path (no matching pack)

Full AI-generated code path using `ArchitectStage` → `PlannerStage` → generators.

| Step | What happens |
|---|---|
| Architect | Planner model generates full `AppSpecification` (entities, branding, navigation) |
| Plan | `PlannerStage` builds deterministic step list |
| Model/Route/Types/Service/Page | One LLM call per entity per file type |
| Navigation | Deterministic: single entity → patch Navbar; multi-entity → generate SideNav layout |
| Review | Optional: `REVIEW_MODEL` env var enables a post-codegen review pass |
| Branding | Write `src/config/content.ts` from LLM-generated branding spec |

**PageGenerator** (`PageGenerator.java`) injects:
- The original user prompt as `App context` so the LLM generates domain-specific placeholder text
- Entity characteristic detection: image fields → card grid; stage/status fields → pipeline columns; default → Table
- All entity fields rendered in the form and shown in the display layout

After pipeline success: auto-commit (snapshot all files → `project_commits` + `project_commit_files`).

LLM calls use WebClient with `Authorization: Bearer ${OPENAI_API_KEY}`, `response_format: {type: "json_object"}` where structured output is needed.

Docker SDK (unix socket):
```java
DockerClient docker = DockerClientBuilder.getInstance()
    .withDockerHttpClient(new ApacheDockerHttpClient.Builder()
        .dockerHost(URI.create("unix:///var/run/docker.sock"))
        .build())
    .build();
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | HS256 signing key (min 32 chars, shared with frontend) |
| `OPENAI_API_KEY` | — | Primary LLM provider |
| `ANTHROPIC_API_KEY` | — | Alternative LLM |
| `GEMINI_API_KEY` | — | Alternative LLM |
| `DEEPSEEK_API_KEY` | — | Alternative LLM |
| `PLANNER_MODEL` | — | Model for planning stage (e.g. `gpt-4o`) |
| `CODE_MODEL` | — | Model for codegen stage |
| `REVIEW_MODEL` | — | Model for auto-fix stage |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/codemax` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `codemax` | DB user |
| `SPRING_DATASOURCE_PASSWORD` | `codemax` | DB password |
| `SPRING_RABBITMQ_HOST` | `localhost` | RabbitMQ host |
| `SPRING_RABBITMQ_PORT` | `5672` | RabbitMQ port |
| `SPRING_RABBITMQ_USERNAME` | `codemax` | RabbitMQ user |
| `SPRING_RABBITMQ_PASSWORD` | `codemax` | RabbitMQ password |
| `PROJECTS_DIR` | `/projects` | Generated project files on disk |
| `TEMPLATES_DIR` | `/templates` | Next.js base template |
| `CORS_ALLOW_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `SERVER_PORT` | `8000` | HTTP port |

---

## Implementation Status

### Done
- [x] Domain structure: auth, projects, tasks, teams, versions
- [x] Flyway migrations V1–V10
- [x] JWT filter + Security config
- [x] GlobalExceptionHandler
- [x] RabbitMQ `ai_jobs` queue
- [x] Auth domain (User, UserApiKey, AuthController — 8 endpoints)
- [x] Projects domain (Project, ProjectFile, ProjectController — 19 endpoints)
- [x] Tasks domain (Task, TaskController, pipeline structure)
- [x] Teams domain (ProjectMember, TeamController — 6 endpoints)
- [x] Versions domain (Branch, Commit, PR — VersionController — 11 endpoints)
- [x] PR approve/reject flow in VersionService

### In Progress / TODO
- [ ] Worker pipeline full implementation (12 steps in TaskListenerService)
- [ ] DockerService — full container lifecycle (start, stop, logs, build)
- [ ] OpenAI WebClient — LLM call wrappers
- [ ] PackRegistry / PackSelector — pack-based code generation
- [ ] ReviewStage — AI-assisted code review in pipeline
