package com.reuzenpanda.codemax.teams.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "project_members")
@Data @NoArgsConstructor @AllArgsConstructor
public class ProjectMember {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "invite_email", nullable = false, length = 255)
    private String inviteEmail;

    @Column(name = "invite_token", length = 255)
    private String inviteToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private MemberRole role = MemberRole.observer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private MemberStatus status = MemberStatus.pending;

    @Column(name = "invited_by", nullable = false)
    private UUID invitedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
