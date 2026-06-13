package com.reuzenpanda.codemax.teams.repositories;

import com.reuzenpanda.codemax.teams.entities.ProjectMember;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IProjectMemberRepository {
    ProjectMember save(ProjectMember member);
    Optional<ProjectMember> findById(UUID id);
    List<ProjectMember> findByProjectId(UUID projectId);
    Optional<ProjectMember> findByInviteToken(String token);
    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);
    Optional<ProjectMember> findByProjectIdAndInviteEmail(UUID projectId, String email);
    boolean existsByProjectIdAndInviteEmail(UUID projectId, String email);
    void deleteById(UUID id);
}
