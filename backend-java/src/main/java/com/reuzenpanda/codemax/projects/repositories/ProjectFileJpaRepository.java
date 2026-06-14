package com.reuzenpanda.codemax.projects.repositories;

import com.reuzenpanda.codemax.projects.entities.ProjectFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface ProjectFileJpaRepository extends JpaRepository<ProjectFile, UUID> {
    Optional<ProjectFile> findByProjectIdAndFilePath(UUID projectId, String filePath);
    List<ProjectFile> findByProjectIdOrderByFilePath(UUID projectId);
    void deleteByProjectId(UUID projectId);
}
