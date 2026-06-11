package com.reuzenpanda.codemax.auth.controllers;

import com.reuzenpanda.codemax.auth.dtos.UserApiKeyDto;
import com.reuzenpanda.codemax.auth.dtos.UserDto;
import com.reuzenpanda.codemax.auth.services.IAuthService;
import com.reuzenpanda.codemax.common.security.JwtAuthorizationRequestFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@Tag(name = "Auth", description = "Registration, login, profile and API key management")
@RequiredArgsConstructor
public class AuthController {

    private final IAuthService authService;

    // ── Request / Response types ─────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RegisterRequest {
        private String email;
        private String password;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class TokenResponse {
        private String accessToken;
        private String tokenType = "bearer";
        public TokenResponse(String accessToken) { this.accessToken = accessToken; }
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class UserUpdateRequest {
        private String fullName;
        private String companyName;
        private String companyAddress;
        private String companyCity;
        private String companyCountry;
        private String website;
        private String bio;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class PasswordChangeRequest {
        private String currentPassword;
        private String newPassword;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ApiKeyCreateRequest {
        private String name;
        private String service = "custom";
        private String keyValue;
    }

    // ── Endpoints ────────────────────────────────────────────────────────────

    @PostMapping("/register")
    @Operation(summary = "Register a new user", operationId = "register")
    public ResponseEntity<TokenResponse> register(@RequestBody RegisterRequest request) {
        if (request == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.status(201).body(authService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Login", operationId = "login")
    public ResponseEntity<TokenResponse> login(@RequestBody LoginRequest request) {
        if (request == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user profile", operationId = "getMe")
    public ResponseEntity<UserDto> getMe(HttpServletRequest request) {
        return ResponseEntity.ok(authService.getMe(currentUserId(request)));
    }

    @PutMapping("/me")
    @Operation(summary = "Update current user profile", operationId = "updateMe")
    public ResponseEntity<UserDto> updateMe(HttpServletRequest request,
                                            @RequestBody UserUpdateRequest body) {
        return ResponseEntity.ok(authService.updateMe(currentUserId(request), body));
    }

    @PostMapping("/me/password")
    @Operation(summary = "Change password", operationId = "changePassword")
    public ResponseEntity<Map<String, Boolean>> changePassword(HttpServletRequest request,
                                                               @RequestBody PasswordChangeRequest body) {
        authService.changePassword(currentUserId(request), body);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/api-keys")
    @Operation(summary = "List API keys", operationId = "listApiKeys")
    public ResponseEntity<List<UserApiKeyDto>> listApiKeys(HttpServletRequest request) {
        return ResponseEntity.ok(authService.listApiKeys(currentUserId(request)));
    }

    @PostMapping("/api-keys")
    @Operation(summary = "Add an API key", operationId = "createApiKey")
    public ResponseEntity<UserApiKeyDto> createApiKey(HttpServletRequest request,
                                                      @RequestBody ApiKeyCreateRequest body) {
        if (body == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.status(201).body(authService.createApiKey(currentUserId(request), body));
    }

    @DeleteMapping("/api-keys/{keyId}")
    @Operation(summary = "Delete an API key", operationId = "deleteApiKey")
    public ResponseEntity<Map<String, Boolean>> deleteApiKey(HttpServletRequest request,
                                                             @PathVariable UUID keyId) {
        authService.deleteApiKey(currentUserId(request), keyId);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private UUID currentUserId(HttpServletRequest request) {
        return (UUID) request.getAttribute(JwtAuthorizationRequestFilter.VERIFIED_USER_ID);
    }
}
