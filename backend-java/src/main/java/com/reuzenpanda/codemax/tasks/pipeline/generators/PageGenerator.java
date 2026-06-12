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

        return "Generate a complete React page component for managing '" + entity.name() + "s' in the '" + appName + "' app.\n\n" +
            "Entity: " + entity.name() + " (plural: " + entity.plural() + ")\n" +
            "Fields: " + fields + "\n\n" +
            "The page must:\n" +
            "1. Import { useAuth } from '@/hooks/useAuth' to get the token\n" +
            "2. Use the service functions from '../services/" + entity.plural() + "'\n" +
            "3. Import types from '../types'\n" +
            "4. Show a loading skeleton while fetching (use the template's skeleton pattern)\n" +
            "5. Show a list/table of items with Edit and Delete buttons per item\n" +
            "6. Have a 'Create " + entity.name() + "' button that opens an inline modal or form\n" +
            "7. Modal contains form fields for all entity fields\n" +
            "8. After create: add to local state, show toast, close modal — NO navigate()\n" +
            "9. After edit: update local state, show toast, close modal — NO navigate()\n" +
            "10. After delete: remove from local state, show toast — NO navigate()\n" +
            "11. Use only existing UI components from @/components/ui (Button, Input, Modal, Toast, etc.)\n" +
            "12. The component must be a default export named '" + entity.name() + "sPage'\n\n" +
            "Available UI components: " + String.join(", ", knowledge.availableComponents()) + "\n\n" +
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
