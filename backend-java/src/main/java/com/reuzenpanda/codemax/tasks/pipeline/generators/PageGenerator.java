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
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PageGenerator {

    private final AiRouter aiRouter;
    private final CodeMaxProperties props;

    public String generate(Path projectDir, AppSpecification spec, EntitySpec entity,
                            TemplateKnowledge knowledge) throws IOException {
        String system = GeneratorPrompts.withComponents(knowledge) +
            "\nReference page file (follow patterns from this — state shape, hook usage, modal pattern):\n" +
            knowledge.pagePattern();

        String user = buildUserPrompt(spec.appName(), entity, knowledge);

        log.info("PageGenerator: generating {} page...", entity.name());
        String code = aiRouter.chat(props.getCodeModel(), system, user);

        String pageName = entity.name() + "sPage";
        Path dest = projectDir.resolve("src/pages/" + pageName + ".tsx");
        Files.createDirectories(dest.getParent());
        Files.writeString(dest, code);

        // Delete the Dashboard reference page
        deleteTodo(projectDir, "src/pages/Dashboard.tsx");

        log.info("PageGenerator: wrote {}", dest.getFileName());
        return code;
    }

    private String buildUserPrompt(String appName, EntitySpec entity, TemplateKnowledge knowledge) {
        String fields = entity.fields().stream()
            .map(f -> f.name() + " (" + f.type() + (f.required() ? ", required" : "") + ")")
            .collect(Collectors.joining(", "));

        String n = entity.name();
        String p = entity.plural();
        return "Generate a complete React page component for managing " + n + "s in the '" + appName + "' app.\n\n" +
            "Entity: " + n + " (plural: " + p + ")\n" +
            "Fields: " + fields + "\n\n" +
            "CRITICAL — use EXACTLY these import lines at the top of the file:\n" +
            "  import { get" + n + "s, create" + n + ", update" + n + ", delete" + n + " } from '../services/" + p + "'\n" +
            "  import { I" + n + ", Create" + n + "Request, Update" + n + "Request } from '../types'\n" +
            "  import { useAuth } from '@/hooks/useAuth'\n\n" +
            "The page must:\n" +
            "1. Call get" + n + "s(token) on mount to load items into local state\n" +
            "2. Show a loading skeleton while fetching\n" +
            "3. Show a list/table of items with Edit and Delete buttons per row\n" +
            "4. Have a 'Create " + n + "' button that opens a modal with a form\n" +
            "5. Modal form has an input for each field: " + fields + "\n" +
            "6. After create: call create" + n + "(), add result to state array, show toast, close modal\n" +
            "7. After edit: call update" + n + "(), update item in state array, show toast, close modal\n" +
            "8. After delete: call delete" + n + "(), remove item from state array, show toast\n" +
            "9. NEVER call navigate() or useNavigate() — only update local state\n" +
            "10. Use _id (not id) when accessing MongoDB items\n" +
            "11. Use only UI components from '@/components/ui'\n" +
            "12. Default export must be named '" + n + "sPage'\n\n" +
            "Available UI components (import from '@/components/ui'): " +
            String.join(", ", knowledge.availableComponents()) + "\n\n" +
            "Output ONLY the complete TSX file content. No markdown fences. No explanation.";
    }

    private void deleteTodo(Path projectDir, String relativePath) {
        try {
            Path p = projectDir.resolve(relativePath);
            if (Files.exists(p)) Files.delete(p);
        } catch (IOException e) {
            log.warn("Could not delete reference file {}: {}", relativePath, e.getMessage());
        }
    }
}
