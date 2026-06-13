package com.reuzenpanda.codemax.teams.repositories;

import com.reuzenpanda.codemax.teams.entities.MemberStatus;
import com.reuzenpanda.codemax.teams.entities.ProjectMember;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectMemberRepository implements IProjectMemberRepository {

    private final ProjectMemberJpaRepository jpa;

    @Override public ProjectMember save(ProjectMember m) { return jpa.save(m); }
    @Override public Optional<ProjectMember> findById(UUID id) { return jpa.findById(id); }
    @Override public List<ProjectMember> findByProjectId(UUID projectId) { return jpa.findByProjectId(projectId); }
    @Override public Optional<ProjectMember> findByInviteToken(String token) { return jpa.findByInviteToken(token); }
    @Override public Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId) { return jpa.findByProjectIdAndUserId(projectId, userId); }
    @Override public Optional<ProjectMember> findByProjectIdAndInviteEmail(UUID projectId, String email) { return jpa.findByProjectIdAndInviteEmail(projectId, email); }
    @Override public boolean existsByProjectIdAndInviteEmail(UUID projectId, String email) { return jpa.existsByProjectIdAndInviteEmail(projectId, email); }
    @Override public void deleteById(UUID id) { jpa.deleteById(id); }
    @Override public List<ProjectMember> findByUserIdAndStatus(UUID userId, MemberStatus status) { return jpa.findByUserIdAndStatus(userId, status); }
}
