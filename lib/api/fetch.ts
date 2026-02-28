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
  } catch { }
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

/**
 * 401 durumunda redirect YAPMAYAN güvenli fetch.
 * NotificationBell, BayiOrderAlertBanner, NotificationToaster gibi bileşenlerde kullanın;
 * token süresi dolunca 401 → redirect → sayfa yenilenir → zil tekrar istek atar = sonsuz döngü olmasın diye.
 * Hata/401'de sessizce null döner.
 */
export async function safeFetch<T = unknown>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const headers = { ...getAuthHeaders(), ...(init?.headers as Record<string, string> || {}) }
    const res = await fetch(url, { credentials: 'include', ...init, headers })
    if (!res.ok) return null
    const json = await res.json()
    if (json && typeof json === 'object' && 'success' in json && json.success && 'data' in json) return json.data as T
    return json as T
  } catch {
    return null
  }
}

/** Varsayılan API istek zaman aşımı (ms). Uzun rapor/export için init.signal ile geçersiz kılınabilir. */
export const API_REQUEST_TIMEOUT_MS = 60_000

/** Ağ hatası veya 5xx sonrası tekrar deneme sayısı */
const API_RETRY_COUNT = 1
const API_RETRY_DELAY_MS = 1_500

function isRetryable(error: unknown, status?: number): boolean {
  if (typeof status === 'number' && status >= 500) return true
  if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('network'))) return true
  return false
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

  const isClient = typeof window !== 'undefined'
  const timeoutMs = isClient && !init?.signal ? API_REQUEST_TIMEOUT_MS : undefined
  let lastError: Error | null = null
  let lastStatus: number | undefined

  for (let attempt = 0; attempt <= (isClient ? API_RETRY_COUNT : 0); attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, API_RETRY_DELAY_MS))
    }
    const controller = timeoutMs ? new AbortController() : null
    const timeoutId =
      isClient && controller && timeoutMs
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null
    const signal = init?.signal ?? controller?.signal

    try {
      const response = await fetch(input, {
        credentials: 'include',
        ...init,
        headers,
        signal,
      })
      if (timeoutId) clearTimeout(timeoutId)
      lastStatus = response.status
      let payload: unknown = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredAuthToken()
          if (typeof window !== 'undefined') {
            // SESSION_DISPLACED: Başka bir cihaz/tarayıcıdan giriş yapıldı → özel mesaj
            const isDisplaced = payload && typeof payload === 'object' && (payload as { code?: string }).code === 'SESSION_DISPLACED'
            import('@/lib/notify').then(({ toast }) => {
              if (isDisplaced) {
                toast.error('Başka bir cihaz veya tarayıcıdan giriş yapıldı. Oturumunuz sonlandırıldı.')
              } else {
                toast.info('Oturum süresi doldu. Giriş sayfasına yönlendiriliyorsunuz…')
              }
            }).catch(() => { })
            const path = window.location.pathname + window.location.search
            const isLoginPage = path.startsWith('/auth/login')
            const href = isLoginPage ? '/auth/login' : `/auth/login?returnUrl=${encodeURIComponent(path)}`
            window.location.href = href
            throw new Error('Yetkilendirme gerekli')
          }
        }
        if (isApiEnvelope<T>(payload) && payload.success === false) {
          lastError = new Error(String(payload.error || 'Request failed'))
        } else if (payload && typeof payload === 'object' && 'error' in payload) {
          lastError = new Error(String((payload as { error?: unknown }).error || 'Request failed'))
        } else {
          const statusMsg = response.status ? ` (${response.status})` : ''
          lastError = new Error(response.statusText ? `${response.statusText}${statusMsg}` : `Request failed${statusMsg}`)
        }
        if (attempt < API_RETRY_COUNT && isRetryable(lastError, response.status)) continue
        if (response.status === 503 || response.status === 502 || response.status === 504) {
          lastError = new Error('Sunucu geçici olarak yanıt vermiyor. Lütfen kısa süre sonra tekrar deneyin.')
        }
        throw lastError
      }

      if (isApiEnvelope<T>(payload)) {
        if (payload.success) {
          if ('data' in payload && payload.data !== undefined) return payload.data
          return payload as unknown as T
        }
        lastError = new Error(String(payload.error))
        throw lastError
      }
      return payload as T
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)
      const isAbort = err instanceof Error && err.name === 'AbortError'
      if (isAbort) {
        lastError = new Error('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.')
        throw lastError
      }
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < API_RETRY_COUNT && isRetryable(lastError, lastStatus)) continue
      throw lastError
    }
  }

  throw lastError ?? new Error('Request failed')
}
