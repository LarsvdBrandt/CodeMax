package com.reuzenpanda.codemax.versions.services;

import com.reuzenpanda.codemax.versions.dtos.*;
import com.reuzenpanda.codemax.tasks.dtos.TaskDto;

import java.util.List;
import java.util.UUID;

public interface IVersionService {
    ProjectBranchDto createMainBranch(UUID projectId, UUID userId);
    ProjectCommitDto autoCommit(UUID projectId, UUID taskId, UUID userId, String message);
    List<ProjectBranchDto> listBranches(UUID requestingUserId, UUID projectId);
    ProjectBranchDto createBranch(UUID requestingUserId, UUID projectId, String name, UUID parentBranchId);
    List<ProjectCommitDto> listCommits(UUID requestingUserId, UUID projectId, UUID branchId);
    List<ProjectCommitFileDto> getCommitFiles(UUID requestingUserId, UUID projectId, UUID commitId);
    ProjectBranchDto startBranchPreview(UUID requestingUserId, UUID projectId, UUID branchId);
    ProjectBranchDto stopBranchPreview(UUID requestingUserId, UUID projectId, UUID branchId);
    List<ProjectPullRequestDto> listPullRequests(UUID requestingUserId, UUID projectId);
    ProjectPullRequestDto createPullRequest(UUID requestingUserId, UUID projectId, UUID sourceBranchId, UUID targetBranchId, String title, String description);
    ProjectPullRequestDto approvePullRequest(UUID reviewerUserId, UUID projectId, UUID prId);
    /** Rejects PR and creates a new task for the agent to rework on the source branch */
    RejectPrResult rejectPullRequest(UUID reviewerUserId, UUID projectId, UUID prId);

    record RejectPrResult(ProjectPullRequestDto pr, TaskDto task) {}
}
