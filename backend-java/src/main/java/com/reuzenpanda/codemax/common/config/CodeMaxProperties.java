package com.reuzenpanda.codemax.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "codemax")
public class CodeMaxProperties {
    private String jwtSecret;
    private long jwtExpirationMs;
    private String projectsDir;
    private String templatesDir;
    private String openaiApiKey;
    private String corsAllowOrigins;
}
