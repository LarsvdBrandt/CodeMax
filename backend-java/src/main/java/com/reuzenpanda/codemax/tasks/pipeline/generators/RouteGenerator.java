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
public class RouteGenerator {

    private final AiRouter aiRouter;
    private final CodeMaxProperties props;

    public String generate(Path projectDir, AppSpecification spec, EntitySpec entity,
                            TemplateKnowledge knowledge) throws IOException {
        String system = GeneratorPrompts.PREAMBLE +
            "\nReference Express route file (follow this exact pattern):\n" +
            knowledge.routePattern();

        String user = buildUserPrompt(spec.appName(), entity);

        log.info("RouteGenerator: generating {} routes...", entity.plural());
        String code = aiRouter.chat(props.getCodeModel(), system, user);

        Path dest = projectDir.resolve("server/src/routes/" + entity.plural() + ".ts");
        Files.createDirectories(dest.getParent());
        Files.writeString(dest, code);

        // Delete the Todo reference route
        deleteTodo(projectDir, "server/src/routes/todos.ts");

        log.info("RouteGenerator: wrote {}", dest.getFileName());
        return code;
    }

    private String buildUserPrompt(String appName, EntitySpec entity) {
        return "Generate a complete Express Router file for '" + appName + "'.\n" +
            "Entity: " + entity.name() + " (plural: " + entity.plural() + ", path: " + entity.routePath() + ")\n" +
            "Include all CRUD endpoints: GET / (list user's items), POST / (create), " +
            "GET /:id (get one), PUT /:id (update), DELETE /:id (delete).\n" +
            "CRITICAL — use EXACTLY this import for auth middleware (the file is authenticate.ts, NOT auth.ts):\n" +
            "  import { authenticate } from '../middleware/authenticate'\n" +
            "All routes must call authenticate as middleware.\n" +
            "Filter all queries by { userId: req.user._id } — users can only access their own items.\n" +
            "Import the model from '../models/" + entity.name() + "'.\n" +
            "NEVER touch or regenerate auth.ts, User.ts, or authenticate.ts — those already exist.\n" +
            "Output ONLY the TypeScript file content for " + entity.plural() + ".ts. No markdown. No explanation.";
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
