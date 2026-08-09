import sys
from pathlib import Path

from sqlalchemy import create_engine

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.introspection import introspect

FIXTURES = Path(__file__).parent / "fixtures"


def _audit(name: str):
    engine = create_engine(f"sqlite:///{FIXTURES / name}")
    try:
        return introspect(engine).findings
    finally:
        engine.dispose()


def _findings(findings, category: str, table: str | None = None):
    return [
        f
        for f in findings
        if f.category == category and (table is None or f.table == table)
    ]


def test_clean_schema_has_no_structural_errors():
    findings = _audit("normal.db")
    assert len(findings) == 2
    assert all(f.category == "missing_fk_index" for f in findings)
    assert all(f.severity == "warning" for f in findings)


def test_missing_fk_indexes_detected():
    findings = _audit("normal.db")
    assert len(_findings(findings, "missing_fk_index")) == 2
    # orders.user_id is covered by the explicit idx_orders_user_id index
    assert _findings(findings, "missing_fk_index", "orders") == []
    items = {f.suggestion for f in _findings(findings, "missing_fk_index", "order_items")}
    assert items == {
        "CREATE INDEX idx_order_items_order_id ON order_items (order_id);",
        "CREATE INDEX idx_order_items_product_id ON order_items (product_id);",
    }


def test_composite_pk_leading_prefix_coverage():
    findings = _audit("composite_pk.db")
    # PK (student_id, course_id) covers the leading FK student_id only;
    # course_id is a non-leading column and still needs its own index
    covered = _findings(findings, "missing_fk_index")
    assert len(covered) == 1
    assert covered[0].table == "enrollments"
    assert "course_id" in covered[0].suggestion
    assert "student_id" not in covered[0].suggestion


def test_self_reference_is_indexed_check_not_cycle():
    findings = _audit("self_ref.db")
    assert _findings(findings, "circular_fk") == []
    employees = _findings(findings, "missing_fk_index", "employees")
    assert employees and "manager_id" in employees[0].suggestion


def test_cycle_detected():
    findings = _audit("cycle.db")
    cycles = _findings(findings, "circular_fk")
    assert len(cycles) == 1
    cycle = cycles[0]
    assert cycle.severity == "error"
    assert {"alpha", "beta", "gamma"} <= set(cycle.message.split())


def test_missing_primary_key_and_orphans():
    findings = _audit("no_pk.db")
    events_pk = _findings(findings, "no_primary_key", "events")
    assert events_pk and events_pk[0].severity == "error"
    orphans = {f.table for f in _findings(findings, "orphan_table")}
    assert orphans == {"audits", "events"}


def test_orphan_only_table():
    findings = _audit("orphan.db")
    orphans = {f.table for f in _findings(findings, "orphan_table")}
    assert orphans == {"settings"}


def test_indexes_exposed_on_nodes():
    engine = create_engine(f"sqlite:///{FIXTURES / 'normal.db'}")
    try:
        payload = introspect(engine)
    finally:
        engine.dispose()
    users = next(n for n in payload.nodes if n.id == "users")
    assert any(idx.name == "idx_users_email" and idx.columns == ["email"] for idx in users.indexes)


def test_audit_demo_exercises_every_category():
    findings = _audit("audit_demo.db")

    pk = {f.table for f in _findings(findings, "no_primary_key")}
    assert pk == {"raw_logs"}
    assert all(f.severity == "error" for f in _findings(findings, "no_primary_key"))

    cycle = _findings(findings, "circular_fk")
    assert len(cycle) == 1
    assert cycle[0].severity == "error"
    assert {"a", "b", "c"} <= set(cycle[0].message.split())

    missing = {f.suggestion for f in _findings(findings, "missing_fk_index", "orders")}
    assert missing == {
        "CREATE INDEX idx_orders_customer_id ON orders (customer_id);"
    }

    items = _findings(findings, "missing_fk_index", "order_items")
    assert len(items) == 1
    assert "product_id" in items[0].suggestion

    redundant = {f.table for f in _findings(findings, "redundant_index")}
    assert redundant == {"events"}
    assert all(f.severity == "info" for f in _findings(findings, "redundant_index"))

    orphans = {f.table for f in _findings(findings, "orphan_table")}
    assert orphans == {"settings", "events", "raw_logs"}
    assert all(f.severity == "info" for f in _findings(findings, "orphan_table"))