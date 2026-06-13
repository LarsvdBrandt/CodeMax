package com.reuzenpanda.codemax.versions.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "project_commit_files")
@Data @NoArgsConstructor @AllArgsConstructor
public class ProjectCommitFile {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "commit_id", nullable = false)
    private UUID commitId;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content = "";
}
