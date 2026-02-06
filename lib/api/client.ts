import useSWR, { type SWRConfiguration } from 'swr'
import { fetchApi, getAuthHeaders, clearStoredAuthToken } from '@/lib/api/fetch'

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

export { fetchApi, getAuthHeaders, clearStoredAuthToken }
