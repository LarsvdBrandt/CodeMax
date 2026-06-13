package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectPullRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IProjectPullRequestRepository {
    ProjectPullRequest save(ProjectPullRequest pr);
    Optional<ProjectPullRequest> findById(UUID id);
    List<ProjectPullRequest> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
}
