package com.reuzenpanda.codemax.teams.mappers;

import com.reuzenpanda.codemax.teams.dtos.ProjectMemberDto;
import com.reuzenpanda.codemax.teams.entities.ProjectMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ProjectMemberMapper {

    @Mapping(target = "role", expression = "java(entity.getRole().name())")
    @Mapping(target = "status", expression = "java(entity.getStatus().name())")
    ProjectMemberDto toDto(ProjectMember entity);

    List<ProjectMemberDto> toDtos(List<ProjectMember> entities);
}
