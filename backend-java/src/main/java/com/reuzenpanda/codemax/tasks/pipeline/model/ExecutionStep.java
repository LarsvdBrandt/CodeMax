package com.reuzenpanda.codemax.tasks.pipeline.model;

public record ExecutionStep(
    StepType type,
    String entity,
    String description
) {}
