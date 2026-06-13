package com.reuzenpanda.codemax.versions.mappers;

import com.reuzenpanda.codemax.versions.dtos.ProjectBranchDto;
import com.reuzenpanda.codemax.versions.dtos.ProjectCommitDto;
import com.reuzenpanda.codemax.versions.dtos.ProjectCommitFileDto;
import com.reuzenpanda.codemax.versions.dtos.ProjectPullRequestDto;
import com.reuzenpanda.codemax.versions.entities.ProjectBranch;
import com.reuzenpanda.codemax.versions.entities.ProjectCommit;
import com.reuzenpanda.codemax.versions.entities.ProjectCommitFile;
import com.reuzenpanda.codemax.versions.entities.ProjectPullRequest;
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
public class VersionMapperImpl implements VersionMapper {

    @Override
    public ProjectBranchDto toBranchDto(ProjectBranch entity) {
        if ( entity == null ) {
            return null;
        }

        ProjectBranchDto projectBranchDto = new ProjectBranchDto();

        projectBranchDto.setId( entity.getId() );
        projectBranchDto.setProjectId( entity.getProjectId() );
        projectBranchDto.setName( entity.getName() );
        projectBranchDto.setParentBranchId( entity.getParentBranchId() );
        projectBranchDto.setContainerId( entity.getContainerId() );
        projectBranchDto.setPreviewPort( entity.getPreviewPort() );
        projectBranchDto.setCreatedBy( entity.getCreatedBy() );
        projectBranchDto.setCreatedAt( entity.getCreatedAt() );

        projectBranchDto.setStatus( entity.getStatus().name() );

        return projectBranchDto;
    }

    @Override
    public List<ProjectBranchDto> toBranchDtos(List<ProjectBranch> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ProjectBranchDto> list = new ArrayList<ProjectBranchDto>( entities.size() );
        for ( ProjectBranch projectBranch : entities ) {
            list.add( toBranchDto( projectBranch ) );
        }

        return list;
    }

    @Override
    public ProjectCommitDto toCommitDto(ProjectCommit entity) {
        if ( entity == null ) {
            return null;
        }

        ProjectCommitDto projectCommitDto = new ProjectCommitDto();

        projectCommitDto.setId( entity.getId() );
        projectCommitDto.setProjectId( entity.getProjectId() );
        projectCommitDto.setBranchId( entity.getBranchId() );
        projectCommitDto.setTaskId( entity.getTaskId() );
        projectCommitDto.setMessage( entity.getMessage() );
        projectCommitDto.setCreatedBy( entity.getCreatedBy() );
        projectCommitDto.setCreatedAt( entity.getCreatedAt() );

        return projectCommitDto;
    }

    @Override
    public List<ProjectCommitDto> toCommitDtos(List<ProjectCommit> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ProjectCommitDto> list = new ArrayList<ProjectCommitDto>( entities.size() );
        for ( ProjectCommit projectCommit : entities ) {
            list.add( toCommitDto( projectCommit ) );
        }

        return list;
    }

    @Override
    public ProjectCommitFileDto toCommitFileDto(ProjectCommitFile entity) {
        if ( entity == null ) {
            return null;
        }

        ProjectCommitFileDto projectCommitFileDto = new ProjectCommitFileDto();

        projectCommitFileDto.setId( entity.getId() );
        projectCommitFileDto.setCommitId( entity.getCommitId() );
        projectCommitFileDto.setFilePath( entity.getFilePath() );
        projectCommitFileDto.setContent( entity.getContent() );

        return projectCommitFileDto;
    }

    @Override
    public List<ProjectCommitFileDto> toCommitFileDtos(List<ProjectCommitFile> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ProjectCommitFileDto> list = new ArrayList<ProjectCommitFileDto>( entities.size() );
        for ( ProjectCommitFile projectCommitFile : entities ) {
            list.add( toCommitFileDto( projectCommitFile ) );
        }

        return list;
    }

    @Override
    public ProjectPullRequestDto toPrDto(ProjectPullRequest entity) {
        if ( entity == null ) {
            return null;
        }

        ProjectPullRequestDto projectPullRequestDto = new ProjectPullRequestDto();

        projectPullRequestDto.setId( entity.getId() );
        projectPullRequestDto.setProjectId( entity.getProjectId() );
        projectPullRequestDto.setSourceBranchId( entity.getSourceBranchId() );
        projectPullRequestDto.setTargetBranchId( entity.getTargetBranchId() );
        projectPullRequestDto.setTitle( entity.getTitle() );
        projectPullRequestDto.setDescription( entity.getDescription() );
        projectPullRequestDto.setCreatedBy( entity.getCreatedBy() );
        projectPullRequestDto.setReviewedBy( entity.getReviewedBy() );
        projectPullRequestDto.setReviewedAt( entity.getReviewedAt() );
        projectPullRequestDto.setCreatedAt( entity.getCreatedAt() );
        projectPullRequestDto.setUpdatedAt( entity.getUpdatedAt() );

        projectPullRequestDto.setStatus( entity.getStatus().name() );

        return projectPullRequestDto;
    }

    @Override
    public List<ProjectPullRequestDto> toPrDtos(List<ProjectPullRequest> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ProjectPullRequestDto> list = new ArrayList<ProjectPullRequestDto>( entities.size() );
        for ( ProjectPullRequest projectPullRequest : entities ) {
            list.add( toPrDto( projectPullRequest ) );
        }

        return list;
    }
}
