package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectBranch;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IProjectBranchRepository {
    ProjectBranch save(ProjectBranch branch);
    Optional<ProjectBranch> findById(UUID id);
    List<ProjectBranch> findByProjectIdOrderByCreatedAtAsc(UUID projectId);
    Optional<ProjectBranch> findByProjectIdAndName(UUID projectId, String name);
    void deleteById(UUID id);
}
