"""Schema agent — inspects generated app code and plans safe PostgreSQL migrations."""
import json
import os
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])


async def plan_db_schema(
    prompt: str,
    file_contents: dict[str, str],
    existing_schema: str,
) -> dict:
    """
    Analyze the app source files and determine what database schema changes are needed.

    Returns:
      {
        "needs_db": bool,
        "schema_sql": "SQL to run (CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS)",
        "description": "human-readable summary"
      }
    """
    # Cap total context sent to GPT
    files_text = "\n\n".join(
        f"=== {path} ===\n{content[:1500]}"
        for path, content in list(file_contents.items())[:20]
        if not path.startswith("_meta/")
    )

    resp = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a PostgreSQL schema expert. Analyze a Next.js app's prompt and source code "
                    "to determine what database schema it needs.\n\n"
                    "RULES:\n"
                    "- Set needs_db=true if the app prompt describes any data that needs to persist "
                    "(todo items, users, posts, products, messages, etc.) OR if the code contains "
                    "pool.query / INSERT / SELECT / UPDATE / DELETE calls.\n"
                    "- For a todo app: create a 'todos' table with id, title/text, done/completed, created_at.\n"
                    "- Use CREATE TABLE IF NOT EXISTS for every table.\n"
                    "- Use ALTER TABLE ... ADD COLUMN IF NOT EXISTS for new columns on existing tables.\n"
                    "- Always include: id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW().\n"
                    "- NEVER DROP tables or columns — only additive/safe changes.\n"
                    "- schema_sql must be valid PostgreSQL runnable multiple times without error.\n\n"
                    'Return JSON: {"needs_db": bool, "schema_sql": "...", "description": "..."}'
                ),
            },
            {
                "role": "user",
                "content": (
                    f"App prompt: {prompt}\n\n"
                    f"Existing schema:\n{existing_schema}\n\n"
                    f"Source files:\n{files_text}"
                ),
            },
        ],
    )

    return json.loads(resp.choices[0].message.content)
