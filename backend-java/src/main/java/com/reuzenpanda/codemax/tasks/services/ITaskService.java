package com.reuzenpanda.codemax.tasks.services;

import com.reuzenpanda.codemax.tasks.dtos.TaskDto;

import java.util.List;
import java.util.UUID;

public interface ITaskService {
    TaskDto createTask(UUID projectId, String prompt);
    TaskDto getLatestTask(UUID projectId);
    List<TaskDto> listTasksForProject(UUID projectId);
}
