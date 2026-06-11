package com.reuzenpanda.codemax.auth.mappers;

import com.reuzenpanda.codemax.auth.dtos.UserApiKeyDto;
import com.reuzenpanda.codemax.auth.dtos.UserDto;
import com.reuzenpanda.codemax.auth.entities.User;
import com.reuzenpanda.codemax.auth.entities.UserApiKey;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;

@Mapper
public interface UserMapper {

    UserDto toDto(User entity);
    List<UserDto> toDtos(List<User> entities);

    @Mapping(target = "keyPreview", source = "keyValue", qualifiedByName = "maskKey")
    UserApiKeyDto toApiKeyDto(UserApiKey entity);
    List<UserApiKeyDto> toApiKeyDtos(List<UserApiKey> entities);

    @Named("maskKey")
    default String maskKey(String keyValue) {
        if (keyValue == null || keyValue.length() < 6) return "••••••";
        return keyValue.substring(0, 6) + "••••••••••";
    }
}
