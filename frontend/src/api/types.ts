export interface Column {
  name: string
  type: string
  isPrimaryKey: boolean
}

export interface ColumnIndex {
  name: string
  columns: string[]
}

export interface SchemaNode {
  id: string
  schema: string | null
  columns: Column[]
  indexes: ColumnIndex[]
  pkColumns: string[]
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

export type FindingSeverity = 'error' | 'warning' | 'info'

export interface Finding {
  severity: FindingSeverity
  category: string
  table: string
  message: string
  suggestion?: string | null
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
  findings: Finding[]
}

export interface ApiError {
  kind: string
  message: string
  [key: string]: unknown
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }
