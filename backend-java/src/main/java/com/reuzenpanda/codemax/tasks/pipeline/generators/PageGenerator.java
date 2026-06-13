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
import java.util.List;
import java.util.Set;
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

    private static final Set<String> IMAGE_FIELD_NAMES = Set.of(
        "imageurl", "image", "photo", "thumbnail", "cover", "avatar", "picture", "img"
    );
    private static final Set<String> PRICE_FIELD_NAMES = Set.of(
        "price", "amount", "cost", "value", "fee", "rate", "mrr", "revenue"
    );
    private static final Set<String> STAGE_FIELD_NAMES = Set.of(
        "stage", "status", "state", "phase", "step"
    );

    private String buildUserPrompt(String appName, EntitySpec entity, TemplateKnowledge knowledge) {
        String fields = entity.fields().stream()
            .map(f -> f.name() + " (" + f.type() + (f.required() ? ", required" : "") + ")")
            .collect(Collectors.joining(", "));

        String n = entity.name();
        String p = entity.plural();

        // Detect entity characteristics to choose the right UI layout
        List<String> fieldNames = entity.fields().stream()
            .map(f -> f.name().toLowerCase())
            .collect(Collectors.toList());

        boolean hasImage  = fieldNames.stream().anyMatch(IMAGE_FIELD_NAMES::contains);
        boolean hasPrice  = fieldNames.stream().anyMatch(PRICE_FIELD_NAMES::contains);
        boolean hasStage  = fieldNames.stream().anyMatch(STAGE_FIELD_NAMES::contains);

        StringBuilder prompt = new StringBuilder();
        prompt.append("Generate a complete React page component for managing ").append(n).append("s in the '").append(appName).append("' app.\n\n");
        prompt.append("Entity: ").append(n).append(" (plural: ").append(p).append(")\n");
        prompt.append("Fields: ").append(fields).append("\n\n");
        prompt.append("CRITICAL — use EXACTLY these import lines at the top of the file:\n");
        prompt.append("  import { get").append(n).append("s, create").append(n).append(", update").append(n).append(", delete").append(n).append(" } from '../services/").append(p).append("'\n");
        prompt.append("  import { I").append(n).append(", Create").append(n).append("Request, Update").append(n).append("Request } from '../types'\n");
        prompt.append("  import { useAuth } from '@/hooks/useAuth'\n\n");

        prompt.append("The page must:\n");
        prompt.append("1. Call get").append(n).append("s(token) on mount to load items into local state\n");
        prompt.append("2. Show a loading Skeleton while fetching (use Skeleton component from @/components/ui)\n");
        prompt.append("3. Show EmptyState component (from @/components/ui) when the list is empty\n");
        prompt.append("4. Include a SearchInput component for client-side filtering by title/name\n");
        prompt.append("5. Have a 'Create ").append(n).append("' button that opens a Modal with a form\n");
        prompt.append("6. Modal form has an Input for each field: ").append(fields).append("\n");
        prompt.append("7. After create: call create").append(n).append("(), prepend result to state, show toast, close modal\n");
        prompt.append("8. After edit: call update").append(n).append("(), update item in state, show toast, close modal\n");
        prompt.append("9. After delete: show a ConfirmDialog first, then call delete").append(n).append("(), remove from state, show toast\n");
        prompt.append("10. NEVER call navigate() or useNavigate() — only update local state\n");
        prompt.append("11. Use _id (not id) when accessing MongoDB items\n");
        prompt.append("12. Default export must be named '").append(n).append("sPage'\n\n");

        // Layout guidance based on entity characteristics
        if (hasImage) {
            prompt.append("LAYOUT: Use a card grid layout (not a table) because this entity has an image field.\n");
            prompt.append("  Display items as cards with the image at the top (use ImageCard component if available, or an <img> with object-cover).\n");
            prompt.append("  Use a responsive grid: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4\n");
        } else {
            prompt.append("LAYOUT: Use a list or table layout. Table component is available if fields benefit from columns.\n");
        }
        if (hasPrice) {
            prompt.append("PRICE FORMATTING: Format price fields as currency: €${item.price.toFixed(2)} or use Intl.NumberFormat.\n");
        }
        if (hasStage) {
            prompt.append("STAGE FILTER: Add a filter dropdown above the list to filter by stage/status. Use Badge component to show stage color-coded.\n");
        }

        // Relation guidance
        RelationSpec belongsTo = entity.belongsTo();
        if (belongsTo != null) {
            String fk = belongsTo.foreignKey();
            String parentEntity = belongsTo.entity();
            prompt.append("\nRELATION: This entity belongs to '").append(parentEntity).append("'.\n");
            prompt.append("  - The page should accept an optional '").append(fk)
                  .append("' prop or URL param to filter by parent.\n");
            prompt.append("  - When creating a new item, include '").append(fk)
                  .append("' in the form (as a hidden field or pre-filled from the prop).\n");
            prompt.append("  - Service call: get").append(n).append("s(token, { ").append(fk)
                  .append(": selectedParentId }) when a parent is selected.\n");
        }

        prompt.append("\nAvailable UI components (import from '@/components/ui'): ");
        prompt.append(String.join(", ", knowledge.availableComponents())).append("\n\n");
        prompt.append("Output ONLY the complete TSX file content. No markdown fences. No explanation.");
        return prompt.toString();
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
