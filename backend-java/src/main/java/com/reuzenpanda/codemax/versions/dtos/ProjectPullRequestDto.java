package com.reuzenpanda.codemax.versions.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor
public class ProjectPullRequestDto {
    private UUID id;
    private UUID projectId;
    private UUID sourceBranchId;
    private UUID targetBranchId;
    private String title;
    private String description;
    private String status;
    private UUID createdBy;
    private UUID reviewedBy;
    private OffsetDateTime reviewedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
