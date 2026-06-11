package com.reuzenpanda.codemax.tasks.pipeline;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import com.reuzenpanda.codemax.common.docker.DockerService;
import com.reuzenpanda.codemax.common.openai.OpenAiClient;
import com.reuzenpanda.codemax.projects.entities.Project;
import com.reuzenpanda.codemax.projects.entities.ProjectFile;
import com.reuzenpanda.codemax.projects.entities.ProjectStatus;
import com.reuzenpanda.codemax.projects.repositories.IProjectFileRepository;
import com.reuzenpanda.codemax.projects.repositories.IProjectRepository;
import com.reuzenpanda.codemax.tasks.entities.AgentLogEntry;
import com.reuzenpanda.codemax.tasks.entities.Task;
import com.reuzenpanda.codemax.tasks.entities.TaskStatus;
import com.reuzenpanda.codemax.tasks.repositories.ITaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PipelineService {

    private final ITaskRepository taskRepo;
    private final IProjectRepository projectRepo;
    private final IProjectFileRepository fileRepo;
    private final OpenAiClient ai;
    private final DockerService docker;
    private final CodeMaxProperties props;
    private final ObjectMapper objectMapper;

    private static final int MAX_FIX_ROUNDS = 5;

    public void runPipeline(UUID taskId, UUID projectId, String prompt) {
        Task task = taskRepo.findById(taskId).orElseThrow();
        Project project = projectRepo.findById(projectId).orElseThrow();

        try {
            markRunning(task, project, prompt);

            Path projectDir = Path.of(props.getProjectsDir(), projectId.toString());

            // Step 1 — Seed template
            log(task, "seed_template", "running", "Seeding Next.js template");
            seedTemplate(projectDir);
            log(task, "seed_template", "done", "Template ready");

            // Step 2 — Provision per-project database
            log(task, "provision_db", "running", "Provisioning project database");
            String dbUrl = provisionDb(projectId);
            log(task, "provision_db", "done", "Database ready");

            // Step 3 — Analyze
            log(task, "analyze", "running", "Analyzing prompt");
            List<String> existingFiles = getFileNames(projectId);
            Map<String, Object> analysis = analyzePrompt(prompt, existingFiles);
            log(task, "analyze", "done", "Change type: " + analysis.get("change_type"));

            // Step 4 — Retrieve context
            log(task, "retrieve", "running", "Retrieving file context");
            Map<String, String> context = retrieveContext(projectId, analysis);
            log(task, "retrieve", "done", context.size() + " files loaded");

            // Step 5 — Plan
            log(task, "plan", "running", "Planning file changes");
            String archSummary = context.getOrDefault("_meta/architecture.md", "");
            String dbCtx = "Project DB URL: " + dbUrl + ". Use pg npm package for database access.";
            List<Map<String, String>> plan = planChanges(prompt, analysis, context, dbCtx);
            log(task, "plan", "done", plan.size() + " files planned");

            // Step 6 — Codegen
            log(task, "codegen", "running", "Generating code");
            for (Map<String, String> fileTask : plan) {
                String filePath = fileTask.get("file");
                String action = fileTask.get("action");
                String desc = fileTask.get("description");

                if ("delete".equals(action)) {
                    deleteFile(projectId, projectDir, filePath);
                    continue;
                }

                String existing = context.get(filePath);
                String content = generateFile(desc, filePath, existing, archSummary, dbCtx);
                content = postProcess(filePath, content);
                saveFile(projectId, projectDir, filePath, content);
                log(task, "codegen", "running", "Generated " + filePath);
            }

            // Step 7 — Architecture summary
            log(task, "architecture", "running", "Writing architecture summary");
            List<String> allPaths = getFileNames(projectId);
            String archContent = generateArchSummary(project.getName(), project.getDescription(), allPaths, prompt);
            saveFile(projectId, projectDir, "_meta/architecture.md", archContent);
            log(task, "architecture", "done", "Architecture summary saved");

            // Step 8 — Database schema
            log(task, "db_schema", "running", "Planning database schema");
            applyDbSchema(task, projectId, projectDir, dbUrl, prompt);

            // Step 9 — API key check
            log(task, "api_keys", "running", "Checking API keys");
            boolean needsKey = checkApiKeys(task, projectId, projectDir, prompt);
            if (needsKey) return; // pipeline paused

            // Step 10 — Build preview container
            log(task, "build", "running", "Starting preview container");
            int port = docker.findFreePort();
            String containerId = docker.provisionPreview(projectId, project.getContainerId(), port);
            project.setContainerId(containerId);
            project.setPreviewPort(port);
            projectRepo.save(project);
            log(task, "build", "running", "Container started on port " + port);

            // Step 11 — Auto-fix loop
            boolean ready = false;
            for (int round = 0; round < MAX_FIX_ROUNDS && !ready; round++) {
                Thread.sleep(15_000);
                List<String> logLines = docker.getLogs(containerId, 100);
                String errorLog = String.join("\n", logLines);

                if (isHealthy(containerId, port)) {
                    ready = true;
                    break;
                }
                if (hasErrors(errorLog)) {
                    log(task, "autofix", "running", "Fixing errors (round " + (round + 1) + ")");
                    fixErrors(task, projectId, projectDir, errorLog);
                }
            }

            // Done
            project.setStatus(ProjectStatus.ready);
            projectRepo.save(project);
            task.setStatus(TaskStatus.done);
            taskRepo.save(task);
            log(task, "done", "done", "Build complete. Preview at /preview/" + projectId);

            docker.writeNginxConfig(projectId, "/etc/nginx/conf.d");

        } catch (Exception e) {
            log.error("Pipeline error for task {}: {}", taskId, e.getMessage(), e);
            task.setStatus(TaskStatus.error);
            log(task, "error", "error", e.getMessage());
            project.setStatus(ProjectStatus.error);
            projectRepo.save(project);
            taskRepo.save(task);
        }
    }

    // ── Step implementations ─────────────────────────────────────────────────

    private void seedTemplate(Path projectDir) throws IOException {
        Path templateDir = Path.of(props.getTemplatesDir(), "nextjs-base");
        if (!Files.exists(templateDir)) return;
        Files.createDirectories(projectDir);
        Files.walk(templateDir).forEach(src -> {
            try {
                Path rel = templateDir.relativize(src);
                Path dst = projectDir.resolve(rel);
                if (Files.isDirectory(src)) {
                    Files.createDirectories(dst);
                } else if (!Files.exists(dst)) {
                    Files.createDirectories(dst.getParent());
                    Files.copy(src, dst);
                }
            } catch (IOException e) {
                log.warn("Seed copy failed: {}", e.getMessage());
            }
        });
    }

    private String provisionDb(UUID projectId) {
        String dbName = "proj_" + projectId.toString().replace("-", "_");
        String adminUrl = props.getProjectsDir().contains("/projects")
            ? System.getenv().getOrDefault("SPRING_DATASOURCE_URL", "jdbc:postgresql://postgres:5432/codemax")
            : "jdbc:postgresql://localhost:5432/codemax";
        // Extract base URL without db name
        String baseUrl = adminUrl.replaceAll("/[^/]+$", "/postgres");
        String user = System.getenv().getOrDefault("SPRING_DATASOURCE_USERNAME", "codemax");
        String pass = System.getenv().getOrDefault("SPRING_DATASOURCE_PASSWORD", "codemax");
        try (var conn = DriverManager.getConnection(baseUrl, user, pass);
             var stmt = conn.createStatement()) {
            stmt.execute("CREATE DATABASE \"" + dbName + "\"");
        } catch (Exception e) {
            if (!e.getMessage().contains("already exists")) log.warn("DB provision: {}", e.getMessage());
        }
        String host = adminUrl.replaceAll("jdbc:postgresql://([^/]+)/.*", "$1");
        return "postgresql://" + user + ":" + pass + "@" + host + "/" + dbName;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> analyzePrompt(String prompt, List<String> files) {
        String sys = """
            You are a code analysis expert. Analyze the user's request and classify it.
            Return JSON with: change_type (new_project|ui_change|logic_change|full_refactor),
            affected_files (array of existing file paths relevant to the change),
            summary (one sentence).
            """;
        String user = "Files: " + files + "\n\nRequest: " + prompt;
        try {
            return objectMapper.readValue(ai.chatJson(sys, user), Map.class);
        } catch (Exception e) {
            return Map.of("change_type", "new_project", "affected_files", List.of(), "summary", prompt);
        }
    }

    private Map<String, String> retrieveContext(UUID projectId, Map<String, Object> analysis) {
        Map<String, String> ctx = new HashMap<>();
        String changeType = (String) analysis.getOrDefault("change_type", "new_project");
        if ("new_project".equals(changeType)) return ctx;

        List<?> affected = (List<?>) analysis.getOrDefault("affected_files", List.of());
        for (Object f : affected) {
            fileRepo.findByProjectIdAndFilePath(projectId, f.toString())
                .ifPresent(pf -> ctx.put(pf.getFilePath(), pf.getContent()));
        }
        // Always include architecture doc if present
        fileRepo.findByProjectIdAndFilePath(projectId, "_meta/architecture.md")
            .ifPresent(pf -> ctx.put("_meta/architecture.md", pf.getContent()));
        return ctx;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, String>> planChanges(String prompt, Map<String, Object> analysis,
                                                   Map<String, String> context, String dbCtx) {
        String sys = """
            You are an expert Next.js developer. Plan the file changes needed.
            Rules: use Pages Router, plain .js/.jsx (NO TypeScript), Tailwind CSS only.
            Never include _app.js or _document.js unless asked.
            For persistent data, include pages/api/*.js routes that use the pg npm package.
            Return JSON: {"tasks": [{"file": "path", "action": "create|modify|delete", "description": "what to do"}]}
            """;
        String fileList = context.isEmpty() ? "none" : String.join(", ", context.keySet());
        String user = "Existing files: " + fileList + "\n\nDB context: " + dbCtx + "\n\nRequest: " + prompt;
        try {
            Map<String, Object> result = objectMapper.readValue(ai.chatJson(sys, user), Map.class);
            return (List<Map<String, String>>) result.get("tasks");
        } catch (Exception e) {
            log.warn("Plan parse error: {}", e.getMessage());
            return List.of();
        }
    }

    private String generateFile(String description, String filePath, String existing,
                                 String archSummary, String dbCtx) {
        String sys = """
            You are an expert Next.js developer. Generate the complete file content.
            Use plain JavaScript (NO TypeScript). Tailwind CSS for styling.
            For API routes: ESM imports, export default async function handler(req, res).
            For DB access: import {{ Pool }} from 'pg', use DATABASE_URL env var.
            Return ONLY the file content, no markdown fences.
            """;
        String user = "File: " + filePath
            + "\nTask: " + description
            + (existing != null ? "\n\nCurrent content:\n" + existing : "")
            + (archSummary.isBlank() ? "" : "\n\nArchitecture:\n" + archSummary)
            + "\n\nDB context: " + dbCtx;
        return ai.chat(sys, user);
    }

    private String generateArchSummary(String name, String description, List<String> files, String change) {
        String sys = "You are a technical writer. Generate a concise (under 300 words) architecture summary in Markdown.";
        String user = "App: " + name + "\nDescription: " + description
            + "\nFiles: " + files + "\nLatest change: " + change;
        return ai.chat(sys, user);
    }

    @SuppressWarnings("unchecked")
    private void applyDbSchema(Task task, UUID projectId, Path projectDir,
                                String dbUrl, String prompt) throws Exception {
        // Collect generated JS files
        Map<String, String> srcFiles = new HashMap<>();
        fileRepo.findByProjectIdOrderByFilePath(projectId).stream()
            .filter(f -> f.getFilePath().endsWith(".js") || f.getFilePath().endsWith(".jsx"))
            .forEach(f -> srcFiles.put(f.getFilePath(), f.getContent()));

        String sys = """
            You are a PostgreSQL schema expert. Analyze the app code and return JSON:
            {"needs_db": true/false, "schema_sql": "CREATE TABLE IF NOT EXISTS...", "description": "summary"}
            Rules: only CREATE TABLE IF NOT EXISTS and ALTER TABLE ADD COLUMN IF NOT EXISTS.
            Always include id SERIAL PRIMARY KEY and created_at TIMESTAMPTZ DEFAULT NOW().
            NEVER drop tables or columns.
            """;
        String user = "Prompt: " + prompt + "\n\nCode files:\n" +
            srcFiles.entrySet().stream().map(e -> "// " + e.getKey() + "\n" + e.getValue())
                .collect(Collectors.joining("\n\n"));

        try {
            Map<String, Object> schema = objectMapper.readValue(ai.chatJson(sys, user), Map.class);
            if (Boolean.TRUE.equals(schema.get("needs_db")) && schema.get("schema_sql") != null) {
                String sql = (String) schema.get("schema_sql");
                // Execute schema SQL against project DB
                String jdbcUrl = dbUrl.replace("postgresql://", "jdbc:postgresql://");
                String[] parts = jdbcUrl.split("@");
                // Parse credentials from URL
                String creds = parts[0].replace("jdbc:postgresql://", "");
                String[] credParts = creds.split(":");
                String user2 = credParts[0];
                String pass = credParts[1];
                String urlPart = "jdbc:postgresql://" + parts[1];
                try (var conn = DriverManager.getConnection(urlPart, user2, pass);
                     var stmt = conn.createStatement()) {
                    stmt.execute(sql);
                }
                log(task, "db_schema", "done", (String) schema.get("description"));

                // Generate API routes to wire the DB
                generateDbApiRoutes(task, projectId, projectDir, prompt, sql, srcFiles);
            } else {
                log(task, "db_schema", "done", "No database needed");
            }
        } catch (Exception e) {
            log.warn("DB schema step failed: {}", e.getMessage());
            log(task, "db_schema", "done", "Schema step skipped: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void generateDbApiRoutes(Task task, UUID projectId, Path projectDir,
                                      String prompt, String schemaSql,
                                      Map<String, String> srcFiles) throws Exception {
        String sys = """
            You are a Next.js API routes expert. Generate pages/api/*.js handlers and update pages/index.js.
            Rules: plain JavaScript, ESM imports, use pg Pool, CREATE TABLE IF NOT EXISTS in each handler,
            export default async function handler(req, res).
            Return JSON: {"files": {"pages/api/items.js": "...", "pages/index.js": "..."}}
            """;
        String pageFiles = srcFiles.entrySet().stream()
            .filter(e -> e.getKey().startsWith("pages/") && !e.getKey().startsWith("pages/api/"))
            .limit(5)
            .map(e -> "// " + e.getKey() + "\n" + e.getValue())
            .collect(Collectors.joining("\n\n"));
        String user = "Prompt: " + prompt + "\nSchema:\n" + schemaSql + "\n\nPage files:\n" + pageFiles;

        Map<String, Object> result = objectMapper.readValue(ai.chatJson(sys, user), Map.class);
        Map<String, String> files = (Map<String, String>) result.get("files");
        if (files != null) {
            for (Map.Entry<String, String> entry : files.entrySet()) {
                String content = postProcess(entry.getKey(), entry.getValue());
                saveFile(projectId, projectDir, entry.getKey(), content);
            }
            log(task, "db_wiring", "done", "API routes generated");
        }
    }

    private boolean checkApiKeys(Task task, UUID projectId, Path projectDir, String prompt) {
        // Scan for process.env.XXX_KEY patterns in generated files
        Pattern pattern = Pattern.compile("process\\.env\\.(\\w+(?:_KEY|_SECRET|_TOKEN|_API_KEY|_WEBHOOK))", Pattern.CASE_INSENSITIVE);
        Set<String> missing = new HashSet<>();
        fileRepo.findByProjectIdOrderByFilePath(projectId).forEach(f -> {
            Matcher m = pattern.matcher(f.getContent());
            while (m.find()) missing.add(m.group(1));
        });
        if (missing.isEmpty()) {
            log(task, "api_keys", "done", "No external API keys required");
            return false;
        }
        // For now, write an empty .env.local and continue — user can provide keys later
        try {
            Path envFile = projectDir.resolve(".env.local");
            if (!Files.exists(envFile)) {
                Files.writeString(envFile, "# Add your API keys here\n" +
                    missing.stream().map(k -> k + "=").collect(Collectors.joining("\n")));
            }
        } catch (IOException e) {
            log.warn("Could not write .env.local: {}", e.getMessage());
        }
        log(task, "api_keys", "done", "Keys referenced: " + missing + " — add them in .env.local");
        return false;
    }

    @SuppressWarnings("unchecked")
    private void fixErrors(Task task, UUID projectId, Path projectDir, String errorLog) throws Exception {
        Map<String, String> files = new HashMap<>();
        fileRepo.findByProjectIdOrderByFilePath(projectId).stream()
            .filter(f -> f.getFilePath().endsWith(".js") || f.getFilePath().endsWith(".jsx"))
            .forEach(f -> files.put(f.getFilePath(), f.getContent()));

        String sys = """
            You are a Next.js debugging expert. Fix the compilation errors in the provided files.
            Return JSON: {"files": {"path": "fixed content", ...}}
            Only include files that need changes. Plain JavaScript, no TypeScript.
            """;
        String user = "Errors:\n" + errorLog + "\n\nFiles:\n" +
            files.entrySet().stream().map(e -> "// " + e.getKey() + "\n" + e.getValue())
                .collect(Collectors.joining("\n\n"));

        Map<String, Object> result = objectMapper.readValue(ai.chatJson(sys, user), Map.class);
        Map<String, String> fixed = (Map<String, String>) result.get("files");
        if (fixed != null) {
            for (Map.Entry<String, String> entry : fixed.entrySet()) {
                String content = postProcess(entry.getKey(), entry.getValue());
                saveFile(projectId, projectDir, entry.getKey(), content);
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    @Transactional
    protected void markRunning(Task task, Project project, String prompt) {
        task.setStatus(TaskStatus.running);
        project.setStatus(ProjectStatus.building);
        taskRepo.save(task);
        projectRepo.save(project);
        log(task, "start", "running", "Processing prompt: " + prompt);
    }

    @Transactional
    protected void log(Task task, String step, String status, String detail) {
        AgentLogEntry entry = new AgentLogEntry(step, status,
            OffsetDateTime.now().toString(), detail);
        if (task.getAgentLog() == null) task.setAgentLog(new ArrayList<>());
        task.getAgentLog().add(entry);
        taskRepo.save(task);
    }

    private List<String> getFileNames(UUID projectId) {
        return fileRepo.findByProjectIdOrderByFilePath(projectId)
            .stream().map(ProjectFile::getFilePath).toList();
    }

    private void saveFile(UUID projectId, Path projectDir, String filePath, String content) throws IOException {
        // Write to disk
        Path dest = projectDir.resolve(filePath);
        Files.createDirectories(dest.getParent());
        Files.writeString(dest, content);
        // Persist in DB
        ProjectFile pf = fileRepo.findByProjectIdAndFilePath(projectId, filePath)
            .orElseGet(() -> { var f = new ProjectFile(); f.setProjectId(projectId); f.setFilePath(filePath); return f; });
        pf.setContent(content);
        fileRepo.save(pf);
    }

    private void deleteFile(UUID projectId, Path projectDir, String filePath) throws IOException {
        Files.deleteIfExists(projectDir.resolve(filePath));
        fileRepo.findByProjectIdAndFilePath(projectId, filePath).ifPresent(f -> fileRepo.deleteById(f.getId()));
    }

    /** Strip TypeScript and fix CJS exports in .js files. */
    private String postProcess(String filePath, String content) {
        if (!filePath.endsWith(".js") && !filePath.endsWith(".jsx")) return content;
        // Remove markdown code fences if GPT wrapped the response
        content = content.replaceAll("^```[a-z]*\\n?", "").replaceAll("\\n?```$", "").trim();
        // Convert module.exports = ... to export default ...
        content = content.replaceAll("module\\.exports\\s*=\\s*", "export default ");
        // Convert require() to import where simple
        content = content.replaceAll("const\\s+(\\w+)\\s*=\\s*require\\(['\"]([^'\"]+)['\"]\\)", "import $1 from '$2'");
        return content;
    }

    private boolean isHealthy(String containerId, int port) {
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(3)).build();
            HttpRequest req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/")).GET().build();
            int status = client.send(req, HttpResponse.BodyHandlers.discarding()).statusCode();
            return status < 500;
        } catch (Exception e) {
            return false;
        }
    }

    private static final List<String> ERROR_INDICATORS = List.of(
        "Module not found", "SyntaxError", "Cannot find module",
        "error TS", "Type error", "Failed to compile", "Build error"
    );

    private boolean hasErrors(String log) {
        return ERROR_INDICATORS.stream().anyMatch(log::contains);
    }
}
