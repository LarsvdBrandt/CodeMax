"""Per-project database management using the shared PostgreSQL instance.

Each project gets its own database ('proj_<uuid>') inside the existing
'postgres' service that is already running on codemax_network.
Connection parameters are derived from the worker's DATABASE_URL env var
so they always match the running instance.
"""
import os
import asyncpg
from urllib.parse import urlparse


def _admin_params() -> dict:
    """Parse connection params from the worker's DATABASE_URL env var."""
    raw = os.environ.get("DATABASE_URL", "postgresql://codemax:codemax@postgres:5432/codemax")
    # Strip SQLAlchemy dialect prefix if present
    for prefix in ("postgresql+asyncpg://", "postgresql+psycopg2://"):
        if raw.startswith(prefix):
            raw = "postgresql://" + raw[len(prefix):]
    p = urlparse(raw)
    return {
        "host": p.hostname or "postgres",
        "port": p.port or 5432,
        "user": p.username or "codemax",
        "password": p.password or "codemax",
        "database": (p.path or "/codemax").lstrip("/") or "codemax",
    }


def _db_name(project_id: str) -> str:
    return "proj_" + project_id.replace("-", "_")


def db_url(project_id: str) -> str:
    """DATABASE_URL for the project's database (pg npm package compatible)."""
    a = _admin_params()
    return f"postgresql://{a['user']}:{a['password']}@{a['host']}:{a['port']}/{_db_name(project_id)}"


async def provision_db(project_id: str) -> str:
    """Create the project's database inside the shared postgres. Idempotent."""
    a = _admin_params()
    db_name = _db_name(project_id)
    conn = await asyncpg.connect(**a)
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", db_name)
        if not exists:
            await conn.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        await conn.close()
    return db_url(project_id)


async def apply_schema(project_id: str, sql: str) -> tuple[bool, str]:
    """Execute SQL against the project's database."""
    a = _admin_params()
    db_name = _db_name(project_id)
    try:
        conn = await asyncpg.connect(host=a["host"], port=a["port"],
                                     user=a["user"], password=a["password"],
                                     database=db_name)
        try:
            for stmt in sql.split(";"):
                s = stmt.strip()
                if s:
                    await conn.execute(s)
            return True, "OK"
        finally:
            await conn.close()
    except Exception as exc:
        return False, str(exc)


async def get_schema_info(project_id: str) -> str:
    """Return current public schema as a readable string, or 'No tables yet.'"""
    a = _admin_params()
    db_name = _db_name(project_id)
    try:
        conn = await asyncpg.connect(host=a["host"], port=a["port"],
                                     user=a["user"], password=a["password"],
                                     database=db_name)
        try:
            rows = await conn.fetch("""
                SELECT t.table_name,
                       string_agg(c.column_name || ' ' || c.data_type
                         || CASE WHEN c.is_nullable='NO' THEN ' NOT NULL' ELSE '' END,
                         ', ' ORDER BY c.ordinal_position) AS columns
                FROM information_schema.tables t
                JOIN information_schema.columns c
                    ON t.table_name = c.table_name AND t.table_schema = c.table_schema
                WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
                GROUP BY t.table_name ORDER BY t.table_name
            """)
            return "\n".join(f"{r['table_name']}: {r['columns']}" for r in rows) if rows else "No tables yet."
        finally:
            await conn.close()
    except Exception:
        return "No tables yet."


async def remove_db(project_id: str) -> None:
    """Drop the project database on project delete."""
    a = _admin_params()
    db_name = _db_name(project_id)
    try:
        conn = await asyncpg.connect(**a)
        try:
            await conn.execute("""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()
            """, db_name)
            await conn.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
        finally:
            await conn.close()
    except Exception:
        pass


def build_db_context(project_id: str, schema: str) -> str:
    url = db_url(project_id)
    return f"""DATABASE (PostgreSQL) is ready for this project.
process.env.DATABASE_URL = "{url}"  (written to .env.local)
The 'pg' npm package is in package.json.

MANDATORY RULES — you MUST follow these:
- Use the database for ALL data that needs to persist. NEVER use localStorage.
- Write /pages/api/*.js server-side handlers. React components call fetch('/api/route').
- Every handler must run CREATE TABLE IF NOT EXISTS before any INSERT/SELECT.
- Use ESM syntax throughout: `import {{ Pool }} from 'pg'` and `export default async function handler`.
  NEVER mix require() with export default — that breaks Next.js.

Current schema:
{schema}

Exact template to copy for every API route (pure ESM, no TypeScript):

import {{ Pool }} from 'pg';
const pool = new Pool({{ connectionString: process.env.DATABASE_URL }});

const INIT = `
  CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    done BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

export default async function handler(req, res) {{
  await pool.query(INIT);
  if (req.method === 'GET') {{
    const {{ rows }} = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    return res.status(200).json(rows);
  }}
  if (req.method === 'POST') {{
    const {{ title }} = req.body;
    const {{ rows }} = await pool.query(
      'INSERT INTO todos (title) VALUES ($1) RETURNING *', [title]
    );
    return res.status(201).json(rows[0]);
  }}
  res.status(405).end();
}}"""
