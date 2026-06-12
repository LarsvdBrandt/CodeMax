package com.reuzenpanda.codemax.tasks.pipeline.packs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reuzenpanda.codemax.common.ai.AiRouter;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PackSelector {

    private final AiRouter aiRouter;
    private final CodeMaxProperties props;
    private final ObjectMapper objectMapper;

    public record Selection(List<String> packs, boolean needsAuth) {}

    public Selection select(String prompt, List<PackMetadata> available) {
        if (available.isEmpty()) return new Selection(List.of(), true);

        String catalog = available.stream()
            .map(p -> "- \"" + p.name() + "\": " + p.description()
                + " [keywords: " + String.join(", ", p.tags()) + "]")
            .collect(Collectors.joining("\n"));

        String sys = """
            You are a component pack selector for an AI app builder.
            Given a user's app description, select the most appropriate component packs to install.

            Available packs:
            """ + catalog + """

            Selection rules:
            - For kanban/board/card/pipeline/workflow apps: select "kanban-entity"
            - For list/table/CRUD/manage apps: select "crud-table"
            - For informational/marketing/landing/portfolio sites: select "marketing-landing" if available
            - Select AT MOST 2 packs
            - If the app clearly needs user accounts/login: set needs_auth to true
            - If it is just informational (no user data, no login): set needs_auth to false
            - If no pack clearly fits, return an empty packs array

            Respond ONLY with valid JSON, no other text:
            {"packs": ["pack-name"], "needs_auth": true}
            """;

        try {
            String raw = aiRouter.chatJson(props.getPlannerModel(), sys, "App description: " + prompt);
            JsonNode node = objectMapper.readTree(raw);

            List<String> packNames = objectMapper.convertValue(
                node.get("packs"),
                objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
            );
            boolean needsAuth = !node.has("needs_auth") || node.get("needs_auth").asBoolean(true);

            // Filter to only valid pack names
            Set<String> validNames = available.stream().map(PackMetadata::name).collect(Collectors.toSet());
            packNames = packNames.stream().filter(validNames::contains).collect(Collectors.toList());

            log.info("PackSelector: selected {} for prompt '{}'", packNames, prompt.substring(0, Math.min(60, prompt.length())));
            return new Selection(packNames, needsAuth);
        } catch (Exception e) {
            log.warn("PackSelector failed: {}", e.getMessage());
            return new Selection(List.of(), true);
        }
    }
}
