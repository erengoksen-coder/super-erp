'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Filters = Record<string, string | number | boolean | null>

export function useOptimizedRealtime<T>(
  table: string,
  filters?: Filters,
  options?: {
    debounce?: number
    maxRetries?: number
    retryDelay?: number
  }
) {
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const retryCount = useRef(0)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const maxRetries = options?.maxRetries ?? 3
  const retryDelay = options?.retryDelay ?? 1000
  const debounce = options?.debounce ?? 0

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
      retryCount.current = 0
    } catch (err) {
      if (retryCount.current < maxRetries) {
        retryCount.current += 1
        setTimeout(fetchData, retryDelay * retryCount.current)
      } else {
        setError(err as Error)
        setLoading(false)
      }
    }
  }, [table, JSON.stringify(filters || {}), maxRetries, retryDelay, supabase])

  const applyUpdate = useCallback((payload: any) => {
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
          return newData.filter((item: any) => item.id !== (payload.old as any).id)
        default:
          return newData
      }
    })
  }, [])

  useEffect(() => {
    fetchData()

    if (!supabase) {
      return
    }

    const channel = supabase
      .channel(`${table}-changes-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: { eventType: string; new?: unknown; old?: unknown }) => {
          if (debounce > 0) {
            if (debounceRef.current) {
              clearTimeout(debounceRef.current)
            }
            debounceRef.current = setTimeout(() => {
              applyUpdate(payload)
            }, debounce)
            return
          }

          applyUpdate(payload)
        }
      )
      .subscribe((status: string) => {
        if (status === 'TIMED_OUT') {
          supabase.removeChannel(channel)
          fetchData()
        }
      })

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [table, debounce, fetchData, applyUpdate, supabase])

  return { data, loading, error, refetch: fetchData }
}
