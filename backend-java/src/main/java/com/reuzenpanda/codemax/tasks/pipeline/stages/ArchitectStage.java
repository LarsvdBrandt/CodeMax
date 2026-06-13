package com.reuzenpanda.codemax.tasks.pipeline.stages;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reuzenpanda.codemax.common.ai.AiRouter;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import com.reuzenpanda.codemax.tasks.pipeline.model.AppSpecification;
import com.reuzenpanda.codemax.tasks.pipeline.model.TemplateKnowledge;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArchitectStage {

    private final AiRouter aiRouter;
    private final CodeMaxProperties props;
    private final ObjectMapper objectMapper;

    // Keys must be snake_case — Jackson is configured with SNAKE_CASE naming strategy globally,
    // so it maps app_name→appName, accent_color_rgb→accentColorRgb, etc. on deserialization.
    private static final String SCHEMA_HINT =
        """
        Return ONLY valid JSON matching this exact schema — no markdown, no explanation.
        ALL keys must be snake_case exactly as shown:
        {
          "app_name":    "string — PascalCase, 1-3 words",
          "description": "string — one sentence",
          "branding": {
            "accent_color_rgb":  "string — RGB triple, space-separated, e.g. '20 184 166'",
            "tagline":           "string — short marketing line",
            "hero_headline":     "string — H1 landing page headline",
            "hero_subheadline":  "string — 1-2 sentence subheadline",
            "feature_items": [
              {"icon": "string — lucide-react icon name", "title": "string", "description": "string"}
            ]
          },
          "entities": [
            {
              "name":       "string — PascalCase singular, e.g. 'Lead'",
              "plural":     "string — lowercase plural, e.g. 'leads'",
              "route_path": "string — e.g. '/leads'",
              "fields": [
                {"name": "string", "type": "string — TS type", "required": true, "default_value": "string or null"}
              ],
              "relations": [
                {
                  "type":        "hasMany or belongsTo",
                  "entity":      "string — PascalCase name of related entity",
                  "foreign_key": "string — camelCase FK field name, e.g. 'leadId'"
                }
              ]
            }
          ],
          "navigation": ["string — nav label"],
          "features":   ["string — feature bullet"],
          "update":     false
        }

        Relations guidance:
        - For a CRM: Lead hasMany Deal; Deal belongsTo Lead (foreign_key: "leadId")
        - For a shop with orders: Order hasMany OrderItem; OrderItem belongsTo Order (foreign_key: "orderId")
        - Omit "relations" entirely if no relationships are needed (single-entity app)
        - belongsTo entity must include the foreign_key field in its "fields" array as well (type: "string", required: true)
        """;

    /**
     * Extract a full AppSpecification from the user's prompt.
     * Uses the planner model (typically Gemini 2.5 Pro).
     */
    public AppSpecification architect(String prompt, Map<String, String> answers,
                                      TemplateKnowledge knowledge) {
        String system = buildSystemPrompt(knowledge);
        String user   = buildUserPrompt(prompt, answers);

        log.info("ArchitectStage: calling {} for app spec...", props.getPlannerModel());
        String raw = aiRouter.chatJson(props.getPlannerModel(), system, user);
        log.debug("ArchitectStage raw response: {}", raw);

        return parse(raw);
    }

    /**
     * Merge a new prompt into an existing specification (update mode).
     * Only new/changed fields should be modified; existing entities are preserved.
     */
    public AppSpecification architectUpdate(String prompt, Map<String, String> answers,
                                             TemplateKnowledge knowledge,
                                             AppSpecification existing) {
        String system = buildSystemPrompt(knowledge) +
            "\nThis is an UPDATE to an existing app. Preserve existing entities unchanged. " +
            "Only add new entities or update fields the user explicitly mentions. Set \"update\": true.";

        String user = buildUserPrompt(prompt, answers) +
            "\n\nExisting specification:\n" + toJson(existing);

        log.info("ArchitectStage (update): calling {} for updated spec...", props.getPlannerModel());
        String raw = aiRouter.chatJson(props.getPlannerModel(), system, user);
        log.debug("ArchitectStage update raw response: {}", raw);

        AppSpecification updated = parse(raw);
        // Safety: ensure update flag is set
        if (!updated.update()) {
            updated = new AppSpecification(
                updated.appName(), updated.description(), updated.branding(),
                updated.entities(), updated.navigation(), updated.features(), true);
        }
        return updated;
    }

    // ── Prompt builders ───────────────────────────────────────────────────────

    private String buildSystemPrompt(TemplateKnowledge knowledge) {
        StringBuilder sb = new StringBuilder();
        sb.append("""
            You are an expert software architect. Analyse the user's description of a web app \
            and produce a structured AppSpecification JSON.

            The app uses: Vite + React 18 + TypeScript + Express + MongoDB.
            The template already includes: authentication (login/register), a landing page, \
            a dashboard page, and a Todo CRUD example.
            You are replacing/extending the Todo example with the user's described feature.

            Accent color: pick an appropriate RGB triple (no commas). Examples:
              Indigo = '99 102 241', Teal = '20 184 166', Rose = '244 63 94', Amber = '245 158 11'

            Entity rules:
            - Extract 1-3 entities. For simple apps: 1. For CRM/SaaS/complex apps: 2-3 is fine.
            - Field types: 'string', 'number', 'boolean', 'Date'. No custom types.
            - Include at minimum: title/name (string, required).
            - Do NOT include: _id, createdAt, updatedAt, userId — these are added automatically.
            - For product/shop/card/item/inventory entities: include imageUrl (string), price (number), category (string), stock (number) where relevant to the description.
            - For CRM/lead/contact/customer entities: include company (string), email (string), phone (string), stage (string) where relevant.
            - For deal/opportunity/pipeline entities: include value (number), stage (string), probability (number) where relevant.
            - For task/project/ticket entities: include status (string), priority (string), dueDate (Date) where relevant.
            - For SaaS/subscription entities: include plan (string), status (string), trialEndsAt (Date) where relevant.

            Available lucide-react icon names for featureItems:
              Zap, Shield, Globe, Sparkles, Lock, Palette, Clock, Star, Heart, \
              BarChart, Bell, Bookmark, Calendar, Check, Cloud, Code, Cog, \
              Download, Edit, Eye, File, Filter, Folder, Hash, Home, Image, \
              Inbox, Key, Layout, Link, List, Map, MessageSquare, Monitor, \
              Moon, Music, Package, Phone, Play, Plus, Search, Send, Settings, \
              Share, Sliders, Tag, Trash, TrendingUp, Upload, User, Video, X
            """);

        if (!knowledge.availableComponents().isEmpty()) {
            sb.append("\nAvailable UI components (for reference only — not used in spec):\n")
              .append(String.join(", ", knowledge.availableComponents())).append("\n");
        }

        sb.append(SCHEMA_HINT);
        return sb.toString();
    }

    private String buildUserPrompt(String prompt, Map<String, String> answers) {
        StringBuilder sb = new StringBuilder("User description:\n").append(prompt);
        if (answers != null && !answers.isEmpty()) {
            sb.append("\n\nAdditional answers from user:\n");
            answers.forEach((k, v) -> sb.append("- ").append(k).append(": ").append(v).append("\n"));
        }
        return sb.toString();
    }

    // ── Parsing ───────────────────────────────────────────────────────────────

    private AppSpecification parse(String raw) {
        String json = stripFences(raw.trim());
        try {
            AppSpecification spec = objectMapper.readValue(json, AppSpecification.class);
            validate(spec);
            log.info("ArchitectStage: parsed spec — appName='{}', entities={}",
                spec.appName(), spec.entities().stream().map(e -> e.name()).toList());
            return spec;
        } catch (Exception e) {
            log.error("ArchitectStage: failed to parse spec JSON:\n{}", json);
            throw new RuntimeException("ArchitectStage could not parse AppSpecification: " + e.getMessage(), e);
        }
    }

    private void validate(AppSpecification spec) {
        if (spec.appName() == null || spec.appName().isBlank())
            throw new IllegalStateException("AppSpecification.appName is blank");
        if (spec.entities() == null || spec.entities().isEmpty())
            throw new IllegalStateException("AppSpecification.entities is empty");
    }

    private String stripFences(String s) {
        if (s.startsWith("```")) {
            int first = s.indexOf('\n');
            int last  = s.lastIndexOf("```");
            if (first >= 0 && last > first) return s.substring(first + 1, last).trim();
        }
        return s;
    }

    private String toJson(Object o) {
        try { return objectMapper.writeValueAsString(o); }
        catch (Exception e) { return "{}"; }
    }

    /**
     * Fallback spec for unit tests / local dev without a real API key.
     */
    public static AppSpecification fallback(String prompt) {
        String name = inferName(prompt);
        return new AppSpecification(
            name, prompt,
            new com.reuzenpanda.codemax.tasks.pipeline.model.BrandingSpec(
                "99 102 241", "Manage your " + name.toLowerCase() + "s with ease.",
                "The easiest way to manage your " + name.toLowerCase() + "s",
                "Built for teams who want to ship fast.", List.of()),
            List.of(new com.reuzenpanda.codemax.tasks.pipeline.model.EntitySpec(
                name, name.toLowerCase() + "s", "/" + name.toLowerCase() + "s",
                List.of(
                    new com.reuzenpanda.codemax.tasks.pipeline.model.FieldSpec("title", "string", true, null),
                    new com.reuzenpanda.codemax.tasks.pipeline.model.FieldSpec("description", "string", false, "")
                ))),
            List.of(name + "s"), List.of("CRUD", "Auth", "MongoDB"), false);
    }

    private static String inferName(String prompt) {
        String[] words = prompt.trim().split("\\s+");
        for (String w : words) {
            String clean = w.replaceAll("[^a-zA-Z]", "");
            if (clean.length() > 3) {
                return Character.toUpperCase(clean.charAt(0)) + clean.substring(1).toLowerCase();
            }
        }
        return "Item";
    }
}
