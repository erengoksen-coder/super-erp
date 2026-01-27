'use client'

import { useState, useEffect, useRef } from 'react'
import { Package, Search, Printer, Download, Eye, EyeOff } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface Barcode {
  id: string
  barcode: string
  serial_number: string
  product_id: string
  product_name: string
  sku: string
  status: string
  production_order_number?: string
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

  useEffect(() => {
    loadBarcodes()
  }, [filterStatus])

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

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { label: string; className: string }> = {
      in_stock: { label: 'Depoda', className: 'bg-green-900 text-green-300' },
      sold: { label: 'Satıldı', className: 'bg-blue-900 text-blue-300' },
      reserved: { label: 'Rezerve', className: 'bg-yellow-900 text-yellow-300' },
    }
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-800 text-gray-300' }
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
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barkod: ${barcode.barcode}</title>
          <style>
            @media print {
              @page { size: 80mm 50mm; margin: 5mm; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 10px;
              text-align: center;
            }
            .barcode {
              font-size: 24px;
              font-weight: bold;
              margin: 10px 0;
              letter-spacing: 2px;
            }
            .serial {
              font-size: 14px;
              color: #666;
              margin: 5px 0;
            }
            .product {
              font-size: 12px;
              margin: 5px 0;
            }
            .sku {
              font-size: 10px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="product">${barcode.product_name}</div>
          <div class="sku">${barcode.sku}</div>
          <div class="barcode">${barcode.barcode}</div>
          <div class="serial">SN: ${barcode.serial_number}</div>
          <div style="margin-top: 10px; font-size: 10px;">
            ${new Date(barcode.created_at).toLocaleDateString('tr-TR')}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Barkod Yönetimi</h1>
          <p className="text-gray-400 mt-1">Üretilen ürünlerin barkod ve seri numaraları</p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="sold">Satıldı</option>
              <option value="reserved">Rezerve</option>
            </select>
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
                <TableHead className="h-8">Tarih</TableHead>
                <TableHead className="h-8">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBarcodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-400 text-xs py-8">
                    {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz barkod oluşturulmamış'}
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
                      {getStatusBadge(barcode.status)}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {barcode.production_order_number || '-'}
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
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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

