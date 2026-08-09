import { useState } from 'react'
import { explainSchema } from '../api/client'

const KEY_STORAGE = 'schema-visualizer.aiKey'

export function AiPanel() {
  const [hasKey, setHasKey] = useState(() => Boolean(localStorage.getItem(KEY_STORAGE)))
  const [key, setKey] = useState(() => localStorage.getItem(KEY_STORAGE) ?? '')
  const [model, setModel] = useState('gpt-4o-mini')
  const [open, setOpen] = useState(hasKey)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function saveKey() {
    if (key.trim()) {
      localStorage.setItem(KEY_STORAGE, key.trim())
      setHasKey(true)
      setOpen(true)
    }
  }

  function clearKey() {
    localStorage.removeItem(KEY_STORAGE)
    setHasKey(false)
    setOpen(false)
    setKey('')
  }

  async function run() {
    setLoading(true)
    setError('')
    setText('')
    const res = await explainSchema({ apiKey: key, model, provider: 'openai' })
    setLoading(false)
    if (res.ok) setText(res.data.text)
    else setError(res.error.message)
  }

  if (!hasKey) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AI API key (stored in this browser only)"
          style={inputStyle}
        />
        <button onClick={saveKey} disabled={!key.trim()} style={toolStyle}>
          Enable AI
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
      {open ? (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 380,
            maxHeight: 420,
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
            padding: 12,
            zIndex: 20,
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="model" style={inputStyle} />
            <button onClick={run} disabled={loading} style={toolStyle}>
              {loading ? 'Thinking…' : 'Explain schema'}
            </button>
            <button onClick={clearKey} title="Remove key from this browser" style={toolStyle}>
              ✕
            </button>
          </div>
          {error ? <div style={{ color: '#b91c1c', marginBottom: 6 }}>{error}</div> : null}
          {text ? <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{text}</pre> : null}
        </div>
      ) : null}
      <button onClick={() => setOpen((o) => !o)} style={toolStyle}>
        AI Explain
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  width: 180,
}

const toolStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#334155',
  fontSize: 13,
  cursor: 'pointer',
}
