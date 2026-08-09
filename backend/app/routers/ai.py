from fastapi import APIRouter

from app.errors import ApiError
from app.services import ai, cache

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/explain")
def explain_schema(req: ai.ExplainRequest) -> dict[str, str]:
    payload = cache.get()
    if payload is None:
        raise ApiError(409, "not_connected", "No schema loaded. Connect first.")
    try:
        text = ai.explain(payload, req.apiKey, req.model)
    except ai.ProviderError as exc:
        raise ApiError(502, "ai", str(exc))
    return {"text": text}
