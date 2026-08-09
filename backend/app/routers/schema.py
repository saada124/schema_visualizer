from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from app.contract import SchemaPayload
from app.errors import ApiError, ConnectionError, IntrospectionTimeout
from app.services import cache, connection
from app.services.introspection import introspect_with_timeout

router = APIRouter(prefix="/schema", tags=["schema"])

DEMO_DIR = Path(__file__).resolve().parents[3] / "demo"


class ConnectRequest(BaseModel):
    connectionString: str


@router.post("/connect")
def connect(req: ConnectRequest) -> SchemaPayload:
    url = resolve_connection(req.connectionString)
    try:
        engine = connection.connect(url)
    except ConnectionError as exc:
        raise ApiError(400, exc.kind, exc.message)
    return _introspect_and_cache(engine)


def resolve_connection(connection_string: str) -> str:
    if connection_string == "demo://chinook":
        db_path = DEMO_DIR / "chinook.db"
        if not db_path.exists():
            raise ApiError(
                400, "connection", f"Demo schema not found at {db_path}. Download it first."
            )
        return f"sqlite:///{db_path.as_posix()}"
    if connection_string == "demo://audit":
        db_path = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "audit_demo.db"
        if not db_path.exists():
            raise ApiError(
                400, "connection", f"Audit demo schema not found at {db_path}. Build it first."
            )
        return f"sqlite:///{db_path.as_posix()}"
    return connection_string


@router.get("")
def get_schema() -> SchemaPayload:
    payload = cache.get()
    if payload is None:
        raise ApiError(409, "not_connected", "No active connection. Connect first.")
    return payload


@router.post("/refresh")
def refresh() -> SchemaPayload:
    try:
        engine = connection.get_engine()
    except ConnectionError as exc:
        raise ApiError(409, exc.kind, exc.message)
    return _introspect_and_cache(engine)


def _introspect_and_cache(engine) -> SchemaPayload:
    try:
        payload = introspect_with_timeout(engine)
    except IntrospectionTimeout as exc:
        raise ApiError(exc.status, exc.kind, exc.message, suggestFocusMode=True)
    cache.set(payload)
    return payload
