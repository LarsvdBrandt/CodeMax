package com.reuzenpanda.codemax.teams.controllers;

import com.reuzenpanda.codemax.common.security.JwtAuthorizationRequestFilter;
import com.reuzenpanda.codemax.teams.dtos.ProjectMemberDto;
import com.reuzenpanda.codemax.teams.entities.MemberRole;
import com.reuzenpanda.codemax.teams.services.IProjectMemberService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class TeamController {

    private final IProjectMemberService memberService;

    @Data @NoArgsConstructor
    static class InviteRequest {
        private String email;
        private String role;
    }

    @Data @NoArgsConstructor
    static class UpdateRoleRequest {
        private String role;
    }

    @GetMapping("/projects/{projectId}/members")
    public ResponseEntity<List<ProjectMemberDto>> list(@PathVariable UUID projectId, HttpServletRequest req) {
        return ResponseEntity.ok(memberService.listMembers(userId(req), projectId));
    }

    @PostMapping("/projects/{projectId}/members")
    public ResponseEntity<ProjectMemberDto> invite(@PathVariable UUID projectId,
                                                    @RequestBody InviteRequest body,
                                                    HttpServletRequest req) {
        if (body == null || body.getEmail() == null) return ResponseEntity.badRequest().build();
        MemberRole role = parseRole(body.getRole());
        return ResponseEntity.status(201).body(memberService.inviteMember(userId(req), projectId, body.getEmail(), role));
    }

    @DeleteMapping("/projects/{projectId}/members/{memberId}")
    public ResponseEntity<Map<String, Boolean>> remove(@PathVariable UUID projectId,
                                                        @PathVariable UUID memberId,
                                                        HttpServletRequest req) {
        memberService.removeMember(userId(req), projectId, memberId);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    @PatchMapping("/projects/{projectId}/members/{memberId}")
    public ResponseEntity<ProjectMemberDto> updateRole(@PathVariable UUID projectId,
                                                        @PathVariable UUID memberId,
                                                        @RequestBody UpdateRoleRequest body,
                                                        HttpServletRequest req) {
        if (body == null || body.getRole() == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(memberService.updateRole(userId(req), projectId, memberId, parseRole(body.getRole())));
    }

    @GetMapping("/projects/{projectId}/my-role")
    public ResponseEntity<Map<String, String>> myRole(@PathVariable UUID projectId, HttpServletRequest req) {
        String role = memberService.getMemberRole(userId(req), projectId);
        return ResponseEntity.ok(Map.of("role", role != null ? role : "none"));
    }

    @PostMapping("/invites/{token}/accept")
    public ResponseEntity<ProjectMemberDto> acceptInvite(@PathVariable String token, HttpServletRequest req) {
        return ResponseEntity.ok(memberService.acceptInvite(token, userId(req)));
    }

    private MemberRole parseRole(String role) {
        if (role == null) return MemberRole.observer;
        return switch (role.toLowerCase()) {
            case "admin" -> MemberRole.admin;
            case "maintainer" -> MemberRole.maintainer;
            default -> MemberRole.observer;
        };
    }

    private UUID userId(HttpServletRequest request) {
        return (UUID) request.getAttribute(JwtAuthorizationRequestFilter.VERIFIED_USER_ID);
    }
}
