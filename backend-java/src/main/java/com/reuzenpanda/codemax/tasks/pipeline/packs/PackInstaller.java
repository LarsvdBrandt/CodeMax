package com.reuzenpanda.codemax.tasks.pipeline.packs;

import com.reuzenpanda.codemax.tasks.pipeline.generators.NavigationGenerator;
import com.reuzenpanda.codemax.tasks.pipeline.model.AppSpecification;
import com.reuzenpanda.codemax.tasks.pipeline.model.BrandingSpec;
import com.reuzenpanda.codemax.tasks.pipeline.model.EntitySpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PackInstaller {

    private final ResourcePatternResolver resourceLoader;
    private final NavigationGenerator navGen;
    private final DatabaseSchemaService schemaService;

    /**
     * Installs a named pack into the project directory.
     * Renders all .hbs templates with the entity tokens and writes output files.
     * Also patches routes/index.ts, App.tsx, and Navbar.tsx.
     */
    public void install(Path projectDir, String packName, EntityDefinition entity) throws IOException {
        log.info("PackInstaller: installing '{}' for entity '{}'", packName, entity.entityName());

        Map<String, String> tokens = buildTokens(entity);

        // Map of template file → output path (output paths also go through token substitution)
        Map<String, String> fileMap = buildFileMap(packName);

        for (Map.Entry<String, String> entry : fileMap.entrySet()) {
            String templatePath = entry.getKey();
            String outputRelative = render(entry.getValue(), tokens);

            String template = loadPackResource(packName, templatePath);
            if (template == null) {
                log.warn("PackInstaller: template not found: packs/{}/{}", packName, templatePath);
                continue;
            }

            String rendered = render(template, tokens);
            Path dest = projectDir.resolve(outputRelative);
            Files.createDirectories(dest.getParent());

            // Types file: append to existing index.ts rather than overwrite
            if (outputRelative.equals("src/types/index.ts")) {
                String existing = Files.exists(dest) ? Files.readString(dest) : "";
                String marker = "// === " + tokens.get("EntityName") + " types ===";
                if (!existing.contains(marker)) {
                    Files.writeString(dest, existing.isBlank() ? rendered : existing + "\n\n" + marker + "\n" + rendered);
                }
            } else {
                Files.writeString(dest, rendered);
            }
            log.info("PackInstaller: wrote {}", outputRelative);
        }

        // Write a clean routes/index.ts referencing only auth + this entity (no todos/users/contact)
        // Skip for stats-dashboard — it has no server routes; primary pack already wrote the index
        if (!"stats-dashboard".equals(packName)) {
            writeCleanRouteIndex(projectDir, tokens.get("entities"));
        }

        // stats-dashboard has no entity routes — skip nav patching, caller handles it
        if ("stats-dashboard".equals(packName)) {
            schemaService.writeSchema(projectDir, packName, entity);
            log.info("PackInstaller: '{}' pack installed successfully", packName);
            return;
        }

        // Update App.tsx + Navbar via NavigationGenerator (deterministic)
        EntitySpec entitySpec = new EntitySpec(
            tokens.get("EntityName"),
            tokens.get("entities"),
            "/" + tokens.get("entities"),
            List.of()
        );
        AppSpecification minimalSpec = new AppSpecification(
            tokens.get("EntityName"), "", new BrandingSpec("99 102 241", "", "", "", List.of()),
            List.of(entitySpec), List.of(), List.of(), false
        );
        navGen.generateAll(projectDir, minimalSpec);

        // Persist schema so follow-up builds know what's already deployed
        schemaService.writeSchema(projectDir, packName, entity);

        log.info("PackInstaller: '{}' pack installed successfully", packName);
    }

    // ── Token map ──────────────────────────────────────────────────────────────

    private Map<String, String> buildTokens(EntityDefinition entity) {
        String name   = entity.entityName();   // "task"
        String plural = entity.entityNamePlural(); // "tasks"
        String EntityName = capitalize(name);  // "Task"
        String Entities   = capitalize(plural); // "Tasks"

        Map<String, String> t = new LinkedHashMap<>();
        t.put("EntityName", EntityName);
        t.put("entityName", name);
        t.put("Entities",   Entities);
        t.put("entities",   plural);
        t.put("routePath",  "/" + plural);
        t.put("fieldDefs",  entity.mongooseFields() != null ? entity.mongooseFields() : "");
        t.put("tsDefs",     entity.tsFields() != null ? entity.tsFields() : "");
        // Kanban-specific
        t.put("statusValues",      "'todo' | 'in-progress' | 'done'");
        t.put("statusEnumValues",  "'todo', 'in-progress', 'done'");
        t.put("defaultStatus",     "todo");

        // ── Dynamic field tokens derived from tsFields ─────────────────────────
        List<ExtraField> extraFields = parseTsExtraFields(entity.tsFields());

        // {{extraFormState}} — extra key: defaultValue pairs for the form state object
        // e.g.  , price: 0, category: '', imageUrl: ''
        String extraFormState = extraFields.stream()
            .map(f -> f.name + ": " + f.defaultValue())
            .collect(Collectors.joining(", "));
        t.put("extraFormState", extraFields.isEmpty() ? "" : ", " + extraFormState);

        // {{extraFormFields}} — JSX <Input> elements for extra fields
        t.put("extraFormFields", buildExtraFormFieldsJsx(extraFields));

        // {{extraTableColumns}} — Column object entries for Table component
        t.put("extraTableColumns", buildExtraTableColumnsJsx(extraFields));

        return t;
    }

    // ── Extra field parsing ────────────────────────────────────────────────────

    private record ExtraField(String name, String tsType, boolean optional) {
        String defaultValue() {
            return switch (tsType) {
                case "number" -> "0";
                default       -> "''";
            };
        }
        String inputType() {
            String lower = name.toLowerCase();
            if (tsType.equals("number")) return "number";
            if (lower.contains("date") || lower.contains("at")) return "date";
            if (lower.contains("email")) return "email";
            if (lower.contains("url") || lower.contains("image") || lower.contains("photo") || lower.contains("img")) return "url";
            return "text";
        }
        String label() {
            // camelCase → "Camel Case"
            String spaced = name.replaceAll("([A-Z])", " $1");
            return Character.toUpperCase(spaced.charAt(0)) + spaced.substring(1).trim();
        }
    }

    /** Parse lines like "  price?: number;\n  category?: string;" into ExtraField list. */
    private List<ExtraField> parseTsExtraFields(String tsFields) {
        List<ExtraField> result = new ArrayList<>();
        if (tsFields == null || tsFields.isBlank()) return result;

        // Match: optional whitespace, fieldName, optional ?, colon, type, semicolon
        Pattern p = Pattern.compile("\\s*(\\w+)(\\?)?\\s*:\\s*(\\w+)\\s*;");
        Matcher m = p.matcher(tsFields);
        while (m.find()) {
            String fieldName = m.group(1);
            boolean optional = m.group(2) != null;
            String tsType    = m.group(3).toLowerCase();
            // Normalise Date → string (JS date inputs use string values)
            if (tsType.equals("date")) tsType = "string";
            result.add(new ExtraField(fieldName, tsType, optional));
        }
        return result;
    }

    /** Build JSX <Input> elements for all extra fields. */
    private String buildExtraFormFieldsJsx(List<ExtraField> fields) {
        if (fields.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (ExtraField f : fields) {
            String inputType = f.inputType();
            sb.append("          <Input\n");
            sb.append("            label=\"").append(f.label()).append("\"\n");
            if (!inputType.equals("text")) {
                sb.append("            type=\"").append(inputType).append("\"\n");
            }
            sb.append("            value={form.").append(f.name).append(" ?? ").append(f.defaultValue().equals("0") ? "0" : "''").append("}\n");
            sb.append("            onChange={e => setForm(f => ({ ...f, ").append(f.name).append(": ");
            if (f.tsType.equals("number")) {
                sb.append("Number(e.target.value)");
            } else {
                sb.append("e.target.value");
            }
            sb.append(" }))}\n");
            sb.append("            placeholder=\"").append(f.label()).append("...\"\n");
            sb.append("          />\n");
        }
        return sb.toString().stripTrailing();
    }

    /** Build Column entries for extra fields (for the Table component). */
    private String buildExtraTableColumnsJsx(List<ExtraField> fields) {
        if (fields.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (ExtraField f : fields) {
            sb.append("    { key: '").append(f.name).append("', header: '").append(f.label()).append("'");
            // Price / amount fields: format as currency
            String lower = f.name.toLowerCase();
            if (f.tsType.equals("number") &&
                    (lower.contains("price") || lower.contains("amount") || lower.contains("cost")
                     || lower.contains("value") || lower.contains("fee") || lower.contains("revenue"))) {
                sb.append(", render: (v: unknown) => v != null ? `€${(v as number).toFixed(2)}` : '—'");
            } else if (f.tsType.equals("number")) {
                sb.append(", render: (v: unknown) => v != null ? String(v as number) : '—'");
            }
            sb.append(" },\n");
        }
        // Remove trailing comma+newline
        String result = sb.toString();
        if (result.endsWith(",\n")) result = result.substring(0, result.length() - 2) + "\n";
        return result.stripTrailing();
    }

    // ── File map: template relative path → output relative path ───────────────

    private Map<String, String> buildFileMap(String packName) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("server/model.ts.hbs",   "server/src/models/{{EntityName}}.ts");
        m.put("server/routes.ts.hbs",  "server/src/routes/{{entities}}.ts");
        m.put("client/types.ts.hbs",   "src/types/index.ts");
        m.put("client/service.ts.hbs", "src/services/{{entities}}.ts");
        // stats-dashboard always writes DashboardPage (not entity-named page)
        if ("stats-dashboard".equals(packName)) {
            m.put("client/page.tsx.hbs", "src/pages/DashboardPage.tsx");
        } else {
            m.put("client/page.tsx.hbs", "src/pages/{{Entities}}Page.tsx");
        }
        return m;
    }

    // ── Route index ───────────────────────────────────────────────────────────
    // Write a clean routes/index.ts that only wires auth + the generated entity.
    // This replaces the fragile regex-patching approach.

    private void writeCleanRouteIndex(Path projectDir, String plural) throws IOException {
        String content = String.format("""
            import { Router } from 'express'
            import authRouter from './auth'
            import %1$sRouter from './%1$s'

            const router = Router()

            router.use('/auth',  authRouter)
            router.use('/%1$s', %1$sRouter)

            router.get('/health', (_req, res) => res.json({ status: 'ok' }))

            export default router
            """, plural);

        Path indexPath = projectDir.resolve("server/src/routes/index.ts");
        Files.createDirectories(indexPath.getParent());
        Files.writeString(indexPath, content);
        log.info("PackInstaller: wrote clean routes/index.ts for entity '{}'", plural);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String loadPackResource(String packName, String relativePath) {
        try {
            Resource r = resourceLoader.getResource("classpath:packs/" + packName + "/" + relativePath);
            if (!r.exists()) return null;
            try (InputStream is = r.getInputStream()) {
                return new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            log.warn("PackInstaller: could not load packs/{}/{}: {}", packName, relativePath, e.getMessage());
            return null;
        }
    }

    private String render(String template, Map<String, String> tokens) {
        String result = template;
        for (Map.Entry<String, String> e : tokens.entrySet()) {
            result = result.replace("{{" + e.getKey() + "}}", e.getValue() != null ? e.getValue() : "");
        }
        return result;
    }

    public static String capitalize(String s) {
        if (s == null || s.isBlank()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
