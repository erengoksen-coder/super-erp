import useSWR, { type SWRConfiguration, mutate } from 'swr'
import { fetchApi, getAuthHeaders, clearStoredAuthToken } from '@/lib/api/fetch'
import { toast } from 'sonner'

/**
 * Premium API hook for single resources or collections.
 * Includes standardized intervals and retry counts for robust operations.
 */
export function useApi<T>(
  key: string | null,
  config?: SWRConfiguration<T, Error>
) {
  return useSWR<T, Error>(key, fetchApi, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
    refreshInterval: 15_000,
    errorRetryCount: 3,
    errorRetryInterval: 5_000,
    ...config,
  })
}

export type PaginatedMeta = { total: number; limit: number; offset: number; [key: string]: any }
export type PaginatedResponse<T> = { list: T[]; meta: PaginatedMeta }

async function fetchPaginatedApi<T>(url: string): Promise<PaginatedResponse<T>> {
  const res = await fetch(url, { credentials: 'include', headers: getAuthHeaders() })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = json?.error ?? res.statusText
    throw new Error(typeof err === 'string' ? err : 'Request failed')
  }
  const list = Array.isArray(json?.data) ? json.data : []
  const meta = json?.meta ?? {}
  return {
    list,
    meta: {
      ...meta,
      total: typeof meta.total === 'number' ? meta.total : list.length,
      limit: typeof meta.limit === 'number' ? meta.limit : 50,
      offset: typeof meta.offset === 'number' ? meta.offset : 0,
    },
  }
}

/**
 * Premium Paginated API hook.
 * Simplifies accessing lists and metadata.
 */
export function usePaginatedApi<T>(
  key: string | null,
  config?: SWRConfiguration<PaginatedResponse<T>, Error>
) {
  const swr = useSWR<PaginatedResponse<T>, Error>(key, fetchPaginatedApi, {
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
    ...config,
  })
  return {
    ...swr,
    data: swr.data?.list ?? [],
    meta: swr.data?.meta ?? { total: 0, limit: 50, offset: 0 },
  }
}

/**
 * Premium Action Helper.
 * Handles API calls with automatic toast feedback and optimistic mutation support.
 */
export async function fetchAction<T>(
  promise: Promise<T>,
  options: {
    loading?: string
    success?: string
    error?: string
    onSettled?: () => void
  } = {}
) {
  const { loading = 'İşlem yapılıyor...', success = 'İşlem başarıyla tamamlandı', error = 'Bir hata oluştu' } = options
  
  toast.promise(promise, {
    loading,
    success: (data: any) => data?.message || success,
    error: (err: any) => err?.message || error,
  })

  try {
    const result = await promise
    return result
  } finally {
    options.onSettled?.()
  }
}

/**
 * Unified Mutate helper for optimistic UI updates.
 */
export { mutate }
export { fetchApi, getAuthHeaders, clearStoredAuthToken }
