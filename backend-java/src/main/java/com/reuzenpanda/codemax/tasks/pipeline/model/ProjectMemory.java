package com.reuzenpanda.codemax.tasks.pipeline.model;

import java.time.OffsetDateTime;
import java.util.List;

public record ProjectMemory(
    AppSpecification specification,
    ExecutionPlan executionPlan,
    List<String> generatedFiles,
    OffsetDateTime lastBuildAt,
    String lastPrompt
) {}
