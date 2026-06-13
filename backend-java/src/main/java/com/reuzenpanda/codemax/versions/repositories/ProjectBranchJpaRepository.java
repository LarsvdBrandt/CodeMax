package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectBranch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectBranchJpaRepository extends JpaRepository<ProjectBranch, UUID> {
    List<ProjectBranch> findByProjectIdOrderByCreatedAtAsc(UUID projectId);
    Optional<ProjectBranch> findByProjectIdAndName(UUID projectId, String name);
}
