import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app
from app.services import cache, connection

FIXTURES = Path(__file__).parent / "fixtures"
NORMAL = f"sqlite:///{(FIXTURES / 'normal.db').as_posix()}"


@pytest.fixture(autouse=True)
def _clean_state():
    connection.dispose()
    cache.clear()
    yield
    connection.dispose()
    cache.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_connect_returns_payload(client):
    resp = client.post("/schema/connect", json={"connectionString": NORMAL})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["version"] == 1
    assert payload["database"]["dialect"] == "sqlite"
    assert {n["id"] for n in payload["nodes"]} == {
        "users",
        "products",
        "orders",
        "order_items",
    }


def test_get_schema_after_connect(client):
    client.post("/schema/connect", json={"connectionString": NORMAL})
    resp = client.get("/schema")
    assert resp.status_code == 200
    assert resp.json()["database"]["name"].endswith("normal.db")


def test_get_schema_without_connection(client):
    resp = client.get("/schema")
    assert resp.status_code == 409
    assert resp.json()["error"]["kind"] == "not_connected"


def test_refresh_replaces_cache(client):
    client.post("/schema/connect", json={"connectionString": NORMAL})
    first = client.get("/schema").json()
    resp = client.post("/schema/refresh")
    assert resp.status_code == 200
    assert resp.json() == first


def test_bad_connection_string(client):
    resp = client.post(
        "/schema/connect", json={"connectionString": "postgresql://u:p@localhost:1/nope"}
    )
    assert resp.status_code == 400
    body = resp.json()
    assert body["error"]["kind"] == "connection"
    assert "Could not connect" in body["error"]["message"]
    assert "u:p@" not in body["error"]["message"]


def test_malformed_url(client):
    resp = client.post("/schema/connect", json={"connectionString": "not a url"})
    assert resp.status_code == 400
    assert resp.json()["error"]["kind"] == "connection"


def test_ai_explain_requires_connection(client):
    resp = client.post(
        "/ai/explain",
        json={"apiKey": "sk-test", "model": "gpt-4o-mini", "provider": "openai"},
    )
    assert resp.status_code == 409


def test_ai_explain_success(client, monkeypatch):
    client.post("/schema/connect", json={"connectionString": NORMAL})
    calls: dict = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        calls["body"] = json
        req = httpx.Request("POST", url)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "A clean e-commerce schema."}}]},
            request=req,
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    resp = client.post(
        "/ai/explain",
        json={"apiKey": "sk-test", "model": "gpt-4o-mini", "provider": "openai"},
    )
    assert resp.status_code == 200
    assert resp.json()["text"] == "A clean e-commerce schema."
    assert calls["body"]["temperature"] == 0.3
    assert calls["body"]["max_tokens"] == 300


def test_ai_explain_openrouter_key_routes_to_openrouter(client, monkeypatch):
    client.post("/schema/connect", json={"connectionString": NORMAL})
    calls: dict = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        calls["url"] = url
        calls["headers"] = headers
        calls["body"] = json
        req = httpx.Request("POST", url)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "Explained."}}]},
            request=req,
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    resp = client.post(
        "/ai/explain",
        json={
            "apiKey": "sk-or-v1-test-key-openrouter",
            "model": "gpt-4o-mini",
            "provider": "openai",
        },
    )
    assert resp.status_code == 200
    assert calls["url"] == "https://openrouter.ai/api/v1/chat/completions"
    assert calls["body"]["model"] == "openai/gpt-4o-mini"
    assert calls["headers"]["Authorization"] == "Bearer sk-or-v1-test-key-openrouter"
    assert calls["headers"]["X-Title"] == "Schema Visualizer"


def test_ai_explain_openrouter_401_hint(client, monkeypatch):
    client.post("/schema/connect", json={"connectionString": NORMAL})

    def fake_post(url, headers=None, json=None, timeout=None):
        req = httpx.Request("POST", url)
        return httpx.Response(401, json={"error": {"message": "bad key"}}, request=req)

    monkeypatch.setattr(httpx, "post", fake_post)
    resp = client.post(
        "/ai/explain",
        json={"apiKey": "sk-or-v1-test", "model": "gpt-4o-mini", "provider": "openai"},
    )
    assert resp.status_code == 502
    message = resp.json()["error"]["message"]
    assert "openrouter.ai/keys" in message
    assert "openai.com" not in message


def test_ai_explain_provider_error(client, monkeypatch):
    client.post("/schema/connect", json={"connectionString": NORMAL})

    def fake_post(url, headers=None, json=None, timeout=None):
        req = httpx.Request("POST", url)
        return httpx.Response(
            401,
            json={"error": {"message": "Incorrect API key provided: sk-xxxx."}},
            request=req,
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    resp = client.post(
        "/ai/explain",
        json={"apiKey": "bad-key", "model": "gpt-4o-mini", "provider": "openai"},
    )
    assert resp.status_code == 502
    body = resp.json()["error"]
    assert body["kind"] == "ai"
    assert "Incorrect API key (401)" in body["message"]
    assert "api.openai.com" not in body["message"]
