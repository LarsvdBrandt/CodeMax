package com.reuzenpanda.codemax.tasks.pipeline.packs;

import java.util.List;
import java.util.Map;

public record EntityDefinition(
    String entityName,        // camelCase singular: "task"
    String entityNamePlural,  // lowercase plural: "tasks"
    String mongooseFields,    // Mongoose Schema extra field block (may be empty)
    String tsFields,          // TypeScript interface extra field block (may be empty)
    String heroHeadline,      // LLM-generated H1 landing page headline
    String tagline,           // LLM-generated short tagline
    List<Map<String, String>> featureItems  // LLM-generated feature cards [{icon,title,description}]
) {
    /** Convenience constructor for backward-compat / defaults (no branding). */
    public EntityDefinition(String entityName, String entityNamePlural,
                             String mongooseFields, String tsFields) {
        this(entityName, entityNamePlural, mongooseFields, tsFields, "", "", List.of());
    }
}
