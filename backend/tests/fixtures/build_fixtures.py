"""Build the checked-in SQLite fixture databases used by the test suite."""
from pathlib import Path

from sqlalchemy import (
    Column,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    PrimaryKeyConstraint,
    String,
    Table,
    MetaData,
    create_engine,
)

FIXTURES = Path(__file__).parent


def _normal():
    md = MetaData()
    Table(
        "users",
        md,
        Column("id", Integer, primary_key=True),
        Column("email", String(255), unique=True),
        Index("idx_users_email", "email"),
    )
    Table(
        "products",
        md,
        Column("id", Integer, primary_key=True),
        Column("name", String(100)),
    )
    Table(
        "orders",
        md,
        Column("id", Integer, primary_key=True),
        Column("user_id", Integer, ForeignKey("users.id")),
        Index("idx_orders_user_id", "user_id"),
    )
    Table(
        "order_items",
        md,
        Column("id", Integer, primary_key=True),
        Column("order_id", Integer, ForeignKey("orders.id")),
        Column("product_id", Integer, ForeignKey("products.id")),
        Column("quantity", Integer),
        Index("idx_order_items_quantity", "quantity"),
    )
    return md


def _composite_pk():
    md = MetaData()
    Table(
        "students",
        md,
        Column("id", Integer, primary_key=True),
        Column("name", String(100)),
    )
    Table(
        "courses",
        md,
        Column("id", Integer, primary_key=True),
        Column("title", String(100)),
    )
    Table(
        "enrollments",
        md,
        Column("student_id", Integer),
        Column("course_id", Integer),
        Column("grade", String(2)),
        ForeignKeyConstraint(["student_id"], ["students.id"]),
        ForeignKeyConstraint(["course_id"], ["courses.id"]),
        PrimaryKeyConstraint("student_id", "course_id"),
    )
    return md


def _self_ref():
    md = MetaData()
    Table(
        "employees",
        md,
        Column("id", Integer, primary_key=True),
        Column("name", String(100)),
        Column("manager_id", Integer, ForeignKey("employees.id")),
    )
    return md


def _no_pk():
    md = MetaData()
    Table(
        "events",
        md,
        Column("ts", String(50)),
        Column("message", String(255)),
    )
    Table(
        "audits",
        md,
        Column("id", Integer, primary_key=True),
        Column("note", String(255)),
    )
    return md


def _orphan():
    md = MetaData()
    Table(
        "authors",
        md,
        Column("id", Integer, primary_key=True),
        Column("name", String(100)),
    )
    Table(
        "books",
        md,
        Column("id", Integer, primary_key=True),
        Column("author_id", Integer, ForeignKey("authors.id")),
    )
    Table(
        "settings",
        md,
        Column("key", String(50), primary_key=True),
        Column("value", String(255)),
    )
    return md


def _cycle():
    md = MetaData()
    Table(
        "alpha",
        md,
        Column("id", Integer, primary_key=True),
        Column("gamma_id", Integer, ForeignKey("gamma.id")),
    )
    Table(
        "beta",
        md,
        Column("id", Integer, primary_key=True),
        Column("alpha_id", Integer, ForeignKey("alpha.id")),
    )
    Table(
        "gamma",
        md,
        Column("id", Integer, primary_key=True),
        Column("beta_id", Integer, ForeignKey("beta.id")),
    )
    return md


def _audit_demo():
    """One file that exercises every audit finding category at once."""
    md = MetaData()
    Table(
        "customers",
        md,
        Column("id", Integer, primary_key=True),
        Column("name", String(100)),
        Column("region", String(50)),
        Index("idx_customers_region", "region"),
    )
    Table(
        "orders",
        md,
        Column("id", Integer, primary_key=True),
        Column("customer_id", Integer, ForeignKey("customers.id")),
        Column("total", Integer),
    )
    Table(
        "order_items",
        md,
        Column("id", Integer, primary_key=True),
        Column("order_id", Integer, ForeignKey("orders.id")),
        Column("product_id", Integer, ForeignKey("products.id")),
        Column("quantity", Integer),
        Index("idx_order_items_order_qty", "order_id", "quantity"),
    )
    Table(
        "products",
        md,
        Column("id", Integer, primary_key=True),
        Column("name", String(100)),
    )
    Table(
        "a",
        md,
        Column("id", Integer, primary_key=True),
        Column("b_id", Integer, ForeignKey("b.id")),
    )
    Table(
        "b",
        md,
        Column("id", Integer, primary_key=True),
        Column("c_id", Integer, ForeignKey("c.id")),
    )
    Table(
        "c",
        md,
        Column("id", Integer, primary_key=True),
        Column("a_id", Integer, ForeignKey("a.id")),
    )
    Table(
        "raw_logs",
        md,
        Column("ts", String(50)),
        Column("payload", String(255)),
    )
    Table(
        "events",
        md,
        Column("id", Integer, primary_key=True),
        Column("user_id", Integer),
        Column("ts", String(50)),
        Index("idx_events_ts", "ts"),
        Index("idx_events_ts_user", "ts", "user_id"),
    )
    Table(
        "settings",
        md,
        Column("key", String(50), primary_key=True),
        Column("value", String(255)),
    )
    return md


BUILDERS = {
    "normal.db": _normal,
    "composite_pk.db": _composite_pk,
    "self_ref.db": _self_ref,
    "no_pk.db": _no_pk,
    "orphan.db": _orphan,
    "cycle.db": _cycle,
    "audit_demo.db": _audit_demo,
}


def build_all() -> None:
    FIXTURES.mkdir(exist_ok=True)
    for name, builder in BUILDERS.items():
        db_path = FIXTURES / name
        if db_path.exists():
            db_path.unlink()
        md = builder()
        engine = create_engine(f"sqlite:///{db_path}")
        md.create_all(engine)
        engine.dispose()


if __name__ == "__main__":
    build_all()
    print(f"Built {len(BUILDERS)} fixture databases in {FIXTURES}")
