package com.reuzenpanda.codemax.auth.repositories;

import com.reuzenpanda.codemax.auth.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserRepository implements IUserRepository {

    private final UserJpaRepository jpa;

    @Override public User save(User user) { return jpa.save(user); }
    @Override public Optional<User> findById(UUID id) { return jpa.findById(id); }
    @Override public Optional<User> findByEmail(String email) { return jpa.findByEmail(email); }
    @Override public boolean existsByEmail(String email) { return jpa.existsByEmail(email); }
}
