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
  shipment_id?: string | null
  shipment_number?: string | null
  current_station?: string | null
  production_order_status?: string | null
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
  return parsed.toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
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
      
      // Debug: API'den gelen veriyi logla
      console.log('Barkod API yanıtı:', {
        barcode: item.barcode,
        status: item.status,
        current_station: item.current_station,
        production_order_status: item.production_order_status,
        production_order_id: item.production_order_id
      })
      
      // Sevk edilmiş ürün kontrolü (öncelikli)
      const isShipped = !!(item.shipment_id || item.shipment_date || item.status === 'shipped')
      const shippedDate = isShipped ? formatShipmentDate(item.shipment_date) : null
      const shipmentNumber = item.shipment_number || null
      
      // Üretim aşaması bilgisini al
      // Öncelik: current_station (her zaman öncelikli, production_order_status kontrolüne bağlı değil)
      let stage = formatStage(item.status)
      
      // Sevk edilmiş ürünler için özel mesaj
      if (isShipped) {
        stage = 'Sevk Edildi'
        const shipmentInfo = shipmentNumber ? ` • Sevk No: ${shipmentNumber}` : ''
        const dateInfo = shippedDate ? ` • ${shippedDate}` : ''
        const productInfo = item.product_name ? ` • ${item.product_name}` : ''
        
        window.dispatchEvent(
          new CustomEvent('barcode:scanned', {
            detail: { barcode, item },
          })
        )
        
        pushBanner('success', `${barcode}${productInfo} • ${stage}${shipmentInfo}${dateInfo}`)
        return
      }
      
      // current_station varsa ve boş değilse, MUTLAKA onu göster (production_order_status kontrolü yok)
      if (item.current_station && String(item.current_station).trim() !== '' && item.current_station !== null) {
        const stationKey = String(item.current_station).toLowerCase().trim()
        
        // completed durumu için özel mesaj
        if (stationKey === 'completed') {
          stage = 'Mamül Depoda'
          console.log('Aşama belirlendi (current_station):', stage, 'stationKey:', stationKey)
        } else {
          const stationMap: Record<string, string> = {
            iskelet: 'İskelet',
            terzihane: 'Terzihane',
            döşeme: 'Döşeme',
            doseme: 'Döşeme',
            döseme: 'Döşeme',
            berjer: 'Berjer',
            montaj: 'Montaj',
            sevkiyat: 'Sevkiyat',
          }
          const stationName = stationMap[stationKey] || item.current_station
          stage = `${stationName} aşamasında`
          console.log('Aşama belirlendi (current_station):', stage, 'stationKey:', stationKey)
        }
      } else if (item.production_order_status && item.production_order_status !== 'completed') {
        // current_station yoksa ama üretim devam ediyorsa, genel "Üretimde" göster
        stage = 'Üretimde'
        console.log('Aşama belirlendi (production_order_status):', stage)
      } else {
        console.log('Aşama belirlendi (status):', stage)
      }
      
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
          pushBanner('info', `Sevke hazır değil: ${barcode}${productInfo} • ${stage}`)
        }
        return
      }

      window.dispatchEvent(
        new CustomEvent('barcode:scanned', {
          detail: { barcode, item },
        })
      )

      pushBanner('success', `${barcode}${productInfo} • ${stage}`)

      if (item.ready_for_shipment) {
        pushBanner('info', `Sevke hazır: ${barcode} • Sevkiyat ekranında onaylanabilir`)
      }
    } catch {
      pushBanner('error', `Barkod okunamadı: ${barcode}`)
    }
  }, [pathname, pushBanner])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Güvenli kontrol: event.key undefined olabilir Edge'de
      if (!event || !event.key) return
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) {
        return
      }

      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }

      const key = String(event.key || '')

      if (key === 'Enter') {
        const scanned = bufferRef.current
        bufferRef.current = ''
        if (scanned && scanned.length >= 6) {
          handleScan(scanned)
        }
        return
      }

      if (key && key.length === 1) {
        bufferRef.current += key
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
