'use client'

import useSWR, { type SWRConfiguration, mutate } from 'swr'
import { secureFetchApi, getAuthHeaders } from './agi-core'

/**
 * OPTIMIZED API HOOKS - Client Side Only
 */

export function useApi<T>(
  key: string | null,
  config?: SWRConfiguration<T, Error>
) {
  return useSWR<T, Error>(key, secureFetchApi, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    revalidateIfStale: false,
    dedupingInterval: 10_000,
    keepPreviousData: true,
    ...config,
  }) as any
}

export type PaginatedMeta = { total: number; limit: number; offset: number }
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
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    revalidateIfStale: false,
    dedupingInterval: 10_000,
    keepPreviousData: true,
    errorRetryCount: 2,
    errorRetryInterval: 3_000,
    focusThrottleInterval: 30_000,
    ...config,
  }) as any
  return {
    ...swr,
    data: swr.data?.list ?? [],
    meta: swr.data?.meta ?? { total: 0, limit: 50, offset: 0 },
  }
}

export function useApiOnce<T>(
  key: string | null,
  config?: SWRConfiguration<T, Error>
) {
  return useSWR<T, Error>(key, secureFetchApi, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    errorRetryCount: 0,
    ...config,
  }) as any
}

/**
 * MUTATE HELPERS
 */

export async function refreshKey(key: string) {
  await mutate(key)
}

export async function refreshKeys(keys: string[]) {
  await Promise.all(keys.map(k => mutate(k)))
}

export async function optimisticUpdate<T>(
  key: string,
  updater: (old: T | undefined) => T,
  apiCall: () => Promise<T>
) {
  await mutate(key, updater, false)
  try {
    const newData = await apiCall()
    await mutate(key, newData, false)
  } catch (error) {
    await mutate(key)
    throw error
  }
}

// Explicitly export mutate for components to use
export { mutate }
