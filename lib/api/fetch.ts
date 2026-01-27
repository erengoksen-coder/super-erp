export type ApiSuccess<T> = {
  success: true
  data: T
  message?: string
}

export type ApiError = {
  success: false
  error: string
  details?: unknown
}

type ApiEnvelope<T> = ApiSuccess<T> | ApiError

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value
  )
}

export async function fetchApi<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init)
  let payload: unknown = null

  try {
    payload = await response.json()
  } catch (error) {
    payload = null
  }

  if (!response.ok) {
    if (isApiEnvelope<T>(payload) && payload.success === false) {
      throw new Error(payload.error)
    }
    if (payload && typeof payload === 'object' && 'error' in payload) {
      throw new Error(String((payload as { error?: unknown }).error || 'Request failed'))
    }
    throw new Error(response.statusText || 'Request failed')
  }

  if (isApiEnvelope<T>(payload)) {
    if (payload.success) {
      return payload.data
    }
    throw new Error(payload.error)
  }

  return payload as T
}
