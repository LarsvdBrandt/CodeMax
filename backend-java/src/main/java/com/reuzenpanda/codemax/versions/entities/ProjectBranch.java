package com.reuzenpanda.codemax.versions.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "project_branches")
@Data @NoArgsConstructor @AllArgsConstructor
public class ProjectBranch {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "parent_branch_id")
    private UUID parentBranchId;

    @Column(name = "container_id")
    private String containerId;

    @Column(name = "preview_port")
    private Integer previewPort;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private BranchStatus status = BranchStatus.active;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
