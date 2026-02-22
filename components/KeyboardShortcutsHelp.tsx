'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Keyboard } from 'lucide-react'
import { cn } from '@/lib/cn'

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: 'Ctrl + K', desc: 'Sayfa veya menü ara' },
  { keys: 'N', desc: 'Yeni (fatura / sipariş / sevkiyat / cari — bulunduğun sayfaya göre)' },
  { keys: 'S', desc: 'Arama kutusuna odaklan (sipariş, cari, fatura, sevkiyat sayfalarında)' },
  { keys: '? veya Ctrl + /', desc: 'Bu kısayol listesini aç/kapat' },
]

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  const toggle = useCallback(() => setOpen((o) => !o), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '?' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault()
        toggle()
        return
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-labelledby="shortcuts-title"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div
        className={cn(
          'bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-w-md w-full overflow-hidden',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-400" />
            Klavye kısayolları
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <ul className="p-4 space-y-3">
          {SHORTCUTS.map(({ keys, desc }) => (
            <li key={keys} className="flex items-start gap-3 text-sm">
              <kbd className="shrink-0 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-gray-300 font-mono text-xs">
                {keys}
              </kbd>
              <span className="text-gray-400 pt-0.5">{desc}</span>
            </li>
          ))}
        </ul>
        <p className="px-4 pb-4 text-xs text-gray-500">
          İpucu: Input veya textarea içindeyken tek harfli kısayollar (N, S) çalışmaz.
        </p>
      </div>
    </div>
  )
}
