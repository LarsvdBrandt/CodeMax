package com.reuzenpanda.codemax.tasks.pipeline.model;

public record FieldSpec(
    String name,
    String type,
    boolean required,
    String defaultValue
) {}
