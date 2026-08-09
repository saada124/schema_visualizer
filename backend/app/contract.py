from typing import Literal, Optional

from pydantic import BaseModel, Field


class Column(BaseModel):
    name: str
    type: str
    isPrimaryKey: bool = False


class Index(BaseModel):
    name: str
    columns: list[str]


class Node(BaseModel):
    id: str
    schema: Optional[str] = None
    columns: list[Column] = []
    indexes: list[Index] = []
    pkColumns: list[str] = []


class Edge(BaseModel):
    source: str
    sourceColumns: list[str]
    target: str
    targetColumns: list[str]
    type: str = "foreign_key"


class SkippedTable(BaseModel):
    name: str
    reason: str


class Finding(BaseModel):
    severity: Literal["error", "warning", "info"]
    category: str
    table: str
    message: str
    suggestion: Optional[str] = None


class DatabaseInfo(BaseModel):
    dialect: str
    name: str


class SchemaPayload(BaseModel):
    version: int = Field(default=1)
    database: DatabaseInfo
    nodes: list[Node] = []
    edges: list[Edge] = []
    skippedTables: list[SkippedTable] = []
    warnings: list[str] = []
    findings: list[Finding] = []
