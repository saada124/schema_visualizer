from __future__ import annotations

import contextlib
from threading import Lock
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from app.errors import ConnectionError

_engine: Optional[Engine] = None
_lock = Lock()
_url: Optional[str] = None


def connect(url: str) -> Engine:
    global _engine, _url
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
    except Exception as exc:
        raise ConnectionError(f"Could not connect: check host, port and credentials") from exc
    with _lock:
        dispose()
        _engine = engine
        _url = url
    return engine


def get_engine() -> Engine:
    if _engine is None:
        raise ConnectionError("Not connected to any database")
    return _engine


def get_url() -> Optional[str]:
    return _url


def dispose() -> None:
    global _engine
    if _engine is not None:
        with contextlib.suppress(Exception):
            _engine.dispose()
        _engine = None
