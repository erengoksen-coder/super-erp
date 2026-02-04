'use client'

import { useState, useEffect, useRef } from 'react'
import { Package, Search, Printer, Download, Eye, EyeOff, QrCode, X } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'

interface Barcode {
  id: string
  barcode: string
  serial_number: string
  product_id: string
  product_name: string
  sku: string
  status: string
  production_order_number?: string
  production_order_created_at?: string
  current_station?: string | null
  production_order_status?: string | null
  dealer_name?: string | null
  customer_name?: string | null
  customer_order_number?: string | null
  created_at: string
}

// Barkod görseli için component
function BarcodeVisual({ barcode, serialNumber }: { barcode: string; serialNumber: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showVisual, setShowVisual] = useState(false)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    if (showVisual && canvasRef.current && typeof window !== 'undefined') {
      const canvas = canvasRef.current
      const barcodeValue = barcode.replace(/[^0-9]/g, '') || barcode
      
      import('jsbarcode').then((JsBarcodeModule) => {
        const JsBarcode = JsBarcodeModule.default || JsBarcodeModule
        
        canvas.width = 300
        canvas.height = 80
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
        
        try {
          const options = {
            width: 1.5,
            height: 60,
            displayValue: true,
            fontSize: 14,
            margin: 10,
            background: '#ffffff',
            lineColor: '#000000',
            textAlign: 'center' as const,
            textPosition: 'bottom' as const,
            textMargin: 4,
          }

          if (barcodeValue.length === 13) {
            JsBarcode(canvas, barcodeValue, { ...options, format: 'EAN13' })
          } else {
            JsBarcode(canvas, barcodeValue, { ...options, format: 'CODE128' })
          }
        } catch (error) {
          console.error('Barkod oluşturma hatası:', error)
        }
      }).catch((error) => {
        console.error('jsbarcode yükleme hatası:', error)
      })
    }
  }, [showVisual, barcode])

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(barcode)}`

  return (
    <div className="space-y-2">
      <div className="text-xs font-mono font-bold text-white">
        {barcode}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowVisual(!showVisual)}
          className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
          title="Görsel Barkod"
        >
          {showVisual ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          <span>Barkod</span>
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="text-xs text-green-400 hover:text-green-300 transition flex items-center gap-1"
          title="QR Kod"
        >
          {showQR ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          <span>QR</span>
        </button>
      </div>
      {showVisual && (
        <div className="bg-white p-2 rounded border border-gray-600">
          <canvas ref={canvasRef} className="max-w-full h-auto" />
        </div>
      )}
      {showQR && (
        <div className="bg-white p-2 rounded border border-gray-600 inline-block">
          <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" />
        </div>
      )}
    </div>
  )
}

export default function BarcodesPage() {
  const [barcodes, setBarcodes] = useState<Barcode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scannedBarcodeData, setScannedBarcodeData] = useState<Barcode | null>(null)
  const qrScannerRef = useRef<any>(null)
  const qrReaderId = 'barcode-qr-reader'

  useEffect(() => {
    loadBarcodes()
  }, [filterStatus])

  useEffect(() => {
    if (showQRScanner && typeof window !== 'undefined') {
      // html5-qrcode'u dinamik olarak yükle
      import('html5-qrcode').then((Html5QrcodeModule) => {
        const Html5QrcodeScanner = Html5QrcodeModule.Html5QrcodeScanner || (Html5QrcodeModule as any).default?.Html5QrcodeScanner
        
        if (!Html5QrcodeScanner) {
          console.error('Html5QrcodeScanner bulunamadı')
          return
        }

        const container = document.getElementById(qrReaderId)
        if (!container) {
          console.error('QR reader container bulunamadı.')
          return
        }

        let html5QrcodeScanner: any
        try {
          html5QrcodeScanner = new Html5QrcodeScanner(
            qrReaderId,
            {
              qrbox: { width: 250, height: 250 },
              fps: 10,
              aspectRatio: 1.0
            },
            false // verbose
          )
        } catch (error) {
          console.error('QR reader başlatılamadı:', error)
          return
        }

        html5QrcodeScanner.render(
          async (decodedText: string) => {
            // QR kod okundu
            try {
              // JSON formatında mı kontrol et
              let barcodeNumber: string
              try {
                const qrData = JSON.parse(decodedText)
                barcodeNumber = qrData.barcode || decodedText
              } catch (e) {
                // JSON değilse direkt barkod numarası olarak kullan
                barcodeNumber = decodedText
              }

              // Barkod detaylarını API'den al
              const response = await fetch(`/api/barcodes?barcode=${encodeURIComponent(barcodeNumber)}`)
              if (!response.ok) throw new Error('Barkod bulunamadı')
              
              const data = await response.json()
              if (data && data.length > 0) {
                setScannedBarcodeData(data[0])
                setShowQRScanner(false)
                html5QrcodeScanner.clear()
                qrScannerRef.current = null
              } else {
                alert('Barkod bulunamadı')
              }
            } catch (e: any) {
              console.error('QR kod okuma hatası:', e)
              alert('QR kod okunamadı: ' + (e.message || 'Bilinmeyen hata'))
            }
          },
          (errorMessage: string) => {
            // Hata mesajlarını görmezden gel (sürekli tarama yapıyor)
          }
        )

        qrScannerRef.current = html5QrcodeScanner

        return () => {
          if (qrScannerRef.current) {
            qrScannerRef.current.clear()
            qrScannerRef.current = null
          }
        }
      }).catch((error) => {
        console.error('html5-qrcode yükleme hatası:', error)
        alert('QR kod tarayıcı yüklenemedi')
        setShowQRScanner(false)
      })
    } else if (!showQRScanner && qrScannerRef.current) {
      // Scanner kapatıldığında temizle
      try {
        qrScannerRef.current.clear()
      } catch (e) {
        // Ignore
      }
      qrScannerRef.current = null
    }
  }, [showQRScanner])

  async function loadBarcodes() {
    try {
      const url = filterStatus === 'all' 
        ? '/api/barcodes'
        : `/api/barcodes?status=${filterStatus}`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Barkodlar yüklenemedi')
      const data = await response.json()
      setBarcodes(data)
    } catch (error) {
      console.error('Error loading barcodes:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(barcode: Barcode) {
    // Üretim aşamasındaysa current_station bilgisini göster
    if (barcode.production_order_status && barcode.production_order_status !== 'completed' && barcode.current_station) {
      const stationMap: Record<string, { label: string; className: string }> = {
        iskelet: { label: 'İskelet Aşamasında', className: 'bg-orange-900 text-orange-300' },
        terzihane: { label: 'Terzihane Aşamasında', className: 'bg-orange-900 text-orange-300' },
        döşeme: { label: 'Döşeme Aşamasında', className: 'bg-orange-900 text-orange-300' },
        doseme: { label: 'Döşeme Aşamasında', className: 'bg-orange-900 text-orange-300' },
        berjer: { label: 'Berjer Aşamasında', className: 'bg-orange-900 text-orange-300' },
        montaj: { label: 'Montaj Aşamasında', className: 'bg-orange-900 text-orange-300' },
        sevkiyat: { label: 'Sevkiyat Aşamasında', className: 'bg-orange-900 text-orange-300' },
      }
      const stationKey = barcode.current_station.toLowerCase()
      const stationInfo = stationMap[stationKey] || { 
        label: `${barcode.current_station} Aşamasında`, 
        className: 'bg-orange-900 text-orange-300' 
      }
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stationInfo.className}`}>
          {stationInfo.label}
        </span>
      )
    }
    
    const statusMap: Record<string, { label: string; className: string }> = {
      in_stock: { label: 'Depoda', className: 'bg-green-900 text-green-300' },
      in_production: { label: 'Üretim Aşamasında', className: 'bg-orange-900 text-orange-300' },
      sold: { label: 'Satıldı', className: 'bg-blue-900 text-blue-300' },
      reserved: { label: 'Rezerve', className: 'bg-yellow-900 text-yellow-300' },
      shipped: { label: 'Sevk Edildi', className: 'bg-purple-900 text-purple-300' },
    }
    const statusInfo = statusMap[barcode.status] || { label: barcode.status, className: 'bg-gray-800 text-gray-300' }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  const filteredBarcodes = barcodes.filter((barcode) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      barcode.barcode.toLowerCase().includes(searchLower) ||
      barcode.serial_number.toLowerCase().includes(searchLower) ||
      barcode.product_name.toLowerCase().includes(searchLower) ||
      barcode.sku.toLowerCase().includes(searchLower)
    )
  })

  function printBarcode(barcode: Barcode) {
    // Yazdırma sayfasına yönlendir
    window.open(`/inventory/products/print-barcode-label?barcodeId=${barcode.barcode}`, '_blank')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Barkod Yönetimi</h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-gray-400 mt-1">Üretilen ürünlerin barkod ve seri numaraları</p>
        </div>
      </div>

      {/* QR Kod Okuma Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">QR Kod Okut</h2>
              <button
                onClick={() => {
                  setShowQRScanner(false)
                  if (qrScannerRef.current) {
                    try {
                      qrScannerRef.current.clear()
                    } catch (e) {
                      // Ignore
                    }
                    qrScannerRef.current = null
                  }
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>
            <div id={qrReaderId} className="mb-4 bg-black rounded-lg overflow-hidden"></div>
            <p className="text-gray-400 text-center text-sm">
              QR kodu kameraya gösterin
            </p>
          </div>
        </div>
      )}

      {/* Barkod Detayları Modal */}
      {scannedBarcodeData && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border-2 border-gray-600 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Barkod Detayları</h2>
              <button
                onClick={() => setScannedBarcodeData(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">BARKOD</div>
                <div className="text-white text-sm font-mono font-bold">{scannedBarcodeData.barcode}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">SERİ NO</div>
                <div className="text-white text-sm font-mono">{scannedBarcodeData.serial_number}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                <div className="text-white text-sm font-bold">{scannedBarcodeData.product_name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">SKU</div>
                <div className="text-white text-sm">{scannedBarcodeData.sku}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">DURUM</div>
                <div>{getStatusBadge(scannedBarcodeData)}</div>
              </div>
              {scannedBarcodeData.production_order_number && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">ÜRETİM EMRİ</div>
                  <div className="text-white text-sm font-mono">{scannedBarcodeData.production_order_number}</div>
                </div>
              )}
              {scannedBarcodeData.dealer_name && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                  <div className="text-white text-sm">{scannedBarcodeData.dealer_name}</div>
                </div>
              )}
              {scannedBarcodeData.customer_name && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                  <div className="text-white text-sm">{scannedBarcodeData.customer_name}</div>
                </div>
              )}
              {scannedBarcodeData.customer_order_number && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">SİPARİŞ NO</div>
                  <div className="text-white text-sm font-mono">{scannedBarcodeData.customer_order_number}</div>
                </div>
              )}
              {scannedBarcodeData.production_order_created_at && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">ÜRETİM TARİHİ</div>
                  <div className="text-white text-sm">
                    {new Date(scannedBarcodeData.production_order_created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-400 mb-1">OLUŞTURULMA TARİHİ</div>
                <div className="text-white text-sm">
                  {new Date(scannedBarcodeData.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setScannedBarcodeData(null)}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Ara (Barkod, Seri No, Ürün)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Barkod, seri numarası veya ürün adı..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Durum Filtresi
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tümü</option>
              <option value="in_stock">Depoda</option>
              <option value="in_production">Üretim Aşamasında</option>
              <option value="sold">Satıldı</option>
              <option value="reserved">Rezerve</option>
              <option value="shipped">Sevk Edildi</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowQRScanner(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center space-x-2"
            >
              <QrCode size={20} />
              <span>QR Kod Okut</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="h-8">Barkod</TableHead>
                <TableHead className="h-8">Seri No</TableHead>
                <TableHead className="h-8">Ürün</TableHead>
                <TableHead className="h-8">Durum</TableHead>
                <TableHead className="h-8">Üretim Emri</TableHead>
                <TableHead className="h-8">Üretime Alınma</TableHead>
                <TableHead className="h-8">Bayi</TableHead>
                <TableHead className="h-8">Müşteri</TableHead>
                <TableHead className="h-8">Tarih</TableHead>
                <TableHead className="h-8">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBarcodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <LogoWithBackground size="md" className="mb-4" />
                      <p className="text-gray-400 text-xs mt-4">
                        {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz barkod oluşturulmamış'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBarcodes.map((barcode) => (
                  <TableRow key={barcode.id}>
                    <TableCell>
                      <BarcodeVisual barcode={barcode.barcode} serialNumber={barcode.serial_number} />
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-mono text-gray-300">
                        {barcode.serial_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-white">{barcode.product_name}</div>
                      <div className="text-xs text-gray-400">{barcode.sku}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(barcode)}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {barcode.production_order_number || '-'}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {barcode.production_order_created_at 
                        ? new Date(barcode.production_order_created_at).toLocaleString('tr-TR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : barcode.created_at
                          ? new Date(barcode.created_at).toLocaleString('tr-TR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'
                      }
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs">
                      {barcode.dealer_name || '-'}
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs">
                      {barcode.customer_name || '-'}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {new Date(barcode.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => printBarcode(barcode)}
                        className="text-blue-400 hover:text-blue-300 transition inline-flex items-center"
                        title="Yazdır"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* İstatistikler */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Toplam Barkod</div>
          <div className="text-2xl font-bold text-white">{barcodes.length}</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Depoda</div>
          <div className="text-2xl font-bold text-green-400">
            {barcodes.filter((b) => b.status === 'in_stock').length}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Üretim Aşamasında</div>
          <div className="text-2xl font-bold text-orange-400">
            {barcodes.filter((b) => b.status === 'in_production').length}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Satıldı</div>
          <div className="text-2xl font-bold text-blue-400">
            {barcodes.filter((b) => b.status === 'sold').length}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Rezerve</div>
          <div className="text-2xl font-bold text-yellow-400">
            {barcodes.filter((b) => b.status === 'reserved').length}
          </div>
        </div>
      </div>
    </div>
  )
}

