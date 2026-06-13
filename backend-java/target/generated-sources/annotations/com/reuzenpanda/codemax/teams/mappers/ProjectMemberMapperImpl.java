package com.reuzenpanda.codemax.teams.mappers;

import com.reuzenpanda.codemax.teams.dtos.ProjectMemberDto;
import com.reuzenpanda.codemax.teams.entities.ProjectMember;
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
public class ProjectMemberMapperImpl implements ProjectMemberMapper {

    @Override
    public ProjectMemberDto toDto(ProjectMember entity) {
        if ( entity == null ) {
            return null;
        }

        ProjectMemberDto projectMemberDto = new ProjectMemberDto();

        projectMemberDto.setId( entity.getId() );
        projectMemberDto.setProjectId( entity.getProjectId() );
        projectMemberDto.setUserId( entity.getUserId() );
        projectMemberDto.setInviteEmail( entity.getInviteEmail() );
        projectMemberDto.setInviteToken( entity.getInviteToken() );
        projectMemberDto.setInvitedBy( entity.getInvitedBy() );
        projectMemberDto.setCreatedAt( entity.getCreatedAt() );

        projectMemberDto.setRole( entity.getRole().name() );
        projectMemberDto.setStatus( entity.getStatus().name() );

        return projectMemberDto;
    }

    @Override
    public List<ProjectMemberDto> toDtos(List<ProjectMember> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ProjectMemberDto> list = new ArrayList<ProjectMemberDto>( entities.size() );
        for ( ProjectMember projectMember : entities ) {
            list.add( toDto( projectMember ) );
        }

        return list;
    }
}
