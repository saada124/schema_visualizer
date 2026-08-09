from pathlib import Path

from sqlalchemy import create_engine

from app.services.introspection import introspect

FIXTURES = Path(__file__).parent / "fixtures"


def _introspect(name: str):
    engine = create_engine(f"sqlite:///{FIXTURES / name}")
    try:
        return introspect(engine)
    finally:
        engine.dispose()


def _node(payload, table: str):
    matches = [n for n in payload.nodes if n.id == table]
    assert matches, f"table {table!r} missing from payload"
    return matches[0]


def test_normal_schema():
    payload = _introspect("normal.db")
    assert payload.version == 1
    assert payload.database.dialect == "sqlite"
    assert {n.id for n in payload.nodes} == {
        "users",
        "products",
        "orders",
        "order_items",
    }
    assert payload.skippedTables == []
    assert payload.warnings == []

    users = _node(payload, "users")
    by_name = {c.name: c for c in users.columns}
    assert by_name["id"].isPrimaryKey is True
    assert by_name["email"].isPrimaryKey is False
    assert by_name["email"].type.startswith("VARCHAR")

    edges = {(e.source, e.target) for e in payload.edges}
    assert edges == {
        ("orders", "users"),
        ("order_items", "orders"),
        ("order_items", "products"),
    }
    order_items = next(e for e in payload.edges if e.source == "order_items")
    assert order_items.sourceColumns == ["order_id"]
    assert order_items.targetColumns == ["id"]


def test_composite_primary_key():
    payload = _introspect("composite_pk.db")
    enrollments = _node(payload, "enrollments")
    pk_columns = {c.name for c in enrollments.columns if c.isPrimaryKey}
    assert pk_columns == {"student_id", "course_id"}
    edges = {(e.source, e.target) for e in payload.edges}
    assert edges == {
        ("enrollments", "students"),
        ("enrollments", "courses"),
    }


def test_self_referencing_foreign_key():
    payload = _introspect("self_ref.db")
    edges = [(e.source, e.target) for e in payload.edges]
    assert ("employees", "employees") in edges


def test_table_without_primary_key():
    payload = _introspect("no_pk.db")
    events = _node(payload, "events")
    assert all(c.isPrimaryKey is False for c in events.columns)
    assert any("events" in w and "no primary key" in w for w in payload.warnings)


def test_orphan_table():
    payload = _introspect("orphan.db")
    edge_tables = {e.source for e in payload.edges} | {e.target for e in payload.edges}
    assert "authors" in edge_tables
    assert "books" in edge_tables
    assert "settings" not in edge_tables
