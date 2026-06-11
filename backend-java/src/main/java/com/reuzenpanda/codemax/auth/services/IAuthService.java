package com.reuzenpanda.codemax.auth.services;

import com.reuzenpanda.codemax.auth.controllers.AuthController.*;
import com.reuzenpanda.codemax.auth.dtos.UserApiKeyDto;
import com.reuzenpanda.codemax.auth.dtos.UserDto;

import java.util.List;
import java.util.UUID;

public interface IAuthService {
    TokenResponse register(RegisterRequest request);
    TokenResponse login(LoginRequest request);
    UserDto getMe(UUID userId);
    UserDto updateMe(UUID userId, UserUpdateRequest request);
    void changePassword(UUID userId, PasswordChangeRequest request);
    List<UserApiKeyDto> listApiKeys(UUID userId);
    UserApiKeyDto createApiKey(UUID userId, ApiKeyCreateRequest request);
    void deleteApiKey(UUID userId, UUID keyId);
}
