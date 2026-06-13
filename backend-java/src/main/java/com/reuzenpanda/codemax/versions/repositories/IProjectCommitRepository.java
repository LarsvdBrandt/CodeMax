package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectCommit;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IProjectCommitRepository {
    ProjectCommit save(ProjectCommit commit);
    Optional<ProjectCommit> findById(UUID id);
    List<ProjectCommit> findByBranchIdOrderByCreatedAtDesc(UUID branchId);
    Optional<ProjectCommit> findTopByBranchIdOrderByCreatedAtDesc(UUID branchId);
}
