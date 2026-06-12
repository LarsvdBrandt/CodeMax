package com.reuzenpanda.codemax.tasks.pipeline.model;

import java.util.List;

public record EntitySpec(
    String name,       // PascalCase singular: "Invoice"
    String plural,     // lowercase plural: "invoices"
    String routePath,  // "/invoices"
    List<FieldSpec> fields
) {}
