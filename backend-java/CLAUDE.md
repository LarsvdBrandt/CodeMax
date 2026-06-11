# CodeMax Backend — Java

AI-powered Next.js application builder. Receives user prompts, orchestrates GPT-4o agents to generate and deploy Next.js apps inside Docker containers, persists everything in PostgreSQL.

## Quick Start

```bash
# From repo root
docker compose down -v && docker compose up --build
# API: http://localhost:8000
# Swagger: http://localhost:8000/swagger-ui/index.html
# Health: http://localhost:8000/health
```

## Build

```bash
mvn package -DskipTests        # build JAR
mvn test                       # run tests
mvn verify                     # build + test
```

---

## Architecture

Two services from the same JAR:

| Service | Profile | Role |
|---|---|---|
| `backend` | `api` (default) | REST API on port 8000 |
| `worker` | `worker` | RabbitMQ consumer running the AI pipeline |

The worker is not yet implemented — jobs are queued but not processed until the worker domain is built.

### Domain layout

```
src/main/java/com/reuzenpanda/codemax/
├── CodeMaxApplication.java
├── common/
│   ├── amqp/          AmqpConfig (queue declarations)
│   ├── config/        SecurityConfig, CodeMaxProperties
│   ├── exceptions/    GlobalExceptionHandler + custom exceptions
│   ├── health/        HealthController
│   └── security/      JwtAuthorizationRequestFilter
├── auth/              User + UserApiKey domain
├── projects/          Project + ProjectFile domain
└── tasks/             Task domain + worker pipeline (TODO)
```

Each domain follows the standard layout:
```
<domain>/
├── entities/
├── dtos/
├── controllers/     (+ request/response classes inline)
├── services/        IXxxService + XxxService
├── repositories/    IXxxRepository + XxxRepository
└── mappers/         XxxMapper (MapStruct)
```

---

## Coding Standards

### Naming

| Thing | Convention | Example |
|---|---|---|
| Service interface | `I` prefix | `IAuthService` |
| Service impl | plain | `AuthService` |
| Repository interface | `I` prefix | `IUserRepository` |
| Repository impl | plain | `UserRepository` |
| DTO | `Dto` suffix | `UserDto` |
| Request body | `Request` suffix | `CreateProjectRequest` |
| Response body | `Response` suffix | `ProjectResponse` |
| Mapper | `Mapper` suffix | `UserMapper` |
| RabbitMQ listener | `Listener` suffix | `TaskListener` |
| Listener service | `ListenerService` suffix | `TaskListenerService` |
| Exception | descriptive | `NotFoundException` |

### Entities

```java
@Entity
@Table(name = "users")        // explicit table name always
@Data @NoArgsConstructor @AllArgsConstructor
public class User {
    @Id UUID id;              // UUID, never Long or String
    // userId scopes every top-level entity (this service's equivalent of companyProfileId)
}
```

- Lombok `@Data @NoArgsConstructor @AllArgsConstructor` on every entity
- ID is always `UUID id` — never `Long`, never `String`
- Use `@Enumerated(EnumType.STRING)` for enum columns (matches PostgreSQL enum values)
- No business logic in entities

### DTOs

```java
@Data @NoArgsConstructor @AllArgsConstructor
public class UserDto {
    private UUID id;
    private String email;
    // JSON field names use camelCase to match frontend TypeScript interfaces
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

- One mapper per domain entity pair
- Injected into **controllers** — controllers own the DTO/entity boundary
- Complex mappings use `@Mapping(target=..., expression=...)`

### Repositories

```java
public interface IUserRepository {
    User save(User user);
    Optional<User> findById(UUID id);
    Optional<User> findByEmail(String email);
}

@Service
public class UserRepository implements IUserRepository {
    // Use Spring Data JpaRepository internally, or direct EntityManager
}
```

- Interface + implementation pattern — controllers/services never use Spring Data repos directly
- Never update by saving full entity — use targeted `@Modifying @Query` updates

### Services

```java
public interface IAuthService {
    TokenResponse register(RegisterRequest request);
    TokenResponse login(LoginRequest request);
}

@Service
@RequiredArgsConstructor(onConstructor_ = @__({@Autowired}))
public class AuthService implements IAuthService {
    private final IUserRepository userRepository;
    // business logic here; no mappers, no HTTP concerns
}
```

- All business logic lives in services
- Services publish AMQP events for every mutating operation
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
    public ResponseEntity<TokenResponse> register(@RequestBody @Valid RegisterRequest request) {
        if (request == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.status(201).body(authService.register(request));
    }
}
```

- `@Tag` on every controller class
- `@Operation(summary, operationId)` on every endpoint
- Return type always `ResponseEntity<XxxResponse>`
- Null-check body → 400 before calling service
- Mappers called at this boundary, not in service

### Security Filter Chain (Order: JWT → CompanyAccess → DomainAccess)

```
Request
  └─ JwtAuthorizationRequestFilter  (OncePerRequestFilter)
       validates JWT, sets request.setAttribute(VERIFIED_USER_ID, uuid)
       └─ controller uses:
            UUID userId = (UUID) request.getAttribute(VERIFIED_USER_ID);
```

For domain-level ownership checks, add a domain `XxxAccessFilter`:
- Returns `403 {"message": "XXX_ACCESS_DENIED"}` if ownership fails
- Returns `409` if preceding filter hasn't verified yet

### JWT (jjwt 0.12.x)

```java
// Sign
String token = Jwts.builder()
    .subject(userId.toString())
    .expiration(new Date(now + properties.getJwtExpirationMs()))
    .signWith(Keys.hmacShaKeyFor(secret.getBytes(UTF_8)))
    .compact();

// Verify
Claims claims = Jwts.parser()
    .verifyWith(Keys.hmacShaKeyFor(secret.getBytes(UTF_8)))
    .build()
    .parseSignedClaims(token)
    .getPayload();
```

- HS256 only
- Secret from `codemax.jwt-secret` env var — never hardcoded
- 7-day expiry (`codemax.jwt-expiration-ms: 604800000`)

### Password Hashing

```java
// BCryptPasswordEncoder(12) — configured in SecurityConfig
passwordEncoder.encode(rawPassword);
passwordEncoder.matches(raw, hash);
```

### RabbitMQ Events (instead of Kafka)

CodeMax uses RabbitMQ (`ai_jobs` queue), not Kafka. Adapt the team Kafka pattern:

```java
// Publisher (in service)
rabbitTemplate.convertAndSend(AmqpConfig.AI_JOBS_QUEUE, new JobMessage(taskId, projectId, prompt));

// Listener (worker profile only)
@Component
public class TaskListener {
    @RabbitListener(queues = AmqpConfig.AI_JOBS_QUEUE)
    public void onMessage(JobMessage message) {
        taskListenerService.process(message);
    }
}

// ListenerService — only calls repositories, no business logic, no publishing
@Service
public class TaskListenerService {
    public void process(JobMessage message) { /* run pipeline steps */ }
}
```

### Exception Handling

| Scenario | Exception | HTTP |
|---|---|---|
| Resource not found | `NotFoundException` | 404 |
| Access denied | `ForbiddenException` | 403 |
| Business rule violation | `ConflictException` | 409 |
| Bad input | `BadRequestException` | 400 |

Response shape: `{"error": "ERROR_CODE", "message": "..."}` — handled by `GlobalExceptionHandler`.

### OpenAPI

- `@OpenAPIDefinition` on `CodeMaxApplication` — servers + info + glossary
- `@Tag(name, description)` on every controller
- `@Operation(summary, operationId)` on every endpoint
- No `@Schema` unless the field name is ambiguous

---

## Database

PostgreSQL 16 via Spring Data JPA + Flyway.

**Deviation from team MongoDB standard**: CodeMax uses relational data with foreign keys, cascade deletes, and UUID references across tables. JPA + PostgreSQL is the right fit.

Flyway migrations in `src/main/resources/db/migration/`:
| File | Content |
|---|---|
| `V1__initial_schema.sql` | users, projects, project_files, tasks + enums |
| `V2__user_profile.sql` | user profile columns, user_api_keys table |
| `V3__waiting_for_key_status.sql` | adds `waiting_for_key` to task_status enum |

Rules:
- Never drop columns or tables — additive only
- New columns must be nullable or have a default
- Add index for every FK and frequently-queried column

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | HS256 signing key (min 32 chars) |
| `OPENAI_API_KEY` | — | GPT-4o API access |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/codemax` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `codemax` | DB user |
| `SPRING_DATASOURCE_PASSWORD` | `codemax` | DB password |
| `SPRING_RABBITMQ_HOST` | `localhost` | RabbitMQ host |
| `SPRING_RABBITMQ_PORT` | `5672` | RabbitMQ port |
| `SPRING_RABBITMQ_USERNAME` | `codemax` | RabbitMQ user |
| `SPRING_RABBITMQ_PASSWORD` | `codemax` | RabbitMQ password |
| `PROJECTS_DIR` | `/projects` | Where generated project files live |
| `TEMPLATES_DIR` | `/templates` | Next.js base template source |
| `CORS_ALLOW_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `SERVER_PORT` | `8000` | HTTP port |

---

## REST API Contract

All 27 endpoints must match the Python backend contract exactly (same paths, same JSON shapes) so the frontend works without changes.

### Auth (`/auth`)

| Method | Path | Auth | Status |
|---|---|---|---|
| POST | `/auth/register` | No | 201 |
| POST | `/auth/login` | No | 200 |
| GET | `/auth/me` | Yes | 200 |
| PUT | `/auth/me` | Yes | 200 |
| POST | `/auth/me/password` | Yes | 200 |
| GET | `/auth/api-keys` | Yes | 200 |
| POST | `/auth/api-keys` | Yes | 201 |
| DELETE | `/auth/api-keys/{key_id}` | Yes | 200 |

### Projects (`/projects`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/projects` | Yes | ordered by created_at DESC |
| POST | `/projects` | Yes | creates project + task, queues job → 201 |
| GET | `/projects/{id}` | Yes | |
| PATCH | `/projects/{id}` | Yes | rename only |
| DELETE | `/projects/{id}` | Yes | stops container, drops proj DB |
| GET | `/projects/{id}/status` | Yes | latest task + agent_log |
| POST | `/projects/{id}/prompt` | Yes | new task, queue job |
| POST | `/projects/{id}/retry` | Yes | re-queue last task |
| GET | `/projects/{id}/files` | Yes | ordered by file_path |
| GET | `/projects/{id}/files/{path}` | Yes | path can contain slashes |
| PUT | `/projects/{id}/files/{path}` | Yes | write to disk + DB |
| POST | `/projects/{id}/stop` | Yes | stop Docker container |
| POST | `/projects/{id}/start` | Yes | restart Docker container |
| GET | `/projects/{id}/logs` | Yes | last 150 lines from container |
| GET | `/projects/{id}/tasks` | Yes | ordered by created_at ASC |
| POST | `/projects/{id}/provide_key` | Yes | save key, resume build |
| POST | `/projects/{id}/detect_keys` | Yes | GPT-4o key detection |
| POST | `/projects/{id}/clarify` | Yes | GPT-4o clarify response |
| POST | `/planning` | Yes | GPT-4o plan generation |
| GET | `/health` | No | 200 `{"status":"ok"}` |

---

## AI Pipeline (Worker — TODO)

The 12-step pipeline runs per task in the `worker` Spring profile. Implement as `TaskListenerService.process()`:

1. **Seed template** — copy `/templates/nextjs-base/` into `/projects/{id}/` (never overwrite existing files)
2. **Provision DB** — create `proj_{id}` database in PostgreSQL
3. **Analyze** — GPT-4o JSON: `{change_type, affected_files, summary}`
4. **Retrieve context** — fetch affected files from `project_files` table
5. **Plan** — GPT-4o JSON: `{tasks: [{file, action, description}]}`
6. **Codegen** — GPT-4o per file; post-process: strip TS from .js, CJS→ESM in API routes
7. **Architecture summary** — GPT-4o → save as `_meta/architecture.md`
8. **DB schema** — GPT-4o: `{needs_db, schema_sql}`; execute against project DB
9. **Wire API routes** — GPT-4o: generate `pages/api/*.js` handlers + update `pages/index.js`
10. **API key check** — scan env vars; if missing → `waiting_for_key`; else write `.env.local`
11. **Build preview** — Docker: `node:20-alpine`, `npm install && npm run dev`, port 4000–5000, network `codemax_network`
12. **Auto-fix loop** — up to 5 rounds: npm install missing packages + GPT-4o error fix

GPT-4o calls use WebClient with `Authorization: Bearer ${OPENAI_API_KEY}`, model `gpt-4o`, `response_format: {type: "json_object"}` where JSON output is expected.

Docker SDK config (unix socket):
```java
DockerClient docker = DockerClientBuilder.getInstance()
    .withDockerHttpClient(new ApacheDockerHttpClient.Builder()
        .dockerHost(URI.create("unix:///var/run/docker.sock"))
        .build())
    .build();
```

---

## Implementation Roadmap

### Done (scaffold)
- [x] Project structure + package layout
- [x] `pom.xml` with all dependencies
- [x] Flyway migrations (V1–V3, matches Python Alembic schema exactly)
- [x] `application.yml` with all env vars
- [x] JWT filter (`JwtAuthorizationRequestFilter`)
- [x] Security config (CSRF off, CORS, stateless, JWT filter chain)
- [x] `GlobalExceptionHandler` + custom exceptions
- [x] RabbitMQ `ai_jobs` queue declaration
- [x] `GET /health`
- [x] `docker-compose.yml` updated (Java backend, worker commented out)

### Next: Auth domain
- [ ] `User` entity + `UserApiKey` entity
- [ ] `UserRepository` + `IUserRepository`
- [ ] `AuthService` (register, login, JWT issuance)
- [ ] `UserMapper`
- [ ] `AuthController` (8 endpoints)

### Then: Projects domain
- [ ] `Project` entity + `ProjectFile` entity
- [ ] `ProjectRepository`, `ProjectFileRepository`
- [ ] `ProjectService` (CRUD, status, files, start/stop)
- [ ] `ProjectController` (13 endpoints)
- [ ] `QueuePublisher` (AMQP job publishing)

### Then: Tasks domain
- [ ] `Task` entity
- [ ] `TaskRepository`
- [ ] `TaskService`
- [ ] `TaskController` (task list, clarify, planning, detect_keys, provide_key)

### Finally: Worker pipeline
- [ ] `application-worker.yml` (web-application-type: NONE)
- [ ] `TaskListener` + `TaskListenerService`
- [ ] All 12 pipeline steps (see AI Pipeline section above)
- [ ] Docker SDK integration (`BuilderService`)
- [ ] OpenAI client (`OpenAiClient`)
- [ ] Uncomment worker service in `docker-compose.yml`
