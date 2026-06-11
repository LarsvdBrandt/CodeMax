package com.reuzenpanda.codemax.tasks.repositories;

import com.reuzenpanda.codemax.tasks.entities.Task;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ITaskRepository {
    Task save(Task task);
    Optional<Task> findById(UUID id);
    List<Task> findByProjectIdOrderByCreatedAtAsc(UUID projectId);
    Optional<Task> findTopByProjectIdOrderByCreatedAtDesc(UUID projectId);
}
