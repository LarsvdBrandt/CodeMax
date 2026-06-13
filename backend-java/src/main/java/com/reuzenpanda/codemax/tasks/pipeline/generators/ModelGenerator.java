package com.reuzenpanda.codemax.tasks.pipeline.generators;

import com.reuzenpanda.codemax.common.ai.AiRouter;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import com.reuzenpanda.codemax.tasks.pipeline.model.AppSpecification;
import com.reuzenpanda.codemax.tasks.pipeline.model.EntitySpec;
import com.reuzenpanda.codemax.tasks.pipeline.model.FieldSpec;
import com.reuzenpanda.codemax.tasks.pipeline.model.RelationSpec;
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
public class ModelGenerator {

    private final AiRouter aiRouter;
    private final CodeMaxProperties props;

    public String generate(Path projectDir, AppSpecification spec, EntitySpec entity,
                            TemplateKnowledge knowledge) throws IOException {
        String system = GeneratorPrompts.PREAMBLE +
            "\nReference Mongoose model (follow this exact pattern):\n" +
            knowledge.modelPattern();

        String user = buildUserPrompt(spec.appName(), entity);

        log.info("ModelGenerator: generating {} model...", entity.name());
        String code = aiRouter.chat(props.getCodeModel(), system, user);

        Path dest = projectDir.resolve("server/src/models/" + entity.name() + ".ts");
        Files.createDirectories(dest.getParent());
        Files.writeString(dest, code);

        // Delete the Todo reference model now that ours is generated
        deleteTodo(projectDir, "server/src/models/Todo.ts");

        log.info("ModelGenerator: wrote {}", dest.getFileName());
        return code;
    }

    private String buildUserPrompt(String appName, EntitySpec entity) {
        StringBuilder sb = new StringBuilder();
        sb.append("Generate a Mongoose model file for the '").append(appName).append("' app.\n");
        sb.append("Entity: ").append(entity.name()).append(" (plural: ").append(entity.plural()).append(")\n");
        sb.append("Fields:\n");
        for (FieldSpec f : entity.fields()) {
            sb.append("  - ").append(f.name()).append(": ").append(f.type());
            if (f.required()) sb.append(" (required)");
            if (f.defaultValue() != null && !f.defaultValue().isBlank())
                sb.append(", default: ").append(f.defaultValue());
            sb.append("\n");
        }
        sb.append("\nAlways include: userId (ObjectId ref 'User', required), createdAt, updatedAt (via timestamps: true).\n");

        // Add relation fields
        RelationSpec belongsTo = entity.belongsTo();
        if (belongsTo != null) {
            sb.append("\nThis entity belongs to '").append(belongsTo.entity()).append("'. ");
            sb.append("Add this field to the Mongoose schema:\n");
            sb.append("  ").append(belongsTo.foreignKey())
              .append(": { type: Schema.Types.ObjectId, ref: '").append(belongsTo.entity())
              .append("', required: true }\n");
            sb.append("Also add it to the TypeScript interface as: ")
              .append(belongsTo.foreignKey()).append(": string\n");
        }

        sb.append("\nExport both the Mongoose model as default and a TypeScript interface 'I").append(entity.name()).append("' at the top.\n");
        sb.append("Output ONLY the TypeScript file content. No markdown. No explanation.");
        return sb.toString();
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
