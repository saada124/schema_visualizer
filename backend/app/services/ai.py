from __future__ import annotations

from typing import Any

import httpx
from pydantic import BaseModel

from app.contract import SchemaPayload

DEFAULT_BASE_URL = "https://api.openai.com/v1"


class ExplainRequest(BaseModel):
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    apiKey: str


def explain(payload: SchemaPayload, api_key: str, model: str) -> str:
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
    resp = httpx.post(
        f"{DEFAULT_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json=body,
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


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
