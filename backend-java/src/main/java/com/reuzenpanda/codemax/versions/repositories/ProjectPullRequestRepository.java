package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectPullRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectPullRequestRepository implements IProjectPullRequestRepository {
    private final ProjectPullRequestJpaRepository jpa;

    @Override public ProjectPullRequest save(ProjectPullRequest pr) { return jpa.save(pr); }
    @Override public Optional<ProjectPullRequest> findById(UUID id) { return jpa.findById(id); }
    @Override public List<ProjectPullRequest> findByProjectIdOrderByCreatedAtDesc(UUID projectId) { return jpa.findByProjectIdOrderByCreatedAtDesc(projectId); }
}
