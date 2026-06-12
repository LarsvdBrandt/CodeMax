package com.reuzenpanda.codemax.tasks.pipeline.generators;

import com.reuzenpanda.codemax.common.ai.AiRouter;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import com.reuzenpanda.codemax.tasks.pipeline.model.AppSpecification;
import com.reuzenpanda.codemax.tasks.pipeline.model.EntitySpec;
import com.reuzenpanda.codemax.tasks.pipeline.model.FieldSpec;
import com.reuzenpanda.codemax.tasks.pipeline.model.TemplateKnowledge;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
@Service
@RequiredArgsConstructor
public class TypeGenerator {

    private final AiRouter aiRouter;
    private final CodeMaxProperties props;

    /**
     * Rewrites src/types/index.ts with the generated entity types and src/lib/api.ts
     * with the entity API functions.
     */
    public void generate(Path projectDir, AppSpecification spec, EntitySpec entity,
                          TemplateKnowledge knowledge) throws IOException {
        generateTypes(projectDir, spec, entity);
        generateApiConfig(projectDir, spec, entity);
    }

    private void generateTypes(Path projectDir, AppSpecification spec,
                                EntitySpec entity) throws IOException {
        String system = GeneratorPrompts.PREAMBLE;
        String user = buildTypesPrompt(spec.appName(), entity);

        log.info("TypeGenerator: generating types for {}...", entity.name());
        String code = aiRouter.chat(props.getCodeModel(), system, user);

        Path dest = projectDir.resolve("src/types/index.ts");
        Files.createDirectories(dest.getParent());

        // Append to existing types file rather than overwriting (preserve User/Auth types)
        String existing = Files.exists(dest) ? Files.readString(dest) : "";
        String marker = "// === GENERATED: " + entity.name() + " ===";
        if (!existing.contains(marker)) {
            Files.writeString(dest, existing.isBlank() ? code : existing + "\n\n" + marker + "\n" + code);
        } else {
            log.debug("TypeGenerator: {} types already in index.ts, skipping", entity.name());
        }
    }

    private void generateApiConfig(Path projectDir, AppSpecification spec,
                                    EntitySpec entity) throws IOException {
        String system = GeneratorPrompts.PREAMBLE;
        String user = buildApiPrompt(spec.appName(), entity);

        log.info("TypeGenerator: generating API config for {}...", entity.plural());
        String code = aiRouter.chat(props.getCodeModel(), system, user);

        Path dest = projectDir.resolve("src/lib/api.ts");
        Files.createDirectories(dest.getParent());

        String existing = Files.exists(dest) ? Files.readString(dest) : "";
        String marker = "// === API: " + entity.plural() + " ===";
        if (!existing.contains(marker)) {
            Files.writeString(dest, existing.isBlank() ? code : existing + "\n\n" + marker + "\n" + code);
        }
    }

    private String buildTypesPrompt(String appName, EntitySpec entity) {
        StringBuilder sb = new StringBuilder();
        sb.append("Generate TypeScript type definitions for '").append(appName).append("' — entity: ").append(entity.name()).append(".\n");
        sb.append("Export these interfaces:\n");
        sb.append("  - I").append(entity.name()).append(" — the entity with _id (string), userId (string), createdAt (string), updatedAt (string)\n");
        sb.append("  - Create").append(entity.name()).append("Request — for creating (omit _id, userId, createdAt, updatedAt)\n");
        sb.append("  - Update").append(entity.name()).append("Request — all fields optional (Partial<Create").append(entity.name()).append("Request>)\n");
        sb.append("\nFields:\n");
        for (FieldSpec f : entity.fields()) {
            sb.append("  ").append(f.name()).append(": ").append(f.type());
            if (!f.required()) sb.append(" | null");
            sb.append("\n");
        }
        sb.append("\nOutput ONLY the TypeScript interfaces. No markdown. No explanation.");
        return sb.toString();
    }

    private String buildApiPrompt(String appName, EntitySpec entity) {
        return "Generate the API endpoint constants for '" + appName + "' — entity: " + entity.plural() + ".\n" +
            "Export a const API_ENDPOINTS object with a '" + entity.plural() + "' key containing:\n" +
            "  base: '/" + entity.plural() + "'\n" +
            "  byId: (id: string) => `/" + entity.plural() + "/${id}`\n" +
            "The base URL is obtained from import.meta.env.VITE_API_URL.\n" +
            "Use the existing pattern from the template's api.ts file.\n" +
            "Output ONLY the TypeScript content. No markdown. No explanation.";
    }
}
