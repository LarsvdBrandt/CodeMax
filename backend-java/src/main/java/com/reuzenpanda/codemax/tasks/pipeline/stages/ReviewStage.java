package com.reuzenpanda.codemax.tasks.pipeline.stages;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reuzenpanda.codemax.common.ai.AiRouter;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import com.reuzenpanda.codemax.tasks.pipeline.engine.Patch;
import com.reuzenpanda.codemax.tasks.pipeline.engine.PatchOperation;
import com.reuzenpanda.codemax.tasks.pipeline.model.AppSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewStage {

    private final AiRouter aiRouter;
    private final CodeMaxProperties props;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT =
        """
        You are a senior TypeScript code reviewer. You will receive an AppSpecification \
        and a set of generated source files. Your job is to find bugs that would cause \
        build failures or runtime errors.

        Focus ONLY on:
        - Import paths that reference files that don't exist
        - TypeScript type mismatches between the types file and usage in page/service
        - Missing exports (e.g., a type used in the service but not exported from types/index.ts)
        - Wrong MongoDB field access (_id vs id)
        - useNavigate() used after create/edit/delete (must use local state instead)
        - Response shape mismatches (e.g., service returns array but page expects object)

        Return ONLY valid JSON in this exact shape:
        {
          "issues": ["short description of each issue found"],
          "patches": [
            {
              "file": "relative/path/to/file.ts",
              "operation": "REPLACE_BLOCK",
              "search": "exact string to find",
              "replace": "replacement string"
            }
          ]
        }

        If no issues are found, return: {"issues": [], "patches": []}
        No markdown. No explanation outside the JSON.
        """;

    /**
     * Review a set of generated files and return patches for any issues found.
     * Returns empty list if review is disabled (reviewModel is blank).
     */
    public List<Patch> review(AppSpecification spec, Map<String, String> generatedFiles) {
        String reviewModel = props.getReviewModel();
        if (reviewModel == null || reviewModel.isBlank()) {
            log.info("ReviewStage: review disabled (review-model not set), skipping");
            return List.of();
        }

        if (generatedFiles.isEmpty()) {
            log.info("ReviewStage: no generated files to review, skipping");
            return List.of();
        }

        log.info("ReviewStage: reviewing {} generated files with {}...",
            generatedFiles.size(), reviewModel);

        String user = buildUserPrompt(spec, generatedFiles);

        try {
            String raw = aiRouter.chatJson(reviewModel, SYSTEM_PROMPT, user);
            return parsePatches(raw);
        } catch (Exception e) {
            log.warn("ReviewStage: review call failed ({}), proceeding without review", e.getMessage());
            return List.of();
        }
    }

    private String buildUserPrompt(AppSpecification spec, Map<String, String> generatedFiles) {
        StringBuilder sb = new StringBuilder();
        sb.append("AppSpecification:\n```json\n");
        try { sb.append(objectMapper.writeValueAsString(spec)); }
        catch (Exception ignored) { sb.append("{}"); }
        sb.append("\n```\n\nGenerated files:\n");

        for (Map.Entry<String, String> entry : generatedFiles.entrySet()) {
            String content = entry.getValue();
            // Truncate very long files to stay within context
            if (content.length() > 3000) content = content.substring(0, 3000) + "\n// ... (truncated)";
            sb.append("\n### ").append(entry.getKey()).append("\n```typescript\n")
              .append(content).append("\n```\n");
        }

        return sb.toString();
    }

    private List<Patch> parsePatches(String raw) {
        try {
            String json = stripFences(raw.trim());
            JsonNode root = objectMapper.readTree(json);
            JsonNode patchesNode = root.get("patches");
            List<Patch> patches = new ArrayList<>();

            if (patchesNode == null || patchesNode.isEmpty()) {
                log.info("ReviewStage: no patches needed");
                return patches;
            }

            for (JsonNode p : patchesNode) {
                String file      = p.get("file").asText();
                String operation = p.get("operation").asText("REPLACE_BLOCK");
                String search    = p.has("search")  ? p.get("search").asText()  : "";
                String replace   = p.has("replace") ? p.get("replace").asText() : "";

                PatchOperation op = PatchOperation.valueOf(operation);
                patches.add(new Patch(file, op, search, replace));
            }

            JsonNode issuesNode = root.get("issues");
            if (issuesNode != null && !issuesNode.isEmpty()) {
                log.info("ReviewStage: found {} issues, {} patches applied",
                    issuesNode.size(), patches.size());
            } else {
                log.info("ReviewStage: no issues found");
            }

            return patches;
        } catch (Exception e) {
            log.warn("ReviewStage: could not parse review response ({}), skipping patches", e.getMessage());
            return List.of();
        }
    }

    private String stripFences(String s) {
        if (s.startsWith("```")) {
            int first = s.indexOf('\n');
            int last  = s.lastIndexOf("```");
            if (first >= 0 && last > first) return s.substring(first + 1, last).trim();
        }
        return s;
    }

    /**
     * Collect a sample of generated files for review (types, service, page).
     * Limits to 4 files to keep review prompt manageable.
     */
    public Map<String, String> collectReviewFiles(Path projectDir, String entityPlural) {
        Map<String, String> files = new java.util.LinkedHashMap<>();
        String[] candidates = {
            "src/types/index.ts",
            "src/services/" + entityPlural + ".ts",
            "src/pages/" + Character.toUpperCase(entityPlural.charAt(0)) +
                entityPlural.substring(1) + "Page.tsx",
            "server/src/models/" + Character.toUpperCase(entityPlural.charAt(0)) +
                entityPlural.substring(1, entityPlural.length() - 1) + ".ts",
        };
        for (String rel : candidates) {
            Path p = projectDir.resolve(rel);
            if (Files.exists(p)) {
                try { files.put(rel, Files.readString(p)); }
                catch (Exception ignored) {}
            }
        }
        return files;
    }
}
