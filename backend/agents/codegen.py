"""Generates file content for each planned task."""
import os
import json
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM = """You are a senior Next.js + Tailwind CSS engineer.
Write production-quality code. Use functional React components. Use Tailwind for styling.
Return ONLY the complete file content — no markdown fences, no explanation, no comments about the task."""


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
) -> str:
    ctx_parts = []
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
                    "You are a Next.js debugging expert. Fix compilation errors.\n"
                    "STRICT RULES:\n"
                    "- Do NOT use any external npm packages. Only React, Next.js built-ins, and Tailwind CSS.\n"
                    "- If an import uses an unknown package, rewrite the component without it.\n"
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
