package com.reuzenpanda.codemax.auth.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor
public class UserApiKeyDto {
    private UUID id;
    private String name;
    private String service;
    private String keyPreview;
    private OffsetDateTime createdAt;
}
