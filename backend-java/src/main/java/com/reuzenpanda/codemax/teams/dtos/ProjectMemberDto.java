package com.reuzenpanda.codemax.teams.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor
public class ProjectMemberDto {
    private UUID id;
    private UUID projectId;
    private UUID userId;
    private String inviteEmail;
    private String inviteToken;
    private String role;
    private String status;
    private UUID invitedBy;
    private String invitedByEmail;
    private OffsetDateTime createdAt;
}
