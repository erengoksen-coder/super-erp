import { useEffect, useCallback } from 'react'

type KeyCombo = string | { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }

interface HotkeyConfig {
  enabled?: boolean
  preventDefault?: boolean
}

/**
 * useHotkeys
 * 
 * Global keyboard shortcuts for Super ERP
 * Usage: useHotkeys('n', () => router.push('/orders/new'))
 */
export function useHotkeys(
  combo: KeyCombo,
  callback: (e: KeyboardEvent) => void,
  config: HotkeyConfig = {}
) {
  const { enabled = true, preventDefault = true } = config

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return

    // Target check: Don't trigger when typing in inputs/textareas
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    let isMatch = false

    if (typeof combo === 'string') {
      isMatch = e.key.toLowerCase() === combo.toLowerCase()
    } else {
      isMatch = 
        e.key.toLowerCase() === combo.key.toLowerCase() &&
        (!!combo.ctrl === e.ctrlKey) &&
        (!!combo.shift === e.shiftKey) &&
        (!!combo.alt === e.altKey) &&
        (!!combo.meta === e.metaKey)
    }

    if (isMatch) {
      if (preventDefault) e.preventDefault()
      callback(e)
    }
  }, [combo, callback, enabled, preventDefault])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
