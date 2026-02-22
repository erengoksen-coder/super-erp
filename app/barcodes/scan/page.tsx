'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  const [barcodeOkModalMessage, setBarcodeOkModalMessage] = useState<string | null>(null)
  const [cameraScanning, setCameraScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string>('')
  const scanBufferRef = useRef('')
  const scanTimerRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const html5QrCodeRef = useRef<any>(null)
  const handleDecodedTextRef = useRef<(text: string) => Promise<void>>(() => Promise.resolve())

  // Unmount: kamera kapat
  useEffect(() => {
    return () => {
      const q = html5QrCodeRef.current
      if (q) {
        q.stop().catch(() => {})
        q.clear().catch(() => {})
        html5QrCodeRef.current = null
      }
    }
  }, [])

  async function stopCameraScanner() {
    const q = html5QrCodeRef.current
    if (q) {
      try {
        await q.stop()
        await q.clear()
      } catch (_) {}
      html5QrCodeRef.current = null
    }
    setCameraScanning(false)
  }

  // Kamerayı doğrudan açar (Hızlı İşlem gibi; dosyadan tarama yok)
  useEffect(() => {
    if (!cameraScanning) return

    let cancelled = false
    const container = document.getElementById('qr-reader')
    if (!container) return

    const startCamera = async () => {
      await new Promise((r) => setTimeout(r, 400))
      if (cancelled) return

      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Kamera desteklenmiyor. USB okuyucu veya manuel giriş kullanın.')
        setCameraScanning(false)
        return
      }

      try {
        const html5QrcodeModule = await import('html5-qrcode')
        const Html5Qrcode = html5QrcodeModule.Html5Qrcode || html5QrcodeModule.default?.Html5Qrcode
        if (!Html5Qrcode) throw new Error('Html5Qrcode bulunamadı')

        const html5QrCode = new Html5Qrcode('qr-reader')
        html5QrCodeRef.current = html5QrCode

        let cameras: { id: string; label?: string }[] = []
        try {
          cameras = await Html5Qrcode.getCameras()
        } catch (_) {}

        const qrbox = (w: number, h: number) => {
          const s = Math.floor(Math.min(w, h) * 0.7)
          return { width: s, height: s }
        }
        const onScan = (decodedText: string) => {
          handleDecodedTextRef.current?.(decodedText)
        }
        const noop = () => {}

        let started = false

        try {
          await html5QrCode.start({ facingMode: 'environment' }, { fps: 5, qrbox }, onScan, noop)
          started = true
        } catch (_) {}

        if (!started && cameras.length > 0) {
          let cameraId: string | null = null
          for (const d of cameras) {
            const l = (d.label || '').toLowerCase()
            if (l.includes('back') || l.includes('rear') || l.includes('environment')) {
              cameraId = d.id
              break
            }
          }
          if (!cameraId) cameraId = cameras[cameras.length - 1]?.id ?? cameras[0]?.id
          if (cameraId) {
            try {
              await html5QrCode.start(cameraId, { fps: 5, qrbox }, onScan, noop)
              started = true
            } catch (_) {}
          }
        }

        if (!started && cameras.length > 0) {
          try {
            await html5QrCode.start(cameras[0].id, { fps: 5, qrbox }, onScan, noop)
            started = true
          } catch (_) {}
        }

        if (!started) {
          try {
            await html5QrCode.start({ facingMode: 'user' }, { fps: 5, qrbox }, onScan, noop)
            started = true
          } catch (_) {}
        }

        if (cancelled) {
          try {
            await html5QrCode.stop()
            await html5QrCode.clear()
          } catch (_) {}
          html5QrCodeRef.current = null
          return
        }
        if (!started) {
          const msg = 'Kamera açılamadı. USB okuyucu veya manuel giriş kullanın.'
          setCameraError(msg)
          setCameraScanning(false)
          try {
            await html5QrCode.clear()
          } catch (_) {}
          html5QrCodeRef.current = null
        } else {
          setCameraError('')
        }
      } catch (e: any) {
        if (!cancelled) {
          setCameraError(e?.message || 'Kamera açılamadı.')
          setCameraScanning(false)
        }
        const q = html5QrCodeRef.current
        if (q) {
          try {
            await q.clear()
          } catch (_) {}
          html5QrCodeRef.current = null
        }
      }
    }

    startCamera()
    return () => {
      cancelled = true
      const q = html5QrCodeRef.current
      if (q) {
        q.stop().catch(() => {})
        q.clear().catch(() => {})
        html5QrCodeRef.current = null
      }
    }
  }, [cameraScanning])

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

  /** Tek kaynak: AŞAMA, DURUM MESAJI ve SEVK DURUMU hep aynı gerçek duruma gore gosterilir. */
  function getUnifiedStatus(data: BarcodeDetails): { stage: string; message: string; shipmentLabel: string } {
    const stationMap: Record<string, string> = {
      iskelet: 'İskelet',
      terzihane: 'Terzihane',
      döşeme: 'Döşeme',
      doseme: 'Döşeme',
      montaj: 'Montaj',
      berjer: 'Berjer',
      sevkiyat: 'Sevkiyat',
    }
    // 1) Sevk edildiyse her yerde "Sevk edildi"
    if (data.shipment_date || data.status === 'shipped') {
      return { stage: 'Sevk Edildi', message: 'Sevk edildi', shipmentLabel: 'Sevk edildi' }
    }
    // 2) Sevke hazir
    if (data.ready_for_shipment) {
      return { stage: 'Sevke Hazır', message: 'Sevk edileceklerde', shipmentLabel: 'Sevke Hazır' }
    }
    // 3) Üretimde (emir tamamlanmamis veya status in_production)
    if (data.status === 'in_production' || (data.production_order_status && data.production_order_status !== 'completed')) {
      const station = data.current_station ? (stationMap[data.current_station] || data.current_station) : 'Üretim'
      return {
        stage: 'Üretimde',
        message: `${station} aşamasında`,
        shipmentLabel: 'Sevke Hazır Değil',
      }
    }
    // 4) Mamül depoda
    if (data.status === 'in_stock' || data.status === 'available') {
      return { stage: 'Mamül Depoda', message: 'Mamül depoda', shipmentLabel: 'Sevke Hazır Değil' }
    }
    // 5) Diger
    const status = data.status || ''
    const fallback = status === 'reserved' ? 'Rezerve' : status === 'sold' ? 'Satıldı' : status === 'pending' ? 'Beklemede' : status || '-'
    return { stage: fallback, message: fallback, shipmentLabel: 'Sevke Hazır Değil' }
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
    } finally {
      await stopCameraScanner()
    }
  }

  useEffect(() => {
    handleDecodedTextRef.current = handleDecodedText
  })

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
        setBarcodeOkModalMessage('Barkod okundu: ' + (item.product_name || item.sku || item.barcode))
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
      {/* Okunan barkod mesajı - Tamam'a basılana kadar ekranda kalır */}
      {barcodeOkModalMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">
          <div className="rounded-xl border-2 border-green-600 bg-green-900/95 p-6 max-w-md w-full shadow-xl">
            <p className="text-lg font-semibold text-green-100 mb-4">{barcodeOkModalMessage}</p>
            <button
              type="button"
              onClick={() => setBarcodeOkModalMessage(null)}
              className="w-full py-3 bg-white text-gray-900 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

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

        {/* Telefon / Cloudflare ile kullanım kılavuzu */}
        <div className="mb-4 rounded-lg border border-blue-800 bg-blue-900/20 p-3 text-sm text-blue-200">
          <p className="font-semibold mb-1">Telefonda barkod okutma (Cloudflare / ngrok üzerinden)</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs opacity-95">
            <li>Telefonda bu sayfayı açın (giriş yaptıktan sonra).</li>
            <li>Tarayıcı kamera izni isterse &quot;İzin Ver&quot; deyin.</li>
            <li>Barkodu veya QR kodu kameraya tutun; kare içine alındığında otomatik okunur.</li>
          </ol>
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
              {(() => {
                const u = getUnifiedStatus(data)
                return (
                  <>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">AŞAMA</div>
                      <div className="text-white text-sm font-semibold">{u.stage}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">DURUM MESAJI</div>
                      <div className="text-white text-sm font-semibold">{u.message}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">SEVK DURUMU</div>
                      <div className={`text-sm font-semibold ${
                        u.shipmentLabel === 'Sevk edildi' ? 'text-green-400' :
                        u.shipmentLabel === 'Sevke Hazır' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {u.shipmentLabel}
                      </div>
                    </div>
                  </>
                )
              })()}
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
                setBarcodeOkModalMessage(null)
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

            {/* Hızlı İşlemdeki gibi doğrudan kamera; dosyadan tarama yok */}
            {!cameraScanning ? (
              <div className="space-y-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setCameraError('')
                    setCameraScanning(true)
                  }}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  📷 Kamerayı Aç
                </button>
                {cameraError && (
                  <div className="p-3 bg-amber-900/30 border border-amber-700 rounded-lg text-amber-200 text-sm">
                    {cameraError}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4 space-y-2">
                <div
                  id="qr-reader"
                  className="w-full bg-black rounded-lg overflow-hidden"
                  style={{ minHeight: '250px', maxHeight: '400px' }}
                />
                <button
                  type="button"
                  onClick={() => stopCameraScanner()}
                  className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                >
                  Durdur
                </button>
              </div>
            )}
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300">
                {error}
              </div>
            )}
            <p className="text-gray-400 text-center text-sm mt-4">
              Kamerayı açın veya USB tarayıcı ile okutun
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

