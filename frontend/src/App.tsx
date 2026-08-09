import { useCallback, useMemo, useState } from 'react'
import { toPng } from 'html-to-image'
import { ConnectionForm } from './components/ConnectionForm'
import { DiagramCanvas, type PanRequest } from './components/DiagramCanvas'
import { ErrorBanner } from './components/ErrorBanner'
import { WarningBanner } from './components/WarningBanner'
import { AuditPanel } from './components/AuditPanel'
import { AiPanel } from './components/AiPanel'
import { connectSchema, refreshSchema } from './api/client'
import type { ApiError, SchemaPayload } from './api/types'

export default function App() {
  const [payload, setPayload] = useState<SchemaPayload | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [focusEnabled, setFocusEnabled] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [panRequest, setPanRequest] = useState<PanRequest | null>(null)

  const handleSelectFromAudit = useCallback((nodeId: string) => {
    setHighlightId(nodeId)
    setPanRequest({ id: nodeId, ts: Date.now() })
  }, [])

  const runConnect = useCallback(async (connectionString: string) => {
    setLoading(true)
    setError(null)
    const res = await connectSchema(connectionString)
    setLoading(false)
    if (res.ok) {
      setPayload(res.data)
      setFocusId(null)
      setHighlightId(null)
      setPanRequest(null)
    } else {
      setError(res.error)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await refreshSchema()
    setLoading(false)
    if (res.ok) setPayload(res.data)
    else setError(res.error)
  }, [])

  const exportPng = useCallback(async () => {
    const el = document.querySelector('.react-flow__viewport') as HTMLElement | null
    if (!el) return
    const dataUrl = await toPng(el, { backgroundColor: '#ffffff', pixelRatio: 2 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'schema.png'
    a.click()
  }, [])

  const visibleIds = useMemo(() => {
    if (!payload) return null
    if (query) {
      const matched = new Set(
        payload.nodes.filter((n) => n.id.toLowerCase().includes(query.toLowerCase())).map((n) => n.id),
      )
      return matched
    }
    if (focusEnabled && focusId) {
      const ids = new Set([focusId])
      for (const e of payload.edges) {
        if (e.source === focusId) ids.add(e.target)
        if (e.target === focusId) ids.add(e.source)
      }
      return ids
    }
    return null
  }, [payload, query, focusEnabled, focusId])

  const stats = useMemo(() => {
    if (!payload) return null
    const columns = payload.nodes.reduce((acc, n) => acc + n.columns.length, 0)
    const related = new Set(
      payload.edges.flatMap((e) => [e.source, e.target]),
    )
    const orphans = payload.nodes.filter((n) => !related.has(n.id)).length
    return { tables: payload.nodes.length, columns, fks: payload.edges.length, orphans }
  }, [payload])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        style={{
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px' }}>
          <strong style={{ fontSize: 15, whiteSpace: 'nowrap' }}>Schema Visualizer</strong>
          {stats ? (
            <span style={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
              {stats.tables} tables · {stats.columns} columns · {stats.fks} FKs
              {stats.orphans > 0 ? ` · ${stats.orphans} orphans` : ''}
            </span>
          ) : null}
          {payload ? (
            <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              {payload.database.dialect} · {payload.database.name}
            </span>
          ) : null}
        </div>
        <ConnectionForm
          onConnect={runConnect}
          onLoadDemo={() => runConnect('demo://chinook')}
          onLoadAuditDemo={() => runConnect('demo://audit')}
          loading={loading}
        />
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 8px', alignItems: 'center' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tables…"
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              width: 220,
            }}
          />
          <button onClick={() => setFocusEnabled((f) => !f)} style={toolButton(focusEnabled)}>
            Focus mode {focusEnabled ? 'on' : 'off'}
          </button>
          <button onClick={handleRefresh} disabled={loading || !payload} style={toolButton(false)}>
            Refresh schema
          </button>
          <button onClick={exportPng} disabled={!payload} style={toolButton(false)}>
            Export PNG
          </button>
          <div style={{ flex: 1 }} />
          {payload ? (
            <>
              <AuditPanel payload={payload} onSelectNode={handleSelectFromAudit} />
              <AiPanel />
            </>
          ) : null}
        </div>
      </div>

      {error ? <ErrorBanner error={error} /> : null}
      {payload ? <WarningBanner payload={payload} /> : null}

      <div style={{ flex: 1, position: 'relative', background: '#fbfdff' }}>
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 10, background: 'rgba(255,255,255,0.7)' }}>
            <span style={{ fontSize: 14, color: '#475569' }}>Introspecting schema…</span>
          </div>
        ) : null}
        {payload ? (
          payload.nodes.length === 0 ? (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#b45309', fontSize: 14 }}>
              Connected, but no tables were found in this database.
            </div>
          ) : (
            <DiagramCanvas
              payload={payload}
              visibleIds={visibleIds}
              onSelectNode={focusEnabled ? setFocusId : undefined}
              highlightId={highlightId}
              panRequest={panRequest}
            />
          )
        ) : (
          !loading && (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#94a3b8', fontSize: 14 }}>
              Connect to a database or load the demo schema to generate an ERD.
            </div>
          )
        )}
      </div>
    </div>
  )
}

function toolButton(active: boolean): React.CSSProperties {
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
