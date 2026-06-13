package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectPullRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectPullRequestJpaRepository extends JpaRepository<ProjectPullRequest, UUID> {
    List<ProjectPullRequest> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
}
