package com.reuzenpanda.codemax.projects.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reuzenpanda.codemax.common.amqp.QueuePublisher;
import com.reuzenpanda.codemax.common.docker.DockerService;
import com.reuzenpanda.codemax.common.exceptions.ForbiddenException;
import com.reuzenpanda.codemax.common.exceptions.NotFoundException;
import com.reuzenpanda.codemax.common.ai.AiRouter;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import com.reuzenpanda.codemax.projects.dtos.ProjectDto;
import com.reuzenpanda.codemax.projects.dtos.ProjectFileDto;
import com.reuzenpanda.codemax.projects.entities.Project;
import com.reuzenpanda.codemax.projects.entities.ProjectFile;
import com.reuzenpanda.codemax.projects.entities.ProjectStatus;
import com.reuzenpanda.codemax.projects.mappers.ProjectMapper;
import com.reuzenpanda.codemax.projects.repositories.IProjectFileRepository;
import com.reuzenpanda.codemax.projects.repositories.IProjectRepository;
import com.reuzenpanda.codemax.tasks.dtos.TaskDto;
import com.reuzenpanda.codemax.tasks.entities.Task;
import com.reuzenpanda.codemax.tasks.entities.TaskStatus;
import com.reuzenpanda.codemax.tasks.repositories.ITaskRepository;
import com.reuzenpanda.codemax.teams.entities.MemberRole;
import com.reuzenpanda.codemax.teams.entities.MemberStatus;
import com.reuzenpanda.codemax.teams.repositories.IProjectMemberRepository;
import com.reuzenpanda.codemax.versions.services.IVersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectService implements IProjectService {

    private final IProjectRepository projectRepo;
    private final IProjectFileRepository fileRepo;
    private final ITaskRepository taskRepo;
    private final ProjectMapper mapper;
    private final QueuePublisher queue;
    private final DockerService docker;
    private final AiRouter aiRouter;
    private final CodeMaxProperties props;
    private final IVersionService versionService;
    private final IProjectMemberRepository memberRepo;

    @Override
    public List<ProjectDto> listProjects(UUID userId) {
        List<Project> owned = projectRepo.findByUserIdOrderByCreatedAtDesc(userId);
        List<UUID> memberProjectIds = memberRepo.findByUserIdAndStatus(userId, MemberStatus.accepted)
            .stream().map(m -> m.getProjectId()).toList();
        List<Project> memberProjects = memberProjectIds.isEmpty() ? List.of()
            : projectRepo.findByIdInOrderByCreatedAtDesc(memberProjectIds);
        return mapper.toDtos(
            Stream.concat(owned.stream(), memberProjects.stream())
                .distinct()
                .sorted(Comparator.comparing(Project::getCreatedAt).reversed())
                .toList()
        );
    }

    @Override
    public ProjectDto createProject(UUID userId, String name, String description, String prompt,
                                     Map<String, String> answers) {
        Project project = new Project();
        project.setUserId(userId);
        project.setName(name);
        project.setDescription(description != null ? description : "");
        project.setStatus(ProjectStatus.idle);
        if (answers != null) project.setAnswers(answers);
        project = projectRepo.save(project);

        Task task = new Task();
        task.setProjectId(project.getId());
        task.setPrompt(prompt);
        task.setStatus(TaskStatus.queued);
        task = taskRepo.save(task);

        queue.publishJob(task.getId(), project.getId(), prompt);

        // Initialize main branch for version control
        try {
            versionService.createMainBranch(project.getId(), userId);
        } catch (Exception e) {
            log.warn("Failed to create main branch for project {}: {}", project.getId(), e.getMessage());
        }

        return mapper.toDto(project);
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> generateQuestions(String description) {
        String sys = """
            You are an onboarding assistant for an AI app builder.
            Given a user's app idea, generate 5–7 questions to gather branding AND domain-specific details.

            STEP 1 — Detect the app type from these categories:
              CRM, SHOP, SAAS, PROJECT_MANAGEMENT, BOOKING, INVENTORY, CONTENT, SOCIAL, CUSTOM

            STEP 2 — Always include these 3 questions FIRST (exact IDs and types):
            1. business_name (type: text) — ask for their brand/app name
            2. primary_color (type: color_picker) — ask for their primary brand color, offer 8 preset options
            3. tone (type: quick_menu) — ask for the app's vibe: Professional / Playful & Fun / Clean & Minimal / Bold & Dynamic

            STEP 3 — Add 2–4 domain-specific questions based on app type:

            CRM:
              - pipeline_stages (type: text, placeholder: "e.g. Prospect, Demo, Proposal, Won, Lost") — "What pipeline stages do you use for your sales process?"
              - lead_fields (type: quick_menu) — "What's most important to track per contact?" options: Company & Industry / Budget & Revenue / Communication History / All of the above

            SHOP:
              - product_categories (type: text, placeholder: "e.g. Electronics, Clothing, Books") — "What product categories does your shop have?"
              - needs_inventory (type: quick_menu) — "Do you need to track stock/inventory?" options: Yes, track stock per product / No, unlimited stock / Yes, with variants (size/color)
              - needs_images (type: quick_menu) — "Will products have images?" options: Yes, product images are essential / Optional / No images needed

            SAAS:
              - subscription_plans (type: text, placeholder: "e.g. Free, Pro €19/mo, Enterprise") — "What subscription plans will you offer?"
              - key_features (type: text, placeholder: "e.g. Analytics dashboard, Team collaboration, API access") — "What are the top 3 features of your SaaS?"

            PROJECT_MANAGEMENT:
              - task_statuses (type: text, placeholder: "e.g. To Do, In Progress, Review, Done") — "What task statuses do you need?"
              - team_size (type: quick_menu) — "Who uses this?" options: Just me / Small team (2-10) / Larger organization / Multiple clients

            BOOKING:
              - service_types (type: text, placeholder: "e.g. Haircut 30min, Consultation 1hr") — "What services or slots can be booked?"
              - booking_fields (type: quick_menu) — "What info do you collect per booking?" options: Name & contact only / Full client profile / Payment details too

            INVENTORY:
              - item_categories (type: text, placeholder: "e.g. Tools, Spare parts, Raw materials") — "What categories of items do you manage?"
              - location_tracking (type: quick_menu) — "Do you track item locations/warehouses?" options: Yes / No, single location

            CONTENT:
              - content_types (type: text, placeholder: "e.g. Articles, Videos, Podcasts") — "What types of content do you publish?"
              - publishing_workflow (type: quick_menu) — "Do you need an approval workflow?" options: Yes, draft → review → publish / No, publish directly

            CUSTOM or any other: add 2 generic domain questions:
              - main_features (type: text, placeholder: "e.g. User profiles, Reports, Notifications") — "What are the 2-3 most important features your users need?"
              - data_types (type: text, placeholder: "e.g. Customers, Orders, Products") — "What are the main types of data you need to manage?"

            For primary_color options, always include these 8 colors exactly:
            Indigo #6366F1 (value "99 102 241"), Teal #14B8A6 (value "20 184 166"),
            Violet #8B5CF6 (value "139 92 246"), Rose #F43F5E (value "244 63 94"),
            Amber #F59E0B (value "245 158 11"), Sky #0EA5E9 (value "14 165 233"),
            Emerald #10B981 (value "16 185 129"), Orange #F97316 (value "249 115 22").

            Return a JSON object:
            {
              "app_type": "CRM|SHOP|SAAS|PROJECT_MANAGEMENT|BOOKING|INVENTORY|CONTENT|SOCIAL|CUSTOM",
              "questions": [
                {
                  "id": "string",
                  "type": "text" | "quick_menu" | "color_picker",
                  "question": "string",
                  "placeholder": "string (text type only, optional)",
                  "options": [{"value":"string","label":"string","hex":"#hex (color_picker only)"}]
                }
              ]
            }
            """;
        try {
            String raw = aiRouter.chatJson(props.getPlannerModel(), sys, "App idea: " + description);
            Object parsed = new ObjectMapper().readValue(raw, Object.class);
            if (parsed instanceof Map<?, ?> map && map.containsKey("questions")) {
                return (List<Map<String, Object>>) map.get("questions");
            }
            if (parsed instanceof List<?> list) {
                return (List<Map<String, Object>>) list;
            }
            return defaultQuestions();
        } catch (Exception e) {
            log.warn("generateQuestions failed: {}", e.getMessage());
            return defaultQuestions();
        }
    }

    private List<Map<String, Object>> defaultQuestions() {
        return List.of(
            Map.of("id", "business_name", "type", "text",
                   "question", "What's the name of your business or app?",
                   "placeholder", "e.g. TaskFlow, NoteBase, ShopEasy"),
            Map.of("id", "primary_color", "type", "color_picker",
                   "question", "What's your primary brand color?",
                   "options", List.of(
                       Map.of("value", "99 102 241", "label", "Indigo", "hex", "#6366F1"),
                       Map.of("value", "20 184 166", "label", "Teal", "hex", "#14B8A6"),
                       Map.of("value", "139 92 246", "label", "Violet", "hex", "#8B5CF6"),
                       Map.of("value", "244 63 94",  "label", "Rose",   "hex", "#F43F5E"),
                       Map.of("value", "245 158 11", "label", "Amber",  "hex", "#F59E0B"),
                       Map.of("value", "14 165 233", "label", "Sky",    "hex", "#0EA5E9"),
                       Map.of("value", "16 185 129", "label", "Emerald","hex", "#10B981"),
                       Map.of("value", "249 115 22", "label", "Orange", "hex", "#F97316"))),
            Map.of("id", "tone", "type", "quick_menu",
                   "question", "What's the vibe of your app?",
                   "options", List.of(
                       Map.of("value", "professional", "label", "Professional"),
                       Map.of("value", "playful",      "label", "Playful & Fun"),
                       Map.of("value", "minimal",      "label", "Clean & Minimal"),
                       Map.of("value", "bold",         "label", "Bold & Dynamic"))),
            Map.of("id", "audience", "type", "quick_menu",
                   "question", "Who will use this app?",
                   "options", List.of(
                       Map.of("value", "consumers",   "label", "General Users"),
                       Map.of("value", "businesses",  "label", "Business Teams"),
                       Map.of("value", "developers",  "label", "Developers"),
                       Map.of("value", "creators",    "label", "Creators"))),
            Map.of("id", "tagline", "type", "text",
                   "question", "Describe your app in one catchy sentence (used as your homepage tagline)",
                   "placeholder", "e.g. The fastest way to manage your team's tasks")
        );
    }

    @Override
    public ProjectDto getProject(UUID userId, UUID projectId) {
        return mapper.toDto(requireAccessible(userId, projectId));
    }

    @Override
    public ProjectDto updateProject(UUID userId, UUID projectId, String name, String description) {
        Project project = requireOwned(userId, projectId);
        if (name != null) project.setName(name);
        if (description != null) project.setDescription(description);
        return mapper.toDto(projectRepo.save(project));
    }

    @Override
    public void deleteProject(UUID userId, UUID projectId) {
        Project project = requireOwned(userId, projectId);
        // Tear down compose stack (containers + mongo volume) — must happen before dir deletion
        if (project.getContainerId() != null) {
            docker.removeContainer(project.getContainerId());
        }
        // Delete project files from the named volume
        deleteProjectDirectory(Path.of(props.getProjectsDir(), projectId.toString()));
        fileRepo.deleteByProjectId(projectId);
        projectRepo.deleteById(projectId);
    }

    private void deleteProjectDirectory(Path dir) {
        if (!Files.exists(dir)) return;
        try {
            new ProcessBuilder("rm", "-rf", dir.toString()).start().waitFor();
            log.info("ProjectService: deleted project directory {}", dir);
        } catch (Exception e) {
            log.warn("ProjectService: could not delete project directory {}: {}", dir, e.getMessage());
        }
    }

    @Override
    public Map<String, Object> getProjectStatus(UUID userId, UUID projectId) {
        Project project = requireAccessible(userId, projectId);
        Map<String, Object> result = new HashMap<>();
        result.put("status", project.getStatus().name());
        result.put("preview_port", project.getPreviewPort());
        taskRepo.findTopByProjectIdOrderByCreatedAtDesc(projectId)
            .ifPresent(t -> result.put("task", mapper.toTaskDto(t)));
        return result;
    }

    @Override
    public TaskDto submitPrompt(UUID userId, UUID projectId, String prompt, UUID branchId) {
        // Main branch: only owner/admin may prompt. Feature branch: maintainer+.
        if (branchId == null) {
            requireAdminOrAbove(userId, projectId);
        } else {
            requireMaintainerOrAbove(userId, projectId);
        }
        Task task = new Task();
        task.setProjectId(projectId);
        task.setPrompt(prompt);
        task.setBranchId(branchId);
        task.setStatus(TaskStatus.queued);
        task = taskRepo.save(task);
        queue.publishJob(task.getId(), projectId, prompt, branchId);
        return mapper.toTaskDto(task);
    }

    @Override
    public TaskDto retryLatestTask(UUID userId, UUID projectId) {
        requireMaintainerOrAbove(userId, projectId);
        Task latest = taskRepo.findTopByProjectIdOrderByCreatedAtDesc(projectId)
            .orElseThrow(() -> new NotFoundException("No tasks found for this project"));
        latest.setStatus(TaskStatus.queued);
        latest = taskRepo.save(latest);
        queue.publishJob(latest.getId(), projectId, latest.getPrompt(), latest.getBranchId());
        return mapper.toTaskDto(latest);
    }

    @Override
    public List<ProjectFileDto> listFiles(UUID userId, UUID projectId) {
        requireAccessible(userId, projectId);
        return mapper.toFileDtos(fileRepo.findByProjectIdOrderByFilePath(projectId));
    }

    @Override
    public ProjectFileDto getFile(UUID userId, UUID projectId, String filePath) {
        requireAccessible(userId, projectId);
        return fileRepo.findByProjectIdAndFilePath(projectId, filePath)
            .map(mapper::toFileDto)
            .orElseThrow(() -> new NotFoundException("File not found: " + filePath));
    }

    @Override
    public void saveFile(UUID userId, UUID projectId, String filePath, String content) {
        requireAdminOrAbove(userId, projectId);
        ProjectFile file = fileRepo.findByProjectIdAndFilePath(projectId, filePath)
            .orElseGet(() -> {
                ProjectFile f = new ProjectFile();
                f.setProjectId(projectId);
                f.setFilePath(filePath);
                return f;
            });
        file.setContent(content);
        fileRepo.save(file);

        // Also write to disk if the projects dir is mounted
        try {
            String projectsDir = System.getenv().getOrDefault("PROJECTS_DIR", "/projects");
            Path dest = Path.of(projectsDir, projectId.toString(), filePath);
            Files.createDirectories(dest.getParent());
            Files.writeString(dest, content);
        } catch (IOException e) {
            log.warn("Could not write file to disk: {}", e.getMessage());
        }
    }

    @Override
    public void stopContainer(UUID userId, UUID projectId) {
        Project project = requireOwned(userId, projectId);
        if (project.getContainerId() != null) {
            docker.stopContainer(project.getContainerId());
        }
    }

    @Override
    public void startContainer(UUID userId, UUID projectId) {
        Project project = requireOwned(userId, projectId);
        if (project.getContainerId() != null) {
            docker.startContainer(project.getContainerId());
        }
    }

    @Override
    public List<String> getContainerLogs(UUID userId, UUID projectId) {
        Project project = requireAccessible(userId, projectId);
        if (project.getContainerId() == null) return List.of();
        return docker.getLogs(project.getContainerId(), 150);
    }

    @Override
    public List<TaskDto> listTasks(UUID userId, UUID projectId) {
        requireAccessible(userId, projectId);
        return mapper.toTaskDtos(taskRepo.findByProjectIdOrderByCreatedAtAsc(projectId));
    }

    @Override
    public void provideApiKey(UUID userId, UUID projectId, String keyName, String keyValue) {
        requireMaintainerOrAbove(userId, projectId);
        // Write key to .env.local in the project directory
        try {
            String projectsDir = System.getenv().getOrDefault("PROJECTS_DIR", "/projects");
            Path envFile = Path.of(projectsDir, projectId.toString(), ".env.local");
            String existing = Files.exists(envFile) ? Files.readString(envFile) : "";
            // Replace or append the key
            Pattern p = Pattern.compile("^" + keyName + "=.*$", Pattern.MULTILINE);
            Matcher m = p.matcher(existing);
            String updated = m.find() ? m.replaceAll(keyName + "=" + keyValue) : existing + "\n" + keyName + "=" + keyValue;
            Files.writeString(envFile, updated);
        } catch (IOException e) {
            log.warn("Could not write .env.local: {}", e.getMessage());
        }
        // Resume the waiting task
        taskRepo.findTopByProjectIdOrderByCreatedAtDesc(projectId).ifPresent(task -> {
            if (task.getStatus() == TaskStatus.waiting_for_key) {
                task.setStatus(TaskStatus.queued);
                taskRepo.save(task);
                queue.publishJob(task.getId(), projectId, task.getPrompt());
            }
        });
    }

    @Override
    public Map<String, Object> detectMissingKeys(UUID userId, UUID projectId) {
        requireAccessible(userId, projectId);
        Pattern pattern = Pattern.compile(
            "process\\.env\\.(\\w+(?:_KEY|_SECRET|_TOKEN|_API_KEY|_WEBHOOK))",
            Pattern.CASE_INSENSITIVE);
        List<String> missing = fileRepo.findByProjectIdOrderByFilePath(projectId).stream()
            .flatMap(f -> {
                Matcher m = pattern.matcher(f.getContent());
                java.util.stream.Stream.Builder<String> sb = java.util.stream.Stream.builder();
                while (m.find()) sb.add(m.group(1));
                return sb.build();
            })
            .distinct()
            .toList();
        return Map.of("missing", missing);
    }

    @Override
    public Map<String, Object> clarifyPrompt(UUID userId, UUID projectId, String prompt) {
        requireAccessible(userId, projectId);
        String sys = """
            You are a helpful app development assistant. Determine if the user's prompt is clear enough
            to build an app, or if you need more information. Return JSON:
            {"needs_clarification": true/false, "question": "...", "suggestions": ["...", "..."]}
            If needs_clarification is false, question and suggestions can be null.
            """;
        try {
            String response = aiRouter.chatJson(props.getPlannerModel(), sys, prompt);
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(response, Map.class);
        } catch (Exception e) {
            return Map.of("needs_clarification", false);
        }
    }

    @Override
    public String generatePlan(UUID userId, String prompt) {
        String sys = """
            You are an enthusiastic app-building assistant.
            Given an app idea, write a short, exciting overview of what the user's app will do.
            Keep it under 120 words total.

            Format exactly like this:
            One sentence describing what the app does.

            **What you'll get:**
            - [emoji] [user-facing feature]
            - [emoji] [user-facing feature]
            - [emoji] [user-facing feature]
            - [emoji] [user-facing feature]

            Rules:
            - ONLY mention features the user will experience
            - NO technical terms (no React, MongoDB, JWT, API, TypeScript, database, backend, frontend, Express)
            - Write as if explaining to a non-technical person
            - Use relevant emojis that match each feature
            - 3-5 bullet points maximum
            """;
        return aiRouter.chat(props.getPlannerModel(), sys, prompt);
    }

    private Project requireAccessible(UUID userId, UUID projectId) {
        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new NotFoundException("Project not found"));
        if (project.getUserId().equals(userId)) return project;
        memberRepo.findByProjectIdAndUserId(projectId, userId)
            .filter(m -> m.getStatus() == MemberStatus.accepted)
            .orElseThrow(() -> new ForbiddenException("Access denied"));
        return project;
    }

    private Project requireAdminOrAbove(UUID userId, UUID projectId) {
        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new NotFoundException("Project not found"));
        if (project.getUserId().equals(userId)) return project;
        memberRepo.findByProjectIdAndUserId(projectId, userId)
            .filter(m -> m.getStatus() == MemberStatus.accepted)
            .filter(m -> m.getRole() == MemberRole.admin)
            .orElseThrow(() -> new ForbiddenException("Admin or owner access required"));
        return project;
    }

    private Project requireMaintainerOrAbove(UUID userId, UUID projectId) {
        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new NotFoundException("Project not found"));
        if (project.getUserId().equals(userId)) return project;
        memberRepo.findByProjectIdAndUserId(projectId, userId)
            .filter(m -> m.getStatus() == MemberStatus.accepted)
            .filter(m -> m.getRole() == MemberRole.maintainer || m.getRole() == MemberRole.admin)
            .orElseThrow(() -> new ForbiddenException("Maintainer or higher access required"));
        return project;
    }

    private Project requireOwned(UUID userId, UUID projectId) {
        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new NotFoundException("Project not found"));
        if (!project.getUserId().equals(userId)) throw new ForbiddenException("Access denied");
        return project;
    }
}
