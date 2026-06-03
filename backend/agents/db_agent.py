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


async def generate_api_routes(
    prompt: str,
    schema_sql: str,
    existing_page_files: dict[str, str],
) -> dict[str, str]:
    """Generate pages/api/*.js files and update the main page to use fetch().

    Returns {file_path: content} for every file that needs to be written.
    This runs AFTER schema is applied, ensuring the generated app actually
    connects to the database regardless of what the planner chose.
    """
    files_text = "\n\n".join(
        f"=== {path} ===\n{content}"
        for path, content in list(existing_page_files.items())[:10]
    )

    resp = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You wire a Next.js app to its PostgreSQL database.\n"
                    "Given the DB schema and the current frontend files, produce:\n"
                    "1. pages/api/*.js handler files (one per resource/table) using `import { Pool } from 'pg'` and `export default async function handler(req, res)`.\n"
                    "2. An updated version of the main page (pages/index.js) that fetches data from the API routes using useEffect + fetch(), replacing any localStorage or in-memory state.\n\n"
                    "STRICT RULES:\n"
                    "- Plain JavaScript only (.js files) — no TypeScript annotations.\n"
                    "- CRITICAL: Use ESM syntax consistently. Use `import { Pool } from 'pg'` and "
                    "`export default async function handler(req, res)`. "
                    "NEVER use require() with export default in the same file — that breaks Next.js.\n"
                    "- Every API handler must run CREATE TABLE IF NOT EXISTS before any query.\n"
                    "- React component uses useState + useEffect + fetch('/api/route').\n"
                    "- Keep all existing UI/styling — only replace the data layer.\n"
                    'Return JSON: {"files": {"pages/api/todos.js": "...", "pages/index.js": "..."}}'
                ),
            },
            {
                "role": "user",
                "content": (
                    f"App prompt: {prompt}\n\n"
                    f"Database schema:\n{schema_sql}\n\n"
                    f"Current frontend files:\n{files_text}"
                ),
            },
        ],
    )
    result = json.loads(resp.choices[0].message.content)
    return result.get("files", {})
