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
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 30_000,
        errorRetryCount: 2,
        errorRetryInterval: 5_000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
