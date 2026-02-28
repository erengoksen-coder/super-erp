import useSWR, { type SWRConfiguration } from 'swr'
import { fetchApi, getAuthHeaders, clearStoredAuthToken, safeFetch } from '@/lib/api/fetch'

export function useApi<T>(
  key: string | null,
  config?: SWRConfiguration<T, Error>
) {
  return useSWR<T, Error>(key, fetchApi, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
    refreshInterval: 15_000,
    errorRetryCount: 2,
    errorRetryInterval: 5_000,
    ...config,
  })
}

export type PaginatedMeta = { total: number; limit: number; offset: number }

export type PaginatedResponse<T> = { list: T[]; meta: PaginatedMeta }

async function fetchPaginatedApi<T>(url: string): Promise<PaginatedResponse<T>> {
  const res = await fetch(url, { credentials: 'include', headers: getAuthHeaders(), cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = json?.error ?? res.statusText
    throw new Error(typeof err === 'string' ? err : 'İstek başarısız')
  }
  const list = Array.isArray(json?.data) ? json.data : []
  const meta = json?.meta ?? {}
  return {
    list,
    meta: {
      total: typeof meta.total === 'number' ? meta.total : list.length,
      limit: typeof meta.limit === 'number' ? meta.limit : 50,
      offset: typeof meta.offset === 'number' ? meta.offset : 0,
    },
  }
}

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

export { fetchApi, getAuthHeaders, clearStoredAuthToken, safeFetch }
