"""Detect required API keys in generated code and check/inject them."""
import re
from pathlib import Path

# Map env var name → (service display name, description)
ENV_VAR_MAP: dict[str, tuple[str, str]] = {
    "OPENAI_API_KEY":          ("OpenAI",        "ChatGPT / GPT-4 API calls"),
    "OPENAI_KEY":              ("OpenAI",        "ChatGPT / GPT-4 API calls"),
    "ANTHROPIC_API_KEY":       ("Anthropic",     "Claude API calls"),
    "GOOGLE_MAPS_API_KEY":     ("Google Maps",   "Maps and geocoding"),
    "GOOGLE_API_KEY":          ("Google",        "Google services"),
    "STRIPE_SECRET_KEY":       ("Stripe",        "Server-side payments"),
    "STRIPE_PUBLISHABLE_KEY":  ("Stripe",        "Client-side payment forms"),
    "STRIPE_KEY":              ("Stripe",        "Payment processing"),
    "SENDGRID_API_KEY":        ("SendGrid",      "Email sending"),
    "TWILIO_AUTH_TOKEN":       ("Twilio",        "SMS / phone calls"),
    "TWILIO_ACCOUNT_SID":      ("Twilio",        "SMS / phone calls"),
    "FIREBASE_API_KEY":        ("Firebase",      "Firebase services"),
    "SUPABASE_KEY":            ("Supabase",      "Supabase database"),
    "SUPABASE_ANON_KEY":       ("Supabase",      "Supabase database"),
    "MAPBOX_TOKEN":            ("Mapbox",        "Mapbox maps"),
    "MAPBOX_ACCESS_TOKEN":     ("Mapbox",        "Mapbox maps"),
    "WEATHER_API_KEY":         ("OpenWeatherMap","Weather data"),
    "NEWS_API_KEY":            ("NewsAPI",       "News data"),
    "GITHUB_TOKEN":            ("GitHub",        "GitHub API"),
    "HUGGINGFACE_API_KEY":     ("HuggingFace",   "AI model inference"),
}

# Patterns: process.env.KEY, import.meta.env.VITE_KEY, env.KEY, etc.
_PATTERNS = [
    re.compile(r'process\.env\.([A-Z][A-Z0-9_]+)'),
    re.compile(r'import\.meta\.env\.(?:VITE_)?([A-Z][A-Z0-9_]+)'),
    re.compile(r'process\.env\[[\'"]([ A-Z][A-Z0-9_]+)[\'"]\]'),
]


def scan_project_for_keys(project_dir: Path) -> list[str]:
    """Return list of env var names referenced in the project code."""
    found: set[str] = set()
    for ext in ("*.js", "*.jsx", "*.ts", "*.tsx", "*.mjs"):
        for f in project_dir.rglob(ext):
            if "node_modules" in f.parts or ".next" in f.parts:
                continue
            try:
                text = f.read_text(errors="ignore")
            except OSError:
                continue
            for pat in _PATTERNS:
                for m in pat.finditer(text):
                    key = m.group(1)
                    if key in ENV_VAR_MAP:
                        found.add(key)
    return sorted(found)


async def detect_required_services(prompt: str) -> list[tuple[str, str, str]]:
    """Use GPT-4o to detect which API services a prompt will need.

    Returns list of (env_var, service_display_name, description).
    Only returns vars that are in ENV_VAR_MAP.
    """
    import os
    import json as _json
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

    known = "\n".join(
        f"- {env_var}: {service} ({desc})"
        for env_var, (service, desc) in ENV_VAR_MAP.items()
    )

    resp = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": (
                    "You analyze web app build requests and identify which external API keys will be needed.\n"
                    "Only return env var names from this exact list:\n"
                    f"{known}\n\n"
                    'Return JSON: {"required": ["ENV_VAR1", "ENV_VAR2"]} or {"required": []} if none needed.\n'
                    "Be conservative: only include APIs that are clearly implied by the request."
                ),
            },
            {"role": "user", "content": f"Build request: {prompt}"},
        ],
    )

    result = _json.loads(resp.choices[0].message.content)
    return [
        (env_var, ENV_VAR_MAP[env_var][0], ENV_VAR_MAP[env_var][1])
        for env_var in result.get("required", [])
        if env_var in ENV_VAR_MAP
    ]


def write_env_local(project_dir: Path, key_values: dict[str, str]) -> None:
    """Write / append to .env.local so Next.js picks up the keys on restart."""
    env_file = project_dir / ".env.local"
    existing: dict[str, str] = {}
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                existing[k.strip()] = v.strip()
    existing.update(key_values)
    env_file.write_text(
        "\n".join(f"{k}={v}" for k, v in sorted(existing.items())) + "\n"
    )
