import type { ApiError } from '../api/types'

const KIND_STYLE: Record<string, { bg: string; fg: string; title: string }> = {
  connection: { bg: '#fee2e2', fg: '#991b1b', title: 'Connection failed' },
  timeout: { bg: '#fef3c7', fg: '#92400e', title: 'Introspection timed out' },
  not_connected: { bg: '#f1f5f9', fg: '#334155', title: 'Not connected' },
  network: { bg: '#fee2e2', fg: '#991b1b', title: 'Backend unreachable' },
  ai: { bg: '#fef3c7', fg: '#92400e', title: 'AI provider error' },
}

export function ErrorBanner({ error }: { error: ApiError }) {
  const style = KIND_STYLE[error.kind] ?? { bg: '#fee2e2', fg: '#991b1b', title: 'Error' }
  return (
    <div
      style={{
        background: style.bg,
        color: style.fg,
        padding: '10px 16px',
        fontSize: 13,
        display: 'flex',
        gap: 8,
        alignItems: 'baseline',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <strong>{style.title}:</strong>
      <span>{error.message}</span>
      {error.kind === 'timeout' ? <em>(Try refresh, or connect to one schema only)</em> : null}
    </div>
  )
}
