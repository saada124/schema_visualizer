from __future__ import annotations

import threading
from typing import Optional

from app.contract import SchemaPayload
from app.services.connection import get_url

_cache: dict[str, SchemaPayload] = {}
_lock = threading.Lock()


def key() -> str:
    url = get_url()
    return url or ""


def get() -> Optional[SchemaPayload]:
    with _lock:
        return _cache.get(key())


def set(payload: SchemaPayload) -> None:
    with _lock:
        _cache[key()] = payload


def clear() -> None:
    with _lock:
        _cache.clear()
