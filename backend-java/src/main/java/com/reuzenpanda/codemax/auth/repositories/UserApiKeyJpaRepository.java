package com.reuzenpanda.codemax.auth.repositories;

import com.reuzenpanda.codemax.auth.entities.UserApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface UserApiKeyJpaRepository extends JpaRepository<UserApiKey, UUID> {
    List<UserApiKey> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<UserApiKey> findByUserId(UUID userId);
}
