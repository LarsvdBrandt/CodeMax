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

            Selection rules (apply in order — first matching rule wins for the primary pack):
            - For webshop/shop/store/marketplace/buy/sell/product catalog/ecommerce/card shop/pokemon/collectibles/inventory for sale: select "webshop"
            - For CRM/sales/deals/leads/pipeline/funnel/opportunity/clients/prospects: select "crm-pipeline"
            - For kanban/board/sprint/workflow/task-board/project board (non-CRM): select "kanban-entity"
            - For list/table/CRUD/manage/records/catalogue/form/survey/collect/registration/tracker: select "crud-table"
            - For pure landing page/marketing site/portfolio/brochure/informational (no user login or persistent data needed): return empty packs array — the landing page template handles it without a pack
            - For subscription/billing/SaaS pricing/Stripe/payment tiers/membership: return empty packs array — the V3 generator handles complex multi-step flows
            - For booking/appointment/calendar/scheduling/reservation: select "crud-table" (entity: Booking)
            - For multi-entity apps (CRM, SaaS dashboard, project management, any app with 2+ distinct entity types): ALSO select "stats-dashboard" as the second pack for a summary/overview page
            - Select AT MOST 2 packs total
            - Only select packs that are listed in the available packs above
            - If no pack clearly fits the description, return an empty packs array
            - If the app clearly needs user accounts/login: set needs_auth to true
            - If it is purely informational (no user data, no login): set needs_auth to false

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
