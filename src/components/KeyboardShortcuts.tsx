'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X, Keyboard } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'

/** Klavye kısayolları: N/S (mevcut) + Alt+1-6 navigasyon + ? overlay */
export function KeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const [showPanel, setShowPanel] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

    // ? tuşu ile panel aç/kapat (input dışında)
    if (e.key === '?' && !isInput && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      setShowPanel(o => !o)
      return
    }
    // Ctrl+/ ile panel aç/kapat
    if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      setShowPanel(o => !o)
      return
    }
    // Escape panel kapat
    if (e.key === 'Escape' && showPanel) {
      setShowPanel(false)
      return
    }

    // Alt+1-6 navigasyon
    if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
      const navMap: Record<string, string> = {
        '1': '/', '2': '/dashboard', '3': '/orders',
        '4': '/inventory', '5': '/production', '6': '/reports',
      }
      if (navMap[e.key]) {
        e.preventDefault()
        router.push(navMap[e.key])
        return
      }
    }

    // Mevcut N/S kısayolları (input dışında, modifier yok)
    if (isInput) return
    if (e.ctrlKey || e.metaKey || e.altKey) return

    const key = e.key.toLowerCase()
    if (key === 'n') {
      if (pathname?.startsWith('/invoices')) {
        e.preventDefault(); router.push('/invoices/new')
      } else if (pathname?.startsWith('/orders')) {
        e.preventDefault(); window.dispatchEvent(new CustomEvent('open-create-order-modal'))
      } else if (pathname?.startsWith('/shipments')) {
        e.preventDefault(); router.push('/shipments/new')
      } else if (pathname?.startsWith('/accounts')) {
        e.preventDefault(); router.push('/accounts/new')
      }
    }
    if (key === 's') {
      const search = document.querySelector<HTMLInputElement>('input[placeholder*="ara"], input[placeholder*="Ara"], input[type="search"]')
      if (search && (pathname?.startsWith('/orders') || pathname?.startsWith('/accounts') || pathname?.startsWith('/invoices') || pathname?.startsWith('/shipments'))) {
        e.preventDefault(); search.focus()
      }
    }
  }, [pathname, router, showPanel])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!showPanel) return null

  const categories = [
    {
      name: 'Navigasyon',
      items: [
        { keys: ['Alt', '1'], label: 'Ana Sayfa' },
        { keys: ['Alt', '2'], label: 'Kontrol Paneli' },
        { keys: ['Alt', '3'], label: 'Siparişler' },
        { keys: ['Alt', '4'], label: 'Stok' },
        { keys: ['Alt', '5'], label: 'Üretim' },
        { keys: ['Alt', '6'], label: 'Raporlar' },
      ],
    },
    {
      name: 'İşlemler',
      items: [
        { keys: ['Ctrl', 'K'], label: 'Arama aç' },
        { keys: ['N'], label: 'Yeni kayıt oluştur' },
        { keys: ['S'], label: 'Arama kutusuna odaklan' },
        { keys: ['Escape'], label: 'Modal kapat' },
      ],
    },
    {
      name: 'Genel',
      items: [
        { keys: ['?'], label: 'Kısayollar paneli' },
        { keys: ['Ctrl', '/'], label: 'Kısayollar paneli' },
      ],
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowPanel(false)}>
      <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Keyboard className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Klavye Kısayolları</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">Hızlı navigasyon ve işlem kısayolları</p>
              </div>
            </div>
            <button onClick={() => setShowPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">
            {categories.map(cat => (
              <div key={cat.name}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">{cat.name}</h3>
                <div className="space-y-2">
                  {cat.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700 dark:text-slate-300">{item.label}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, ki) => (
                          <span key={ki}>
                            {ki > 0 && <span className="text-gray-400 mx-0.5">+</span>}
                            <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-xs font-mono text-gray-600 dark:text-slate-300 shadow-sm">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">?</kbd> tuşuna basarak bu paneli açıp kapatabilirsiniz
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
