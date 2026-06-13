package com.reuzenpanda.codemax.versions.controllers;

import com.reuzenpanda.codemax.common.security.JwtAuthorizationRequestFilter;
import com.reuzenpanda.codemax.versions.dtos.*;
import com.reuzenpanda.codemax.versions.services.IVersionService;
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
@RequestMapping("/projects/{projectId}/versions")
@RequiredArgsConstructor
public class VersionController {

    private final IVersionService versionService;

    @Data @NoArgsConstructor
    static class CreateBranchRequest {
        private String name;
        private UUID parentBranchId;
    }

    @Data @NoArgsConstructor
    static class CreatePrRequest {
        private UUID sourceBranchId;
        private UUID targetBranchId;
        private String title;
        private String description;
    }

    // ── Branches ──────────────────────────────────────────────────────────────

    @GetMapping("/branches")
    public ResponseEntity<List<ProjectBranchDto>> listBranches(@PathVariable UUID projectId, HttpServletRequest req) {
        return ResponseEntity.ok(versionService.listBranches(userId(req), projectId));
    }

    @PostMapping("/branches")
    public ResponseEntity<ProjectBranchDto> createBranch(@PathVariable UUID projectId,
                                                          @RequestBody CreateBranchRequest body,
                                                          HttpServletRequest req) {
        if (body == null || body.getName() == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.status(201).body(versionService.createBranch(userId(req), projectId, body.getName(), body.getParentBranchId()));
    }

    @PostMapping("/branches/{branchId}/preview/start")
    public ResponseEntity<ProjectBranchDto> startPreview(@PathVariable UUID projectId,
                                                          @PathVariable UUID branchId,
                                                          HttpServletRequest req) {
        return ResponseEntity.ok(versionService.startBranchPreview(userId(req), projectId, branchId));
    }

    @PostMapping("/branches/{branchId}/preview/stop")
    public ResponseEntity<ProjectBranchDto> stopPreview(@PathVariable UUID projectId,
                                                         @PathVariable UUID branchId,
                                                         HttpServletRequest req) {
        return ResponseEntity.ok(versionService.stopBranchPreview(userId(req), projectId, branchId));
    }

    @PostMapping("/branches/{branchId}/promote")
    public ResponseEntity<ProjectBranchDto> promote(@PathVariable UUID projectId,
                                                     @PathVariable UUID branchId,
                                                     HttpServletRequest req) {
        return ResponseEntity.ok(versionService.promoteToMain(userId(req), projectId, branchId));
    }

    // ── Commits ────────────────────────────────────────────────────────────────

    @GetMapping("/branches/{branchId}/commits")
    public ResponseEntity<List<ProjectCommitDto>> listCommits(@PathVariable UUID projectId,
                                                               @PathVariable UUID branchId,
                                                               HttpServletRequest req) {
        return ResponseEntity.ok(versionService.listCommits(userId(req), projectId, branchId));
    }

    @GetMapping("/commits/{commitId}/files")
    public ResponseEntity<List<ProjectCommitFileDto>> getCommitFiles(@PathVariable UUID projectId,
                                                                      @PathVariable UUID commitId,
                                                                      HttpServletRequest req) {
        return ResponseEntity.ok(versionService.getCommitFiles(userId(req), projectId, commitId));
    }

    // ── Pull requests ──────────────────────────────────────────────────────────

    @GetMapping("/pull-requests")
    public ResponseEntity<List<ProjectPullRequestDto>> listPrs(@PathVariable UUID projectId, HttpServletRequest req) {
        return ResponseEntity.ok(versionService.listPullRequests(userId(req), projectId));
    }

    @PostMapping("/pull-requests")
    public ResponseEntity<ProjectPullRequestDto> createPr(@PathVariable UUID projectId,
                                                           @RequestBody CreatePrRequest body,
                                                           HttpServletRequest req) {
        if (body == null || body.getTitle() == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.status(201).body(
            versionService.createPullRequest(userId(req), projectId,
                body.getSourceBranchId(), body.getTargetBranchId(),
                body.getTitle(), body.getDescription()));
    }

    @PostMapping("/pull-requests/{prId}/approve")
    public ResponseEntity<ProjectPullRequestDto> approvePr(@PathVariable UUID projectId,
                                                            @PathVariable UUID prId,
                                                            HttpServletRequest req) {
        return ResponseEntity.ok(versionService.approvePullRequest(userId(req), projectId, prId));
    }

    @PostMapping("/pull-requests/{prId}/reject")
    public ResponseEntity<Map<String, Object>> rejectPr(@PathVariable UUID projectId,
                                                         @PathVariable UUID prId,
                                                         HttpServletRequest req) {
        IVersionService.RejectPrResult result = versionService.rejectPullRequest(userId(req), projectId, prId);
        return ResponseEntity.ok(Map.of("pr", result.pr(), "task", result.task()));
    }

    private UUID userId(HttpServletRequest request) {
        return (UUID) request.getAttribute(JwtAuthorizationRequestFilter.VERIFIED_USER_ID);
    }
}
