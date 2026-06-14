package com.reuzenpanda.codemax.projects.repositories;

import com.reuzenpanda.codemax.projects.entities.Project;
import com.reuzenpanda.codemax.projects.entities.ProjectStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IProjectRepository {
    Project save(Project project);
    Optional<Project> findById(UUID id);
    List<Project> findByUserIdOrderByCreatedAtDesc(UUID userId);
    void deleteById(UUID id);
    List<Project> findByStatus(ProjectStatus status);
    List<Project> findByIdInOrderByCreatedAtDesc(List<UUID> ids);
}
