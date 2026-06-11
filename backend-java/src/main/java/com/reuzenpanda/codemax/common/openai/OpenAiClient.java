package com.reuzenpanda.codemax.common.openai;

import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class OpenAiClient {

    private static final String MODEL = "gpt-4o";
    private static final String BASE_URL = "https://api.openai.com/v1";

    private final WebClient webClient;
    private final String apiKey;

    public OpenAiClient(CodeMaxProperties properties) {
        this.apiKey = properties.getOpenaiApiKey();
        this.webClient = WebClient.builder()
            .baseUrl(BASE_URL)
            .defaultHeader("Content-Type", "application/json")
            .build();
    }

    /** Plain text response. */
    public String chat(String systemPrompt, String userMessage) {
        return call(systemPrompt, userMessage, false);
    }

    /** JSON-mode response — system prompt must instruct GPT to return JSON. */
    public String chatJson(String systemPrompt, String userMessage) {
        return call(systemPrompt, userMessage, true);
    }

    @SuppressWarnings("unchecked")
    private String call(String systemPrompt, String userMessage, boolean jsonMode) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("OPENAI_API_KEY is not configured");
        }
        if (systemPrompt == null || userMessage == null) {
            throw new IllegalArgumentException("systemPrompt and userMessage must not be null");
        }

        var messages = List.of(
            Map.of("role", "system", "content", systemPrompt),
            Map.of("role", "user", "content", userMessage)
        );
        var body = new java.util.HashMap<String, Object>();
        body.put("model", MODEL);
        body.put("messages", messages);
        if (jsonMode) body.put("response_format", Map.of("type", "json_object"));

        Map<?, ?> response = webClient.post()
            .uri("/chat/completions")
            .header("Authorization", "Bearer " + apiKey)
            .bodyValue(body)
            .retrieve()
            .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                resp -> resp.bodyToMono(String.class).map(
                    err -> new RuntimeException("OpenAI error " + resp.statusCode() + ": " + err)))
            .bodyToMono(Map.class)
            .block();

        List<Map<?, ?>> choices = (List<Map<?, ?>>) response.get("choices");
        Map<?, ?> message = (Map<?, ?>) choices.get(0).get("message");
        return (String) message.get("content");
    }
}
