from __future__ import annotations

from typing import Optional

from app.contract import Finding, SchemaPayload

SEVERITY_ERROR = "error"
SEVERITY_WARNING = "warning"
SEVERITY_INFO = "info"


def run_audit(payload: SchemaPayload) -> list[Finding]:
    findings: list[Finding] = []
    _missing_primary_keys(payload, findings)
    _circular_dependencies(payload, findings)
    _missing_fk_indexes(payload, findings)
    _redundant_indexes(payload, findings)
    _orphan_tables(payload, findings)
    return findings


def _missing_primary_keys(payload: SchemaPayload, findings: list[Finding]) -> None:
    for node in payload.nodes:
        if any(c.isPrimaryKey for c in node.columns):
            continue
        findings.append(
            Finding(
                severity=SEVERITY_ERROR,
                category="no_primary_key",
                table=node.id,
                message=f"Table '{node.id}' has no primary key",
                suggestion=f"Add a primary key to '{node.id}' to enable reliable row identity and joins.",
            )
        )


def _circular_dependencies(payload: SchemaPayload, findings: list[Finding]) -> None:
    nodes = sorted(n.id for n in payload.nodes)
    adjacency: dict[str, list[str]] = {n: [] for n in nodes}
    for edge in payload.edges:
        if edge.source == edge.target:
            continue
        if edge.source in adjacency and edge.target in adjacency:
            adjacency[edge.source].append(edge.target)
    for target in adjacency.values():
        target.sort()

    seen_cycles: set[tuple[str, ...]] = set()
    cycles: list[list[str]] = []

    def walk(path: list[str], in_path: set[str], explored: set[str]) -> None:
        current = path[-1]
        for next_node in adjacency[current]:
            if next_node in in_path:
                start_at = path.index(next_node)
                cycle = path[start_at:] + [next_node]
                key = tuple(sorted(cycle[:-1]))
                if key not in seen_cycles and len(key) >= 2:
                    seen_cycles.add(key)
                    cycles.append(cycle)
                continue
            if next_node in explored:
                continue
            walk(path + [next_node], in_path | {next_node}, explored)
        explored.add(current)

    for node in nodes:
        walk([node], {node}, set())

    for cycle in cycles:
        findings.append(
            Finding(
                severity=SEVERITY_ERROR,
                category="circular_fk",
                table=cycle[0],
                message="Circular FK dependency: " + " -> ".join(cycle),
                suggestion=(
                    "Break the cycle (e.g. drop or defer one FK, or restructure) to keep "
                    "cascade deletes and seed scripts reliable."
                ),
            )
        )


def _covering_indexes(node) -> list[list[str]]:
    candidates: list[list[str]] = []
    if node.pkColumns:
        candidates.append(list(node.pkColumns))
    for index in node.indexes:
        if index.columns:
            candidates.append(list(index.columns))
    return candidates


def _is_covered(node, fk_columns: list[str]) -> bool:
    for candidate in _covering_indexes(node):
        if candidate[: len(fk_columns)] == fk_columns:
            return True
    return False


def _missing_fk_indexes(payload: SchemaPayload, findings: list[Finding]) -> None:
    nodes = {n.id: n for n in payload.nodes}
    for edge in payload.edges:
        source = nodes.get(edge.source)
        if source is None or not edge.sourceColumns:
            continue
        fk_columns = list(edge.sourceColumns)
        if _is_covered(source, fk_columns):
            continue
        suffix = "_".join(fk_columns)
        findings.append(
            Finding(
                severity=SEVERITY_WARNING,
                category="missing_fk_index",
                table=edge.source,
                message=(
                    f"Foreign key {edge.source}({', '.join(fk_columns)}) -> "
                    f"{edge.target} has no covering index"
                ),
                suggestion=f"CREATE INDEX idx_{edge.source}_{suffix} ON {edge.source} ({', '.join(fk_columns)});",
            )
        )


def _redundant_indexes(payload: SchemaPayload, findings: list[Finding]) -> None:
    for node in payload.nodes:
        for index_a in node.indexes:
            if not index_a.columns:
                continue
            for index_b in node.indexes:
                if index_a.name == index_b.name:
                    continue
                if len(index_b.columns) > len(index_a.columns) and index_b.columns[
                    : len(index_a.columns)
                ] == index_a.columns:
                    findings.append(
                        Finding(
                            severity=SEVERITY_INFO,
                            category="redundant_index",
                            table=node.id,
                            message=(
                                f"Index '{index_a.name}' ({', '.join(index_a.columns)}) is "
                                f"redundant — covered by '{index_b.name}' "
                                f"({', '.join(index_b.columns)})"
                            ),
                            suggestion=f"DROP INDEX {index_a.name};",
                        )
                    )
                    break


def _orphan_tables(payload: SchemaPayload, findings: list[Finding]) -> None:
    related = {e.source for e in payload.edges} | {e.target for e in payload.edges}
    for node in payload.nodes:
        if node.id in related:
            continue
        findings.append(
            Finding(
                severity=SEVERITY_INFO,
                category="orphan_table",
                table=node.id,
                message=f"Table '{node.id}' has no relationships",
                suggestion=None,
            )
        )