"""Generates file content for each planned task."""
import os
import json
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM = """You are a senior Next.js + Tailwind CSS engineer.
Write production-quality code. Use functional React components. Use Tailwind for styling.
STRICT RULES:
- Only use built-in Tailwind CSS utility classes. NEVER invent custom class names (e.g. never write 'text-custom-black', 'bg-brand-primary', 'text-custom-*', etc.). Use standard Tailwind equivalents like 'text-black', 'bg-black'.
- When you import an npm package that is not part of the base Next.js install, you MUST also write/update package.json to include it as a dependency. Both files go into the same plan.
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
                    "You are a Next.js debugging expert. Fix ALL errors — compilation, runtime, CSS, and server-render errors.\n"
                    "STRICT RULES:\n"
                    "- TAILWIND 'class does not exist' errors: The class name is invalid. Replace every custom/invented Tailwind class with the correct standard Tailwind equivalent. Examples: 'text-custom-black' → 'text-black', 'bg-brand-primary' → 'bg-blue-600', 'hover:text-custom-black' → 'hover:text-black'. Scan ALL files for invented class names.\n"
                    "- MISSING MODULE ('Module not found', 'Can't resolve') errors: The package failed to install. Rewrite the code to achieve the same result WITHOUT that npm package. Use native browser APIs, Next.js built-ins, or a <Script> tag to load a CDN version. For Google Maps use next/script to load maps.googleapis.com and access window.google.maps directly.\n"
                    "- NEVER nest <a> inside <Link>. In Next.js 13+, <Link href='...'> is already an anchor.\n"
                    "- Fix hydration errors by making sure server and client render identical HTML.\n"
                    "- Fix 'Element type is invalid' by ensuring every import actually exists and all components are properly exported.\n"
                    "- Only use built-in Tailwind CSS utility classes — never invent class names.\n"
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
