'use client'

import { useEffect, useCallback } from 'react'

/**
 * Klavye kısayolu dinler.
 * @param key - Tuş (örn. 'Escape', 'k')
 * @param handler - Çalıştırılacak fonksiyon
 * @param options - ctrlKey, metaKey, shiftKey, altKey
 */
export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options?: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean; enabled?: boolean }
) {
  const enabled = options?.enabled !== false
  const callback = useCallback(
    (e: KeyboardEvent) => {
      const keyMatch = e.key === key || e.key.toLowerCase() === key.toLowerCase()
      if (!keyMatch) return
      if (options?.ctrlKey && !e.ctrlKey) return
      if (options?.metaKey && !e.metaKey) return
      if (options?.shiftKey && !e.shiftKey) return
      if (options?.altKey && !e.altKey) return
      e.preventDefault()
      handler()
    },
    [key, handler, options?.ctrlKey, options?.metaKey, options?.shiftKey, options?.altKey]
  )

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', callback)
    return () => window.removeEventListener('keydown', callback)
  }, [callback, enabled])
}
