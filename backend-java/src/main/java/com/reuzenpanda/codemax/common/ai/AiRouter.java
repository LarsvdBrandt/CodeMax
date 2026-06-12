package com.reuzenpanda.codemax.common.ai;

import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AiRouter {

    private final CodeMaxProperties props;

    private final WebClient openAiClient;
    private final WebClient deepSeekClient;
    private final WebClient anthropicClient;
    private final WebClient geminiClient;

    public AiRouter(CodeMaxProperties props) {
        this.props = props;
        this.openAiClient   = WebClient.builder().baseUrl("https://api.openai.com").build();
        this.deepSeekClient = WebClient.builder().baseUrl("https://api.deepseek.com").build();
        this.anthropicClient = WebClient.builder().baseUrl("https://api.anthropic.com").build();
        this.geminiClient   = WebClient.builder().baseUrl("https://generativelanguage.googleapis.com").build();
    }

    public String chat(String model, String systemPrompt, String userMessage) {
        return call(model, systemPrompt, userMessage, false);
    }

    public String chatJson(String model, String systemPrompt, String userMessage) {
        return call(model, systemPrompt, userMessage, true);
    }

    private String call(String model, String systemPrompt, String userMessage, boolean jsonMode) {
        log.debug("AI call: model={} jsonMode={}", model, jsonMode);
        AiProvider provider = ModelRegistry.forModel(model);
        return switch (provider) {
            case OPENAI    -> callOpenAiFormat(openAiClient,   model, systemPrompt, userMessage, jsonMode, props.getOpenaiApiKey());
            case DEEPSEEK  -> callOpenAiFormat(deepSeekClient, model, systemPrompt, userMessage, jsonMode, props.getDeepseekApiKey());
            case ANTHROPIC -> callAnthropic(model, systemPrompt, userMessage, jsonMode);
            case GEMINI    -> callGemini(model, systemPrompt, userMessage, jsonMode);
        };
    }

    // ── OpenAI wire format (used by OpenAI + DeepSeek) ───────────────────────

    @SuppressWarnings("unchecked")
    private String callOpenAiFormat(WebClient client, String model, String system,
                                     String user, boolean json, String apiKey) {
        requireKey(apiKey, model);
        var body = new HashMap<String, Object>();
        body.put("model", model);
        body.put("messages", List.of(
            Map.of("role", "system", "content", system),
            Map.of("role", "user",   "content", user)
        ));
        if (json) body.put("response_format", Map.of("type", "json_object"));

        Map<?, ?> response = client.post()
            .uri("/v1/chat/completions")
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .bodyValue(body)
            .retrieve()
            .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(),
                resp -> resp.bodyToMono(String.class)
                    .map(err -> new RuntimeException("OpenAI/DeepSeek error " + resp.statusCode() + ": " + err)))
            .bodyToMono(Map.class)
            .block();

        List<Map<?, ?>> choices = (List<Map<?, ?>>) response.get("choices");
        return (String) ((Map<?, ?>) choices.get(0).get("message")).get("content");
    }

    // ── Anthropic Messages API ────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String callAnthropic(String model, String system, String user, boolean json) {
        requireKey(props.getAnthropicApiKey(), model);
        // Anthropic has no json_mode flag — instruct via system prompt
        String effectiveSystem = json
            ? system + "\n\nIMPORTANT: Respond with valid JSON only. No markdown fences, no explanation."
            : system;

        var body = new HashMap<String, Object>();
        body.put("model", model);
        body.put("max_tokens", 8192);
        body.put("system", effectiveSystem);
        body.put("messages", List.of(Map.of("role", "user", "content", user)));

        Map<?, ?> response = anthropicClient.post()
            .uri("/v1/messages")
            .header("x-api-key", props.getAnthropicApiKey())
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .bodyValue(body)
            .retrieve()
            .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(),
                resp -> resp.bodyToMono(String.class)
                    .map(err -> new RuntimeException("Anthropic error " + resp.statusCode() + ": " + err)))
            .bodyToMono(Map.class)
            .block();

        List<Map<?, ?>> content = (List<Map<?, ?>>) response.get("content");
        return (String) content.get(0).get("text");
    }

    // ── Gemini generateContent API ────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String callGemini(String model, String system, String user, boolean json) {
        requireKey(props.getGeminiApiKey(), model);
        var body = new HashMap<String, Object>();
        body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", system))));
        body.put("contents", List.of(
            Map.of("role", "user", "parts", List.of(Map.of("text", user)))
        ));
        if (json) {
            body.put("generationConfig", Map.of("responseMimeType", "application/json"));
        }

        Map<?, ?> response = geminiClient.post()
            .uri("/v1beta/models/" + model + ":generateContent?key=" + props.getGeminiApiKey())
            .header("Content-Type", "application/json")
            .bodyValue(body)
            .retrieve()
            .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(),
                resp -> resp.bodyToMono(String.class)
                    .map(err -> new RuntimeException("Gemini error " + resp.statusCode() + ": " + err)))
            .bodyToMono(Map.class)
            .block();

        List<Map<?, ?>> candidates = (List<Map<?, ?>>) response.get("candidates");
        Map<?, ?> content = (Map<?, ?>) candidates.get(0).get("content");
        List<Map<?, ?>> parts = (List<Map<?, ?>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void requireKey(String key, String model) {
        if (key == null || key.isBlank()) {
            throw new IllegalStateException("API key not configured for model: " + model +
                ". Set the relevant *_API_KEY environment variable.");
        }
    }
}
