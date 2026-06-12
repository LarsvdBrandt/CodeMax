package com.reuzenpanda.codemax.tasks.pipeline.packs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reuzenpanda.codemax.common.ai.AiRouter;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class EntityExtractor {

    private final AiRouter aiRouter;
    private final CodeMaxProperties props;
    private final ObjectMapper objectMapper;

    public EntityDefinition extract(String prompt, List<String> packNames) {
        String sys = """
            You are an entity extractor for an app builder.
            Extract the main data entity name and its EXTRA fields from the user's app description.

            Output JSON with EXACTLY these keys (no other keys):
            {
              "entity_name": "task",
              "entity_name_plural": "tasks",
              "mongoose_fields": "  dueDate: { type: Date, default: null },",
              "ts_fields": "  dueDate?: string;"
            }

            Rules for entity_name:
            - camelCase singular (e.g., "task", "invoice", "product", "expense")
            - Derived from what the user wants to manage

            Rules for mongoose_fields — EXTRA fields only:
            - Each field indented with 2 spaces
            - Standard Mongoose field definitions: { type: Type, required: bool, default: val }
            - NEVER include: _id, userId, title, description, status, priority, createdAt, updatedAt
              (these are already defined in the template — adding them causes duplicate identifier errors)
            - Add 0-2 extra fields that make sense for this specific entity (e.g. dueDate, amount, category)
            - If no extra fields are needed, use empty strings for both mongoose_fields and ts_fields

            Rules for ts_fields — EXTRA fields only:
            - Each field indented with 2 spaces, ending with semicolon
            - Map Mongoose types: String→string, Number→number, Boolean→boolean, Date→string
            - Optional fields use ?: notation
            - NEVER include: _id, userId, title, description, status, priority, createdAt, updatedAt
            - Must match the fields listed in mongoose_fields
            """;

        try {
            String raw = aiRouter.chatJson(props.getPlannerModel(), sys, "App: " + prompt);
            JsonNode node = objectMapper.readTree(raw);

            String entityName = node.path("entity_name").asText("item").trim().toLowerCase();
            String entityPlural = node.path("entity_name_plural").asText(entityName + "s").trim().toLowerCase();
            String mongoFields = node.path("mongoose_fields").asText("");
            String tsFields = node.path("ts_fields").asText("");

            log.info("EntityExtractor: entity='{}' plural='{}'", entityName, entityPlural);
            return new EntityDefinition(entityName, entityPlural, mongoFields, tsFields);
        } catch (Exception e) {
            log.warn("EntityExtractor failed: {}, using defaults", e.getMessage());
            return new EntityDefinition("item", "items",
                "  title: { type: String, required: true, trim: true },\n  description: { type: String, default: '' },",
                "  title: string;\n  description?: string;");
        }
    }
}
