package com.reuzenpanda.codemax.auth.repositories;

import com.reuzenpanda.codemax.auth.entities.UserApiKey;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserApiKeyRepository implements IUserApiKeyRepository {

    private final UserApiKeyJpaRepository jpa;

    @Override public UserApiKey save(UserApiKey key) { return jpa.save(key); }
    @Override public Optional<UserApiKey> findById(UUID id) { return jpa.findById(id); }
    @Override public List<UserApiKey> findByUserIdOrderByCreatedAtDesc(UUID userId) { return jpa.findByUserIdOrderByCreatedAtDesc(userId); }
    @Override public void deleteById(UUID id) { jpa.deleteById(id); }
    @Override public List<UserApiKey> findByUserId(UUID userId) { return jpa.findByUserId(userId); }
}
