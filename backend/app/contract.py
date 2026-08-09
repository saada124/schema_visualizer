from typing import Optional

from pydantic import BaseModel, Field


class Column(BaseModel):
    name: str
    type: str
    isPrimaryKey: bool = False


class Node(BaseModel):
    id: str
    schema: Optional[str] = None
    columns: list[Column] = []


class Edge(BaseModel):
    source: str
    sourceColumns: list[str]
    target: str
    targetColumns: list[str]
    type: str = "foreign_key"


class SkippedTable(BaseModel):
    name: str
    reason: str


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
