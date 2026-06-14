package com.reuzenpanda.codemax.projects.mappers;

import com.reuzenpanda.codemax.projects.dtos.ProjectDto;
import com.reuzenpanda.codemax.projects.dtos.ProjectFileDto;
import com.reuzenpanda.codemax.projects.entities.Project;
import com.reuzenpanda.codemax.projects.entities.ProjectFile;
import com.reuzenpanda.codemax.tasks.dtos.TaskDto;
import com.reuzenpanda.codemax.tasks.entities.Task;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper
public interface ProjectMapper {

    @Mapping(target = "status", expression = "java(entity.getStatus().name())")
    ProjectDto toDto(Project entity);

    List<ProjectDto> toDtos(List<Project> entities);

    ProjectFileDto toFileDto(ProjectFile entity);

    List<ProjectFileDto> toFileDtos(List<ProjectFile> entities);

    @Mapping(target = "status", expression = "java(entity.getStatus().name())")
    TaskDto toTaskDto(Task entity);

    List<TaskDto> toTaskDtos(List<Task> entities);
}
