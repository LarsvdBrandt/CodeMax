package com.reuzenpanda.codemax.projects.repositories;

import com.reuzenpanda.codemax.projects.entities.ProjectFile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectFileRepository implements IProjectFileRepository {

    private final ProjectFileJpaRepository jpa;

    @Override public ProjectFile save(ProjectFile f) { return jpa.save(f); }
    @Override public Optional<ProjectFile> findById(UUID id) { return jpa.findById(id); }
    @Override public Optional<ProjectFile> findByProjectIdAndFilePath(UUID pid, String path) { return jpa.findByProjectIdAndFilePath(pid, path); }
    @Override public List<ProjectFile> findByProjectIdOrderByFilePath(UUID pid) { return jpa.findByProjectIdOrderByFilePath(pid); }
    @Override @Transactional public void deleteByProjectId(UUID pid) { jpa.deleteByProjectId(pid); }
    @Override public void deleteById(UUID id) { jpa.deleteById(id); }
}
