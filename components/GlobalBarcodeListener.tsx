'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

type BannerType = 'success' | 'error' | 'info'

type BannerState = {
  id: string
  type: BannerType
  message: string
}

type BarcodeApiItem = {
  barcode: string
  serial_number?: string
  product_name?: string
  sku?: string
  status?: string | null
  ready_for_shipment?: number | null
  shipment_date?: string | null
}

function formatStage(status?: string | null) {
  switch (status) {
    case 'in_production':
      return 'Üretimde'
    case 'in_stock':
      return 'Depoda'
    case 'available':
      return 'Depoda'
    case 'reserved':
      return 'Rezerve'
    case 'sold':
      return 'Satıldı'
    case 'shipped':
      return 'Sevk Edildi'
    default:
      return status || 'Bilinmiyor'
  }
}

function formatShipmentDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) return null
  return parsed.toLocaleDateString('tr-TR')
}

export default function GlobalBarcodeListener() {
  const pathname = usePathname()
  const [banners, setBanners] = useState<BannerState[]>([])
  const bufferRef = useRef('')
  const timerRef = useRef<number | null>(null)

  const pushBanner = useCallback((type: BannerType, message: string) => {
    setBanners((prev) => [
      { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, type, message },
      ...prev,
    ])
  }, [])

  const handleScan = useCallback(async (rawValue: string) => {
    const barcode = rawValue.trim()
    if (!barcode) return

    try {
      const response = await fetch(`/api/barcodes?barcode=${encodeURIComponent(barcode)}`)
      if (!response.ok) {
        pushBanner('error', `Barkod bulunamadı: ${barcode}`)
        return
      }

      const items = (await response.json()) as BarcodeApiItem[]
      if (!Array.isArray(items) || items.length === 0) {
        pushBanner('error', `Barkod bulunamadı: ${barcode}`)
        return
      }

      const item = items[0]
      const stage = formatStage(item.status)
      const shippedDate = item.status === 'shipped' ? formatShipmentDate(item.shipment_date) : null
      const productInfo = item.product_name ? ` • ${item.product_name}` : ''
      if (pathname?.startsWith('/shipments')) {
        if (item.ready_for_shipment) {
          window.dispatchEvent(
            new CustomEvent('barcode:scanned', {
              detail: { barcode, item },
            })
          )
          pushBanner('success', `Sevke eklendi: ${barcode}${productInfo}`)
        } else {
          const shippedSuffix = shippedDate ? ` • Sevk Tarihi: ${shippedDate}` : ''
          pushBanner('info', `Sevke hazır değil: ${barcode}${productInfo} • ${stage}${shippedSuffix}`)
        }
        return
      }

      window.dispatchEvent(
        new CustomEvent('barcode:scanned', {
          detail: { barcode, item },
        })
      )

      const shippedSuffix = shippedDate ? ` • Sevk Tarihi: ${shippedDate}` : ''
      pushBanner('success', `${barcode}${productInfo} • ${stage}${shippedSuffix}`)

      if (item.ready_for_shipment) {
        pushBanner('info', `Sevke hazır: ${barcode} • Sevkiyat ekranında onaylanabilir`)
      }
    } catch {
      pushBanner('error', `Barkod okunamadı: ${barcode}`)
    }
  }, [pathname, pushBanner])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }

      if (event.key === 'Enter') {
        const scanned = bufferRef.current
        bufferRef.current = ''
        if (scanned.length >= 6) {
          handleScan(scanned)
        }
        return
      }

      if (event.key.length === 1) {
        bufferRef.current += event.key
      }

      timerRef.current = window.setTimeout(() => {
        bufferRef.current = ''
      }, 300)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleScan])

  if (banners.length === 0) return null

  const colorMap: Record<BannerType, string> = {
    success: 'bg-green-900/80 border-green-700 text-green-100',
    error: 'bg-red-900/80 border-red-700 text-red-100',
    info: 'bg-blue-900/80 border-blue-700 text-blue-100',
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md space-y-2">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${colorMap[banner.type]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">{banner.message}</div>
            <button
              type="button"
              onClick={() => setBanners((prev) => prev.filter((b) => b.id !== banner.id))}
              className="text-xs text-white/80 hover:text-white"
            >
              Tamam
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
