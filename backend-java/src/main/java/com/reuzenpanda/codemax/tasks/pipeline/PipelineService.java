package com.reuzenpanda.codemax.tasks.pipeline;

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
    private final OpenAiClient ai;
    private final DockerService docker;
    private final CodeMaxProperties props;
    private final ObjectMapper objectMapper;
    private final ResourcePatternResolver resourceLoader;

    private static final int MAX_FIX_ROUNDS = 5;

    record TemplateAnalysis(
        String featureName,
        String featurePlural,
        String featureRoute,
        List<Map<String, Object>> fields,
        String accentColorRgb,
        String appTagline,
        String heroHeadline,
        String heroSubheadline,
        List<Map<String, String>> featuresList
    ) {}

    // ── Entry point ───────────────────────────────────────────────────────────

    public void runPipeline(UUID taskId, UUID projectId, String prompt) {
        Task task = taskRepo.findById(taskId).orElseThrow();
        Project project = projectRepo.findById(projectId).orElseThrow();

        try {
            markRunning(task, project, prompt);
            Path projectDir = Path.of(props.getProjectsDir(), projectId.toString());
            Map<String, String> answers = project.getAnswers() != null ? project.getAnswers() : Map.of();

            pipeLog(task, "seed_template", "running", "Seeding project template");
            seedTemplate(projectDir);
            pipeLog(task, "seed_template", "done", "Template copied");

            pipeLog(task, "env_vars", "running", "Configuring environment");
            injectEnvVars(projectDir, projectId, answers);
            pipeLog(task, "env_vars", "done", "Environment configured");

            applyViteProxy(projectDir);

            String aiContext = loadFile(projectDir, "AI_CONTEXT.md");
            String componentsCtx = loadFile(projectDir, "COMPONENTS.md");

            pipeLog(task, "analyze", "running", "Analyzing your request");
            TemplateAnalysis analysis = analyzePrompt(aiContext, prompt, answers);
            pipeLog(task, "analyze", "done", "Feature: " + analysis.featureName());

            pipeLog(task, "backend_model", "running", "Generating " + analysis.featureName() + " model");
            generateBackendModel(projectDir, aiContext, analysis, answers);
            pipeLog(task, "backend_model", "done", "Model generated");

            pipeLog(task, "backend_routes", "running", "Generating API routes");
            generateBackendRoutes(projectDir, aiContext, analysis, answers);
            pipeLog(task, "backend_routes", "done", "Routes generated");

            pipeLog(task, "route_index", "running", "Wiring routes");
            updateRouteIndex(projectDir, analysis);
            pipeLog(task, "route_index", "done", "Routes mounted");

            pipeLog(task, "frontend_types", "running", "Generating TypeScript types and service");
            generateFrontendTypesAndService(projectDir, aiContext, analysis, answers);
            pipeLog(task, "frontend_types", "done", "Types and service ready");

            pipeLog(task, "frontend_page", "running", "Building " + analysis.featureName() + " page");
            generateFeaturePage(projectDir, aiContext, componentsCtx, analysis, answers);
            pipeLog(task, "frontend_page", "done", "Page generated");

            pipeLog(task, "routing", "running", "Updating navigation");
            updateAppAndNavbar(projectDir, analysis);
            pipeLog(task, "routing", "done", "Navigation updated");

            pipeLog(task, "branding", "running", "Applying branding");
            updateBranding(projectDir, aiContext, analysis, answers);
            pipeLog(task, "branding", "done", "Branding applied");

            pipeLog(task, "build", "running", "Starting preview container");
            Map<String, String> envVars = buildContainerEnv(projectDir);
            DockerService.PreviewResult preview = docker.provisionPreview(projectId, project.getContainerId(), envVars);
            project.setContainerId(preview.containerId());
            project.setPreviewPort(preview.port());
            projectRepo.save(project);
            pipeLog(task, "build", "running", "Container started on port " + preview.port());

            int port = preview.port();
            String containerId = preview.containerId();
            boolean ready = false;
            for (int round = 0; round < MAX_FIX_ROUNDS && !ready; round++) {
                Thread.sleep(25_000);
                List<String> logLines = docker.getLogs(containerId, 100);
                String errorLog = String.join("\n", logLines);

                if (isHealthy(port)) {
                    ready = true;
                    break;
                }
                if (hasErrors(errorLog)) {
                    pipeLog(task, "autofix", "running", "Fixing errors (round " + (round + 1) + ")");
                    fixErrors(projectDir, errorLog, aiContext, componentsCtx);
                }
            }

            project.setStatus(ProjectStatus.ready);
            projectRepo.save(project);
            task.setStatus(TaskStatus.done);
            taskRepo.save(task);
            pipeLog(task, "done", "done", "Build complete — preview on port " + port);

            docker.writeNginxConfig(projectId, "/etc/nginx/conf.d");

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

    // ── Step 2: Inject env vars ───────────────────────────────────────────────

    private void injectEnvVars(Path projectDir, UUID projectId,
                                Map<String, String> answers) throws IOException {
        String dbName = "proj_" + projectId.toString().replace("-", "_");
        String mongoUri = props.getMongoRootUrl() + "/" + dbName + "?authSource=admin";
        String jwtSecret = generateSecret();
        String appUrl = "http://localhost:3000";
        String appName = answers.getOrDefault("business_name", "My App");

        Map<String, String> frontendEnv = new LinkedHashMap<>();
        frontendEnv.put("VITE_API_BASE_URL", "");
        frontendEnv.put("VITE_APP_NAME", appName);
        frontendEnv.put("VITE_GOOGLE_CLIENT_ID", "");
        frontendEnv.put("APP_URL", appUrl);
        frontendEnv.put("NODE_ENV", "development");
        writeEnvFile(projectDir.resolve(".env"), frontendEnv);

        Map<String, String> serverEnv = new LinkedHashMap<>();
        serverEnv.put("PORT", "3000");
        serverEnv.put("MONGODB_URI", mongoUri);
        serverEnv.put("JWT_SECRET", jwtSecret);
        serverEnv.put("JWT_EXPIRES_IN", "7d");
        serverEnv.put("APP_URL", appUrl);
        serverEnv.put("EMAIL_PROVIDER", "resend");
        serverEnv.put("FROM_EMAIL", "noreply@example.com");
        serverEnv.put("GOOGLE_CLIENT_ID", "");
        serverEnv.put("GOOGLE_CLIENT_SECRET", "");
        serverEnv.put("GITHUB_CLIENT_ID", "");
        serverEnv.put("GITHUB_CLIENT_SECRET", "");
        serverEnv.put("RESEND_API_KEY", "");
        writeEnvFile(projectDir.resolve("server/.env"), serverEnv);
    }

    // ── Step 3: Vite proxy ────────────────────────────────────────────────────

    private void applyViteProxy(Path projectDir) throws IOException {
        String content = """
            import { defineConfig } from 'vite'
            import react from '@vitejs/plugin-react'
            import path from 'path'

            const port = Number(process.env.VITE_PORT ?? 5173)

            export default defineConfig({
              plugins: [react()],
              server: {
                port,
                host: true,
                strictPort: true,
                proxy: {
                  '/api': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                  },
                },
              },
              resolve: {
                alias: {
                  '@': path.resolve(__dirname, './src'),
                },
              },
            })
            """;
        Files.writeString(projectDir.resolve("vite.config.ts"), content);
    }

    // ── Step 4: Analyze ───────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private TemplateAnalysis analyzePrompt(String aiContext, String prompt,
                                            Map<String, String> answers) {
        String userColor  = answers.getOrDefault("primary_color", "");
        String userTone   = answers.getOrDefault("tone", "");
        String userAudience = answers.getOrDefault("audience", "");
        String userTagline  = answers.getOrDefault("tagline", "");
        String brandCtx   = brandingContext(answers);

        String sys = systemPrompt(aiContext, "") + """

            Analyze the user's request and return JSON:
            {
              "feature_name": "Task",
              "feature_plural": "tasks",
              "feature_route": "/tasks",
              "fields": [{"name": "title", "type": "string", "required": true}],
              "accent_color_rgb": "99 102 241",
              "app_tagline": "...",
              "hero_headline": "...",
              "hero_subheadline": "...",
              "features_list": [{"icon": "Zap", "title": "...", "description": "..."}]
            }
            feature_name: PascalCase singular. feature_plural: lowercase plural.
            accent_color_rgb: RGB triple without commas — MUST match the brand color if provided.
            app_tagline / hero_headline / hero_subheadline: use the user's tagline as the primary source.
            icon: valid lucide-react icon name.
            Generate compelling copy for ALL text fields — tone must match the specified app vibe.
            """;
        String enrichedPrompt = brandCtx.isBlank() ? prompt
            : prompt + "\n\n---\nBranding context:\n" + brandCtx;
        try {
            Map<String, Object> r = objectMapper.readValue(ai.chatJson(sys, enrichedPrompt), Map.class);
            // User-specified values always win over AI-generated ones
            String color = userColor.isBlank() ? str(r, "accent_color_rgb", "99 102 241") : userColor;
            String tagline = userTagline.isBlank() ? str(r, "app_tagline", "") : userTagline;
            return new TemplateAnalysis(
                str(r, "feature_name", "Item"),
                str(r, "feature_plural", "items"),
                str(r, "feature_route", "/dashboard"),
                (List<Map<String, Object>>) r.getOrDefault("fields", List.of()),
                color,
                tagline,
                str(r, "hero_headline", ""),
                str(r, "hero_subheadline", ""),
                (List<Map<String, String>>) r.getOrDefault("features_list", List.of())
            );
        } catch (Exception e) {
            log.warn("Analysis parse failed: {}", e.getMessage());
            return new TemplateAnalysis("Item", "items", "/dashboard",
                List.of(), userColor.isBlank() ? "99 102 241" : userColor,
                userTagline, "", "", List.of());
        }
    }

    // ── Step 5: Backend Mongoose model ────────────────────────────────────────

    private void generateBackendModel(Path projectDir, String aiContext,
                                       TemplateAnalysis a, Map<String, String> answers) throws IOException {
        String todoRef = loadFile(projectDir, "server/src/models/Todo.ts");
        String sys = systemPrompt(aiContext, "") + """

            Generate a Mongoose TypeScript model following the exact pattern of the reference.
            - Interface I%s extends Document with all fields + timestamps
            - userId: Types.ObjectId required, indexed
            - timestamps: true in schema options
            Return ONLY the TypeScript file content, no markdown fences.
            """.formatted(a.featureName());
        String content = stripFences(ai.chat(sys,
            "Feature: " + a.featureName() + " (" + a.featurePlural() + ")\n" +
            "Fields: " + a.fields() + "\n\nReference Todo model:\n" + todoRef));
        save(projectDir, "server/src/models/" + a.featureName() + ".ts", content);
        Files.deleteIfExists(projectDir.resolve("server/src/models/Todo.ts"));
    }

    // ── Step 6: Backend Express routes ───────────────────────────────────────

    private void generateBackendRoutes(Path projectDir, String aiContext,
                                        TemplateAnalysis a, Map<String, String> answers) throws IOException {
        String todoRef = loadFile(projectDir, "server/src/routes/todos.ts");
        String sys = systemPrompt(aiContext, "") + """

            Generate a complete Express router following the todos.ts pattern exactly.
            - Import and use the %s model (not Todo)
            - All queries must include { userId: req.user._id }
            - Full CRUD: GET /, POST /, GET /:id, PUT /:id, DELETE /:id
            - Use authenticate middleware on all routes
            Return ONLY the TypeScript file content, no markdown fences.
            """.formatted(a.featureName());
        String content = stripFences(ai.chat(sys,
            "Feature: " + a.featureName() + " (" + a.featurePlural() + ")\n" +
            "Fields: " + a.fields() + "\n\nReference todos router:\n" + todoRef));
        save(projectDir, "server/src/routes/" + a.featurePlural() + ".ts", content);
        Files.deleteIfExists(projectDir.resolve("server/src/routes/todos.ts"));
    }

    // ── Step 7: Server route index ────────────────────────────────────────────

    private void updateRouteIndex(Path projectDir, TemplateAnalysis a) throws IOException {
        String current = loadFile(projectDir, "server/src/routes/index.ts");
        String sys = """
            Update this Express route index file:
            1. Remove the todos import and router.use('/todos', ...) line
            2. Add: import %sRouter from './%s'  and  router.use('/%s', %sRouter)
            Keep all other routes identical. Return ONLY the complete TypeScript file, no fences.
            """.formatted(a.featurePlural(), a.featurePlural(), a.featurePlural(), a.featurePlural());
        save(projectDir, "server/src/routes/index.ts", stripFences(ai.chat(sys, current)));
    }

    // ── Step 8: Frontend types + api config + service ─────────────────────────

    private void generateFrontendTypesAndService(Path projectDir, String aiContext,
                                                   TemplateAnalysis a, Map<String, String> answers) throws IOException {
        // types/index.ts
        String curTypes = loadFile(projectDir, "src/types/index.ts");
        String typesSys = systemPrompt(aiContext, "") + """

            Update this types file:
            1. Add %s, Create%sPayload, Update%sPayload interfaces from the fields
            2. Remove Todo, TodoPriority, CreateTodoPayload, UpdateTodoPayload
            Keep User, AuthTokens, ApiResponse, ApiError and all other types.
            Return ONLY the complete TypeScript file, no fences.
            """.formatted(a.featureName(), a.featureName(), a.featureName());
        save(projectDir, "src/types/index.ts", stripFences(ai.chat(typesSys,
            "Feature: " + a.featureName() + "\nFields: " + a.fields() +
            "\n\nCurrent src/types/index.ts:\n" + curTypes)));

        // config/api.ts
        String curApi = loadFile(projectDir, "src/config/api.ts");
        String apiSys = systemPrompt(aiContext, "") + """

            Update src/config/api.ts:
            1. Remove todo/todos endpoint entries
            2. Add: %s: '/api/%s' and %s: (id: string) => '/api/%s/' + id
            Return ONLY the complete TypeScript file, no fences.
            """.formatted(a.featurePlural(), a.featurePlural(),
                          a.featureName().toLowerCase(), a.featurePlural());
        save(projectDir, "src/config/api.ts", stripFences(ai.chat(apiSys,
            "Current src/config/api.ts:\n" + curApi)));

        // services/{plural}.ts
        String curService = loadFile(projectDir, "src/services/todos.ts");
        String svcSys = systemPrompt(aiContext, "") + """

            Generate a frontend service file for the %s resource.
            Follow the exact todos.ts pattern. Use the new endpoint keys from api.ts.
            Return ONLY the complete TypeScript file, no fences.
            """.formatted(a.featureName());
        save(projectDir, "src/services/" + a.featurePlural() + ".ts", stripFences(ai.chat(svcSys,
            "Feature: " + a.featureName() + " (" + a.featurePlural() + ")\n" +
            "Fields: " + a.fields() + "\n\nReference todos service:\n" + curService)));
        Files.deleteIfExists(projectDir.resolve("src/services/todos.ts"));
    }

    // ── Step 9: Feature page ──────────────────────────────────────────────────

    private void generateFeaturePage(Path projectDir, String aiContext, String componentsCtx,
                                      TemplateAnalysis a, Map<String, String> answers) throws IOException {
        String dashRef = loadFile(projectDir, "src/pages/Dashboard.tsx");
        String sys = systemPrompt(aiContext, componentsCtx) + """

            Generate a complete React TSX page for the %s feature.
            Strictly follow the structural pattern of Dashboard.tsx (imports, Framer Motion, auth guard).
            Requirements:
            - Full CRUD: list, create (Modal + form), edit (Modal + form), delete (confirm)
            - Use ONLY '@/components/ui' components: Button, Input, Modal, Badge, EmptyState, useToast, Skeleton
            - Framer Motion AnimatePresence + motion.div for list items
            - useAuth hook for current user
            - Loading state: Skeleton; empty state: EmptyState with create CTA
            - Errors: toast.error(); success: toast.success()
            - Strict TypeScript, no 'any'
            - MongoDB items use _id (not id) — always access item._id, never item.id
            - NEVER use useNavigate() or navigate() — do NOT navigate after create/edit/delete
            - After create: add item to local state array, show toast, close modal
            - After edit: update item in local state array, show toast, close modal
            - After delete: remove item from local state array, show toast
            Return ONLY the complete TSX file, no markdown fences.
            """.formatted(a.featureName());
        String content = stripFences(ai.chat(sys,
            "Feature: " + a.featureName() + " (" + a.featurePlural() + ")\n" +
            "Fields: " + a.fields() + "\nRoute: " + a.featureRoute() +
            "\n\nReference Dashboard.tsx:\n" + dashRef));
        save(projectDir, "src/pages/" + a.featureName() + "Page.tsx", content);
        Files.deleteIfExists(projectDir.resolve("src/pages/Dashboard.tsx"));
    }

    // ── Step 10: App.tsx + Navbar ─────────────────────────────────────────────

    private void updateAppAndNavbar(Path projectDir, TemplateAnalysis a) throws IOException {
        String curApp = loadFile(projectDir, "src/App.tsx");
        String appSys = """
            Update src/App.tsx:
            1. Replace Dashboard lazy import with: const %sPage = lazy(() => import('@/pages/%sPage'))
            2. Replace the /dashboard route element with <%sPage /> at path "%s"
            Keep all other routes and imports identical. Return ONLY the complete file, no fences.
            """.formatted(a.featureName(), a.featureName(), a.featureName(), a.featureRoute());
        save(projectDir, "src/App.tsx", stripFences(ai.chat(appSys, curApp)));

        String curNav = loadFile(projectDir, "src/components/layout/Navbar.tsx");
        if (!curNav.isBlank()) {
            // Direct string replace is more reliable than AI for two simple substitutions
            String updatedNav = curNav
                // Replace hardcoded brand name with env var
                .replace(">AppTemplate<", ">{import.meta.env.VITE_APP_NAME ?? 'AppTemplate'}<")
                // Replace the 'Work' home-page scroll entry with the feature page route
                .replace("{ label: 'Work',     section: 'work'     }",
                    "{ label: '" + a.featureName() + "', href: '" + a.featureRoute() + "' }")
                .replace("{ label: 'Work', section: 'work' }",
                    "{ label: '" + a.featureName() + "', href: '" + a.featureRoute() + "' }");
            // If the simple replace didn't update the nav route, fall back to AI
            if (updatedNav.contains("section: 'work'")) {
                String navSys = """
                    Update the NAV_ITEMS (or equivalent) array in Navbar.tsx to replace any Dashboard/work entry
                    with: { label: '%s', href: '%s' } (use whatever shape the existing items use).
                    Also replace any hardcoded 'AppTemplate' text with: {import.meta.env.VITE_APP_NAME ?? 'AppTemplate'}
                    Keep all other nav items identical. Return ONLY the complete file, no fences.
                    """.formatted(a.featureName(), a.featureRoute());
                save(projectDir, "src/components/layout/Navbar.tsx", stripFences(ai.chat(navSys, curNav)));
            } else {
                save(projectDir, "src/components/layout/Navbar.tsx", updatedNav);
            }
        }
    }

    // ── Step 11: Branding ─────────────────────────────────────────────────────

    private void updateBranding(Path projectDir, String aiContext, TemplateAnalysis a,
                                 Map<String, String> answers) throws IOException {
        if (!a.accentColorRgb().isBlank()) {
            String rgb = a.accentColorRgb();
            // theme.ts — read by main.tsx at runtime to inject CSS custom properties
            String theme = loadFile(projectDir, "src/config/theme.ts");
            if (!theme.isBlank()) {
                save(projectDir, "src/config/theme.ts",
                    theme.replaceAll("accent:\\s*'[0-9 ]+'", "accent: '" + rgb + "'"));
            }
            // globals.css — also update the static fallback so SSR/initial paint is correct
            String css = loadFile(projectDir, "src/styles/globals.css");
            if (!css.isBlank()) {
                save(projectDir, "src/styles/globals.css",
                    css.replaceAll("--color-accent:\\s*[0-9 ]+;", "--color-accent: " + rgb + ";"));
            }
        }

        if (!a.heroHeadline().isBlank()) {
            String heroFile = loadFile(projectDir, "src/sections/HeroSection.tsx");
            if (!heroFile.isBlank()) {
                String sys = systemPrompt(aiContext, "") + """
                    Update only the headline, subheadline, and tagline text in this HeroSection.
                    Keep all JSX structure, classNames, and Framer Motion animations identical.
                    Return ONLY the complete file, no fences.
                    """;
                save(projectDir, "src/sections/HeroSection.tsx", stripFences(ai.chat(sys,
                    "headline: " + a.heroHeadline() + "\nsubheadline: " + a.heroSubheadline() +
                    "\ntagline: " + a.appTagline() + "\n\nCurrent file:\n" + heroFile)));
            }
        }

        if (!a.featuresList().isEmpty()) {
            String featFile = loadFile(projectDir, "src/sections/FeaturesSection.tsx");
            if (!featFile.isBlank()) {
                String sys = systemPrompt(aiContext, "") + """
                    Replace the FEATURES array in FeaturesSection.tsx with the provided list.
                    Use lucide-react icons by name. Keep all JSX and animations identical.
                    Return ONLY the complete file, no fences.
                    """;
                save(projectDir, "src/sections/FeaturesSection.tsx", stripFences(ai.chat(sys,
                    "New features: " + a.featuresList() + "\n\nCurrent file:\n" + featFile)));
            }
        }
    }

    // ── Auto-fix ──────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void fixErrors(Path projectDir, String errorLog, String aiContext,
                            String componentsCtx) {
        Map<String, String> files = new LinkedHashMap<>();
        collectTsFiles(projectDir.resolve("src"), projectDir, files, 8);
        collectTsFiles(projectDir.resolve("server/src"), projectDir, files, 4);

        String sys = systemPrompt(aiContext, componentsCtx) + """

            Fix the TypeScript compilation/import errors in the provided files.
            Return JSON: {"files": {"relative/path.ts": "fixed content", ...}}
            Only include files that need changes. No markdown fences inside file content.
            """;
        String userMsg = "Errors:\n" + errorLog + "\n\nFiles:\n" +
            files.entrySet().stream()
                .map(e -> "// " + e.getKey() + "\n" + e.getValue())
                .collect(Collectors.joining("\n\n"));
        try {
            Map<String, Object> result = objectMapper.readValue(ai.chatJson(sys, userMsg), Map.class);
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

    private void collectTsFiles(Path dir, Path base, Map<String, String> out, int limit) {
        if (!Files.exists(dir)) return;
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.filter(p -> (p.toString().endsWith(".ts") || p.toString().endsWith(".tsx"))
                    && !p.toString().contains("node_modules"))
                .limit(limit)
                .forEach(p -> {
                    try { out.put(base.relativize(p).toString(), Files.readString(p)); }
                    catch (IOException ignored) {}
                });
        } catch (IOException e) {
            log.warn("collectTsFiles failed: {}", e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String brandingContext(Map<String, String> answers) {
        if (answers == null || answers.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        if (!answers.getOrDefault("business_name", "").isBlank())
            sb.append("Business/App name: ").append(answers.get("business_name")).append("\n");
        if (!answers.getOrDefault("tone", "").isBlank())
            sb.append("App vibe/tone: ").append(answers.get("tone")).append("\n");
        if (!answers.getOrDefault("audience", "").isBlank())
            sb.append("Target audience: ").append(answers.get("audience")).append("\n");
        if (!answers.getOrDefault("tagline", "").isBlank())
            sb.append("Tagline: ").append(answers.get("tagline")).append("\n");
        if (!answers.getOrDefault("primary_color", "").isBlank())
            sb.append("Brand color (RGB): ").append(answers.get("primary_color")).append("\n");
        return sb.toString().trim();
    }

    private String systemPrompt(String aiContext, String componentsCtx) {
        StringBuilder sb = new StringBuilder(
            "You are an expert TypeScript + React + Express developer working on this template:\n\n");
        if (!aiContext.isBlank()) {
            String truncated = aiContext.length() > 8000 ? aiContext.substring(0, 8000) + "\n...(truncated)" : aiContext;
            sb.append(truncated).append("\n\n");
        }
        if (!componentsCtx.isBlank()) {
            String truncated = componentsCtx.length() > 4000 ? componentsCtx.substring(0, 4000) + "\n...(truncated)" : componentsCtx;
            sb.append("Component library:\n").append(truncated).append("\n\n");
        }
        return sb.toString();
    }

    private Map<String, String> buildContainerEnv(Path projectDir) {
        Map<String, String> merged = new LinkedHashMap<>();
        merged.putAll(docker.readEnvFile(projectDir.resolve("server/.env")));
        merged.putAll(docker.readEnvFile(projectDir.resolve(".env")));
        return merged;
    }

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
        UUID projectId = UUID.fromString(projectDir.getFileName().toString());
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

    private String str(Map<String, Object> map, String key, String def) {
        Object v = map.get(key);
        return v instanceof String s ? s : def;
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

    private boolean isHealthy(int port) {
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
            HttpRequest req = HttpRequest.newBuilder(URI.create("http://localhost:" + port)).GET().build();
            return client.send(req, HttpResponse.BodyHandlers.discarding()).statusCode() < 500;
        } catch (Exception e) {
            return false;
        }
    }

    private static final List<String> ERROR_INDICATORS = List.of(
        "Module not found", "SyntaxError", "Cannot find module",
        "error TS", "Type error", "Failed to compile", "Build error",
        "ERR_MODULE_NOT_FOUND"
    );

    private boolean hasErrors(String logContent) {
        return ERROR_INDICATORS.stream().anyMatch(logContent::contains);
    }
}
