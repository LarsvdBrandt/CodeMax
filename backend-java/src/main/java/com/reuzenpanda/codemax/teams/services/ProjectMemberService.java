package com.reuzenpanda.codemax.teams.services;

import com.reuzenpanda.codemax.common.exceptions.ConflictException;
import com.reuzenpanda.codemax.common.exceptions.ForbiddenException;
import com.reuzenpanda.codemax.common.exceptions.NotFoundException;
import com.reuzenpanda.codemax.projects.repositories.IProjectRepository;
import com.reuzenpanda.codemax.teams.dtos.ProjectMemberDto;
import com.reuzenpanda.codemax.teams.entities.MemberRole;
import com.reuzenpanda.codemax.teams.entities.MemberStatus;
import com.reuzenpanda.codemax.teams.entities.ProjectMember;
import com.reuzenpanda.codemax.teams.mappers.ProjectMemberMapper;
import com.reuzenpanda.codemax.teams.repositories.IProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectMemberService implements IProjectMemberService {

    private final IProjectMemberRepository memberRepo;
    private final IProjectRepository projectRepo;
    private final ProjectMemberMapper mapper;

    @Override
    public ProjectMemberDto inviteMember(UUID requestingUserId, UUID projectId, String email, MemberRole role) {
        requireAdminOrOwner(requestingUserId, projectId);

        if (memberRepo.existsByProjectIdAndInviteEmail(projectId, email)) {
            throw new ConflictException("User already invited to this project");
        }

        ProjectMember member = new ProjectMember();
        member.setProjectId(projectId);
        member.setInviteEmail(email);
        member.setRole(role);
        member.setStatus(MemberStatus.pending);
        member.setInvitedBy(requestingUserId);
        member.setInviteToken(UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", ""));

        return mapper.toDto(memberRepo.save(member));
    }

    @Override
    public ProjectMemberDto acceptInvite(String token, UUID userId) {
        ProjectMember member = memberRepo.findByInviteToken(token)
            .orElseThrow(() -> new NotFoundException("Invite not found or already used"));

        member.setUserId(userId);
        member.setStatus(MemberStatus.accepted);
        member.setInviteToken(null);

        return mapper.toDto(memberRepo.save(member));
    }

    @Override
    public List<ProjectMemberDto> listMembers(UUID requestingUserId, UUID projectId) {
        if (!canAccessProject(requestingUserId, projectId)) {
            throw new ForbiddenException("Access denied");
        }
        return mapper.toDtos(memberRepo.findByProjectId(projectId));
    }

    @Override
    public void removeMember(UUID requestingUserId, UUID projectId, UUID memberId) {
        requireOwner(requestingUserId, projectId);
        ProjectMember member = memberRepo.findById(memberId)
            .orElseThrow(() -> new NotFoundException("Member not found"));
        if (!member.getProjectId().equals(projectId)) throw new ForbiddenException("Access denied");
        memberRepo.deleteById(memberId);
    }

    @Override
    public ProjectMemberDto updateRole(UUID requestingUserId, UUID projectId, UUID memberId, MemberRole newRole) {
        requireOwner(requestingUserId, projectId);
        ProjectMember member = memberRepo.findById(memberId)
            .orElseThrow(() -> new NotFoundException("Member not found"));
        if (!member.getProjectId().equals(projectId)) throw new ForbiddenException("Access denied");
        member.setRole(newRole);
        return mapper.toDto(memberRepo.save(member));
    }

    @Override
    public String getMemberRole(UUID userId, UUID projectId) {
        var project = projectRepo.findById(projectId).orElse(null);
        if (project == null) return null;
        if (project.getUserId().equals(userId)) return "owner";
        return memberRepo.findByProjectIdAndUserId(projectId, userId)
            .filter(m -> m.getStatus() == MemberStatus.accepted)
            .map(m -> m.getRole().name())
            .orElse(null);
    }

    @Override
    public boolean canAccessProject(UUID userId, UUID projectId) {
        return getMemberRole(userId, projectId) != null;
    }

    private void requireOwner(UUID userId, UUID projectId) {
        var project = projectRepo.findById(projectId)
            .orElseThrow(() -> new NotFoundException("Project not found"));
        if (!project.getUserId().equals(userId)) throw new ForbiddenException("Only the project owner can perform this action");
    }

    private void requireAdminOrOwner(UUID userId, UUID projectId) {
        var project = projectRepo.findById(projectId)
            .orElseThrow(() -> new NotFoundException("Project not found"));
        if (project.getUserId().equals(userId)) return;
        memberRepo.findByProjectIdAndUserId(projectId, userId)
            .filter(m -> m.getStatus() == MemberStatus.accepted)
            .filter(m -> m.getRole() == MemberRole.admin)
            .orElseThrow(() -> new ForbiddenException("Admin or owner access required"));
    }
}
