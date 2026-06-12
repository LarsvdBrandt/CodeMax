package com.reuzenpanda.codemax.auth.mappers;

import com.reuzenpanda.codemax.auth.dtos.UserApiKeyDto;
import com.reuzenpanda.codemax.auth.dtos.UserDto;
import com.reuzenpanda.codemax.auth.entities.User;
import com.reuzenpanda.codemax.auth.entities.UserApiKey;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-12T13:06:44+0200",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 23.0.2 (Homebrew)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public UserDto toDto(User entity) {
        if ( entity == null ) {
            return null;
        }

        UserDto userDto = new UserDto();

        userDto.setId( entity.getId() );
        userDto.setEmail( entity.getEmail() );
        userDto.setFullName( entity.getFullName() );
        userDto.setCompanyName( entity.getCompanyName() );
        userDto.setCompanyAddress( entity.getCompanyAddress() );
        userDto.setCompanyCity( entity.getCompanyCity() );
        userDto.setCompanyCountry( entity.getCompanyCountry() );
        userDto.setWebsite( entity.getWebsite() );
        userDto.setBio( entity.getBio() );
        userDto.setCreatedAt( entity.getCreatedAt() );

        return userDto;
    }

    @Override
    public List<UserDto> toDtos(List<User> entities) {
        if ( entities == null ) {
            return null;
        }

        List<UserDto> list = new ArrayList<UserDto>( entities.size() );
        for ( User user : entities ) {
            list.add( toDto( user ) );
        }

        return list;
    }

    @Override
    public UserApiKeyDto toApiKeyDto(UserApiKey entity) {
        if ( entity == null ) {
            return null;
        }

        UserApiKeyDto userApiKeyDto = new UserApiKeyDto();

        userApiKeyDto.setKeyPreview( maskKey( entity.getKeyValue() ) );
        userApiKeyDto.setId( entity.getId() );
        userApiKeyDto.setName( entity.getName() );
        userApiKeyDto.setService( entity.getService() );
        userApiKeyDto.setCreatedAt( entity.getCreatedAt() );

        return userApiKeyDto;
    }

    @Override
    public List<UserApiKeyDto> toApiKeyDtos(List<UserApiKey> entities) {
        if ( entities == null ) {
            return null;
        }

        List<UserApiKeyDto> list = new ArrayList<UserApiKeyDto>( entities.size() );
        for ( UserApiKey userApiKey : entities ) {
            list.add( toApiKeyDto( userApiKey ) );
        }

        return list;
    }
}
