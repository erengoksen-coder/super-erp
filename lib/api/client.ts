'use client'

import useSWR, { KeyedMutator } from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useApi<T>(url: string | null): { 
  data: T | undefined, 
  error: any, 
  isLoading: boolean, 
  mutate: KeyedMutator<T> 
} {
  const { data, error, isLoading, mutate } = useSWR<T>(url, fetcher)
  
  return {
    data,
    error,
    isLoading,
    mutate
  }
}
