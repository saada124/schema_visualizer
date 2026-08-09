import { useState, type FormEvent } from 'react'

interface ConnectionFormProps {
  onConnect: (connectionString: string) => void
  onLoadDemo: () => void
  loading: boolean
}

export function ConnectionForm({ onConnect, onLoadDemo, loading }: ConnectionFormProps) {
  const [value, setValue] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (value.trim()) onConnect(value.trim())
  }

  return (
    <form
      onSubmit={submit}
      style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 16px' }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="postgresql://user:pass@host:5432/dbname  or  sqlite:///path/to.db"
        spellCheck={false}
        style={{
          flex: 1,
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          fontSize: 13,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        style={buttonStyle('#2563eb')}
      >
        {loading ? 'Connecting…' : 'Connect'}
      </button>
      <button type="button" onClick={onLoadDemo} disabled={loading} style={buttonStyle('#059669')}>
        Load demo schema
      </button>
    </form>
  )
}

function buttonStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}
