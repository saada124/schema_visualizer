import type { SchemaPayload } from '../api/types'

export function WarningBanner({ payload }: { payload: SchemaPayload }) {
  const problems = [
    ...payload.warnings,
    ...payload.skippedTables.map((t) => `Skipped '${t.name}': ${t.reason}`),
  ]
  if (problems.length === 0) return null
  return (
    <div
      style={{
        background: '#fefce8',
        color: '#713f12',
        borderBottom: '1px solid #fde68a',
        padding: '8px 16px',
        fontSize: 12,
      }}
    >
      <strong>Partial schema — {problems.length} issue{problems.length === 1 ? '' : 's'}:</strong>
      <ul style={{ margin: '4px 0 0 20px' }}>
        {problems.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  )
}
