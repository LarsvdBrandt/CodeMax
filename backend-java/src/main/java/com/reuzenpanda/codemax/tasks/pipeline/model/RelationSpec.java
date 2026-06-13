package com.reuzenpanda.codemax.tasks.pipeline.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Describes a relationship between two entities.
 * type = "belongsTo" means this entity holds a foreign key (e.g. Deal has leadId).
 * type = "hasMany"   means this entity is the parent (e.g. Lead has many Deals).
 */
public record RelationSpec(
    String type,        // "belongsTo" or "hasMany"
    String entity,      // PascalCase name of the related entity, e.g. "Lead"
    @JsonProperty("foreign_key")
    String foreignKey   // field name of the FK, e.g. "leadId"
) {}
