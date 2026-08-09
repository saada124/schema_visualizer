import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { TableNodeData } from '../layout/dagreLayout'

function TableNodeComponent({ data }: { data: TableNodeData }) {
  const { table } = data
  return (
    <div
      style={{
        width: 220,
        borderRadius: 8,
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
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
