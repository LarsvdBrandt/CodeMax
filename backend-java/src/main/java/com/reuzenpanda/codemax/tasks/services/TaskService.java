package com.reuzenpanda.codemax.tasks.services;

import com.reuzenpanda.codemax.projects.mappers.ProjectMapper;
import com.reuzenpanda.codemax.tasks.dtos.TaskDto;
import com.reuzenpanda.codemax.tasks.entities.Task;
import com.reuzenpanda.codemax.tasks.entities.TaskStatus;
import com.reuzenpanda.codemax.tasks.repositories.ITaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskService implements ITaskService {

    private final ITaskRepository taskRepo;
    private final ProjectMapper mapper;

    @Override
    public TaskDto createTask(UUID projectId, String prompt) {
        Task task = new Task();
        task.setProjectId(projectId);
        task.setPrompt(prompt);
        task.setStatus(TaskStatus.queued);
        return mapper.toTaskDto(taskRepo.save(task));
    }

    @Override
    public TaskDto getLatestTask(UUID projectId) {
        return taskRepo.findTopByProjectIdOrderByCreatedAtDesc(projectId)
            .map(mapper::toTaskDto)
            .orElse(null);
    }

    @Override
    public List<TaskDto> listTasksForProject(UUID projectId) {
        return mapper.toTaskDtos(taskRepo.findByProjectIdOrderByCreatedAtAsc(projectId));
    }
}
