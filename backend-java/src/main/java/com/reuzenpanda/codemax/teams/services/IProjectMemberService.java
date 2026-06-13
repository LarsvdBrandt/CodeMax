package com.reuzenpanda.codemax.teams.services;

import com.reuzenpanda.codemax.teams.dtos.ProjectMemberDto;
import com.reuzenpanda.codemax.teams.entities.MemberRole;

import java.util.List;
import java.util.UUID;

public interface IProjectMemberService {
    ProjectMemberDto inviteMember(UUID requestingUserId, UUID projectId, String email, MemberRole role);
    ProjectMemberDto acceptInvite(String token, UUID userId);
    List<ProjectMemberDto> listMembers(UUID requestingUserId, UUID projectId);
    void removeMember(UUID requestingUserId, UUID projectId, UUID memberId);
    ProjectMemberDto updateRole(UUID requestingUserId, UUID projectId, UUID memberId, MemberRole newRole);
    /** Returns "owner", "admin", "maintainer", "observer", or null if not a member */
    String getMemberRole(UUID userId, UUID projectId);
    boolean canAccessProject(UUID userId, UUID projectId);
}
