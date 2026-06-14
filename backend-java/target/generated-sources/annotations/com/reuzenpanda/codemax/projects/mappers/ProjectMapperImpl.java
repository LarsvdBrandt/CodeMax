package com.reuzenpanda.codemax.projects.mappers;

import com.reuzenpanda.codemax.projects.dtos.ProjectDto;
import com.reuzenpanda.codemax.projects.dtos.ProjectFileDto;
import com.reuzenpanda.codemax.projects.entities.Project;
import com.reuzenpanda.codemax.projects.entities.ProjectFile;
import com.reuzenpanda.codemax.tasks.dtos.TaskDto;
import com.reuzenpanda.codemax.tasks.entities.AgentLogEntry;
import com.reuzenpanda.codemax.tasks.entities.Task;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-13T17:43:52+0200",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 23.0.2 (Homebrew)"
)
@Component
public class ProjectMapperImpl implements ProjectMapper {

    @Override
    public ProjectDto toDto(Project entity) {
        if ( entity == null ) {
            return null;
        }

        ProjectDto projectDto = new ProjectDto();

        projectDto.setId( entity.getId() );
        projectDto.setName( entity.getName() );
        projectDto.setDescription( entity.getDescription() );
        projectDto.setPreviewPort( entity.getPreviewPort() );
        projectDto.setCreatedAt( entity.getCreatedAt() );
        projectDto.setUpdatedAt( entity.getUpdatedAt() );

        projectDto.setStatus( entity.getStatus().name() );

        return projectDto;
    }

    @Override
    public List<ProjectDto> toDtos(List<Project> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ProjectDto> list = new ArrayList<ProjectDto>( entities.size() );
        for ( Project project : entities ) {
            list.add( toDto( project ) );
        }

        return list;
    }

    @Override
    public ProjectFileDto toFileDto(ProjectFile entity) {
        if ( entity == null ) {
            return null;
        }

        ProjectFileDto projectFileDto = new ProjectFileDto();

        projectFileDto.setId( entity.getId() );
        projectFileDto.setFilePath( entity.getFilePath() );
        projectFileDto.setContent( entity.getContent() );
        projectFileDto.setUpdatedAt( entity.getUpdatedAt() );

        return projectFileDto;
    }

    @Override
    public List<ProjectFileDto> toFileDtos(List<ProjectFile> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ProjectFileDto> list = new ArrayList<ProjectFileDto>( entities.size() );
        for ( ProjectFile projectFile : entities ) {
            list.add( toFileDto( projectFile ) );
        }

        return list;
    }

    @Override
    public TaskDto toTaskDto(Task entity) {
        if ( entity == null ) {
            return null;
        }

        TaskDto taskDto = new TaskDto();

        taskDto.setId( entity.getId() );
        taskDto.setPrompt( entity.getPrompt() );
        List<AgentLogEntry> list = entity.getAgentLog();
        if ( list != null ) {
            taskDto.setAgentLog( new ArrayList<AgentLogEntry>( list ) );
        }
        taskDto.setCreatedAt( entity.getCreatedAt() );

        taskDto.setStatus( entity.getStatus().name() );

        return taskDto;
    }

    @Override
    public List<TaskDto> toTaskDtos(List<Task> entities) {
        if ( entities == null ) {
            return null;
        }

        List<TaskDto> list = new ArrayList<TaskDto>( entities.size() );
        for ( Task task : entities ) {
            list.add( toTaskDto( task ) );
        }

        return list;
    }
}
