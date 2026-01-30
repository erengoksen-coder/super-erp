'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
// Logo bileşeni yerine doğrudan resim kullanılacak
import { Printer, ArrowLeft } from 'lucide-react'
import JsBarcode from 'jsbarcode'

interface BarcodeData {
  id: string
  barcode: string
  serial_number: string
  product_id: string
  product_name: string
  sku: string
  production_order_number?: string | null
  dealer_name?: string | null
  customer_name?: string | null
  customer_order_number?: string | null
  order_date?: string | null
  production_order_created_at?: string | null
  created_at: string
  configuration?: string | null
  notes?: string | null
  quantity?: number
}

export default function PrintBarcodeLabelPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Hem barcodeId hem de barcodeld (typo) parametrelerini destekle
  const barcodeId = searchParams.get('barcodeId') || searchParams.get('barcodeld')
  
  const [barcodeData, setBarcodeData] = useState<BarcodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [barcodeCanvasId] = useState(`barcode-${Date.now()}`)
  const [labelSettings, setLabelSettings] = useState({
    logo_width: '90',
    logo_height: '15',
    logo_align: 'left',
    product_name_font_size: '15',
    barcode_height: '22',
    qr_code_size: '35',
    detail_font_size: '13',
    label_width: '100',
    label_height: '100',
    label_padding: '3'
  })

  useEffect(() => {
    if (barcodeId) {
      loadBarcode()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcodeId])

  useEffect(() => {
    if (barcodeData && typeof window !== 'undefined') {
      // Barkod oluşturmayı biraz geciktir (DOM hazır olsun)
      setTimeout(() => {
        try {
          const canvas = document.getElementById(barcodeCanvasId) as HTMLCanvasElement
          if (canvas && barcodeData.barcode) {
            JsBarcode(canvas, barcodeData.barcode, {
              format: 'CODE128',
              width: 1.5,
              height: parseFloat(labelSettings.barcode_height) || 22,
              displayValue: true,
              fontSize: 12,
              fontOptions: 'bold',
              font: 'Arial Black, Arial, sans-serif',
              textMargin: 2,
              margin: 2,
              background: '#ffffff',
              lineColor: '#000000',
              textAlign: 'center',
              textPosition: 'bottom'
            })
            
            // Barkod numarasını daha koyu yap
            setTimeout(() => {
              const textElements = canvas.parentElement?.querySelectorAll('text, .barcode-text')
              textElements?.forEach((el: any) => {
                el.style.fill = '#000000'
                el.style.fontWeight = '900'
                el.style.fontFamily = 'Arial Black, Arial, sans-serif'
                el.style.stroke = '#000000'
                el.style.strokeWidth = '0.5'
              })
            }, 100)
          }
        } catch (error) {
          console.error('Barkod oluşturma hatası:', error)
        }
      }, 100)
    }
  }, [barcodeData, barcodeCanvasId])

  async function loadBarcode() {
    if (!barcodeId) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const response = await fetch(`/api/barcodes?barcode=${barcodeId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Barkod yüklenemedi')
      }
      
      const data = await response.json()
      if (data && data.length > 0) {
        setBarcodeData(data[0])
      } else {
        console.error('Barkod bulunamadı:', barcodeId)
        alert('Barkod bulunamadı. Lütfen geçerli bir barkod numarası girin.')
      }
    } catch (error: any) {
      console.error('Barkod yüklenirken hata:', error)
      alert('Barkod yüklenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    try {
      // Yazdırma öncesi kontrol
      if (!barcodeData) {
        alert('Barkod verisi yüklenmedi. Lütfen sayfayı yenileyin.')
        return
      }
      
      // Yazdırma dialog'unu aç
      window.print()
    } catch (error: any) {
      console.error('Yazdırma hatası:', error)
      alert('Yazdırma sırasında hata oluştu: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-'
    try {
      const dateStrClean = String(dateStr).trim()
      let date: Date
      
      if (dateStrClean.includes('-')) {
        if (dateStrClean.match(/^\d{4}-\d{2}-\d{2}/)) {
          date = new Date(dateStrClean)
        } else {
          const parts = dateStrClean.split('-')
          if (parts.length === 3 && parts[0].length <= 2) {
            date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
          } else {
            date = new Date(dateStrClean)
          }
        }
      } else if (dateStrClean.includes('.') || dateStrClean.includes('/')) {
        const parts = dateStrClean.split(/[./]/)
        if (parts.length === 3) {
          date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
        } else {
          date = new Date(dateStrClean)
        }
      } else {
        date = new Date(dateStrClean)
      }
      
      if (isNaN(date.getTime())) {
        return dateStrClean
      }
      
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}.${month}.${year}`
    } catch (e) {
      return String(dateStr)
    }
  }

  function cleanNotes(notes: string | null | undefined): string {
    if (!notes) return '-'
    let desc = notes
      .replace(/Kumaş:\s*[^|]+/gi, '')
      .replace(/Kasa:\s*[^|]+/gi, '')
      .replace(/Ayak:\s*[^|]+/gi, '')
      .replace(/Birim:\s*[^|]+/gi, '')
      .replace(/\|\s*\|\s*/g, '|')
      .replace(/^\|\s*|\s*\|$/g, '')
      .trim()
    return desc || '-'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!barcodeData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400">Barkod bulunamadı</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  const productionDate = barcodeData.order_date || barcodeData.production_order_created_at || barcodeData.created_at

  // QR kod içeriği: etiketteki tüm detaylar (kompakt JSON formatı)
  const qrContent = JSON.stringify({
    barcode: barcodeData.barcode,
    serial_number: barcodeData.serial_number,
    product_id: barcodeData.product_id,
    sku: barcodeData.sku,
    product_name: barcodeData.product_name,
    sip_trh: formatDate(productionDate),
    takip_no: barcodeData.customer_order_number || barcodeData.production_order_number || '-',
    cari_adi: barcodeData.dealer_name || '-',
    musteri_adi: barcodeData.customer_name || '-',
    konfigurasyon: barcodeData.configuration || '-',
    aciklama: barcodeData.notes ? cleanNotes(barcodeData.notes) : '-',
    uretim_emri: barcodeData.production_order_number || '-'
  })

  return (
    <div className="p-4 print-page">
      {/* Yazdırma Kontrolleri - Sadece ekranda görünür, yazdırılmaz */}
      <div className="mb-4 print:hidden flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition inline-flex items-center space-x-2"
        >
          <ArrowLeft size={20} />
          <span>Geri Dön</span>
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
        >
          <Printer size={20} />
          <span>Yazdır</span>
        </button>
      </div>

      {/* Etiket - Ayarlardan gelen boyutlar */}
      <div className="flex justify-center items-center min-h-[400px] py-8 print-wrapper">
        <div
          className="bg-white border-2 border-gray-300 shadow-lg print-label"
          style={{
            width: `${labelSettings.label_width}mm`,
            height: `${labelSettings.label_height}mm`,
            minWidth: `${labelSettings.label_width}mm`,
            minHeight: `${labelSettings.label_height}mm`,
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            padding: `${labelSettings.label_padding}mm`,
            boxSizing: 'border-box',
            overflow: 'hidden',
            visibility: 'visible',
            opacity: 1
          }}
        >
          {/* Logo - Ayarlardan gelen manuel boyutlar, yükseklik max 16mm */}
          {(() => {
            const logoHeight = Math.min(parseFloat(labelSettings.logo_height) || 15, 16)
            return (
              <div style={{ 
                marginBottom: '1.5mm', 
                height: `${logoHeight}mm`, 
                width: `${labelSettings.logo_width}mm`, 
                overflow: 'hidden', 
                alignSelf: labelSettings.logo_align === 'left' ? 'flex-start' : labelSettings.logo_align === 'right' ? 'flex-end' : 'center'
              }}>
                <img 
                  src="/logo.png" 
                  alt="LIVA SOFA Logo" 
                  style={{ 
                    width: `${labelSettings.logo_width}mm`,
                    height: `${logoHeight}mm`,
                    objectFit: 'fill',
                    imageRendering: '-webkit-optimize-contrast',
                    WebkitImageRendering: '-webkit-optimize-contrast',
                    msInterpolationMode: 'bicubic',
                    filter: 'contrast(1.15) brightness(1.05)',
                    display: 'block'
                  }}
                />
              </div>
            )
          })()}

          {/* Ürün Adı */}
          <div className="text-center" style={{ marginBottom: '1.5mm' }}>
            <div className="font-black text-gray-900 leading-tight" style={{ fontSize: `${labelSettings.product_name_font_size}px`, fontWeight: 900 }}>{barcodeData.product_name}</div>
          </div>

          {/* Barkod Görseli */}
          <div className="flex justify-center" style={{ marginBottom: '1mm' }}>
            <canvas id={barcodeCanvasId} className="max-w-full" style={{ height: `${labelSettings.barcode_height}mm`, maxHeight: `${labelSettings.barcode_height}mm` }}></canvas>
          </div>

          {/* QR Kod */}
          <div className="flex justify-center" style={{ marginBottom: '1.5mm' }}>
            <QRCodeSVG
              value={qrContent}
              size={parseInt(labelSettings.qr_code_size) || 35}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Üretim Emri Kartı Detayları - Ayarlardan gelen font boyutu */}
          <div className="font-black text-gray-900 leading-tight print-details" style={{ 
            fontSize: `${labelSettings.detail_font_size}px`,
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'flex-start', 
            gap: '0.8mm', 
            overflow: 'hidden' 
          }}>
            <div className="flex justify-between items-start">
              <span className="font-black whitespace-nowrap">SİP TRH:</span>
              <span className="font-black text-right ml-1">{formatDate(productionDate)}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-black whitespace-nowrap">TAKİP NO:</span>
              <span className="font-black font-mono text-right ml-1 break-all">{barcodeData.customer_order_number || barcodeData.production_order_number || '-'}</span>
            </div>
            {barcodeData.dealer_name && (
              <div className="flex justify-between items-start">
                <span className="font-black whitespace-nowrap">CARİ:</span>
                <span className="font-black text-right ml-1 break-all">{barcodeData.dealer_name}</span>
              </div>
            )}
            {barcodeData.customer_name && (
              <div className="flex justify-between items-start">
                <span className="font-black whitespace-nowrap">MÜŞTERİ:</span>
                <span className="font-black text-right ml-1 break-all">{barcodeData.customer_name}</span>
              </div>
            )}
            {barcodeData.configuration && barcodeData.configuration !== '-' && (
              <div className="flex justify-between items-start">
                <span className="font-black whitespace-nowrap">KONF:</span>
                <span className="font-black text-right ml-1">{barcodeData.configuration}</span>
              </div>
            )}
            {barcodeData.notes && cleanNotes(barcodeData.notes) !== '-' && (
              <div className="flex flex-col">
                <span className="font-black">AÇIK:</span>
                <span className="font-black break-words leading-tight">{cleanNotes(barcodeData.notes)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ekran ve Yazdırma Stilleri - GPrinter GP1125D için optimize edilmiş */}
      <style jsx global>{`
        /* Ekran görünümü için - etiket her zaman görünür olmalı */
        div[style*="${labelSettings.label_width}mm"] {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        @media print {
          /* GPrinter GP1125D için sayfa boyutu - dinamik etiket boyutları */
          @page {
            size: ${labelSettings.label_width}mm ${labelSettings.label_height}mm;
            margin: 0;
            padding: 0;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            width: ${labelSettings.label_width}mm;
            height: ${labelSettings.label_height}mm;
            overflow: hidden;
          }
          
          /* Uygulama kabuklarını gizle */
          aside, nav, header, button, .sidebar, [data-sidebar] {
            display: none !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print-page {
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Yazdırmada tek etiket */
          .print-wrapper {
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: ${labelSettings.label_width}mm !important;
            height: ${labelSettings.label_height}mm !important;
          }

          .print-label {
            margin: 0 !important;
            padding: ${labelSettings.label_padding}mm !important;
            width: ${labelSettings.label_width}mm !important;
            height: ${labelSettings.label_height}mm !important;
            max-width: ${labelSettings.label_width}mm !important;
            max-height: ${labelSettings.label_height}mm !important;
            page-break-after: auto !important;
            page-break-inside: avoid !important;
            break-after: auto !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }

          .print-details {
            font-size: 11px !important;
            line-height: 1.1 !important;
          }
          
          /* GPrinter GP1125D için optimize edilmiş yazdırma */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Barkod numarasını koyulaştır */
          canvas + * {
            color: #000000 !important;
            font-weight: 900 !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          /* GPrinter GP1125D için görüntü kalitesi */
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
          }
          
          /* QR kod ve barkod için optimize */
          canvas, svg {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* GPrinter GP1125D için yazdırma alanı sınırlaması */
          body > * {
            max-width: ${labelSettings.label_width}mm;
            max-height: ${labelSettings.label_height}mm;
          }
        }
      `}</style>
    </div>
  )
}

