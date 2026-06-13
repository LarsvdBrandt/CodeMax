package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectCommitFile;

import java.util.List;
import java.util.UUID;

public interface IProjectCommitFileRepository {
    ProjectCommitFile save(ProjectCommitFile file);
    List<ProjectCommitFile> saveAll(List<ProjectCommitFile> files);
    List<ProjectCommitFile> findByCommitId(UUID commitId);
    void deleteByCommitId(UUID commitId);
}
