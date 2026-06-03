"""Produces a file-level plan of changes."""
import json
import os
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM = """You are a senior engineer working on a Next.js + Tailwind CSS project.
Only modify what is needed. Use functional components, Tailwind for all styles, no CSS modules.
Return ONLY valid JSON with no extra text."""

SCHEMA = """{
  "tasks": [
    {"file": "relative/path.js", "action": "create | modify | delete", "description": "what to do"}
  ]
}"""


async def plan(
    prompt: str,
    analysis: dict,
    file_contexts: dict[str, str],
) -> dict:
    context_text = ""
    if file_contexts:
        parts = []
        for path, content in file_contexts.items():
            parts.append(f"=== {path} ===\n{content}")
        context_text = "\n\n".join(parts)

    user_msg = f"""User request: {prompt}

Change analysis: {json.dumps(analysis)}

Existing file contents:
{context_text or "(no existing files — this is a new project)"}

Rules:
- Use pages/ directory (Next.js pages router, plain .js/.jsx files — NO TypeScript)
- Use Tailwind for all styling
- Functional components only
- Keep it minimal — only create files needed for the feature
- For a new project always include: pages/index.js, styles/globals.css
- NEVER include pages/_app.js or pages/_document.js unless the user explicitly asks to change global app setup — these are already correct boilerplate files in the template
- All generated code must be plain JavaScript. No TypeScript type annotations in .js files.

Return a JSON plan matching this schema:
{SCHEMA}"""

    response = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user_msg},
        ],
    )
    return json.loads(response.choices[0].message.content)
