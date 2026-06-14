package com.reuzenpanda.codemax.projects.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor
public class ProjectDto {
    private UUID id;
    private String name;
    private String description;
    private String status;
    private Integer previewPort;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
