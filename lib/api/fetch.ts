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

const AUTH_TOKEN_KEY = 'auth-token'

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function clearStoredAuthToken(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {}
}

/** Ngrok uyarı sayfasını atlamak için header (sayfa ngrok URL'den açıksa). */
function getNgrokSkipHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const h = window.location.hostname || ''
  if (h.endsWith('ngrok-free.dev') || h.endsWith('ngrok.io') || h.endsWith('ngrok-free.app')) {
    return { 'ngrok-skip-browser-warning': 'true' }
  }
  return {}
}

/** API ve ngrok için ortak header'lar (Authorization + ngrok-skip-browser-warning). Doğrudan fetch çağrılarında kullanın. */
export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken()
  const ngrok = getNgrokSkipHeader()
  return { ...ngrok, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

export async function fetchApi<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
  const isOurApi = typeof url === 'string' && (url.startsWith('/api/') || url.includes('/api/'))
  const headers = new Headers(init?.headers)
  const ngrokSkip = getNgrokSkipHeader()
  Object.keys(ngrokSkip).forEach((k) => headers.set(k, ngrokSkip[k]))
  if (isOurApi) {
    const token = getStoredToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
    headers,
  })
  let payload: unknown = null

  try {
    payload = await response.json()
  } catch (error) {
    payload = null
  }

  if (!response.ok) {
    if (response.status === 401) clearStoredAuthToken()
    if (isApiEnvelope<T>(payload) && payload.success === false) {
      throw new Error(String(payload.error || 'Request failed'))
    }
    if (payload && typeof payload === 'object' && 'error' in payload) {
      throw new Error(String((payload as { error?: unknown }).error || 'Request failed'))
    }
    const statusMsg = response.status ? ` (${response.status})` : ''
    throw new Error(response.statusText ? `${response.statusText}${statusMsg}` : `Request failed${statusMsg}`)
  }

  if (isApiEnvelope<T>(payload)) {
    if (payload.success) {
      if ('data' in payload && payload.data !== undefined) {
        return payload.data
      }
      // Fallback for legacy responses that set success=true but omit data.
      return payload as unknown as T
    }
    throw new Error(payload.error)
  }

  return payload as T
}
