"""Manages per-project PostgreSQL containers and schema."""
import base64
import os
import time
import docker
from pathlib import Path

DOCKER_NETWORK = os.environ.get("DOCKER_NETWORK", "codemax_network")
DB_USER = "appuser"
DB_PASS = "apppass"
DB_NAME = "app"


def _docker():
    return docker.from_env()


def db_url(project_id: str) -> str:
    return f"postgresql://{DB_USER}:{DB_PASS}@codemax_db_{project_id}:5432/{DB_NAME}"


def provision_db(project_id: str) -> str:
    """Start (or reuse) the Postgres container for this project. Returns DATABASE_URL."""
    dc = _docker()
    name = f"codemax_db_{project_id}"

    try:
        container = dc.containers.get(name)
        if container.status != "running":
            container.start()
    except docker.errors.NotFound:
        # Named volume keeps data alive across container restarts / rebuilds
        volume_name = f"codemax_db_{project_id}_data"
        dc.containers.run(
            image="postgres:15-alpine",
            name=name,
            detach=True,
            network=DOCKER_NETWORK,
            environment={
                "POSTGRES_USER": DB_USER,
                "POSTGRES_PASSWORD": DB_PASS,
                "POSTGRES_DB": DB_NAME,
            },
            volumes={volume_name: {"bind": "/var/lib/postgresql/data", "mode": "rw"}},
            remove=False,
        )

    wait_for_db(project_id)
    return db_url(project_id)


def wait_for_db(project_id: str, timeout: int = 60) -> bool:
    dc = _docker()
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            c = dc.containers.get(f"codemax_db_{project_id}")
            result = c.exec_run(["pg_isready", "-U", DB_USER, "-d", DB_NAME])
            if result.exit_code == 0:
                return True
        except Exception:
            pass
        time.sleep(1)
    return False


def apply_schema(project_id: str, sql: str) -> tuple[bool, str]:
    """Execute SQL against the project database. Returns (success, output)."""
    dc = _docker()
    try:
        c = dc.containers.get(f"codemax_db_{project_id}")
        # Base64-encode to avoid any shell-escaping issues
        encoded = base64.b64encode(sql.encode()).decode()
        result = c.exec_run(
            ["sh", "-c", f"echo {encoded} | base64 -d | psql -U {DB_USER} -d {DB_NAME}"]
        )
        output = (result.output or b"").decode(errors="replace").strip()
        return result.exit_code == 0, output
    except Exception as e:
        return False, str(e)


def get_schema_info(project_id: str) -> str:
    """Return the current public schema as a readable string."""
    dc = _docker()
    sql = (
        "SELECT t.table_name, "
        "string_agg(c.column_name || ' ' || c.data_type "
        "|| CASE WHEN c.is_nullable='NO' THEN ' NOT NULL' ELSE '' END "
        "|| CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT '||c.column_default ELSE '' END, "
        "', ' ORDER BY c.ordinal_position) "
        "FROM information_schema.tables t "
        "JOIN information_schema.columns c "
        "  ON t.table_name=c.table_name AND t.table_schema=c.table_schema "
        "WHERE t.table_schema='public' AND t.table_type='BASE TABLE' "
        "GROUP BY t.table_name;"
    )
    try:
        c = dc.containers.get(f"codemax_db_{project_id}")
        encoded = base64.b64encode(sql.encode()).decode()
        result = c.exec_run(
            ["sh", "-c", f"echo {encoded} | base64 -d | psql -U {DB_USER} -d {DB_NAME} -t"]
        )
        out = (result.output or b"").decode(errors="replace").strip()
        return out if out else "No tables yet."
    except Exception:
        return "No tables yet."


def remove_db(project_id: str) -> None:
    """Force-remove the database container and its data volume for a project."""
    dc = _docker()
    try:
        dc.containers.get(f"codemax_db_{project_id}").remove(force=True)
    except docker.errors.NotFound:
        pass
    try:
        dc.volumes.get(f"codemax_db_{project_id}_data").remove(force=True)
    except Exception:
        pass


def build_db_context(project_id: str) -> str:
    """Return the db context string injected into every codegen prompt."""
    schema = get_schema_info(project_id)
    url = db_url(project_id)
    return f"""DATABASE (PostgreSQL) is provisioned for this project.
process.env.DATABASE_URL = "{url}"  (already in .env.local)
The 'pg' package is already in package.json.

Connection pattern for every API route that touches the DB:
  const {{ Pool }} = require('pg');
  const pool = new Pool({{ connectionString: process.env.DATABASE_URL }});

REQUIRED: For any feature that stores/reads data:
  1. Write a /pages/api/*.js route (NOT a component — a server-side API handler).
  2. At the top of each handler that writes data, run CREATE TABLE IF NOT EXISTS so the
     table is always guaranteed to exist before you insert.
  3. Call pool.query() for all CRUD operations.
  4. Return JSON from the handler. In the React component, fetch('/api/your-route').

Current schema:
{schema}

Example todo API route (pages/api/todos.js):
  const {{ Pool }} = require('pg');
  const pool = new Pool({{ connectionString: process.env.DATABASE_URL }});
  export default async function handler(req, res) {{
    await pool.query(`CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    if (req.method === 'GET') {{
      const {{ rows }} = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
      res.json(rows);
    }} else if (req.method === 'POST') {{
      const {{ title }} = req.body;
      const {{ rows }} = await pool.query('INSERT INTO todos (title) VALUES ($1) RETURNING *', [title]);
      res.json(rows[0]);
    }}
  }}"""
