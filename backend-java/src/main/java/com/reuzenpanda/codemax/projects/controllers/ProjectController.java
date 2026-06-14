package com.reuzenpanda.codemax.projects.controllers;

import com.reuzenpanda.codemax.common.security.JwtAuthorizationRequestFilter;
import com.reuzenpanda.codemax.projects.dtos.ProjectDto;
import com.reuzenpanda.codemax.projects.dtos.ProjectFileDto;
import com.reuzenpanda.codemax.projects.services.IProjectService;
import com.reuzenpanda.codemax.tasks.dtos.TaskDto;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final IProjectService projectService;

    // ── Request bodies ────────────────────────────────────────────────────────

    @Data @NoArgsConstructor
    static class CreateProjectRequest {
        private String name;
        private String description;
        private String prompt;
        private Map<String, String> answers;
        private String plan;
    }

    @Data @NoArgsConstructor
    static class QuestionsRequest {
        private String description;
    }

    @Data @NoArgsConstructor
    static class UpdateProjectRequest {
        private String name;
        private String description;
    }

    @Data @NoArgsConstructor
    static class PromptRequest {
        private String prompt;
        private java.util.UUID branchId;
    }

    @Data @NoArgsConstructor
    static class FileWriteRequest {
        private String content;
    }

    @Data @NoArgsConstructor
    static class ProvideKeyRequest {
        private String keyName;
        private String keyValue;
    }

    @Data @NoArgsConstructor
    static class PlanningRequest {
        private String description; // frontend sends 'description', not 'prompt'
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<ProjectDto>> list(HttpServletRequest request) {
        return ResponseEntity.ok(projectService.listProjects(userId(request)));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody CreateProjectRequest body, HttpServletRequest request) {
        String prompt = body.getPrompt() != null ? body.getPrompt() : body.getDescription();
        Map<String, String> answers = body.getAnswers() != null ? new java.util.HashMap<>(body.getAnswers()) : new java.util.HashMap<>();
        if (body.getPlan() != null && !body.getPlan().isBlank()) {
            answers.put("_plan", body.getPlan());
        }
        ProjectDto project = projectService.createProject(userId(request), body.getName(), body.getDescription(), prompt, answers);
        TaskDto task = projectService.listTasks(userId(request), project.getId()).stream().findFirst().orElse(null);
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("project_id", project.getId());
        result.put("task_id", task != null ? task.getId() : null);
        return ResponseEntity.status(201).body(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectDto> get(@PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok(projectService.getProject(userId(request), id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ProjectDto> update(@PathVariable UUID id,
                                              @RequestBody UpdateProjectRequest body,
                                              HttpServletRequest request) {
        return ResponseEntity.ok(projectService.updateProject(userId(request), id, body.getName(), body.getDescription()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Boolean>> delete(@PathVariable UUID id, HttpServletRequest request) {
        projectService.deleteProject(userId(request), id);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> status(@PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok(projectService.getProjectStatus(userId(request), id));
    }

    @PostMapping("/{id}/prompt")
    public ResponseEntity<TaskDto> prompt(@PathVariable UUID id,
                                          @RequestBody PromptRequest body,
                                          HttpServletRequest request) {
        return ResponseEntity.ok(projectService.submitPrompt(userId(request), id, body.getPrompt(), body.getBranchId()));
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<TaskDto> retry(@PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok(projectService.retryLatestTask(userId(request), id));
    }

    @GetMapping("/{id}/files")
    public ResponseEntity<List<ProjectFileDto>> files(@PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok(projectService.listFiles(userId(request), id));
    }

    @GetMapping("/{id}/files/**")
    public ResponseEntity<ProjectFileDto> getFile(@PathVariable UUID id,
                                                   HttpServletRequest request) {
        String filePath = extractFilePath(request, "/projects/" + id + "/files/");
        return ResponseEntity.ok(projectService.getFile(userId(request), id, filePath));
    }

    @PutMapping("/{id}/files/**")
    public ResponseEntity<Map<String, Boolean>> putFile(@PathVariable UUID id,
                                                         @RequestBody FileWriteRequest body,
                                                         HttpServletRequest request) {
        String filePath = extractFilePath(request, "/projects/" + id + "/files/");
        projectService.saveFile(userId(request), id, filePath, body.getContent());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<Map<String, Boolean>> stop(@PathVariable UUID id, HttpServletRequest request) {
        projectService.stopContainer(userId(request), id);
        return ResponseEntity.ok(Map.of("stopped", true));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<Map<String, Boolean>> start(@PathVariable UUID id, HttpServletRequest request) {
        projectService.startContainer(userId(request), id);
        return ResponseEntity.ok(Map.of("started", true));
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<Map<String, List<String>>> logs(@PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok(Map.of("lines", projectService.getContainerLogs(userId(request), id)));
    }

    @GetMapping("/{id}/tasks")
    public ResponseEntity<List<TaskDto>> tasks(@PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok(projectService.listTasks(userId(request), id));
    }

    @PostMapping("/{id}/provide_key")
    public ResponseEntity<Map<String, Object>> provideKey(@PathVariable UUID id,
                                                           @RequestBody ProvideKeyRequest body,
                                                           HttpServletRequest request) {
        projectService.provideApiKey(userId(request), id, body.getKeyName(), body.getKeyValue());
        return ResponseEntity.ok(Map.of("ok", true, "resumed", true));
    }

    @PostMapping("/{id}/detect_keys")
    public ResponseEntity<Map<String, Object>> detectKeys(@PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok(projectService.detectMissingKeys(userId(request), id));
    }

    @PostMapping("/{id}/clarify")
    public ResponseEntity<Map<String, Object>> clarify(@PathVariable UUID id,
                                                        @RequestBody PromptRequest body,
                                                        HttpServletRequest request) {
        return ResponseEntity.ok(projectService.clarifyPrompt(userId(request), id, body.getPrompt()));
    }

    @PostMapping("/planning")
    public ResponseEntity<Map<String, String>> planning(@RequestBody PlanningRequest body,
                                                         HttpServletRequest request) {
        String plan = projectService.generatePlan(userId(request), body.getDescription());
        return ResponseEntity.ok(Map.of("plan", plan));
    }

    @PostMapping("/questions")
    public ResponseEntity<Map<String, Object>> questions(@RequestBody QuestionsRequest body,
                                                          HttpServletRequest request) {
        // Auth check — user must be logged in
        userId(request);
        List<Map<String, Object>> questions = projectService.generateQuestions(body.getDescription());
        return ResponseEntity.ok(Map.of("questions", questions));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UUID userId(HttpServletRequest request) {
        return (UUID) request.getAttribute(JwtAuthorizationRequestFilter.VERIFIED_USER_ID);
    }

    private String extractFilePath(HttpServletRequest request, String prefix) {
        String uri = request.getRequestURI();
        int idx = uri.indexOf(prefix);
        return idx >= 0 ? uri.substring(idx + prefix.length()) : uri;
    }
}
