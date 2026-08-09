import type { ApiError, ApiResult, SchemaPayload } from './types'

const BASE = 'http://localhost:8000'

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const resp = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (resp.ok) {
      return { ok: true, data: (await resp.json()) as T }
    }
    const body = (await resp.json().catch(() => null)) as {
      error?: ApiError
    } | null
    return {
      ok: false,
      error: body?.error ?? { kind: 'unknown', message: `HTTP ${resp.status}` },
    }
  } catch {
    return {
      ok: false,
      error: {
        kind: 'network',
        message: `Cannot reach backend at ${BASE}. Is it running?`,
      },
    }
  }
}

export function connectSchema(connectionString: string) {
  return request<SchemaPayload>('/schema/connect', {
    method: 'POST',
    body: JSON.stringify({ connectionString }),
  })
}

export function getSchema() {
  return request<SchemaPayload>('/schema')
}

export function refreshSchema() {
  return request<SchemaPayload>('/schema/refresh', { method: 'POST' })
}

export function explainSchema(payload: {
  apiKey: string
  model: string
  provider: string
}) {
  return request<{ text: string }>('/ai/explain', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
