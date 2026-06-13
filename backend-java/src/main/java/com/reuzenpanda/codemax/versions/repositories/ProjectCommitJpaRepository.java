package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectCommit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectCommitJpaRepository extends JpaRepository<ProjectCommit, UUID> {
    List<ProjectCommit> findByBranchIdOrderByCreatedAtDesc(UUID branchId);
    Optional<ProjectCommit> findTopByBranchIdOrderByCreatedAtDesc(UUID branchId);
}
