import sys
from pathlib import Path

from sqlalchemy import create_engine

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.ai import _build_prompt
from app.services.introspection import introspect

FIXTURES = Path(__file__).parent / "fixtures"


def _prompt(name: str) -> str:
    engine = create_engine(f"sqlite:///{FIXTURES / name}")
    try:
        payload = introspect(engine)
    finally:
        engine.dispose()
    return _build_prompt(payload)


def test_prompt_counts_and_join_table():
    prompt = _prompt("composite_pk.db")
    assert "3 tables, 2 foreign keys" in prompt
    assert "Join tables (many-to-many): enrollments" in prompt
    assert "Self-referencing tables: none" in prompt
    assert "Orphan tables (no relationships): none" in prompt
    assert "1 connected component" in prompt
    assert "Data quality alerts: none detected" in prompt


def test_prompt_self_referencing():
    prompt = _prompt("self_ref.db")
    assert "Self-referencing tables: employees" in prompt


def test_prompt_orphans_and_alerts():
    prompt = _prompt("no_pk.db")
    assert "Orphan tables (no relationships): audits, events" in prompt
    assert "no primary key" in prompt
    assert "none detected" not in prompt