package com.reuzenpanda.codemax.auth.repositories;

import com.reuzenpanda.codemax.auth.entities.UserApiKey;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IUserApiKeyRepository {
    UserApiKey save(UserApiKey key);
    Optional<UserApiKey> findById(UUID id);
    List<UserApiKey> findByUserIdOrderByCreatedAtDesc(UUID userId);
    void deleteById(UUID id);
    List<UserApiKey> findByUserId(UUID userId);
}
