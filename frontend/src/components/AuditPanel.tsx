import { useState } from 'react'
import type { Finding, SchemaPayload } from '../api/types'

const SEVERITY_ORDER = ['error', 'warning', 'info'] as const
const SEVERITY_META: Record<string, { label: string; color: string }> = {
  error: { label: 'Errors', color: '#dc2626' },
  warning: { label: 'Warnings', color: '#d97706' },
  info: { label: 'Info', color: '#2563eb' },
}

interface AuditPanelProps {
  payload: SchemaPayload
  onSelectNode: (nodeId: string) => void
}

export function AuditPanel({ payload, onSelectNode }: AuditPanelProps) {
  const [open, setOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const findings = payload.findings ?? []
  const problemCount = findings.filter((f) => f.severity !== 'info').length

  const groups = SEVERITY_ORDER.map((severity) => ({
    severity,
    items: findings.filter((f) => f.severity === severity),
  })).filter((g) => g.items.length > 0)

  async function copySuggestion(suggestion: string, id: string) {
    try {
      await navigator.clipboard.writeText(suggestion)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1200)
    } catch {
      setCopiedId(null)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={toolStyle(open)}>
        Audit
        {problemCount > 0 ? (
          <span
            style={{
              background: '#dc2626',
              color: '#fff',
              borderRadius: 999,
              fontSize: 11,
              padding: '0 6px',
              marginLeft: 6,
            }}
          >
            {problemCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 360,
            maxHeight: '65vh',
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
            padding: 12,
            zIndex: 30,
            fontSize: 13,
          }}
        >
          {groups.length === 0 ? (
            <div style={{ color: '#16a34a', padding: '4px 0' }}>No issues detected.</div>
          ) : (
            groups.map((group) => (
              <div key={group.severity} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: SEVERITY_META[group.severity].color,
                    marginBottom: 4,
                  }}
                >
                  {SEVERITY_META[group.severity].label} ({group.items.length})
                </div>
                {group.items.map((finding) => (
                  <FindingRow
                    key={`${finding.category}:${finding.table}:${finding.message}`}
                    finding={finding}
                    onSelectNode={onSelectNode}
                    copiedId={copiedId}
                    onCopy={copySuggestion}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function FindingRow({
  finding,
  onSelectNode,
  copiedId,
  onCopy,
}: {
  finding: Finding
  onSelectNode: (nodeId: string) => void
  copiedId: string | null
  onCopy: (suggestion: string, id: string) => void
}) {
  const id = `${finding.category}:${finding.table}:${finding.message}`
  return (
    <div
      style={{
        border: '1px solid #f1f5f9',
        borderRadius: 8,
        padding: '6px 8px',
        marginBottom: 6,
        background: '#fbfdff',
      }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: SEVERITY_META[finding.severity].color,
            flexShrink: 0,
            alignSelf: 'center',
          }}
        />
        <button
          onClick={() => onSelectNode(finding.table)}
          title="Show this table on the diagram"
          style={{
            border: 'none',
            background: '#e0f2fe',
            color: '#075985',
            borderRadius: 5,
            padding: '1px 6px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {finding.table}
        </button>
        <span>{finding.message}</span>
      </div>
      {finding.suggestion ? (
        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            marginTop: 5,
            background: '#0f172a',
            color: '#e2e8f0',
            borderRadius: 6,
            padding: '4px 8px',
          }}
        >
          <code
            style={{
              flex: 1,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 11,
              overflowWrap: 'anywhere',
            }}
          >
            {finding.suggestion}
          </code>
          <button
            onClick={() => onCopy(finding.suggestion!, id)}
            title="Copy DDL"
            style={{
              border: 'none',
              background: '#334155',
              color: '#f8fafc',
              borderRadius: 5,
              padding: '2px 6px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {copiedId === id ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function toolStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: active ? '#e0f2fe' : '#ffffff',
    color: active ? '#075985' : '#334155',
    fontSize: 13,
    cursor: 'pointer',
  }
}