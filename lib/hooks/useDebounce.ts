'use client'

import { useState, useEffect } from 'react'

/**
 * Değeri geciktirir; arama/filtre input'larında gereksiz render ve API çağrılarını azaltır.
 * @param value - Debounce uygulanacak değer
 * @param delayMs - Gecikme (ms)
 * @returns Geciktirilmiş değer
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debouncedValue
}
