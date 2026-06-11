package com.reuzenpanda.codemax.tasks.repositories;

import com.reuzenpanda.codemax.tasks.entities.Task;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskRepository implements ITaskRepository {

    private final TaskJpaRepository jpa;

    @Override public Task save(Task t) { return jpa.save(t); }
    @Override public Optional<Task> findById(UUID id) { return jpa.findById(id); }
    @Override public List<Task> findByProjectIdOrderByCreatedAtAsc(UUID pid) { return jpa.findByProjectIdOrderByCreatedAtAsc(pid); }
    @Override public Optional<Task> findTopByProjectIdOrderByCreatedAtDesc(UUID pid) { return jpa.findTopByProjectIdOrderByCreatedAtDesc(pid); }
}
