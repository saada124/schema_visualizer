from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from typing import Iterable

from sqlalchemy import inspect
from sqlalchemy.engine import Engine
from sqlalchemy.engine.reflection import Inspector

from app.contract import Column, DatabaseInfo, Edge, Node, SchemaPayload, SkippedTable
from app.errors import IntrospectionTimeout

INTROSPECTION_TIMEOUT = 30

SYSTEM_SCHEMAS = {
    "information_schema",
    "pg_catalog",
    "pg_toast",
    "mysql",
    "performance_schema",
    "sys",
}


def introspect(engine: Engine) -> SchemaPayload:
    inspector = inspect(engine)
    schemas = _user_schemas(inspector)
    if len(schemas) == 1:
        schemas = [None]
    nodes: list[Node] = []
    edges: list[Edge] = []
    skipped: list[SkippedTable] = []
    warnings: list[str] = []

    for schema in schemas:
        try:
            tables = inspector.get_table_names(schema=schema)
        except Exception as exc:
            warnings.append(f"Could not list tables in schema '{schema}': {exc}")
            continue

        for table in tables:
            full_id = f"{schema}.{table}" if schema else table
            try:
                columns = inspector.get_columns(table, schema=schema)
                pk = inspector.get_pk_constraint(table, schema=schema)
                fks = inspector.get_foreign_keys(table, schema=schema)
            except Exception as exc:
                skipped.append(
                    SkippedTable(name=full_id, reason=f"introspection error: {exc}")
                )
                continue

            pk_columns = set(pk.get("constrained_columns") or [])
            node_columns = [
                Column(
                    name=col["name"],
                    type=str(col["type"]),
                    isPrimaryKey=col["name"] in pk_columns,
                )
                for col in columns
            ]
            nodes.append(Node(id=full_id, schema=schema, columns=node_columns))

            if not pk_columns:
                warnings.append(f"Table '{full_id}' has no primary key")

            for fk in fks:
                source_cols = list(fk["constrained_columns"])
                target_cols = list(fk["referred_columns"])
                target_schema = fk.get("referred_schema")
                target_table = (
                    f"{target_schema}.{fk['referred_table']}"
                    if target_schema
                    else fk["referred_table"]
                )
                edges.append(
                    Edge(
                        source=full_id,
                        sourceColumns=source_cols,
                        target=target_table,
                        targetColumns=target_cols,
                    )
                )

    dialect = engine.dialect.name
    db_name = engine.url.database or engine.url.host or ""
    return SchemaPayload(
        database=DatabaseInfo(dialect=dialect, name=db_name),
        nodes=nodes,
        edges=edges,
        skippedTables=skipped,
        warnings=warnings,
    )


def introspect_with_timeout(
    engine: Engine, timeout: int = INTROSPECTION_TIMEOUT
) -> SchemaPayload:
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(introspect, engine)
        try:
            return future.result(timeout=timeout)
        except FuturesTimeoutError as exc:
            raise IntrospectionTimeout(
                f"Introspection timed out after {timeout}s. "
                "Try refreshing with a single schema, or use focus mode."
            ) from exc


def _user_schemas(inspector: Inspector) -> Iterable[str]:
    try:
        schemas = inspector.get_schema_names()
    except Exception:
        return [None]
    return [s for s in schemas if s not in SYSTEM_SCHEMAS] or [None]
