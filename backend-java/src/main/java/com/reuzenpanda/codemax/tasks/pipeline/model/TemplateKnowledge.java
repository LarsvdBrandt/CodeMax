package com.reuzenpanda.codemax.tasks.pipeline.model;

import java.util.List;

public record TemplateKnowledge(
    List<String> availableComponents,
    String modelPattern,    // content of Todo.ts
    String routePattern,    // content of todos.ts (routes)
    String pagePattern,     // content of Dashboard.tsx
    String servicePattern   // content of todos.ts (frontend service)
) {}
