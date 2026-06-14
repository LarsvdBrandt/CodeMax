package com.reuzenpanda.codemax.projects.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor
public class ProjectFileDto {
    private UUID id;
    private String filePath;
    private String content;
    private OffsetDateTime updatedAt;
}
