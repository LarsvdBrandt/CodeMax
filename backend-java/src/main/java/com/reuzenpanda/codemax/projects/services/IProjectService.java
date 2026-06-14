package com.reuzenpanda.codemax.projects.services;

import com.reuzenpanda.codemax.projects.dtos.ProjectDto;
import com.reuzenpanda.codemax.projects.dtos.ProjectFileDto;
import com.reuzenpanda.codemax.tasks.dtos.TaskDto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface IProjectService {

    List<ProjectDto> listProjects(UUID userId);

    ProjectDto createProject(UUID userId, String name, String description, String prompt,
                              Map<String, String> answers);

    List<Map<String, Object>> generateQuestions(String description);

    ProjectDto getProject(UUID userId, UUID projectId);

    ProjectDto updateProject(UUID userId, UUID projectId, String name, String description);

    void deleteProject(UUID userId, UUID projectId);

    Map<String, Object> getProjectStatus(UUID userId, UUID projectId);

    TaskDto submitPrompt(UUID userId, UUID projectId, String prompt, UUID branchId);

    TaskDto retryLatestTask(UUID userId, UUID projectId);

    List<ProjectFileDto> listFiles(UUID userId, UUID projectId);

    ProjectFileDto getFile(UUID userId, UUID projectId, String filePath);

    void saveFile(UUID userId, UUID projectId, String filePath, String content);

    void stopContainer(UUID userId, UUID projectId);

    void startContainer(UUID userId, UUID projectId);

    List<String> getContainerLogs(UUID userId, UUID projectId);

    List<TaskDto> listTasks(UUID userId, UUID projectId);

    void provideApiKey(UUID userId, UUID projectId, String keyName, String keyValue);

    Map<String, Object> detectMissingKeys(UUID userId, UUID projectId);

    Map<String, Object> clarifyPrompt(UUID userId, UUID projectId, String prompt);

    String generatePlan(UUID userId, String prompt);
}
