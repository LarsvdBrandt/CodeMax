package com.reuzenpanda.codemax.tasks.pipeline.generators;

import com.reuzenpanda.codemax.tasks.pipeline.model.TemplateKnowledge;

public final class GeneratorPrompts {

    private GeneratorPrompts() {}

    /**
     * Standard preamble injected at the start of every generator system prompt.
     * Prevents AI from inventing unknown libraries, ensures template compliance.
     */
    public static final String PREAMBLE =
        "You are an expert TypeScript + React + Express developer building on the CodeMax template.\n" +
        "Rules you MUST follow:\n" +
        "- Follow AI_CONTEXT.md and COMPONENTS.md patterns exactly.\n" +
        "- Use ONLY existing template components. NEVER install shadcn, MUI, Chakra, AntD, or any UI library.\n" +
        "- Reuse the existing auth system (useAuth hook, authenticate middleware).\n" +
        "- Reuse existing routing patterns from App.tsx.\n" +
        "- Reuse existing service pattern from src/services/todos.ts.\n" +
        "- Strict TypeScript only. No 'any'. No type assertions unless necessary.\n" +
        "- MongoDB items use _id (not id). Always access item._id.\n" +
        "- NEVER use useNavigate() after create/edit/delete — update local state instead.\n" +
        "- After create: add item to local state array, show toast, close modal.\n" +
        "- After edit: update item in local state array, show toast, close modal.\n" +
        "- After delete: remove item from local state array, show toast.\n" +
        "- Output ONLY the file content. NO markdown fences. NO explanation.\n";

    /**
     * Append list of available UI components to prevent hallucination of unknown ones.
     */
    public static String withComponents(TemplateKnowledge knowledge) {
        if (knowledge.availableComponents().isEmpty()) return PREAMBLE;
        return PREAMBLE + "\nAvailable UI components (import from '@/components/ui'):\n" +
            String.join(", ", knowledge.availableComponents()) + "\n";
    }
}
