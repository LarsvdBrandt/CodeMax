package com.reuzenpanda.codemax.tasks.pipeline.generators;

import com.reuzenpanda.codemax.common.ai.AiRouter;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import com.reuzenpanda.codemax.tasks.pipeline.model.AppSpecification;
import com.reuzenpanda.codemax.tasks.pipeline.model.EntitySpec;
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
public class ServiceGenerator {

    private final AiRouter aiRouter;
    private final CodeMaxProperties props;

    public String generate(Path projectDir, AppSpecification spec, EntitySpec entity,
                            TemplateKnowledge knowledge) throws IOException {
        String system = GeneratorPrompts.PREAMBLE +
            "\nReference frontend service file (follow this exact pattern):\n" +
            knowledge.servicePattern();

        String user = buildUserPrompt(spec.appName(), entity);

        log.info("ServiceGenerator: generating {} service...", entity.plural());
        String code = aiRouter.chat(props.getCodeModel(), system, user);

        Path dest = projectDir.resolve("src/services/" + entity.plural() + ".ts");
        Files.createDirectories(dest.getParent());
        Files.writeString(dest, code);

        // Delete the Todo reference service
        deleteTodo(projectDir, "src/services/todos.ts");

        log.info("ServiceGenerator: wrote {}", dest.getFileName());
        return code;
    }

    private String buildUserPrompt(String appName, EntitySpec entity) {
        return "Generate a complete frontend API service for '" + appName + "' — entity: " + entity.name() + ".\n" +
            "Plural: " + entity.plural() + ", route path: " + entity.routePath() + "\n" +
            "Export these async functions:\n" +
            "  - get" + entity.name() + "s(token: string): Promise<I" + entity.name() + "[]>\n" +
            "  - create" + entity.name() + "(data: Create" + entity.name() + "Request, token: string): Promise<I" + entity.name() + ">\n" +
            "  - update" + entity.name() + "(id: string, data: Update" + entity.name() + "Request, token: string): Promise<I" + entity.name() + ">\n" +
            "  - delete" + entity.name() + "(id: string, token: string): Promise<void>\n" +
            "Use fetch() with Authorization: Bearer {token} header.\n" +
            "Base URL: import.meta.env.VITE_API_URL\n" +
            "Throw errors on non-ok responses (check response.ok, throw new Error(await response.text())).\n" +
            "Import types from '../types'.\n" +
            "Output ONLY the TypeScript file content. No markdown. No explanation.";
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
