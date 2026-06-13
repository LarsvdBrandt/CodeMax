package com.reuzenpanda.codemax.tasks.pipeline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reuzenpanda.codemax.common.ai.AiRouter;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import com.reuzenpanda.codemax.common.docker.DockerService;
import com.reuzenpanda.codemax.projects.entities.Project;
import com.reuzenpanda.codemax.projects.entities.ProjectFile;
import com.reuzenpanda.codemax.projects.entities.ProjectStatus;
import com.reuzenpanda.codemax.projects.repositories.IProjectFileRepository;
import com.reuzenpanda.codemax.projects.repositories.IProjectRepository;
import com.reuzenpanda.codemax.tasks.entities.AgentLogEntry;
import com.reuzenpanda.codemax.tasks.entities.Task;
import com.reuzenpanda.codemax.tasks.entities.TaskStatus;
import com.reuzenpanda.codemax.tasks.repositories.ITaskRepository;
import com.reuzenpanda.codemax.versions.services.IVersionService;
import com.reuzenpanda.codemax.tasks.pipeline.engine.Patch;
import com.reuzenpanda.codemax.tasks.pipeline.engine.PatchEngine;
import com.reuzenpanda.codemax.tasks.pipeline.engine.TemplateKnowledgeBuilder;
import com.reuzenpanda.codemax.tasks.pipeline.generators.*;
import com.reuzenpanda.codemax.tasks.pipeline.memory.ProjectMemoryService;
import com.reuzenpanda.codemax.tasks.pipeline.model.*;
import com.reuzenpanda.codemax.tasks.pipeline.packs.*;
import com.reuzenpanda.codemax.tasks.pipeline.stages.ArchitectStage;
import com.reuzenpanda.codemax.tasks.pipeline.stages.PlannerStage;
import com.reuzenpanda.codemax.tasks.pipeline.stages.ReviewStage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class PipelineService {

    private final ITaskRepository taskRepo;
    private final IProjectRepository projectRepo;
    private final IProjectFileRepository fileRepo;
    private final AiRouter aiRouter;
    private final DockerService docker;
    private final CodeMaxProperties props;
    private final ObjectMapper objectMapper;
    private final ResourcePatternResolver resourceLoader;
    private final IVersionService versionService;
    private final com.reuzenpanda.codemax.versions.repositories.IProjectBranchRepository branchRepo;

    // Pack-based pipeline components
    private final PackRegistry packRegistry;
    private final PackSelector packSelector;
    private final EntityExtractor entityExtractor;
    private final PackInstaller packInstaller;
    private final DatabaseSchemaService schemaService;

    // V3 pipeline components (fallback)
    private final TemplateKnowledgeBuilder knowledgeBuilder;
    private final ArchitectStage architect;
    private final PlannerStage planner;
    private final ReviewStage reviewer;
    private final ModelGenerator modelGen;
    private final RouteGenerator routeGen;
    private final TypeGenerator typeGen;
    private final ServiceGenerator serviceGen;
    private final PageGenerator pageGen;
    private final NavigationGenerator navGen;
    private final BrandingGenerator brandingGen;
    private final ProjectMemoryService memory;
    private final PatchEngine patchEngine;

    private static final int MAX_FIX_ROUNDS = 5;

    // ── Entry point ───────────────────────────────────────────────────────────

    public void runPipeline(UUID taskId, UUID projectId, String prompt) {
        Task task = taskRepo.findById(taskId).orElseThrow();
        Project project = projectRepo.findById(projectId).orElseThrow();

        try {
            markRunning(task, project, prompt);
            UUID branchId = task.getBranchId();
            final boolean isBranchBuild = branchId != null;

            // For branch builds, work in an isolated directory
            Path mainDir = Path.of(props.getProjectsDir(), projectId.toString());
            Path projectDir;
            if (isBranchBuild) {
                projectDir = Path.of(props.getProjectsDir(), projectId + "_branch_" + branchId);
                // Seed branch dir from main if it doesn't exist yet
                if (!Files.exists(projectDir) && Files.exists(mainDir)) {
                    copyDirectory(mainDir, projectDir);
                } else if (!Files.exists(projectDir)) {
                    Files.createDirectories(projectDir);
                }
            } else {
                projectDir = mainDir;
            }
            Map<String, String> answers = project.getAnswers() != null ? project.getAnswers() : Map.of();

            // ── Infrastructure setup ──────────────────────────────────────────
            pipeLog(task, "seed_template", "running", "Seeding project template");
            seedTemplate(projectDir);
            // For branch builds the dir is already seeded from main; skip DB write
            if (!isBranchBuild) {
                persistSeededFiles(projectDir, projectId);
            }
            pipeLog(task, "seed_template", "done", "Template copied");

            pipeLog(task, "env_vars", "running", "Configuring environment");
            String jwtSecret = injectEnvVars(projectDir, projectId, answers);
            pipeLog(task, "env_vars", "done", "Environment configured");

            // ── Knowledge (used by autofix and V3 fallback) ───────────────────
            pipeLog(task, "knowledge", "running", "Scanning template knowledge");
            TemplateKnowledge knowledge = knowledgeBuilder.build(projectDir);
            pipeLog(task, "knowledge", "done", knowledge.availableComponents().size() + " components found");

            boolean isUpdate = memory.hasMemory(projectDir);
            List<String> generatedFiles = new ArrayList<>();

            // ── Pack selector: try pack-based flow first ──────────────────────
            pipeLog(task, "pack_select", "running", "Selecting component packs");
            PackSelector.Selection selection = packSelector.select(prompt, packRegistry.all());
            pipeLog(task, "pack_select", "done", "Packs: " + selection.packs());

            AppSpecification spec;
            ExecutionPlan plan;

            if (!selection.packs().isEmpty()) {
                // ── Pack flow ─────────────────────────────────────────────────
                pipeLog(task, "entity_extract", "running", "Extracting entity definition");
                String existingSchema = isUpdate ? schemaService.schemaContext(projectDir) : "";
                EntityDefinition entity = entityExtractor.extract(prompt, selection.packs(), existingSchema);
                pipeLog(task, "entity_extract", "done", "Entity: " + entity.entityName());

                for (String packName : selection.packs()) {
                    pipeLog(task, "pack_install", "running", "Installing " + packName + " pack");
                    packInstaller.install(projectDir, packName, entity);
                    generatedFiles.add("server/src/models/" + PackInstaller.capitalize(entity.entityName()) + ".ts");
                    generatedFiles.add("server/src/routes/" + entity.entityNamePlural() + ".ts");
                    generatedFiles.add("src/types/index.ts");
                    generatedFiles.add("src/services/" + entity.entityNamePlural() + ".ts");
                    generatedFiles.add("src/pages/" + PackInstaller.capitalize(entity.entityNamePlural()) + "Page.tsx");
                    pipeLog(task, "pack_install", "done", packName + " installed");
                }

                // Build minimal spec for branding + memory
                String appName = answers.getOrDefault("business_name", "My App");
                String colorRgb = answers.getOrDefault("primary_color", "99 102 241");
                String tagline  = answers.getOrDefault("tagline", "");
                BrandingSpec branding = new BrandingSpec(colorRgb, tagline, appName, prompt, List.of());
                EntitySpec primaryEntity = new EntitySpec(
                    entity.entityName(), entity.entityNamePlural(),
                    "/" + entity.entityNamePlural(), List.of()
                );
                spec = new AppSpecification(appName, prompt, branding,
                    List.of(primaryEntity), List.of(), List.of(), isUpdate);
                plan = new ExecutionPlan(List.of());

            } else {
                // ── V3 fallback: full AI-generated code path ──────────────────
                if (isUpdate) {
                    pipeLog(task, "architect", "running", "Merging with existing project spec");
                    AppSpecification existing = memory.loadSpecification(projectDir);
                    spec = architect.architectUpdate(prompt, answers, knowledge, existing);
                    plan = planner.planUpdate(spec, existing);
                    pipeLog(task, "architect", "done", "Update spec: " + spec.appName());
                } else {
                    pipeLog(task, "architect", "running", "Analyzing your request");
                    spec = architect.architect(prompt, answers, knowledge);
                    plan = planner.plan(spec);
                    pipeLog(task, "architect", "done", "App: " + spec.appName() + " — entities: " +
                        spec.entities().stream().map(EntitySpec::name).collect(Collectors.joining(", ")));
                }

                for (EntitySpec entity : spec.entities()) {
                    pipeLog(task, "backend_model", "running", "Generating " + entity.name() + " model");
                    modelGen.generate(projectDir, spec, entity, knowledge);
                    generatedFiles.add("server/src/models/" + entity.name() + ".ts");
                    pipeLog(task, "backend_model", "done", "Model generated");

                    pipeLog(task, "backend_routes", "running", "Generating " + entity.plural() + " routes");
                    routeGen.generate(projectDir, spec, entity, knowledge);
                    generatedFiles.add("server/src/routes/" + entity.plural() + ".ts");
                    pipeLog(task, "backend_routes", "done", "Routes generated");

                    pipeLog(task, "route_index", "running", "Wiring routes");
                    updateRouteIndex(projectDir, entity);
                    pipeLog(task, "route_index", "done", "Routes mounted");

                    pipeLog(task, "frontend_types", "running", "Generating TypeScript types");
                    typeGen.generate(projectDir, spec, entity, knowledge);
                    generatedFiles.add("src/types/index.ts");
                    pipeLog(task, "frontend_types", "done", "Types generated");

                    pipeLog(task, "frontend_service", "running", "Generating " + entity.plural() + " service");
                    serviceGen.generate(projectDir, spec, entity, knowledge);
                    generatedFiles.add("src/services/" + entity.plural() + ".ts");
                    pipeLog(task, "frontend_service", "done", "Service generated");

                    pipeLog(task, "frontend_page", "running", "Building " + entity.name() + " page");
                    pageGen.generate(projectDir, spec, entity, knowledge);
                    generatedFiles.add("src/pages/" + entity.name() + "sPage.tsx");
                    pipeLog(task, "frontend_page", "done", "Page generated");
                }

                // Wire all routing + navigation once after all entities are generated
                pipeLog(task, "routing", "running", "Updating navigation");
                navGen.generateAll(projectDir, spec);
                generatedFiles.add("src/App.tsx");
                pipeLog(task, "routing", "done", "Navigation updated");

                // Review gate (V3 only)
                if (props.getReviewModel() == null || props.getReviewModel().isBlank()) {
                    pipeLog(task, "review", "skipped", "No review-model configured (set review-model to enable)");
                }
                if (props.getReviewModel() != null && !props.getReviewModel().isBlank() && !spec.entities().isEmpty()) {
                    pipeLog(task, "review", "running", "Reviewing generated code");
                    EntitySpec primary = spec.entities().get(0);
                    Map<String, String> reviewFiles = reviewer.collectReviewFiles(projectDir, primary.plural());
                    List<Patch> fixes = reviewer.review(spec, reviewFiles);
                    if (!fixes.isEmpty()) {
                        pipeLog(task, "review", "running", "Applying " + fixes.size() + " review fix(es)");
                        patchEngine.apply(projectDir, fixes);
                    }
                    pipeLog(task, "review", "done", "Review complete");
                }
            }

            pipeLog(task, "branding", "running", "Applying branding");
            brandingGen.generate(projectDir, spec, answers);
            generatedFiles.add("src/config/content.ts");
            pipeLog(task, "branding", "done", "Branding applied");

            // ── Save memory ───────────────────────────────────────────────────
            memory.save(projectDir, spec, plan, knowledge, generatedFiles, prompt);

            // ── Build Docker container ────────────────────────────────────────
            pipeLog(task, "build", "running", "Starting preview container");
            String appName = answers.getOrDefault("business_name", "My App");
            DockerService.PreviewResult preview;
            if (isBranchBuild) {
                String dbName = "branch_" + branchId.toString().replace("-", "_");
                preview = docker.provisionBranchPreview(branchId, projectDir, jwtSecret, appName, dbName);
                // Store container info on the branch, not on the project
                branchRepo.findById(branchId).ifPresent(branch -> {
                    branch.setContainerId(preview.containerId());
                    branch.setPreviewPort(preview.port());
                    branchRepo.save(branch);
                });
            } else {
                String dbName = "proj_" + projectId.toString().replace("-", "_");
                preview = docker.provisionPreview(projectId, project.getContainerId(), jwtSecret, appName, dbName);
                project.setContainerId(preview.containerId());
                project.setPreviewPort(preview.port());
                projectRepo.save(project);
            }
            pipeLog(task, "build", "running", "Container started on port " + preview.port());

            String containerId = preview.containerId();
            boolean ready = false;
            for (int round = 0; round < MAX_FIX_ROUNDS && !ready; round++) {
                // First round: wait longer for npm install to complete (60-120s typical)
                Thread.sleep(round == 0 ? 70_000 : 25_000);
                List<String> logLines = docker.getLogs(containerId, 200);
                String errorLog = String.join("\n", logLines);

                if (docker.isHealthy(preview.port())) {
                    ready = true;
                    break;
                }
                if (hasErrors(errorLog)) {
                    pipeLog(task, "autofix", "running", "Fixing errors (round " + (round + 1) + ")");
                    fixErrors(projectDir, errorLog, knowledge, generatedFiles);
                }
            }

            if (ready) {
                project.setStatus(ProjectStatus.ready);
                task.setStatus(TaskStatus.done);
                pipeLog(task, "done", "done", "Build complete — preview on port " + preview.port());
            } else {
                project.setStatus(ProjectStatus.error);
                task.setStatus(TaskStatus.error);
                pipeLog(task, "error", "error", "Build timed out after " + MAX_FIX_ROUNDS + " rounds — app did not become healthy");
            }
            projectRepo.save(project);
            taskRepo.save(task);

            // Auto-commit version snapshot only after successful build
            if (ready) {
                try {
                    versionService.autoCommit(projectId, taskId, project.getUserId(), task.getPrompt(), task.getBranchId());
                } catch (Exception vEx) {
                    log.warn("Version auto-commit failed for task {}: {}", taskId, vEx.getMessage());
                }
            }

        } catch (Exception e) {
            log.error("Pipeline failed for task {}: {}", taskId, e.getMessage(), e);
            task.setStatus(TaskStatus.error);
            pipeLog(task, "error", "error", e.getMessage());
            project.setStatus(ProjectStatus.error);
            projectRepo.save(project);
            taskRepo.save(task);
        }
    }

    // ── Step 1: Seed template from classpath ──────────────────────────────────

    private void seedTemplate(Path projectDir) throws IOException {
        Resource[] resources = resourceLoader.getResources("classpath:template/**");
        Files.createDirectories(projectDir);

        for (Resource resource : resources) {
            if (!resource.isReadable()) continue;

            String uriStr = resource.getURI().toString();
            int idx = uriStr.lastIndexOf("/template/");
            if (idx < 0) continue;
            String relativePath = uriStr.substring(idx + "/template/".length());
            if (relativePath.isBlank()) continue;

            if (relativePath.contains("node_modules/")
                || relativePath.startsWith("dist/")
                || relativePath.contains("/.claude/")
                || relativePath.equals(".env")
                || relativePath.equals("server/.env")) continue;

            Path dest = projectDir.resolve(relativePath);
            if (!Files.exists(dest)) {
                Files.createDirectories(dest.getParent());
                try (InputStream is = resource.getInputStream()) {
                    Files.copy(is, dest);
                }
            }
        }
    }

    // ── Step 1b: Persist seeded files to DB so the file viewer shows them ────

    private static final Set<String> TEXT_EXTENSIONS = Set.of(
        ".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html",
        ".md", ".txt", ".yaml", ".yml", ".env", ".mjs", ".cjs"
    );

    private void persistSeededFiles(Path projectDir, UUID projectId) {
        try (Stream<Path> walk = Files.walk(projectDir)) {
            walk.filter(Files::isRegularFile)
                .filter(p -> {
                    String name = p.getFileName().toString();
                    return TEXT_EXTENSIONS.stream().anyMatch(name::endsWith);
                })
                .filter(p -> {
                    String rel = projectDir.relativize(p).toString();
                    return !rel.contains("node_modules") && !rel.startsWith("dist/")
                        && !rel.startsWith(".git/") && !rel.equals(".env")
                        && !rel.equals("server/.env");
                })
                .forEach(p -> {
                    try {
                        String rel = projectDir.relativize(p).toString();
                        String content = Files.readString(p);
                        // Use fileRepo directly to avoid the content-blank guard in save()
                        ProjectFile pf = fileRepo.findByProjectIdAndFilePath(projectId, rel)
                            .orElseGet(() -> {
                                ProjectFile f = new ProjectFile();
                                f.setProjectId(projectId);
                                f.setFilePath(rel);
                                return f;
                            });
                        pf.setContent(content);
                        fileRepo.save(pf);
                    } catch (IOException ignored) {}
                });
        } catch (IOException e) {
            log.warn("persistSeededFiles: could not walk project dir: {}", e.getMessage());
        }
    }

    // ── Step 2: Inject env vars ───────────────────────────────────────────────
    // Returns the generated JWT secret so it can be passed directly to DockerService.

    private String injectEnvVars(Path projectDir, UUID projectId,
                                  Map<String, String> answers) throws IOException {
        String dbName    = "proj_" + projectId.toString().replace("-", "_");
        String jwtSecret = generateSecret();
        String appName   = answers.getOrDefault("business_name", "My App");

        // Write .env files for developer reference (not used by Docker containers directly —
        // DockerService injects env vars when creating each container).
        Map<String, String> frontendEnv = new LinkedHashMap<>();
        frontendEnv.put("VITE_API_BASE_URL", "");
        frontendEnv.put("VITE_APP_NAME", appName);
        frontendEnv.put("NODE_ENV", "development");
        writeEnvFile(projectDir.resolve(".env"), frontendEnv);

        Map<String, String> serverEnv = new LinkedHashMap<>();
        serverEnv.put("PORT", "3000");
        serverEnv.put("MONGODB_URI", "mongodb://localhost:27017/" + dbName);
        serverEnv.put("JWT_SECRET", jwtSecret);
        serverEnv.put("JWT_EXPIRES_IN", "7d");
        serverEnv.put("NODE_ENV", "development");
        writeEnvFile(projectDir.resolve("server/.env"), serverEnv);

        return jwtSecret;
    }

    // ── Route index: deterministic string patch ───────────────────────────────

    private void updateRouteIndex(Path projectDir, EntitySpec entity) throws IOException {
        Path indexPath = projectDir.resolve("server/src/routes/index.ts");
        if (!Files.exists(indexPath)) {
            log.warn("updateRouteIndex: server/src/routes/index.ts not found");
            return;
        }
        String content = Files.readString(indexPath);

        // Remove todos references and inject entity routes
        String updated = content
            .replaceAll("import todosRouter from '\\./todos'[\\r\\n]*", "")
            .replaceAll("router\\.use\\('/todos',\\s*todosRouter\\)[\\r\\n]*", "");

        String plural = entity.plural();
        String importLine = "import " + plural + "Router from './" + plural + "'";
        String useLine    = "router.use('/" + plural + "', " + plural + "Router)";

        if (!updated.contains(importLine)) {
            // Insert import after the last existing import line
            int lastImport = updated.lastIndexOf("import ");
            if (lastImport >= 0) {
                int eol = updated.indexOf('\n', lastImport);
                updated = updated.substring(0, eol + 1) + importLine + "\n" + updated.substring(eol + 1);
            } else {
                updated = importLine + "\n" + updated;
            }
        }

        if (!updated.contains(useLine)) {
            // Insert before the last export/module.exports line, or append
            int exportIdx = updated.lastIndexOf("export default");
            if (exportIdx >= 0) {
                updated = updated.substring(0, exportIdx) + useLine + "\n\n" + updated.substring(exportIdx);
            } else {
                updated = updated + "\n" + useLine + "\n";
            }
        }

        Files.writeString(indexPath, updated);
        save(projectDir, "server/src/routes/index.ts", updated);
    }

    // ── Auto-fix ──────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void fixErrors(Path projectDir, String errorLog, TemplateKnowledge knowledge,
                            List<String> generatedFiles) {
        Map<String, String> files = new LinkedHashMap<>();

        // Priority 1: load the generated files (most likely sources of errors)
        for (String rel : generatedFiles) {
            Path p = projectDir.resolve(rel);
            if (Files.exists(p)) {
                try { files.put(rel, Files.readString(p)); }
                catch (IOException ignored) {}
            }
        }

        // Priority 2: extract file paths mentioned in the error log
        List<String> mentioned = extractMentionedFiles(errorLog);
        for (String rel : mentioned) {
            Path p = projectDir.resolve(rel);
            if (Files.exists(p)) {
                try { files.putIfAbsent(rel, Files.readString(p)); }
                catch (IOException ignored) {}
            }
        }

        // Fill up to 8 src files and 4 server files if we haven't hit enough context
        if (files.size() < 4) {
            collectTsFiles(projectDir.resolve("src"), projectDir, files, 8);
            collectTsFiles(projectDir.resolve("server/src"), projectDir, files, 4);
        }

        String sys = GeneratorPrompts.PREAMBLE + "\n" +
            "Fix the TypeScript compilation/import errors in the provided files.\n" +
            "Return JSON: {\"files\": {\"relative/path.ts\": \"fixed content\", ...}}\n" +
            "Only include files that need changes. No markdown fences inside file content.\n";

        String userMsg = "Errors:\n" + errorLog + "\n\nFiles:\n" +
            files.entrySet().stream()
                .map(e -> "// " + e.getKey() + "\n" + e.getValue())
                .collect(Collectors.joining("\n\n"));
        try {
            Map<String, Object> result = objectMapper.readValue(
                aiRouter.chatJson(props.getCodeModel(), sys, userMsg), Map.class);
            Map<String, String> fixed = (Map<String, String>) result.get("files");
            if (fixed != null) {
                fixed.forEach((path, content) -> {
                    try { save(projectDir, path, stripFences(content)); }
                    catch (IOException e) { log.warn("Could not save fixed file {}: {}", path, e.getMessage()); }
                });
            }
        } catch (Exception e) {
            log.warn("fixErrors failed: {}", e.getMessage());
        }
    }

    private List<String> extractMentionedFiles(String errorLog) {
        List<String> files = new ArrayList<>();
        // Match paths like src/... or server/src/...
        java.util.regex.Matcher m =
            java.util.regex.Pattern.compile("(?:src|server/src)/[^:\\s'\"]+\\.(?:ts|tsx)").matcher(errorLog);
        Set<String> seen = new LinkedHashSet<>();
        while (m.find()) {
            String path = m.group();
            if (seen.add(path)) files.add(path);
        }
        return files;
    }

    private void collectTsFiles(Path dir, Path base, Map<String, String> out, int limit) {
        if (!Files.exists(dir)) return;
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.filter(p -> (p.toString().endsWith(".ts") || p.toString().endsWith(".tsx"))
                    && !p.toString().contains("node_modules"))
                .limit(limit)
                .forEach(p -> {
                    try {
                        String key = base.relativize(p).toString();
                        out.putIfAbsent(key, Files.readString(p));
                    } catch (IOException ignored) {}
                });
        } catch (IOException e) {
            log.warn("collectTsFiles failed: {}", e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void writeEnvFile(Path envFile, Map<String, String> values) throws IOException {
        Files.createDirectories(envFile.getParent());
        StringBuilder sb = new StringBuilder();
        values.forEach((k, v) -> sb.append(k).append("=").append(v).append("\n"));
        Files.writeString(envFile, sb.toString());
    }

    private void save(Path projectDir, String relativePath, String content) throws IOException {
        if (content == null || content.isBlank()) return;
        Path dest = projectDir.resolve(relativePath);
        Files.createDirectories(dest.getParent());
        Files.writeString(dest, content);
        // Branch build dirs are named "{projectId}_branch_{branchId}" — skip DB write
        // so branch changes don't overwrite the main project_files table.
        String dirName = projectDir.getFileName().toString();
        if (dirName.contains("_branch_")) return;
        UUID projectId = UUID.fromString(dirName);
        ProjectFile pf = fileRepo.findByProjectIdAndFilePath(projectId, relativePath)
            .orElseGet(() -> {
                ProjectFile f = new ProjectFile();
                f.setProjectId(projectId);
                f.setFilePath(relativePath);
                return f;
            });
        pf.setContent(content);
        fileRepo.save(pf);
    }

    private String loadFile(Path projectDir, String relativePath) {
        try {
            Path p = projectDir.resolve(relativePath);
            return Files.exists(p) ? Files.readString(p) : "";
        } catch (IOException e) {
            return "";
        }
    }

    private String stripFences(String content) {
        if (content == null) return "";
        return content.replaceAll("^```[a-zA-Z]*\\n?", "").replaceAll("\\n?```$", "").trim();
    }

    private String generateSecret() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private void copyDirectory(Path src, Path dest) throws IOException {
        Files.createDirectories(dest);
        try (Stream<Path> stream = Files.walk(src)) {
            for (Path source : (Iterable<Path>) stream::iterator) {
                Path target = dest.resolve(src.relativize(source));
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }
    }

    @Transactional
    protected void markRunning(Task task, Project project, String prompt) {
        task.setStatus(TaskStatus.running);
        project.setStatus(ProjectStatus.building);
        taskRepo.save(task);
        projectRepo.save(project);
        pipeLog(task, "start", "running", "Processing: " + prompt);
    }

    @Transactional
    protected void pipeLog(Task task, String step, String status, String detail) {
        AgentLogEntry entry = new AgentLogEntry(step, status, OffsetDateTime.now().toString(), detail);
        if (task.getAgentLog() == null) task.setAgentLog(new ArrayList<>());
        task.getAgentLog().add(entry);
        taskRepo.save(task);
        log.info("[pipeline] {} — {}: {}", step, status, detail);
    }

    private static final List<String> ERROR_INDICATORS = List.of(
        "Module not found", "SyntaxError", "Cannot find module",
        "error TS", "Type error", "Failed to compile", "Build error",
        "ERR_MODULE_NOT_FOUND", "ENOENT", "ReferenceError", "TypeError:",
        "UnhandledPromiseRejection", "Cannot read properties of",
        "is not a function", "is not defined", "FATAL ERROR"
    );

    private boolean hasErrors(String logContent) {
        return ERROR_INDICATORS.stream().anyMatch(logContent::contains);
    }
}
