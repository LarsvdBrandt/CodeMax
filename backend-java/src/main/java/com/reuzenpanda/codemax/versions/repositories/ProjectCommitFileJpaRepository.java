package com.reuzenpanda.codemax.versions.repositories;

import com.reuzenpanda.codemax.versions.entities.ProjectCommitFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectCommitFileJpaRepository extends JpaRepository<ProjectCommitFile, UUID> {
    List<ProjectCommitFile> findByCommitId(UUID commitId);
    void deleteByCommitId(UUID commitId);
}
