'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { ArrowLeft, Package, Usb, Keyboard } from 'lucide-react'
import Link from 'next/link'

interface BarcodeDetails {
  barcode: string
  serial_number: string
  product_id: string
  sku: string
  product_name: string
  status?: string | null
  ready_for_shipment?: number | null
  sip_trh?: string
  takip_no?: string
  cari_adi?: string
  musteri_adi?: string
  konfigurasyon?: string
  aciklama?: string
  uretim_emri?: string
  production_order_status?: string | null
  current_station?: string | null
  production_order_number?: string | null
  customer_order_number?: string | null
  dealer_name?: string | null
  customer_name?: string | null
  order_date?: string | null
  configuration?: string | null
  notes?: string | null
  shipment_date?: string | null
}

interface TestBarcodeOption {
  barcode: string
  product_name?: string
  serial_number?: string
}

type ScanMode = 'barcode' | 'shipment'

export default function ScanBarcodePage() {
  const router = useRouter()
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null)
  const [scannedData, setScannedData] = useState<BarcodeDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hardwareMode, setHardwareMode] = useState(true)
  const [hardwareInput, setHardwareInput] = useState('')
  const [lastScan, setLastScan] = useState('')
  const [testBarcodes, setTestBarcodes] = useState<TestBarcodeOption[]>([])
  const [selectedTestBarcode, setSelectedTestBarcode] = useState('')
  const [loadingTestBarcodes, setLoadingTestBarcodes] = useState(false)
  const [scanMode, setScanMode] = useState<ScanMode>('barcode')
  const [shipmentMatch, setShipmentMatch] = useState<BarcodeDetails | null>(null)
  const [markingReady, setMarkingReady] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const scanBufferRef = useRef('')
  const scanTimerRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // QR kod tarayıcıyı başlat (container hazır değilse çık)
    const container = document.getElementById('qr-reader')
    if (!container) {
      console.error('QR reader container bulunamadı.')
      return
    }

    let html5QrcodeScanner: Html5QrcodeScanner | null = null
    try {
      html5QrcodeScanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          qrbox: { width: 250, height: 250 },
          fps: 10,
          aspectRatio: 1.0
        },
        false // verbose
      )

      html5QrcodeScanner.render(
        (decodedText) => {
          handleDecodedText(decodedText)
        },
        () => {
          // Hata mesajlarını görmezden gel (sürekli tarama yapıyor)
        }
      )

      setScanner(html5QrcodeScanner)
    } catch (error) {
      console.error('QR reader başlatılamadı:', error)
    }

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear()
      }
    }
  }, [])

  useEffect(() => {
    let active = true
    async function loadTestBarcodes() {
      setLoadingTestBarcodes(true)
      try {
        const response = await fetch('/api/barcodes')
        if (!response.ok) return
        const data = await response.json()
        const list = Array.isArray(data) ? data : []
        const options = list.slice(0, 20).map((item) => ({
          barcode: item.barcode,
          product_name: item.product_name,
          serial_number: item.serial_number,
        }))
        if (active) {
          setTestBarcodes(options)
          if (options.length > 0) {
            setSelectedTestBarcode(options[0].barcode)
          }
        }
      } catch {
        if (active) {
          setTestBarcodes([])
        }
      } finally {
        if (active) setLoadingTestBarcodes(false)
      }
    }

    loadTestBarcodes()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (hardwareMode && inputRef.current) {
      inputRef.current.focus()
    }
  }, [hardwareMode, scannedData, shipmentMatch, scanMode])

  function formatStage(data: BarcodeDetails) {
    const status = data.status || ''
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
        return status || '-'
    }
  }

  function getStageMessage(data: BarcodeDetails) {
    if (data.ready_for_shipment) return 'Sevk edileceklerde'
    if (data.shipment_date || data.status === 'shipped') return 'Sevk edildi'
    if (data.production_order_status && data.production_order_status !== 'completed') {
      const stationMap: Record<string, string> = {
        iskelet: 'İskelet',
        terzihane: 'Terzihane',
        döşeme: 'Döşeme',
        doseme: 'Döşeme',
        montaj: 'Montaj',
        sevkiyat: 'Sevkiyat',
      }
      const station = data.current_station ? (stationMap[data.current_station] || data.current_station) : 'Üretim'
      return `${station} aşamasında`
    }
    if (data.status === 'in_stock' || data.status === 'available') return 'Hammadde depoda'
    return formatStage(data)
  }

  function normalizeDetails(data: BarcodeDetails) {
    return {
      sip_trh: data.sip_trh || data.order_date || '',
      takip_no: data.takip_no || data.customer_order_number || '',
      cari_adi: data.cari_adi || data.dealer_name || '',
      musteri_adi: data.musteri_adi || data.customer_name || '',
      konfigurasyon: data.konfigurasyon || data.configuration || '',
      aciklama: data.aciklama || data.notes || '',
      uretim_emri: data.uretim_emri || data.production_order_number || '',
    }
  }

  useEffect(() => {
    if (!hardwareMode) return

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      if (target && inputRef.current && target === inputRef.current) {
        return
      }

      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current)
      }

      if (event.key === 'Enter') {
        const value = scanBufferRef.current
        scanBufferRef.current = ''
        if (value.trim()) {
          lookupBarcode(value).catch((e) => setError(e.message))
        }
        return
      }

      if (event.key.length === 1) {
        scanBufferRef.current += event.key
      }

      scanTimerRef.current = window.setTimeout(() => {
        scanBufferRef.current = ''
      }, 300)
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [hardwareMode, scanMode])

  async function handleDecodedText(decodedText: string) {
    setError(null)
    const raw = decodedText?.trim()
    if (!raw) return

    try {
      // QR kod içeriği JSON olabilir, barcode alanını al
      let barcodeValue = raw
      try {
        const parsed = JSON.parse(raw)
        barcodeValue = parsed?.barcode || raw
      } catch {
        // raw barcode
      }

      await lookupBarcode(barcodeValue)
    } catch (e: any) {
      setError(e?.message || 'Barkod okunamadı')
    }
  }

  async function lookupBarcode(barcodeValue: string) {
    const cleaned = barcodeValue.trim()
    if (!cleaned) return
    setLastScan(cleaned)
    setHardwareInput('')
    setShipmentMatch(null)
    setRedirecting(false)

    if (scanMode === 'shipment') {
      const response = await fetch(`/api/shipments/ready-items?barcode=${encodeURIComponent(cleaned)}`)
      if (response.ok) {
        const payload = await response.json()
        const item =
          (payload?.data?.item as BarcodeDetails | undefined) ??
          (payload?.item as BarcodeDetails | undefined)
        if (item) {
          setShipmentMatch(item)
          setRedirecting(true)
          setTimeout(() => {
            router.push(`/shipments?mode=ready&barcode=${encodeURIComponent(cleaned)}`)
          }, 400)
          return
        }
      }

      // Sevke hazır değilse otomatik hazırla ve detay getir
      setMarkingReady(true)
      try {
        const readyResponse = await fetch('/api/shipments/ready-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode: cleaned, ready: true }),
        })
        if (!readyResponse.ok) {
          if (readyResponse.status === 404) {
            throw new Error('Barkod sisteme kayıtlı değildir')
          }
          throw new Error('Sevke hazırlanamadı')
        }

        const detailResponse = await fetch(`/api/shipments/ready-items?barcode=${encodeURIComponent(cleaned)}`)
        if (!detailResponse.ok) {
          if (detailResponse.status === 404) {
            throw new Error('Barkod sisteme kayıtlı değildir')
          }
          throw new Error('Sevke hazır ürün bulunamadı')
        }
        const payload = await detailResponse.json()
        const item =
          (payload?.data?.item as BarcodeDetails | undefined) ??
          (payload?.item as BarcodeDetails | undefined)
        if (item) {
          setShipmentMatch(item)
          setRedirecting(true)
          setTimeout(() => {
            router.push(`/shipments?mode=ready&barcode=${encodeURIComponent(cleaned)}`)
          }, 400)
          return
        }
        throw new Error('Sevke hazır ürün bulunamadı')
      } finally {
        setMarkingReady(false)
      }
    } else {
      const response = await fetch(`/api/barcodes?barcode=${encodeURIComponent(cleaned)}`)
      if (!response.ok) {
        throw new Error('Barkod sisteme kayıtlı değildir')
      }

      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0] as BarcodeDetails
        setScannedData(item)
        if (scanner) {
          scanner.clear()
          setScanner(null)
        }
        return
      }

      throw new Error('Barkod sisteme kayıtlı değildir')
    }
  }

  function handleHardwareKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!hardwareMode) return
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current)
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const value = scanBufferRef.current || hardwareInput
      scanBufferRef.current = ''
      setHardwareInput('')
      if (value.trim()) {
        lookupBarcode(value).catch((e) => setError(e.message))
      }
      return
    }

    if (event.key.length === 1) {
      scanBufferRef.current += event.key
      setHardwareInput(scanBufferRef.current)
    }

    scanTimerRef.current = window.setTimeout(() => {
      scanBufferRef.current = ''
      setHardwareInput('')
    }, 300)
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/barcodes"
            className="flex items-center space-x-2 text-white hover:text-gray-300 transition"
          >
            <ArrowLeft size={20} />
            <span>Geri Dön</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Barkod/QR Kod Okut</h1>
          <div className="w-24"></div> {/* Spacer */}
        </div>

        {(scannedData || shipmentMatch) ? (
          /* Detaylar Göster - Etiket Görünümü */
          <div className="bg-gray-900 rounded-lg border-2 border-gray-600 p-4">
            {scanMode === 'shipment' && markingReady && (
              <div className="mb-4 rounded-lg border border-yellow-700 bg-yellow-900/30 p-3 text-sm text-yellow-200">
                Sevke hazırlanıyor...
              </div>
            )}
            {scanMode === 'shipment' && redirecting && (
              <div className="mb-4 rounded-lg border border-blue-700 bg-blue-900/30 p-3 text-sm text-blue-200">
                Sevkiyat ekranına yönlendiriliyor...
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const data = shipmentMatch || scannedData
                if (!data) return null
                const normalized = normalizeDetails(data)
                return (
                  <>
              <div>
                <div className="text-xs text-gray-400 mb-1">BARKOD</div>
                    <div className="text-white text-sm font-mono">{data.barcode}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">SERİ NO</div>
                    <div className="text-white text-sm font-mono">{data.serial_number}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                    <div className="text-white text-sm font-bold">{data.product_name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">SKU</div>
                    <div className="text-white text-sm">{data.sku}</div>
              </div>
              {data.status && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">AŞAMA</div>
                  <div className="text-white text-sm font-semibold">{formatStage(data)}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-400 mb-1">DURUM MESAJI</div>
                <div className="text-white text-sm font-semibold">{getStageMessage(data)}</div>
              </div>
              {typeof data.ready_for_shipment === 'number' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">SEVK DURUMU</div>
                  <div className={`text-sm font-semibold ${data.ready_for_shipment ? 'text-green-400' : 'text-yellow-400'}`}>
                    {data.ready_for_shipment ? 'Sevke Hazır' : 'Sevke Hazır Değil'}
                  </div>
                </div>
              )}
                  {normalized.sip_trh && (
              <div>
                <div className="text-xs text-gray-400 mb-1">ÜRETİM TARİHİ</div>
                      <div className="text-white text-sm">{normalized.sip_trh}</div>
              </div>
                  )}
                  {normalized.uretim_emri && normalized.uretim_emri !== '-' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">ÜRETİM EMRİ</div>
                      <div className="text-white text-sm font-mono">{normalized.uretim_emri}</div>
                </div>
              )}
                  {normalized.cari_adi && normalized.cari_adi !== '-' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                      <div className="text-white text-sm">{normalized.cari_adi}</div>
                </div>
              )}
                  {normalized.musteri_adi && normalized.musteri_adi !== '-' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                      <div className="text-white text-sm">{normalized.musteri_adi}</div>
                </div>
              )}
                  {normalized.takip_no && normalized.takip_no !== '-' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">SİPARİŞ NO</div>
                      <div className="text-white text-sm font-mono">{normalized.takip_no}</div>
                </div>
              )}
                  {normalized.konfigurasyon && normalized.konfigurasyon !== '-' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">KONFİGÜRASYON</div>
                      <div className="text-white text-sm">{normalized.konfigurasyon}</div>
                </div>
              )}
                  {normalized.aciklama && normalized.aciklama !== '-' && (
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div>
                      <div className="text-white text-sm break-words whitespace-normal">{normalized.aciklama}</div>
                </div>
              )}
                  </>
                )
              })()}
            </div>

            <button
              onClick={() => {
                setScannedData(null)
                setShipmentMatch(null)
                setError(null)
                // Tarayıcıyı yeniden başlat
                window.location.reload()
              }}
              className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Yeni Tarama Yap
            </button>
          </div>
        ) : (
          /* QR Kod Tarayıcı */
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Usb className="w-4 h-4" />
                <span>USB Barkod Okuyucu</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setScanMode('barcode')}
                  className={`px-3 py-1 rounded ${
                    scanMode === 'barcode' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  Barkod Detayı
                </button>
                <button
                  onClick={() => setScanMode('shipment')}
                  className={`px-3 py-1 rounded ${
                    scanMode === 'shipment' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  Sevkiyat Okuma
                </button>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Usb className="w-4 h-4" />
                <span>USB Barkod Okuyucu</span>
              </div>
              <button
                onClick={() => {
                  setHardwareMode(!hardwareMode)
                  setError(null)
                  setHardwareInput('')
                  scanBufferRef.current = ''
                }}
                className={`px-3 py-1 rounded text-xs ${
                  hardwareMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                {hardwareMode ? 'Aktif' : 'Kapalı'}
              </button>
            </div>

            {hardwareMode && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
                <label className="block text-xs text-gray-400 mb-2">Tarayıcı Girişi</label>
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    value={hardwareInput}
                    onChange={(e) => setHardwareInput(e.target.value)}
                    onKeyDown={handleHardwareKeyDown}
                    placeholder="Barkodu okutun veya Enter ile onaylayın"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                  />
                </div>
                {lastScan && (
                  <div className="text-xs text-gray-400 mt-2">
                    Son okunan: <span className="text-white font-mono">{lastScan}</span>
                  </div>
                )}
                {scanMode === 'shipment' && shipmentMatch && (
                  <div className="mt-3 rounded-lg border border-green-700 bg-green-900/30 p-3 text-xs text-green-200">
                    Sevke hazır: {(shipmentMatch as BarcodeDetails | null)?.product_name || ''} ({(shipmentMatch as BarcodeDetails | null)?.sku || ''})
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
              <div className="text-xs text-gray-400 mb-2">Program içi test barkodu</div>
              {loadingTestBarcodes ? (
                <div className="text-xs text-gray-500">Yükleniyor...</div>
              ) : testBarcodes.length === 0 ? (
                <div className="text-xs text-gray-500">Kayıtlı barkod bulunamadı</div>
              ) : (
                <div className="flex flex-col md:flex-row gap-2">
                  <select
                    value={selectedTestBarcode}
                    onChange={(e) => setSelectedTestBarcode(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                  >
                    {testBarcodes.map((item) => (
                      <option key={item.barcode} value={item.barcode}>
                        {item.barcode} {item.product_name ? `- ${item.product_name}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTestBarcode) {
                        lookupBarcode(selectedTestBarcode).catch((e) => setError(e.message))
                      }
                    }}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    Test Et
                  </button>
                </div>
              )}
            </div>

            <div id="qr-reader" className="mb-4"></div>
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300">
                {error}
              </div>
            )}
            <p className="text-gray-400 text-center text-sm mt-4">
              QR kodu kameraya gösterin veya USB tarayıcı ile okutun
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

