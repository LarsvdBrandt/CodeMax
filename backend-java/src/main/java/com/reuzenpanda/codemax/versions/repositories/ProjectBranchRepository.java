package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectBranch;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectBranchRepository implements IProjectBranchRepository {
    private final ProjectBranchJpaRepository jpa;

    @Override public ProjectBranch save(ProjectBranch b) { return jpa.save(b); }
    @Override public Optional<ProjectBranch> findById(UUID id) { return jpa.findById(id); }
    @Override public List<ProjectBranch> findByProjectIdOrderByCreatedAtAsc(UUID projectId) { return jpa.findByProjectIdOrderByCreatedAtAsc(projectId); }
    @Override public Optional<ProjectBranch> findByProjectIdAndName(UUID projectId, String name) { return jpa.findByProjectIdAndName(projectId, name); }
    @Override public void deleteById(UUID id) { jpa.deleteById(id); }
}
