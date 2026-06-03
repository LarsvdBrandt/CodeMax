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
    db_context: str | None = None,
) -> dict:
    context_text = ""
    if file_contexts:
        parts = []
        for path, content in file_contexts.items():
            parts.append(f"=== {path} ===\n{content}")
        context_text = "\n\n".join(parts)

    db_section = ""
    if db_context:
        db_section = f"""
DATABASE is available (PostgreSQL via pg package, DATABASE_URL in .env.local).
Rules for database usage:
- If the app needs to persist data (todos, items, users, posts, etc.) you MUST include pages/api/*.js route files in the plan.
- Each pages/api/*.js file handles server-side database operations (CREATE TABLE IF NOT EXISTS, SELECT, INSERT, UPDATE, DELETE).
- The React pages/components use fetch('/api/route') to talk to these API routes.
- Never use localStorage or in-memory state for data that should persist — use the database.
- For a todo app: plan pages/api/todos.js (GET list + POST create) and pages/api/todos/[id].js (PUT update + DELETE).
"""

    user_msg = f"""User request: {prompt}

Change analysis: {json.dumps(analysis)}
{db_section}
Existing file contents:
{context_text or "(no existing files — this is a new project)"}

Rules:
- Use pages/ directory (Next.js pages router, plain .js/.jsx files — NO TypeScript)
- Use Tailwind for all styling
- Functional components only
- Keep it minimal — only create files needed for the feature
- For a new project always include: pages/index.js, styles/globals.css
- NEVER include pages/_app.js or pages/_document.js unless the user explicitly asks to change global app setup
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
