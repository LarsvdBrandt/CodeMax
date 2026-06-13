package com.reuzenpanda.codemax.tasks.pipeline.model;

import java.util.List;

public record EntitySpec(
    String name,                  // PascalCase singular: "Invoice"
    String plural,                // lowercase plural: "invoices"
    String routePath,             // "/invoices"
    List<FieldSpec> fields,
    List<RelationSpec> relations  // optional — null or empty means no relations
) {
    /** Convenience constructor for backwards-compatibility (no relations). */
    public EntitySpec(String name, String plural, String routePath, List<FieldSpec> fields) {
        this(name, plural, routePath, fields, List.of());
    }

    public List<RelationSpec> relations() {
        return relations != null ? relations : List.of();
    }

    /** Returns the first "belongsTo" relation, or null if none. */
    public RelationSpec belongsTo() {
        return relations().stream()
            .filter(r -> "belongsTo".equals(r.type()))
            .findFirst()
            .orElse(null);
    }
}
