package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectCommitFile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectCommitFileRepository implements IProjectCommitFileRepository {
    private final ProjectCommitFileJpaRepository jpa;

    @Override public ProjectCommitFile save(ProjectCommitFile f) { return jpa.save(f); }
    @Override public List<ProjectCommitFile> saveAll(List<ProjectCommitFile> files) { return jpa.saveAll(files); }
    @Override public List<ProjectCommitFile> findByCommitId(UUID commitId) { return jpa.findByCommitId(commitId); }
    @Override @Transactional public void deleteByCommitId(UUID commitId) { jpa.deleteByCommitId(commitId); }
}
