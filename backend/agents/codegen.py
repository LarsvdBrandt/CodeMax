"""Generates file content for each planned task."""
import os
import re
import json
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM = """You are a senior Next.js + Tailwind CSS engineer.
Write production-quality code. Use functional React components. Use Tailwind for styling.
STRICT RULES:
- FILE EXTENSION MATTERS: For .js and .jsx files write PLAIN JAVASCRIPT — no TypeScript type annotations, no interface/type imports, no generics, no ': SomeType' anywhere. For .ts and .tsx files TypeScript is fine.
- DATABASE: If a DATABASE CONTEXT is provided, you MUST use pg Pool for all persistent data. Write /pages/api/*.js routes using ONLY ESM syntax: `import { Pool } from 'pg'` + `export default async function handler(req, res)`. NEVER use `module.exports` or `require()` — Next.js 14 API routes require `export default`. Always run CREATE TABLE IF NOT EXISTS first.
- Only use built-in Tailwind CSS utility classes. NEVER invent custom class names.
- When you import a new npm package, also update package.json to include it.
Return ONLY the complete file content — no markdown fences, no explanation, no comments."""


def _strip_fences(content: str) -> str:
    """Remove markdown code fences that GPT-4o sometimes wraps output in."""
    lines = content.strip().splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


async def generate_file(
    task_description: str,
    file_path: str,
    current_content: str | None,
    architecture_summary: str | None,
    db_context: str | None = None,
) -> str:
    ctx_parts = []
    if db_context:
        ctx_parts.append(f"DATABASE CONTEXT (use this for any persistent data):\n{db_context}")
    if architecture_summary:
        ctx_parts.append(f"Architecture context:\n{architecture_summary}")
    if current_content:
        ctx_parts.append(f"Current content of {file_path}:\n{current_content}")

    user_msg = f"""Task: {task_description}
File: {file_path}

{chr(10).join(ctx_parts)}

Write the complete new content for {file_path}. Return ONLY the file content."""

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user_msg},
        ],
    )
    return _strip_fences(response.choices[0].message.content)


async def fix_errors(error_log: str, file_contents: dict[str, str]) -> dict[str, str]:
    """Given Next.js compilation errors and current files, return fixed file contents."""
    files_text = "\n\n".join(
        f"=== {path} ===\n{content}" for path, content in file_contents.items()
    )
    response = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a Next.js debugging expert. Fix ALL errors — compilation, runtime, CSS, and server-render errors.\n"
                    "STRICT RULES:\n"
                    "- TYPESCRIPT IN .JS FILE ('Expected \\',\\', got \\':'\\'', 'Expected expression', 'Unexpected token'): The file is .js/.jsx but contains TypeScript syntax. Rewrite the ENTIRE file in plain JavaScript — remove all type annotations (': SomeType', 'as SomeType'), remove all interface/type declarations, remove all TypeScript-only imports (e.g. 'import { AppProps } from \\'next/app\\''), remove all generic type parameters. Keep all logic identical.\n"
                    "- TAILWIND 'class does not exist' errors: Replace every custom/invented Tailwind class with the correct standard Tailwind equivalent.\n"
                    "- 'does not export a default function' (API route error): Next.js 14 requires `export default`, not `module.exports`. Rewrite the ENTIRE file using ESM: `import { Pool } from 'pg'` and `export default async function handler(req, res)`. Replace ALL `require()` with `import` and ALL `module.exports` with `export default`.\n"
                    "- MISSING MODULE errors: Rewrite to avoid the package. For Google Maps use next/script + window.google.maps.\n"
                    "- NEVER nest <a> inside <Link>. In Next.js 13+, <Link href='...'> is already an anchor.\n"
                    "- Fix hydration errors by making server and client render identical HTML.\n"
                    "- Fix 'Element type is invalid' by ensuring imports exist and components are exported correctly.\n"
                    "- Only use built-in Tailwind CSS utility classes.\n"
                    "- Return JSON: {\"files\": {\"relative/path.js\": \"complete fixed file content\"}}\n"
                    "- Only include files that need changes. Return raw code, no markdown fences."
                ),
            },
            {
                "role": "user",
                "content": f"Compilation errors:\n{error_log[-3000:]}\n\nCurrent files:\n{files_text}\n\nFix all errors.",
            },
        ],
    )
    result = json.loads(response.choices[0].message.content)
    return {
        path: _strip_fences(content)
        for path, content in result.get("files", {}).items()
    }


# Detect TypeScript-specific syntax in .js/.jsx files
_TS_PATTERNS = [
    re.compile(r'\}\s*:\s*[A-Z][a-zA-Z<]+'),        # }: TypeName or }: React.FC
    re.compile(r'\binterface\s+\w+'),                # interface Foo {
    re.compile(r'\btype\s+\w+\s*='),                 # type Foo =
    re.compile(r'import\s+type\s+'),                 # import type {
    re.compile(r'import\s*\{[^}]+\}\s*from\s*[\'"]next/app[\'"]'),  # import { AppProps }
    re.compile(r':\s*(string|number|boolean|void|never|any|unknown)\b'),  # : string
    re.compile(r'<[A-Z][a-zA-Z]+>(?!\s*[\w<])'),     # generic <T> (not JSX)
]


def is_api_route(file_path: str) -> bool:
    return file_path.startswith("pages/api/") and file_path.endswith((".js", ".jsx"))


def fix_cjs_exports(content: str) -> str:
    """Convert CommonJS require/module.exports to ESM in API route files.

    Next.js 14 requires `export default` — `module.exports` always fails.
    This is deterministic and runs before writing the file to disk.
    """
    # require('pkg') or require("pkg")  →  import ... from 'pkg'
    content = re.sub(
        r"const\s*\{\s*([^}]+)\}\s*=\s*require\(['\"]([^'\"]+)['\"]\);",
        lambda m: f"import {{ {m.group(1).strip()} }} from '{m.group(2)}';",
        content,
    )
    content = re.sub(
        r"const\s+(\w+)\s*=\s*require\(['\"]([^'\"]+)['\"]\);",
        lambda m: f"import {m.group(1)} from '{m.group(2)}';",
        content,
    )
    # module.exports = async (...) => {  or  module.exports = async function handler(...) {
    content = re.sub(
        r"module\.exports\s*=\s*async\s*(?:function\s*(?:\w+)?\s*)?\(\s*req\s*,\s*res\s*\)\s*(?:=>)?\s*\{",
        "export default async function handler(req, res) {",
        content,
    )
    return content


def has_cjs_exports(content: str) -> bool:
    return "module.exports" in content or "require(" in content


def has_typescript(content: str) -> bool:
    return any(p.search(content) for p in _TS_PATTERNS)


async def strip_typescript(content: str, file_path: str) -> str:
    """Rewrite a .js/.jsx file to remove all TypeScript syntax, preserving logic."""
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "Convert the following file to plain JavaScript by removing ALL TypeScript syntax. "
                    "Rules: remove type annotations (': SomeType'), remove interface/type declarations, "
                    "remove generic type parameters, remove TypeScript-only imports "
                    "(e.g. 'import { AppProps } from \\'next/app\\''), remove 'as TypeCast' expressions. "
                    "Keep all JSX, all logic, all imports that are actually used. "
                    "Return ONLY the converted file content, no explanation, no markdown fences."
                ),
            },
            {"role": "user", "content": f"File: {file_path}\n\n{content}"},
        ],
    )
    return _strip_fences(response.choices[0].message.content)


async def generate_architecture_summary(
    project_name: str,
    description: str,
    files: list[str],
    change_summary: str,
) -> str:
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "Write a concise architecture summary for a Next.js project. Plain markdown, under 300 words.",
            },
            {
                "role": "user",
                "content": f"""Project: {project_name}
Description: {description}
Files: {", ".join(files)}
Latest change: {change_summary}

Write the architecture summary.""",
            },
        ],
    )
    return response.choices[0].message.content.strip()
