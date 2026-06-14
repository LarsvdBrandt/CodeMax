package com.reuzenpanda.codemax.projects.repositories;

import com.reuzenpanda.codemax.projects.entities.Project;
import com.reuzenpanda.codemax.projects.entities.ProjectStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectRepository implements IProjectRepository {

    private final ProjectJpaRepository jpa;

    @Override public Project save(Project p) { return jpa.save(p); }
    @Override public Optional<Project> findById(UUID id) { return jpa.findById(id); }
    @Override public List<Project> findByUserIdOrderByCreatedAtDesc(UUID userId) { return jpa.findByUserIdOrderByCreatedAtDesc(userId); }
    @Override public void deleteById(UUID id) { jpa.deleteById(id); }
    @Override public List<Project> findByStatus(ProjectStatus status) { return jpa.findByStatus(status); }
    @Override public List<Project> findByIdInOrderByCreatedAtDesc(List<UUID> ids) { return jpa.findByIdInOrderByCreatedAtDesc(ids); }
}
