'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Filters = Record<string, string | number | boolean | null>

const buildFilterString = (filters?: Filters) => {
  if (!filters) return undefined
  const entries = Object.entries(filters)
  if (entries.length === 0) return undefined

  const [key, value] = entries[0]
  if (value === null) {
    return `${key}=is.null`
  }
  return `${key}=eq.${value}`
}

export function useRealtime<T>(table: string, filters?: Filters) {
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const filterKey = useMemo(() => JSON.stringify(filters || {}), [filters])
  const realtimeFilter = useMemo(() => buildFilterString(filters), [filterKey])

  const fetchData = useCallback(async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase ayarlari bulunamadi.')
      }
      let query = supabase.from(table).select('*')

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value === null) {
            query = query.is(key, null)
          } else {
            query = query.eq(key, value)
          }
        })
      }

      const { data: initialData, error: fetchError } = await query
      if (fetchError) {
        throw fetchError
      }

      setData(initialData || [])
      setLoading(false)
    } catch (err) {
      setError(err as Error)
      setLoading(false)
    }
  }, [table, filterKey, supabase])

  useEffect(() => {
    fetchData()

    if (!supabase) {
      return
    }

    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(realtimeFilter ? { filter: realtimeFilter } : {}),
        },
        (payload) => {
          setData((prev) => {
            const newData = [...prev]

            switch (payload.eventType) {
              case 'INSERT':
                return [...newData, payload.new as T]
              case 'UPDATE':
                return newData.map((item: any) =>
                  item.id === (payload.new as any).id ? payload.new : item
                )
              case 'DELETE':
                return newData.filter(
                  (item: any) => item.id !== (payload.old as any).id
                )
              default:
                return newData
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, realtimeFilter, fetchData, supabase])

  return { data, loading, error, refetch: fetchData }
}
