package com.reuzenpanda.codemax.common.ai;

import java.util.Map;

public final class ModelRegistry {

    private static final Map<String, AiProvider> REGISTRY = Map.ofEntries(
        Map.entry("gpt-5",              AiProvider.OPENAI),
        Map.entry("gpt-5-mini",         AiProvider.OPENAI),
        Map.entry("gpt-5-nano",         AiProvider.OPENAI),
        Map.entry("gpt-4o",             AiProvider.OPENAI),
        Map.entry("gpt-4.1",            AiProvider.OPENAI),
        Map.entry("claude-sonnet-4-5",  AiProvider.ANTHROPIC),
        Map.entry("claude-opus-4-5",    AiProvider.ANTHROPIC),
        Map.entry("gemini-2.5-pro",     AiProvider.GEMINI),
        Map.entry("gemini-2.5-flash",   AiProvider.GEMINI),
        Map.entry("deepseek-chat",      AiProvider.DEEPSEEK),
        Map.entry("deepseek-reasoner",  AiProvider.DEEPSEEK)
    );

    private ModelRegistry() {}

    public static AiProvider forModel(String model) {
        if (model == null) return AiProvider.OPENAI;
        AiProvider provider = REGISTRY.get(model.strip());
        if (provider == null) {
            throw new IllegalArgumentException("Unknown model: '" + model.strip() + "'. Add it to ModelRegistry.");
        }
        return provider;
    }
}
