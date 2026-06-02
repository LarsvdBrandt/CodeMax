"""Classifies whether this is a new project or an update, and which files are affected."""
import json
import os
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM = """You are a senior software architect. Given a user prompt and a list of existing files,
classify the change and identify which files are likely affected.
Return ONLY valid JSON with no extra text."""

SCHEMA = """{
  "change_type": "new_project | ui_change | logic_change | full_refactor",
  "affected_files": ["list of existing file paths likely to change, or [] for new project"],
  "summary": "one sentence description of the change"
}"""


async def analyze(prompt: str, existing_files: list[str]) -> dict:
    user_msg = f"""User prompt: {prompt}

Existing files: {json.dumps(existing_files)}

Return JSON matching this schema:
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
