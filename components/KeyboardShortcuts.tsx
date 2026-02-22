'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/** N = Yeni (fatura/sipariş/sevkiyat/cari), S = Arama kutusuna odaklan */
export function KeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable
      if (isInput) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const key = e.key.toLowerCase()
      if (key === 'n') {
        if (pathname?.startsWith('/invoices')) {
          e.preventDefault()
          router.push('/invoices/new')
        } else if (pathname?.startsWith('/orders')) {
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('open-create-order-modal'))
        } else if (pathname?.startsWith('/shipments')) {
          e.preventDefault()
          router.push('/shipments/new')
        } else if (pathname?.startsWith('/accounts')) {
          e.preventDefault()
          router.push('/accounts/new')
        }
      }
      if (key === 's') {
        const search = document.querySelector<HTMLInputElement>('input[placeholder*="ara"], input[placeholder*="Ara"], input[type="search"]')
        if (search && (pathname?.startsWith('/orders') || pathname?.startsWith('/accounts') || pathname?.startsWith('/invoices') || pathname?.startsWith('/shipments'))) {
          e.preventDefault()
          search.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pathname, router])

  return null
}
