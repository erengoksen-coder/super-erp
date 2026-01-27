import useSWR, { type SWRConfiguration } from 'swr'
import { fetchApi } from '@/lib/api/fetch'

export function useApi<T>(
  key: string | null,
  config?: SWRConfiguration<T, Error>
) {
  return useSWR<T, Error>(key, fetchApi, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 30_000,
    errorRetryCount: 2,
    errorRetryInterval: 5_000,
    ...config,
  })
}

export { fetchApi }
