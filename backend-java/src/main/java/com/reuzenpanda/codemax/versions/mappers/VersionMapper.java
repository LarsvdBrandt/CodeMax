package com.reuzenpanda.codemax.versions.mappers;

import com.reuzenpanda.codemax.versions.dtos.*;
import com.reuzenpanda.codemax.versions.entities.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface VersionMapper {

    @Mapping(target = "status", expression = "java(entity.getStatus().name())")
    ProjectBranchDto toBranchDto(ProjectBranch entity);

    List<ProjectBranchDto> toBranchDtos(List<ProjectBranch> entities);

    ProjectCommitDto toCommitDto(ProjectCommit entity);

    List<ProjectCommitDto> toCommitDtos(List<ProjectCommit> entities);

    ProjectCommitFileDto toCommitFileDto(ProjectCommitFile entity);

    List<ProjectCommitFileDto> toCommitFileDtos(List<ProjectCommitFile> entities);

    @Mapping(target = "status", expression = "java(entity.getStatus().name())")
    ProjectPullRequestDto toPrDto(ProjectPullRequest entity);

    List<ProjectPullRequestDto> toPrDtos(List<ProjectPullRequest> entities);
}
