package com.reuzenpanda.codemax.teams.repositories;

import com.reuzenpanda.codemax.teams.entities.MemberStatus;
import com.reuzenpanda.codemax.teams.entities.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectMemberJpaRepository extends JpaRepository<ProjectMember, UUID> {
    List<ProjectMember> findByProjectId(UUID projectId);
    Optional<ProjectMember> findByInviteToken(String token);
    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);
    Optional<ProjectMember> findByProjectIdAndInviteEmail(UUID projectId, String email);
    boolean existsByProjectIdAndInviteEmail(UUID projectId, String email);
    List<ProjectMember> findByUserIdAndStatus(UUID userId, MemberStatus status);
}
