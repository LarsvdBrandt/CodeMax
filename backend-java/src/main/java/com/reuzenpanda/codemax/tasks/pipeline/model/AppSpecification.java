package com.reuzenpanda.codemax.tasks.pipeline.model;

import java.util.List;

public record AppSpecification(
    String appName,
    String description,
    BrandingSpec branding,
    List<EntitySpec> entities,
    List<String> navigation,
    List<String> features,
    boolean update  // true when merging into an existing project
) {}
