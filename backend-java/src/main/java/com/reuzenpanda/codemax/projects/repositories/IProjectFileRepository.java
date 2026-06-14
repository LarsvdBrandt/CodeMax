package com.reuzenpanda.codemax.projects.repositories;

import com.reuzenpanda.codemax.projects.entities.ProjectFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IProjectFileRepository {
    ProjectFile save(ProjectFile file);
    Optional<ProjectFile> findById(UUID id);
    Optional<ProjectFile> findByProjectIdAndFilePath(UUID projectId, String filePath);
    List<ProjectFile> findByProjectIdOrderByFilePath(UUID projectId);
    void deleteByProjectId(UUID projectId);
    void deleteById(UUID id);
}
