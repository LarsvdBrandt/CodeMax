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
    private String anthropicApiKey;
    private String geminiApiKey;
    private String deepseekApiKey;
    private String corsAllowOrigins;
    private String mongoRootUrl;
    private String plannerModel = "gpt-4o";
    private String codeModel    = "gpt-4o";
    private String reviewModel  = "gpt-4o";
}
