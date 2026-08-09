import { useState, type FormEvent, type ReactNode } from 'react'
import { explainSchema } from '../api/client'

const KEY_STORAGE = 'schema-visualizer.aiKey'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderBullets(text: string): ReactNode[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const content = line.startsWith('- ') ? line.slice(2) : line
      const parts: ReactNode[] = []
      content.split(/\*\*(.+?)\*\*/).forEach((seg, j) => {
        if (!seg) return
        parts.push(
          j % 2 === 1 ? (
            <strong key={j}>{escapeHtml(seg)}</strong>
          ) : (
            escapeHtml(seg)
          ),
        )
      })
      return (
        <li key={i} style={{ marginBottom: 5 }}>
          {parts}
        </li>
      )
    })
}

function maskedKey(key: string): string {
  if (!key) return 'none'
  const trimmed = key.trim()
  const tail = trimmed.length <= 4 ? '•'.repeat(trimmed.length) : `…${trimmed.slice(-4)}`
  return trimmed.startsWith('sk-or-') ? `or${tail}` : tail
}

export function AiPanel() {
  const [key, setKey] = useState(() => localStorage.getItem(KEY_STORAGE) ?? '')
  const [editing, setEditing] = useState(() => !localStorage.getItem(KEY_STORAGE))
  const [model, setModel] = useState(() => {
    const stored = localStorage.getItem(KEY_STORAGE) ?? ''
    return stored.startsWith('sk-or-') ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'
  })
  const [open, setOpen] = useState(() => Boolean(localStorage.getItem(KEY_STORAGE)))
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const savedKey = localStorage.getItem(KEY_STORAGE)
  const hasKey = Boolean(savedKey)

  function saveKey(e?: FormEvent) {
    e?.preventDefault()
    const trimmed = key.trim()
    if (trimmed) {
      localStorage.setItem(KEY_STORAGE, trimmed)
      setKey(trimmed)
      setEditing(false)
      setError('')
      setText('')
      setOpen(true)
    }
  }

  function startChange() {
    setKey(localStorage.getItem(KEY_STORAGE) ?? '')
    setEditing(true)
    setOpen(true)
  }

  function removeKey() {
    localStorage.removeItem(KEY_STORAGE)
    setKey('')
    setEditing(true)
    setOpen(false)
    setText('')
    setError('')
  }

  async function run() {
    setLoading(true)
    setError('')
    setText('')
    const res = await explainSchema({ apiKey: key.trim(), model, provider: 'openai' })
    setLoading(false)
    if (res.ok) setText(res.data.text)
    else setError(res.error.message)
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
      {editing ? (
        <form onSubmit={saveKey} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="OpenAI or OpenRouter API key (stored in this browser only)"
            style={inputStyle}
          />
          <button type="submit" disabled={!key.trim()} style={toolStyle}>
            {hasKey ? 'Save key' : 'Enable AI'}
          </button>
          {hasKey ? (
            <button type="button" onClick={removeKey} title="Remove key from this browser" style={toolStyle}>
              Remove
            </button>
          ) : null}
          {hasKey ? (
            <button type="button" onClick={startChange} title="Cancel, keep the stored key" style={toolStyle}>
              Cancel
            </button>
          ) : null}
        </form>
      ) : (
        <>
          <button onClick={() => setOpen((o) => !o)} style={toolStyle}>
            AI Explain
          </button>
          <span style={{ fontSize: 12, color: '#64748b' }} title="Stored in this browser only">
            key {maskedKey(savedKey ?? '')}
          </span>
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
                {text ? (
                  <>
                    <button onClick={copyText} style={toolStyle}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button onClick={run} disabled={loading} title="Run the explanation again" style={toolStyle}>
                      Regenerate
                    </button>
                  </>
                ) : null}
                <button onClick={startChange} title="Change the stored API key" style={toolStyle}>
                  Change key
                </button>
              </div>
              {error ? <div style={{ color: '#b91c1c', marginBottom: 6 }}>{error}</div> : null}
              {text ? (
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>{renderBullets(text)}</ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}
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