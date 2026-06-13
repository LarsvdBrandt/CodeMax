package com.reuzenpanda.codemax.versions.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor
public class ProjectCommitDto {
    private UUID id;
    private UUID projectId;
    private UUID branchId;
    private UUID taskId;
    private String message;
    private UUID createdBy;
    private OffsetDateTime createdAt;
}
