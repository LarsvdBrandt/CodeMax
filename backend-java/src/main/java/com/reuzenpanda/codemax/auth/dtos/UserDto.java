package com.reuzenpanda.codemax.auth.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor
public class UserDto {
    private UUID id;
    private String email;
    private String fullName;
    private String companyName;
    private String companyAddress;
    private String companyCity;
    private String companyCountry;
    private String website;
    private String bio;
    private OffsetDateTime createdAt;
}
