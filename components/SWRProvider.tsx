'use client'

import { SWRConfig } from 'swr'
import { fetchApi } from '@/lib/api/client'

type Props = {
  children: React.ReactNode
}

export default function SWRProvider({ children }: Props) {
  return (
    <SWRConfig
      value={{
        fetcher: fetchApi,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        refreshInterval: 15_000, // Real-time polling every 15s
        dedupingInterval: 10_000,
        errorRetryCount: 3,
        errorRetryInterval: 5_000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
