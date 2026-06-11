package com.reuzenpanda.codemax.tasks.repositories;

import com.reuzenpanda.codemax.tasks.entities.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface TaskJpaRepository extends JpaRepository<Task, UUID> {
    List<Task> findByProjectIdOrderByCreatedAtAsc(UUID projectId);
    Optional<Task> findTopByProjectIdOrderByCreatedAtDesc(UUID projectId);
}
