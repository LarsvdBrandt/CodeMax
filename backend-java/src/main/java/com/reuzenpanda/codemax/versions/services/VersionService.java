package com.reuzenpanda.codemax.versions.services;

import com.reuzenpanda.codemax.common.amqp.QueuePublisher;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import com.reuzenpanda.codemax.common.docker.DockerService;
import com.reuzenpanda.codemax.common.exceptions.ForbiddenException;
import com.reuzenpanda.codemax.common.exceptions.NotFoundException;
import com.reuzenpanda.codemax.projects.entities.ProjectFile;
import com.reuzenpanda.codemax.projects.repositories.IProjectFileRepository;
import com.reuzenpanda.codemax.projects.repositories.IProjectRepository;
import com.reuzenpanda.codemax.tasks.dtos.TaskDto;
import com.reuzenpanda.codemax.tasks.entities.Task;
import com.reuzenpanda.codemax.tasks.entities.TaskStatus;
import com.reuzenpanda.codemax.tasks.repositories.ITaskRepository;
import com.reuzenpanda.codemax.teams.entities.MemberStatus;
import com.reuzenpanda.codemax.teams.repositories.IProjectMemberRepository;
import com.reuzenpanda.codemax.versions.dtos.*;
import com.reuzenpanda.codemax.versions.entities.*;
import com.reuzenpanda.codemax.versions.mappers.VersionMapper;
import com.reuzenpanda.codemax.versions.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class VersionService implements IVersionService {

    private final IProjectBranchRepository branchRepo;
    private final IProjectCommitRepository commitRepo;
    private final IProjectCommitFileRepository commitFileRepo;
    private final IProjectPullRequestRepository prRepo;
    private final IProjectRepository projectRepo;
    private final IProjectFileRepository fileRepo;
    private final IProjectMemberRepository memberRepo;
    private final ITaskRepository taskRepo;
    private final QueuePublisher queue;
    private final DockerService docker;
    private final CodeMaxProperties props;
    private final VersionMapper mapper;

    // ── Branch management ──────────────────────────────────────────────────────

    @Override
    public ProjectBranchDto createMainBranch(UUID projectId, UUID userId) {
        ProjectBranch branch = new ProjectBranch();
        branch.setProjectId(projectId);
        branch.setName("main");
        branch.setStatus(BranchStatus.active);
        branch.setCreatedBy(userId);
        return mapper.toBranchDto(branchRepo.save(branch));
    }

    @Override
    public List<ProjectBranchDto> listBranches(UUID requestingUserId, UUID projectId) {
        requireAccess(requestingUserId, projectId);
        return mapper.toBranchDtos(branchRepo.findByProjectIdOrderByCreatedAtAsc(projectId));
    }

    @Override
    public ProjectBranchDto createBranch(UUID requestingUserId, UUID projectId, String name, UUID parentBranchId) {
        requireMaintainerOrHigher(requestingUserId, projectId);

        ProjectBranch parent = branchRepo.findById(parentBranchId)
            .orElseThrow(() -> new NotFoundException("Parent branch not found"));

        ProjectBranch branch = new ProjectBranch();
        branch.setProjectId(projectId);
        branch.setName(name);
        branch.setParentBranchId(parentBranchId);
        branch.setStatus(BranchStatus.active);
        branch.setCreatedBy(requestingUserId);
        branch = branchRepo.save(branch);
        final UUID savedBranchId = branch.getId();

        // Copy parent's latest commit files to new branch as initial commit
        commitRepo.findTopByBranchIdOrderByCreatedAtDesc(parentBranchId).ifPresent(parentCommit -> {
            List<ProjectCommitFile> parentFiles = commitFileRepo.findByCommitId(parentCommit.getId());
            if (!parentFiles.isEmpty()) {
                ProjectCommit initCommit = new ProjectCommit();
                initCommit.setProjectId(projectId);
                initCommit.setBranchId(savedBranchId);
                initCommit.setMessage("Branch from " + parent.getName());
                initCommit.setCreatedBy(requestingUserId);
                initCommit = commitRepo.save(initCommit);

                final UUID commitId = initCommit.getId();
                List<ProjectCommitFile> copies = parentFiles.stream().map(f -> {
                    ProjectCommitFile copy = new ProjectCommitFile();
                    copy.setCommitId(commitId);
                    copy.setFilePath(f.getFilePath());
                    copy.setContent(f.getContent());
                    return copy;
                }).toList();
                commitFileRepo.saveAll(copies);
            }
        });

        return mapper.toBranchDto(branch);
    }

    // ── Commits ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public ProjectCommitDto autoCommit(UUID projectId, UUID taskId, UUID userId, String message, UUID branchId) {
        ProjectBranch targetBranch;
        if (branchId != null) {
            targetBranch = branchRepo.findById(branchId)
                .filter(b -> b.getProjectId().equals(projectId))
                .orElseGet(() -> branchRepo.findByProjectIdAndName(projectId, "main").orElseGet(() -> {
                    ProjectBranch b = new ProjectBranch();
                    b.setProjectId(projectId); b.setName("main");
                    b.setStatus(BranchStatus.active); b.setCreatedBy(userId);
                    return branchRepo.save(b);
                }));
        } else {
            targetBranch = branchRepo.findByProjectIdAndName(projectId, "main")
                .orElseGet(() -> {
                    ProjectBranch b = new ProjectBranch();
                    b.setProjectId(projectId); b.setName("main");
                    b.setStatus(BranchStatus.active); b.setCreatedBy(userId);
                    return branchRepo.save(b);
                });
        }

        ProjectCommit commit = new ProjectCommit();
        commit.setProjectId(projectId);
        commit.setBranchId(targetBranch.getId());
        commit.setTaskId(taskId);
        commit.setMessage(message != null ? message : "Agent edit");
        commit.setCreatedBy(userId);
        commit = commitRepo.save(commit);

        List<ProjectFile> currentFiles = fileRepo.findByProjectIdOrderByFilePath(projectId);
        final UUID commitId = commit.getId();
        List<ProjectCommitFile> snapshots = currentFiles.stream().map(f -> {
            ProjectCommitFile cf = new ProjectCommitFile();
            cf.setCommitId(commitId);
            cf.setFilePath(f.getFilePath());
            cf.setContent(f.getContent() != null ? f.getContent() : "");
            return cf;
        }).toList();
        commitFileRepo.saveAll(snapshots);

        log.info("VersionService: auto-committed {} files for project {} task {}", snapshots.size(), projectId, taskId);
        return mapper.toCommitDto(commit);
    }

    @Override
    public List<ProjectCommitDto> listCommits(UUID requestingUserId, UUID projectId, UUID branchId) {
        requireAccess(requestingUserId, projectId);
        return mapper.toCommitDtos(commitRepo.findByBranchIdOrderByCreatedAtDesc(branchId));
    }

    @Override
    public List<ProjectCommitFileDto> getCommitFiles(UUID requestingUserId, UUID projectId, UUID commitId) {
        requireAccess(requestingUserId, projectId);
        return mapper.toCommitFileDtos(commitFileRepo.findByCommitId(commitId));
    }

    // ── Branch preview ─────────────────────────────────────────────────────────

    @Override
    public ProjectBranchDto startBranchPreview(UUID requestingUserId, UUID projectId, UUID branchId) {
        requireMaintainerOrHigher(requestingUserId, projectId);
        ProjectBranch branch = requireBranchInProject(projectId, branchId);

        ProjectCommit latestCommit = commitRepo.findTopByBranchIdOrderByCreatedAtDesc(branchId)
            .orElseThrow(() -> new NotFoundException("No commits on this branch yet"));
        List<ProjectCommitFile> files = commitFileRepo.findByCommitId(latestCommit.getId());

        // Write branch files to a temp directory
        Path branchDir = Path.of(props.getProjectsDir(), projectId + "_branch_" + branchId);
        try {
            Files.createDirectories(branchDir);
            for (ProjectCommitFile f : files) {
                Path dest = branchDir.resolve(f.getFilePath()).normalize();
                if (!dest.startsWith(branchDir)) continue; // path traversal guard
                Files.createDirectories(dest.getParent());
                Files.writeString(dest, f.getContent());
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to write branch files: " + e.getMessage(), e);
        }

        var project = projectRepo.findById(projectId)
            .orElseThrow(() -> new NotFoundException("Project not found"));
        String appName = "Branch Preview";
        String dbName  = "branch_" + branchId.toString().replace("-", "_");
        String jwtSecret = props.getJwtSecret();

        DockerService.PreviewResult preview = docker.provisionBranchPreview(branchId, branchDir, jwtSecret, appName, dbName);
        branch.setContainerId(preview.containerId());
        branch.setPreviewPort(preview.port());
        return mapper.toBranchDto(branchRepo.save(branch));
    }

    @Override
    public ProjectBranchDto stopBranchPreview(UUID requestingUserId, UUID projectId, UUID branchId) {
        requireMaintainerOrHigher(requestingUserId, projectId);
        ProjectBranch branch = requireBranchInProject(projectId, branchId);

        if (branch.getContainerId() != null) {
            Path branchDir = Path.of(props.getProjectsDir(), projectId + "_branch_" + branchId);
            docker.removeBranchContainer(branchId, branchDir);
            branch.setContainerId(null);
            branch.setPreviewPort(null);
            branchRepo.save(branch);
        }
        return mapper.toBranchDto(branch);
    }

    // ── Pull requests ──────────────────────────────────────────────────────────

    @Override
    public List<ProjectPullRequestDto> listPullRequests(UUID requestingUserId, UUID projectId) {
        requireAccess(requestingUserId, projectId);
        return mapper.toPrDtos(prRepo.findByProjectIdOrderByCreatedAtDesc(projectId));
    }

    @Override
    public ProjectPullRequestDto createPullRequest(UUID requestingUserId, UUID projectId,
                                                    UUID sourceBranchId, UUID targetBranchId,
                                                    String title, String description) {
        requireMaintainerOrHigher(requestingUserId, projectId);

        ProjectPullRequest pr = new ProjectPullRequest();
        pr.setProjectId(projectId);
        pr.setSourceBranchId(sourceBranchId);
        pr.setTargetBranchId(targetBranchId);
        pr.setTitle(title);
        pr.setDescription(description != null ? description : "");
        pr.setStatus(PullRequestStatus.open);
        pr.setCreatedBy(requestingUserId);
        return mapper.toPrDto(prRepo.save(pr));
    }

    @Override
    @Transactional
    public ProjectPullRequestDto approvePullRequest(UUID reviewerUserId, UUID projectId, UUID prId) {
        requireAdminOrOwner(reviewerUserId, projectId);

        ProjectPullRequest pr = prRepo.findById(prId)
            .orElseThrow(() -> new NotFoundException("Pull request not found"));
        if (!pr.getProjectId().equals(projectId)) throw new ForbiddenException("Access denied");
        if (pr.getStatus() != PullRequestStatus.open) throw new ForbiddenException("PR is not open");

        // Copy source branch latest commit files → new commit on target branch
        ProjectCommit sourceCommit = commitRepo.findTopByBranchIdOrderByCreatedAtDesc(pr.getSourceBranchId())
            .orElseThrow(() -> new NotFoundException("No commits on source branch"));
        List<ProjectCommitFile> sourceFiles = commitFileRepo.findByCommitId(sourceCommit.getId());

        ProjectCommit mergeCommit = new ProjectCommit();
        mergeCommit.setProjectId(projectId);
        mergeCommit.setBranchId(pr.getTargetBranchId());
        mergeCommit.setMessage("Merge: " + pr.getTitle());
        mergeCommit.setCreatedBy(reviewerUserId);
        mergeCommit = commitRepo.save(mergeCommit);

        final UUID mergeCommitId = mergeCommit.getId();
        List<ProjectCommitFile> copies = sourceFiles.stream().map(f -> {
            ProjectCommitFile copy = new ProjectCommitFile();
            copy.setCommitId(mergeCommitId);
            copy.setFilePath(f.getFilePath());
            copy.setContent(f.getContent());
            return copy;
        }).toList();
        commitFileRepo.saveAll(copies);

        // Update project_files to reflect merged content
        for (ProjectCommitFile cf : sourceFiles) {
            ProjectFile pf = fileRepo.findByProjectIdAndFilePath(projectId, cf.getFilePath())
                .orElseGet(() -> {
                    ProjectFile newFile = new ProjectFile();
                    newFile.setProjectId(projectId);
                    newFile.setFilePath(cf.getFilePath());
                    return newFile;
                });
            pf.setContent(cf.getContent());
            fileRepo.save(pf);
        }

        // Stop branch preview container if running
        ProjectBranch sourceBranch = branchRepo.findById(pr.getSourceBranchId()).orElse(null);
        if (sourceBranch != null && sourceBranch.getContainerId() != null) {
            Path branchDir = Path.of(props.getProjectsDir(), projectId + "_branch_" + pr.getSourceBranchId());
            docker.removeBranchContainer(pr.getSourceBranchId(), branchDir);
            sourceBranch.setContainerId(null);
            sourceBranch.setPreviewPort(null);
            sourceBranch.setStatus(BranchStatus.merged);
            branchRepo.save(sourceBranch);
        } else if (sourceBranch != null) {
            sourceBranch.setStatus(BranchStatus.merged);
            branchRepo.save(sourceBranch);
        }

        pr.setStatus(PullRequestStatus.approved);
        pr.setReviewedBy(reviewerUserId);
        pr.setReviewedAt(OffsetDateTime.now());
        return mapper.toPrDto(prRepo.save(pr));
    }

    @Override
    @Transactional
    public RejectPrResult rejectPullRequest(UUID reviewerUserId, UUID projectId, UUID prId) {
        requireAdminOrOwner(reviewerUserId, projectId);

        ProjectPullRequest pr = prRepo.findById(prId)
            .orElseThrow(() -> new NotFoundException("Pull request not found"));
        if (!pr.getProjectId().equals(projectId)) throw new ForbiddenException("Access denied");
        if (pr.getStatus() != PullRequestStatus.open) throw new ForbiddenException("PR is not open");

        pr.setStatus(PullRequestStatus.rejected);
        pr.setReviewedBy(reviewerUserId);
        pr.setReviewedAt(OffsetDateTime.now());
        pr = prRepo.save(pr);

        // Create a new task so the agent can rework the branch
        Task task = new Task();
        task.setProjectId(projectId);
        task.setPrompt("[Branch: " + pr.getSourceBranchId() + "] PR rejected: " + pr.getTitle() + ". Please describe the changes needed.");
        task.setStatus(TaskStatus.waiting_for_key); // pause until user provides feedback
        task = taskRepo.save(task);

        TaskDto taskDto = new TaskDto();
        taskDto.setId(task.getId());
        taskDto.setPrompt(task.getPrompt());
        taskDto.setStatus(task.getStatus().name());
        taskDto.setCreatedAt(task.getCreatedAt());

        return new RejectPrResult(mapper.toPrDto(pr), taskDto);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void requireAccess(UUID userId, UUID projectId) {
        var project = projectRepo.findById(projectId).orElseThrow(() -> new NotFoundException("Project not found"));
        if (project.getUserId().equals(userId)) return;
        memberRepo.findByProjectIdAndUserId(projectId, userId)
            .filter(m -> m.getStatus() == MemberStatus.accepted)
            .orElseThrow(() -> new ForbiddenException("Access denied"));
    }

    private void requireMaintainerOrHigher(UUID userId, UUID projectId) {
        var project = projectRepo.findById(projectId).orElseThrow(() -> new NotFoundException("Project not found"));
        if (project.getUserId().equals(userId)) return;
        memberRepo.findByProjectIdAndUserId(projectId, userId)
            .filter(m -> m.getStatus() == MemberStatus.accepted)
            .filter(m -> m.getRole() == com.reuzenpanda.codemax.teams.entities.MemberRole.maintainer
                      || m.getRole() == com.reuzenpanda.codemax.teams.entities.MemberRole.admin)
            .orElseThrow(() -> new ForbiddenException("Maintainer or Admin access required"));
    }

    private void requireAdminOrOwner(UUID userId, UUID projectId) {
        var project = projectRepo.findById(projectId).orElseThrow(() -> new NotFoundException("Project not found"));
        if (project.getUserId().equals(userId)) return;
        memberRepo.findByProjectIdAndUserId(projectId, userId)
            .filter(m -> m.getStatus() == MemberStatus.accepted)
            .filter(m -> m.getRole() == com.reuzenpanda.codemax.teams.entities.MemberRole.admin)
            .orElseThrow(() -> new ForbiddenException("Admin or Owner access required"));
    }

    private ProjectBranch requireBranchInProject(UUID projectId, UUID branchId) {
        ProjectBranch branch = branchRepo.findById(branchId)
            .orElseThrow(() -> new NotFoundException("Branch not found"));
        if (!branch.getProjectId().equals(projectId)) throw new ForbiddenException("Branch does not belong to this project");
        return branch;
    }
}
