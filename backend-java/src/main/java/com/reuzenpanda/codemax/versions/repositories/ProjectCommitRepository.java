package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectCommit;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectCommitRepository implements IProjectCommitRepository {
    private final ProjectCommitJpaRepository jpa;

    @Override public ProjectCommit save(ProjectCommit c) { return jpa.save(c); }
    @Override public Optional<ProjectCommit> findById(UUID id) { return jpa.findById(id); }
    @Override public List<ProjectCommit> findByBranchIdOrderByCreatedAtDesc(UUID branchId) { return jpa.findByBranchIdOrderByCreatedAtDesc(branchId); }
    @Override public Optional<ProjectCommit> findTopByBranchIdOrderByCreatedAtDesc(UUID branchId) { return jpa.findTopByBranchIdOrderByCreatedAtDesc(branchId); }
}
