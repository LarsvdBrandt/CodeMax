package com.reuzenpanda.codemax.tasks.pipeline.packs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reuzenpanda.codemax.common.ai.AiRouter;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EntityExtractor {

    private final AiRouter aiRouter;
    private final CodeMaxProperties props;
    private final ObjectMapper objectMapper;

    /** Extract entity definition for a new build. */
    public EntityDefinition extract(String prompt, List<String> packNames) {
        return extract(prompt, packNames, "");
    }

    /** Extract entity definition, optionally providing existing schema context for update builds. */
    public EntityDefinition extract(String prompt, List<String> packNames, String existingSchema) {
        String sys = """
            You are an entity extractor for an app builder.
            Extract the main data entity name, its EXTRA fields, and branding content from the user's app description.

            Output JSON with EXACTLY these keys (no other keys):
            {
              "entity_name": "task",
              "entity_name_plural": "tasks",
              "mongoose_fields": "  dueDate: { type: Date, default: null },",
              "ts_fields": "  dueDate?: string;",
              "hero_headline": "A compelling H1 headline for the app landing page",
              "tagline": "A short, punchy marketing tagline (max 10 words)",
              "feature_items": [
                {"icon": "Zap", "title": "Feature name", "description": "One-line benefit statement."},
                {"icon": "Shield", "title": "Feature name", "description": "One-line benefit statement."},
                {"icon": "Globe", "title": "Feature name", "description": "One-line benefit statement."}
              ]
            }

            Rules for entity_name:
            - camelCase singular (e.g., "task", "invoice", "product", "expense")
            - Derived from what the user wants to manage

            Rules for mongoose_fields — EXTRA fields only:
            - Each field indented with 2 spaces
            - Standard Mongoose field definitions: { type: Type, required: bool, default: val }
            - NEVER include: _id, userId, title, description, status, priority, createdAt, updatedAt
              (these are already defined in the template — adding them causes duplicate identifier errors)
            - Add 2-4 extra fields that make sense for this specific entity
              (e.g. for products: price, imageUrl, category, stock)
              (e.g. for expenses: amount, category, date, merchant)
              (e.g. for contacts: email, phone, company, role)
            - If truly no extra fields are needed, use empty strings for both mongoose_fields and ts_fields

            Rules for ts_fields — EXTRA fields only:
            - Each field indented with 2 spaces, ending with semicolon
            - Map Mongoose types: String→string, Number→number, Boolean→boolean, Date→string
            - Optional fields use ?: notation
            - NEVER include: _id, userId, title, description, status, priority, createdAt, updatedAt
            - Must match the fields listed in mongoose_fields

            Rules for hero_headline:
            - An attention-grabbing H1 headline (6-12 words) specific to THIS app
            - Written as a marketing statement, not just the app name
            - Examples: "Sell your handmade creations to the world", "Track every expense, master your budget"

            Rules for tagline:
            - A short punchy statement (max 10 words) about what the app does
            - Examples: "Your products, beautifully managed.", "Expenses under control, always."

            Rules for feature_items:
            - Exactly 3-6 items
            - icon must be one of: Zap, Shield, Globe, Sparkles, Lock, Palette, Clock, Star,
              Heart, BarChart, Bell, Package, TrendingUp, Search, Check, List, Image, Tag
            - Each item must be specific to this app, not generic placeholders
            """;

        String userMsg = (existingSchema != null && !existingSchema.isBlank()
            ? existingSchema + "\n\n"
            : "") + "App: " + prompt;

        try {
            String raw = aiRouter.chatJson(props.getPlannerModel(), sys, userMsg);
            JsonNode node = objectMapper.readTree(raw);

            String entityName = node.path("entity_name").asText("item").trim().toLowerCase();
            String entityPlural = node.path("entity_name_plural").asText(entityName + "s").trim().toLowerCase();
            String mongoFields = node.path("mongoose_fields").asText("");
            String tsFields = node.path("ts_fields").asText("");
            String heroHeadline = node.path("hero_headline").asText("");
            String tagline = node.path("tagline").asText("");

            List<Map<String, String>> featureItems = new ArrayList<>();
            JsonNode featNode = node.path("feature_items");
            if (featNode.isArray()) {
                for (JsonNode item : featNode) {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("icon",        item.path("icon").asText("Zap"));
                    m.put("title",       item.path("title").asText("Feature"));
                    m.put("description", item.path("description").asText(""));
                    featureItems.add(m);
                }
            }

            log.info("EntityExtractor: entity='{}' plural='{}' headline='{}'", entityName, entityPlural, heroHeadline);
            return new EntityDefinition(entityName, entityPlural, mongoFields, tsFields,
                heroHeadline, tagline, featureItems);

        } catch (Exception e) {
            log.warn("EntityExtractor failed: {}, using defaults", e.getMessage());
            return new EntityDefinition("item", "items",
                "  title: { type: String, required: true, trim: true },\n  description: { type: String, default: '' },",
                "  title: string;\n  description?: string;");
        }
    }
}
