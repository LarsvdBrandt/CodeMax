package com.reuzenpanda.codemax.tasks.pipeline.packs;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Persists a schema manifest at _meta/db-schema.json after each pack installation.
 * On follow-up builds, EntityExtractor reads this so the AI knows what already exists.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DatabaseSchemaService {

    private final ObjectMapper objectMapper;

    private static final String SCHEMA_PATH = "_meta/db-schema.json";

    public record EntityEntry(String entityName, String entityPlural,
                               String packName, String mongooseFields,
                               String tsFields, String installedAt) {}

    /** Append (or create) a schema entry for the given entity/pack. */
    public void writeSchema(Path projectDir, String packName, EntityDefinition entity) {
        try {
            Path schemaFile = projectDir.resolve(SCHEMA_PATH);
            Files.createDirectories(schemaFile.getParent());

            ArrayNode root = schemaFile.toFile().exists()
                ? (ArrayNode) objectMapper.readTree(schemaFile.toFile())
                : objectMapper.createArrayNode();

            // Remove any prior entry for the same entity so we don't duplicate
            ArrayNode updated = objectMapper.createArrayNode();
            root.forEach(n -> {
                if (!entity.entityName().equals(n.path("entityName").asText())) {
                    updated.add(n);
                }
            });

            ObjectNode entry = objectMapper.createObjectNode();
            entry.put("entityName",     entity.entityName());
            entry.put("entityPlural",   entity.entityNamePlural());
            entry.put("packName",       packName);
            entry.put("mongooseFields", entity.mongooseFields() != null ? entity.mongooseFields() : "");
            entry.put("tsFields",       entity.tsFields()       != null ? entity.tsFields()       : "");
            entry.put("installedAt",    OffsetDateTime.now().toString());
            updated.add(entry);

            objectMapper.writerWithDefaultPrettyPrinter().writeValue(schemaFile.toFile(), updated);
            log.info("DatabaseSchemaService: wrote schema for entity '{}'", entity.entityName());
        } catch (IOException e) {
            log.warn("DatabaseSchemaService: could not write schema: {}", e.getMessage());
        }
    }

    /** Read all known entities for a project. Returns empty list if no schema exists. */
    public List<EntityEntry> readSchema(Path projectDir) {
        Path schemaFile = projectDir.resolve(SCHEMA_PATH);
        List<EntityEntry> result = new ArrayList<>();
        if (!Files.exists(schemaFile)) return result;
        try {
            objectMapper.readTree(schemaFile.toFile()).forEach(n ->
                result.add(new EntityEntry(
                    n.path("entityName").asText(),
                    n.path("entityPlural").asText(),
                    n.path("packName").asText(),
                    n.path("mongooseFields").asText(),
                    n.path("tsFields").asText(),
                    n.path("installedAt").asText()
                ))
            );
        } catch (IOException e) {
            log.warn("DatabaseSchemaService: could not read schema: {}", e.getMessage());
        }
        return result;
    }

    /**
     * Returns a human-readable summary for use as context in AI prompts.
     * Prepend this to EntityExtractor prompts on update builds.
     */
    public String schemaContext(Path projectDir) {
        List<EntityEntry> entries = readSchema(projectDir);
        if (entries.isEmpty()) return "";

        StringBuilder sb = new StringBuilder("EXISTING DATABASE ENTITIES (already deployed — do NOT redefine these):\n");
        for (EntityEntry e : entries) {
            sb.append("- ").append(e.entityName()).append(" (plural: ").append(e.entityPlural())
              .append(", pack: ").append(e.packName()).append(")\n");
            if (!e.mongooseFields().isBlank()) {
                sb.append("  extra mongoose fields: ").append(e.mongooseFields()).append("\n");
            }
        }
        return sb.toString();
    }
}
