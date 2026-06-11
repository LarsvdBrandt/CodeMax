package com.reuzenpanda.codemax.auth.services;

import com.reuzenpanda.codemax.auth.controllers.AuthController.*;
import com.reuzenpanda.codemax.auth.dtos.UserApiKeyDto;
import com.reuzenpanda.codemax.auth.dtos.UserDto;
import com.reuzenpanda.codemax.auth.entities.User;
import com.reuzenpanda.codemax.auth.entities.UserApiKey;
import com.reuzenpanda.codemax.auth.mappers.UserMapper;
import com.reuzenpanda.codemax.auth.repositories.IUserApiKeyRepository;
import com.reuzenpanda.codemax.auth.repositories.IUserRepository;
import com.reuzenpanda.codemax.common.exceptions.BadRequestException;
import com.reuzenpanda.codemax.common.exceptions.ConflictException;
import com.reuzenpanda.codemax.common.exceptions.ForbiddenException;
import com.reuzenpanda.codemax.common.exceptions.NotFoundException;
import com.reuzenpanda.codemax.common.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService implements IAuthService {

    private final IUserRepository userRepository;
    private final IUserApiKeyRepository apiKeyRepository;
    private final UserMapper userMapper;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public TokenResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered");
        }
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user = userRepository.save(user);
        return new TokenResponse(jwtService.generateToken(user.getId()));
    }

    @Override
    public TokenResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new BadRequestException("Invalid email or password"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid email or password");
        }
        return new TokenResponse(jwtService.generateToken(user.getId()));
    }

    @Override
    public UserDto getMe(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("User not found"));
        return userMapper.toDto(user);
    }

    @Override
    public UserDto updateMe(UUID userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("User not found"));
        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getCompanyName() != null) user.setCompanyName(request.getCompanyName());
        if (request.getCompanyAddress() != null) user.setCompanyAddress(request.getCompanyAddress());
        if (request.getCompanyCity() != null) user.setCompanyCity(request.getCompanyCity());
        if (request.getCompanyCountry() != null) user.setCompanyCountry(request.getCompanyCountry());
        if (request.getWebsite() != null) user.setWebsite(request.getWebsite());
        if (request.getBio() != null) user.setBio(request.getBio());
        return userMapper.toDto(userRepository.save(user));
    }

    @Override
    public void changePassword(UUID userId, PasswordChangeRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("User not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new ForbiddenException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public List<UserApiKeyDto> listApiKeys(UUID userId) {
        return userMapper.toApiKeyDtos(apiKeyRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    @Override
    public UserApiKeyDto createApiKey(UUID userId, ApiKeyCreateRequest request) {
        UserApiKey key = new UserApiKey();
        key.setUserId(userId);
        key.setName(request.getName());
        key.setService(request.getService() != null ? request.getService() : "custom");
        key.setKeyValue(request.getKeyValue());
        return userMapper.toApiKeyDto(apiKeyRepository.save(key));
    }

    @Override
    public void deleteApiKey(UUID userId, UUID keyId) {
        UserApiKey key = apiKeyRepository.findById(keyId)
            .orElseThrow(() -> new NotFoundException("API key not found"));
        if (!key.getUserId().equals(userId)) {
            throw new ForbiddenException("API_KEY_ACCESS_DENIED");
        }
        apiKeyRepository.deleteById(keyId);
    }
}
