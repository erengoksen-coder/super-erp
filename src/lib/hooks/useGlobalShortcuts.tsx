'use client'

import { useEffect, useCallback, useMemo } from 'react'

export type ShortcutAction = 
  | 'newOrder'
  | 'newMaterial'
  | 'newProduct'
  | 'save'
  | 'search'
  | 'refresh'
  | 'escape'
  | 'help'
  | 'gotoDashboard'
  | 'gotoOrders'
  | 'gotoInventory'
  | 'gotoProduction'
  | 'gotoFinance'
  | 'gotoReports'

export interface ShortcutDefinition {
  key: string
  modifiers?: ('ctrl' | 'meta' | 'alt' | 'shift')[]
  action: ShortcutAction
  description: string
}

const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  { key: 'n', modifiers: ['ctrl'], action: 'newOrder', description: 'Yeni sipariş oluştur' },
  { key: 'm', modifiers: ['ctrl'], action: 'newMaterial', description: 'Yeni malzeme ekle' },
  { key: 'p', modifiers: ['ctrl'], action: 'newProduct', description: 'Yeni ürün ekle' },
  { key: 's', modifiers: ['ctrl'], action: 'save', description: 'Kaydet' },
  { key: 'k', modifiers: ['ctrl'], action: 'search', description: 'Arama aç' },
  { key: 'r', modifiers: ['ctrl'], action: 'refresh', description: 'Sayfayı yenile' },
  { key: 'Escape', action: 'escape', description: 'Kapat / İptal' },
  { key: '?', modifiers: ['shift'], action: 'help', description: 'Kısayolları göster' },
  { key: '1', modifiers: ['ctrl'], action: 'gotoDashboard', description: 'Ana panel' },
  { key: '2', modifiers: ['ctrl'], action: 'gotoOrders', description: 'Siparişler' },
  { key: '3', modifiers: ['ctrl'], action: 'gotoInventory', description: 'Envanter' },
  { key: '4', modifiers: ['ctrl'], action: 'gotoProduction', description: 'Üretim' },
  { key: '5', modifiers: ['ctrl'], action: 'gotoFinance', description: 'Finans' },
  { key: '6', modifiers: ['ctrl'], action: 'gotoReports', description: 'Raporlar' },
]

interface UseGlobalShortcutsOptions {
  enabled?: boolean
  customHandlers?: Partial<Record<ShortcutAction, () => void>>
  shortcuts?: ShortcutDefinition[]
}

export function useGlobalShortcuts(options: UseGlobalShortcutsOptions = {}) {
  const {
    enabled = true,
    customHandlers = {},
    shortcuts = DEFAULT_SHORTCUTS,
  } = options

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    const target = event.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable

    for (const shortcut of shortcuts) {
      const mods = shortcut.modifiers || []
      
      const ctrlMatch = mods.includes('ctrl') ? (event.ctrlKey || event.metaKey) : !event.ctrlKey
      const metaMatch = mods.includes('meta') ? event.metaKey : true
      const altMatch = mods.includes('alt') ? event.altKey : !event.altKey
      const shiftMatch = mods.includes('shift') ? event.shiftKey : !event.shiftKey

      if (
        event.key === shortcut.key &&
        ctrlMatch &&
        metaMatch &&
        altMatch &&
        shiftMatch
      ) {
        // Input alanlarında sadece Escape ve Ctrl+K çalışsın
        if (isInput && shortcut.action !== 'escape' && shortcut.action !== 'search') {
          continue
        }

        event.preventDefault()
        event.stopPropagation()

        const handler = customHandlers[shortcut.action]
        if (handler) {
          handler()
        }
        return
      }
    }
  }, [enabled, customHandlers, shortcuts])

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  return useMemo(() => ({
    shortcuts,
    shortcutsMap: Object.fromEntries(shortcuts.map(s => [s.action, s])),
  }), [shortcuts])
}

// Kısayol listesi döndüren yardımcı
export function getShortcutList(customHandlers?: Partial<Record<ShortcutAction, () => void>>) {
  return DEFAULT_SHORTCUTS.map(shortcut => ({
    ...shortcut,
    keys: [
      ...(shortcut.modifiers?.includes('ctrl') ? ['Ctrl'] : []),
      ...(shortcut.modifiers?.includes('alt') ? ['Alt'] : []),
      ...(shortcut.modifiers?.includes('shift') ? ['Shift'] : []),
      shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase(),
    ].join(' + '),
    active: !!customHandlers?.[shortcut.action],
  }))
}

// Kısayol tooltip bileşeni
export function ShortcutHint({ shortcut }: { shortcut: ShortcutDefinition }) {
  const keys = [
    ...(shortcut.modifiers?.includes('ctrl') ? ['⌘'] : []),
    ...(shortcut.modifiers?.includes('alt') ? ['⌥'] : []),
    ...(shortcut.modifiers?.includes('shift') ? ['⇧'] : []),
    shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase(),
  ]
  
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
      {keys.map((k, i) => (
        <kbd key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">
          {k}
        </kbd>
      ))}
    </span>
  )
}
