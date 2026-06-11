package com.reuzenpanda.codemax.auth.repositories;

import com.reuzenpanda.codemax.auth.entities.User;

import java.util.Optional;
import java.util.UUID;

public interface IUserRepository {
    User save(User user);
    Optional<User> findById(UUID id);
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
