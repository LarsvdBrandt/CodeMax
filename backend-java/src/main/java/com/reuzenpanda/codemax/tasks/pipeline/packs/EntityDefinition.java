package com.reuzenpanda.codemax.tasks.pipeline.packs;

public record EntityDefinition(
    String entityName,        // camelCase singular: "task"
    String entityNamePlural,  // lowercase plural: "tasks"
    String mongooseFields,    // Mongoose Schema field block (may be empty)
    String tsFields           // TypeScript interface field block (may be empty)
) {}
