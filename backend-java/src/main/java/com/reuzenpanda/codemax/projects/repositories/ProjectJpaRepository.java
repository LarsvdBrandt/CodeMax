package com.reuzenpanda.codemax.projects.repositories;

import com.reuzenpanda.codemax.projects.entities.Project;
import com.reuzenpanda.codemax.projects.entities.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface ProjectJpaRepository extends JpaRepository<Project, UUID> {
    List<Project> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Project> findByStatus(ProjectStatus status);
    List<Project> findByIdInOrderByCreatedAtDesc(List<UUID> ids);
}
