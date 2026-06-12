package com.reuzenpanda.codemax.tasks.pipeline.packs;

import java.util.List;

public record PackMetadata(
    String name,
    String description,
    boolean requiresAuth,
    boolean requiresEntity,
    List<String> tags
) {}
