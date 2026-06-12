package com.reuzenpanda.codemax.tasks.pipeline.packs;

import com.reuzenpanda.codemax.tasks.pipeline.generators.NavigationGenerator;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PackInstaller {

    private final ResourcePatternResolver resourceLoader;
    private final NavigationGenerator navGen;

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

        // Patch routes/index.ts to mount the new entity router
        updateRouteIndex(projectDir, tokens.get("entities"), tokens.get("EntityName"));

        // Patch App.tsx + Navbar via NavigationGenerator (deterministic)
        EntitySpec entitySpec = new EntitySpec(
            tokens.get("EntityName"),
            tokens.get("entities"),
            "/" + tokens.get("entities"),
            List.of()
        );
        navGen.generate(projectDir, null, entitySpec);

        // Delete todo/dashboard reference files now that replacements exist
        deleteIfExists(projectDir, "server/src/models/Todo.ts");
        deleteIfExists(projectDir, "server/src/routes/todos.ts");
        deleteIfExists(projectDir, "src/services/todos.ts");
        deleteIfExists(projectDir, "src/pages/Dashboard.tsx");

        log.info("PackInstaller: '{}' pack installed successfully", packName);
    }

    // ── Token map ──────────────────────────────────────────────────────────────

    private Map<String, String> buildTokens(EntityDefinition entity) {
        String name = entity.entityName(); // "task"
        String plural = entity.entityNamePlural(); // "tasks"
        String EntityName = capitalize(name);     // "Task"
        String Entities = capitalize(plural);     // "Tasks"

        Map<String, String> t = new LinkedHashMap<>();
        t.put("EntityName", EntityName);
        t.put("entityName", name);
        t.put("Entities", Entities);
        t.put("entities", plural);
        t.put("routePath", "/" + plural);
        t.put("fieldDefs", entity.mongooseFields() != null ? entity.mongooseFields() : "");
        t.put("tsDefs", entity.tsFields() != null ? entity.tsFields() : "");
        // Kanban-specific
        t.put("statusValues", "'todo' | 'in-progress' | 'done'");
        t.put("statusEnumValues", "'todo', 'in-progress', 'done'");
        t.put("defaultStatus", "todo");
        return t;
    }

    // ── File map: template relative path → output relative path ───────────────

    private Map<String, String> buildFileMap(String packName) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("server/model.ts.hbs",   "server/src/models/{{EntityName}}.ts");
        m.put("server/routes.ts.hbs",  "server/src/routes/{{entities}}.ts");
        m.put("client/types.ts.hbs",   "src/types/index.ts");
        m.put("client/service.ts.hbs", "src/services/{{entities}}.ts");
        m.put("client/page.tsx.hbs",   "src/pages/{{Entities}}Page.tsx");
        return m;
    }

    // ── Route index patching ──────────────────────────────────────────────────

    private void updateRouteIndex(Path projectDir, String plural, String EntityName) throws IOException {
        Path indexPath = projectDir.resolve("server/src/routes/index.ts");
        if (!Files.exists(indexPath)) {
            log.warn("PackInstaller: routes/index.ts not found, skipping route mount");
            return;
        }
        String content = Files.readString(indexPath);

        // Remove todos references (handle any amount of whitespace)
        String updated = content
            .replaceAll("import\\s+todosRouter\\s+from\\s+'\\./todos'[^\\n]*\\n?", "")
            .replaceAll("router\\.use\\('/todos',\\s*todosRouter\\)[^\\n]*\\n?", "");

        String importLine = "import " + plural + "Router from './" + plural + "'";
        String useLine    = "router.use('/" + plural + "', " + plural + "Router)";

        if (!updated.contains(importLine)) {
            int lastImport = updated.lastIndexOf("import ");
            if (lastImport >= 0) {
                int eol = updated.indexOf('\n', lastImport);
                updated = updated.substring(0, eol + 1) + importLine + "\n" + updated.substring(eol + 1);
            } else {
                updated = importLine + "\n" + updated;
            }
        }

        if (!updated.contains(useLine)) {
            int exportIdx = updated.lastIndexOf("export default");
            if (exportIdx >= 0) {
                updated = updated.substring(0, exportIdx) + useLine + "\n\n" + updated.substring(exportIdx);
            } else {
                updated += "\n" + useLine + "\n";
            }
        }

        Files.writeString(indexPath, updated);
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

    private void deleteIfExists(Path projectDir, String relativePath) {
        try {
            Path p = projectDir.resolve(relativePath);
            if (Files.exists(p)) {
                Files.delete(p);
                log.debug("PackInstaller: deleted reference file {}", relativePath);
            }
        } catch (IOException e) {
            log.warn("PackInstaller: could not delete {}: {}", relativePath, e.getMessage());
        }
    }

    public static String capitalize(String s) {
        if (s == null || s.isBlank()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
