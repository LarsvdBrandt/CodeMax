package com.reuzenpanda.codemax.versions.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor
public class ProjectCommitFileDto {
    private UUID id;
    private UUID commitId;
    private String filePath;
    private String content;
}
