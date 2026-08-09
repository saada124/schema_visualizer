export interface Column {
  name: string
  type: string
  isPrimaryKey: boolean
}

export interface SchemaNode {
  id: string
  schema: string | null
  columns: Column[]
}

export interface SchemaEdge {
  source: string
  sourceColumns: string[]
  target: string
  targetColumns: string[]
  type: string
}

export interface SkippedTable {
  name: string
  reason: string
}

export interface DatabaseInfo {
  dialect: string
  name: string
}

export interface SchemaPayload {
  version: number
  database: DatabaseInfo
  nodes: SchemaNode[]
  edges: SchemaEdge[]
  skippedTables: SkippedTable[]
  warnings: string[]
}

export interface ApiError {
  kind: string
  message: string
  [key: string]: unknown
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }
