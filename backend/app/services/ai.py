from __future__ import annotations

from typing import Any

import httpx
from pydantic import BaseModel

from app.contract import SchemaPayload

OPENAI_BASE_URL = "https://api.openai.com/v1"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class ExplainRequest(BaseModel):
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    apiKey: str


class ProviderError(Exception):
    pass


def detect_base_url(api_key: str) -> str:
    if api_key.strip().startswith("sk-or-"):
        return OPENROUTER_BASE_URL
    return OPENAI_BASE_URL


def _provider_name(api_key: str) -> str:
    return "openrouter" if api_key.strip().startswith("sk-or-") else "openai"


def explain(payload: SchemaPayload, api_key: str, model: str) -> str:
    api_key = api_key.strip()
    base_url = detect_base_url(api_key)
    if base_url == OPENROUTER_BASE_URL and "/" not in model:
        model = f"openai/{model}"
    prompt = _build_prompt(payload)
    body: dict[str, Any] = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a database architect. Explain the following database schema "
                    "in clear plain language for a developer or DBA: overall purpose, key "
                    "tables, important relationships, and any data-quality concerns "
                    "(e.g. tables without primary keys, orphans). Be concise, use short "
                    "sections, no marketing language."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    }
    headers = {"Authorization": f"Bearer {api_key}"}
    if base_url == OPENROUTER_BASE_URL:
        headers["HTTP-Referer"] = "http://localhost:5173"
        headers["X-Title"] = "Schema Visualizer"
    try:
        resp = httpx.post(
            f"{base_url}/chat/completions",
            headers=headers,
            json=body,
            timeout=60,
        )
    except httpx.HTTPError as exc:
        raise ProviderError(f"Could not reach the AI provider: {exc.__class__.__name__}") from exc
    if resp.status_code != 200:
        raise ProviderError(_provider_message(resp, base_url))
    return resp.json()["choices"][0]["message"]["content"]


def _provider_message(resp: httpx.Response, base_url: str) -> str:
    status = resp.status_code
    is_openrouter = base_url == OPENROUTER_BASE_URL
    try:
        payload = resp.json()
        provider_msg = payload.get("error", {}).get("message", "")
    except Exception:
        provider_msg = ""
    if status == 401:
        if is_openrouter:
            return (
                "Invalid API key (401). Generate a key at openrouter.ai/keys "
                "— keys start with 'sk-or-v1-', no spaces or newlines."
            )
        return (
            "Incorrect API key (401). Check the key at platform.openai.com "
            "— it must start with 'sk-' and contain no extra spaces or newlines."
        )
    hints = {
        403: "API key rejected (403). The key may lack permission for this model.",
        404: "Model not found (404). Check that the model name is valid for your provider.",
        429: "Rate limited (429). Try again in a moment or use a smaller schema.",
    }
    if status in hints:
        return hints[status]
    if provider_msg:
        return f"AI provider error ({status}): {provider_msg}"
    return f"AI provider returned HTTP {status}"


def _build_prompt(payload: SchemaPayload) -> str:
    lines = [
        f"Database: {payload.database.dialect} / {payload.database.name}",
        "",
        "Tables:",
    ]
    for node in payload.nodes:
        cols = ", ".join(
            f"{c.name} {c.type}{' (PK)' if c.isPrimaryKey else ''}" for c in node.columns
        )
        lines.append(f"- {node.id}: {cols}")
    if payload.edges:
        lines.append("")
        lines.append("Foreign keys:")
        for edge in payload.edges:
            lines.append(
                f"- {edge.source}({', '.join(edge.sourceColumns)}) -> "
                f"{edge.target}({', '.join(edge.targetColumns)})"
            )
    if payload.warnings:
        lines.append("")
        lines.append("Warnings:")
        for w in payload.warnings:
            lines.append(f"- {w}")
    return "\n".join(lines)