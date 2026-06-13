package com.reuzenpanda.codemax.versions.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor
public class ProjectBranchDto {
    private UUID id;
    private UUID projectId;
    private String name;
    private UUID parentBranchId;
    private String containerId;
    private Integer previewPort;
    private String status;
    private UUID createdBy;
    private OffsetDateTime createdAt;
}
