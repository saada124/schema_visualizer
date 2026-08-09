import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { SchemaNode } from '../api/types'

export interface TableNodeData extends Record<string, unknown> {
  table: SchemaNode
  highlighted?: boolean
}

function TableNodeComponent({ data }: { data: TableNodeData }) {
  const { table } = data
  const highlighted = data.highlighted === true
  return (
    <div
      style={{
        width: 220,
        borderRadius: 8,
        border: highlighted ? '2px solid #2563eb' : '1px solid #cbd5e1',
        background: '#ffffff',
        boxShadow: highlighted
          ? '0 0 0 3px rgba(37, 99, 235, 0.25)'
          : '0 2px 8px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div
        style={{
          padding: '6px 10px',
          background: '#0f172a',
          color: '#f8fafc',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {table.id}
        </span>
        {table.schema ? (
          <span
            style={{
              fontSize: 10,
              background: '#334155',
              borderRadius: 4,
              padding: '0 5px',
              alignSelf: 'center',
            }}
          >
            {table.schema}
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 12 }}>
        {table.columns.map((col) => (
          <div
            key={col.name}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
              padding: '2px 10px',
              borderTop: '1px solid #f1f5f9',
              background: col.isPrimaryKey ? '#fef9c3' : undefined,
            }}
          >
            <span style={{ color: col.isPrimaryKey ? '#854d0e' : '#334155' }}>
              {col.isPrimaryKey ? 'PK ' : ''}
              {col.name}
            </span>
            <span style={{ color: '#94a3b8' }}>{col.type}</span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export const TableNode = memo(TableNodeComponent)
