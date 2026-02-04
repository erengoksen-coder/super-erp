'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
// Logo bileşeni yerine doğrudan resim kullanılacak
import { Printer, ArrowLeft } from 'lucide-react'
// JsBarcode'ı dinamik import ile yükle (CSP sorunlarını önlemek için)

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
    logo_width: '96',
    logo_height: '14',
    logo_align: 'left',
    product_name_font_size: '16',
    barcode_height: '18',
    qr_code_size: '28',
    detail_font_size: '11',
    label_width: '100',
    label_height: '100',
    label_padding: '2'
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
      // Barkod oluşturmayı birkaç kez dene (DOM hazır olana kadar)
      let attempts = 0
      const maxAttempts = 10
      
      const tryRenderBarcode = () => {
        attempts++
        try {
          const canvas = document.getElementById(barcodeCanvasId) as HTMLCanvasElement
          if (canvas && barcodeData.barcode) {
            // Canvas'ı temizle
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width || 300, canvas.height || 80)
            }
            
            // Canvas boyutlarını ayarla (piksel cinsinden) - daha geniş
            const canvasWidth = 400
            const canvasHeight = 80
            canvas.width = canvasWidth
            canvas.height = canvasHeight
            canvas.style.width = '100%'
            canvas.style.height = `${labelSettings.barcode_height}mm`
            
            // Canvas'ın görünür olduğundan emin ol
            canvas.style.display = 'block'
            canvas.style.visibility = 'visible'
            canvas.style.opacity = '1'
            canvas.style.backgroundColor = '#ffffff'
            
            // JsBarcode'ı dinamik olarak yükle ve çağır
            import('jsbarcode').then((JsBarcodeModule) => {
              const JsBarcode = JsBarcodeModule.default || JsBarcodeModule
              
              // Canvas'ı beyaz yap
              if (ctx) {
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, canvasWidth, canvasHeight)
              }
              
              JsBarcode(canvas, barcodeData.barcode, {
                format: 'CODE128',
                width: 3,
                height: 60,
                displayValue: false,
                fontSize: 12,
                fontOptions: 'bold',
                font: 'Arial Black, Arial, sans-serif',
                textMargin: 2,
                margin: 5,
                background: '#ffffff',
                lineColor: '#000000',
                textAlign: 'center',
                textPosition: 'bottom',
                valid: function(valid) {
                  if (!valid) {
                    console.error('Barkod geçersiz:', barcodeData.barcode)
                  } else {
                    console.log('✅ Barkod başarıyla oluşturuldu:', barcodeData.barcode)
                  }
                }
              })
              
              // Canvas'ın render edildiğini kontrol et (daha uzun bekle)
              setTimeout(() => {
                const imageData = ctx?.getImageData(0, 0, canvasWidth, canvasHeight)
                // Siyah piksel var mı kontrol et (barkod çizgileri siyah olmalı)
                const hasContent = imageData && Array.from(imageData.data).some((pixel, index) => {
                  // Her 4 pixel bir RGBA değeri: R, G, B, A
                  const channel = index % 4
                  if (channel === 3) return false // Alpha channel'ı atla
                  // Siyah piksel kontrolü (R, G, B hepsi 0 veya çok koyu)
                  if (channel === 0) { // R channel
                    const r = pixel
                    const g = imageData.data[index + 1]
                    const b = imageData.data[index + 2]
                    // Siyah veya çok koyu gri (threshold: 50)
                    return (r < 50 && g < 50 && b < 50)
                  }
                  return false
                })
                if (hasContent) {
                  console.log('✅ Canvas içeriği render edildi - barkod çizgileri görünüyor')
                } else {
                  console.warn('⚠️ Canvas boş görünüyor, tekrar deniyor...')
                  if (attempts < maxAttempts) {
                    setTimeout(tryRenderBarcode, 300)
                  }
                }
              }, 400)
            }).catch((error) => {
              console.error('❌ JsBarcode yükleme hatası:', error)
              // Fallback: Canvas'a sadece metin yaz
              if (ctx) {
                ctx.fillStyle = '#000000'
                ctx.font = 'bold 14px monospace'
                ctx.textAlign = 'center'
                ctx.fillText(barcodeData.barcode, canvasWidth / 2, canvasHeight / 2)
              }
              if (attempts < maxAttempts) {
                setTimeout(tryRenderBarcode, 300)
              }
            })
          } else {
            if (attempts < maxAttempts) {
              console.log(`Canvas bulunamadı, tekrar deniyor... (${attempts}/${maxAttempts})`)
              setTimeout(tryRenderBarcode, 200)
            } else {
              console.error('❌ Canvas bulunamadı veya barkod verisi yok:', { canvas: !!canvas, barcode: barcodeData.barcode })
            }
          }
        } catch (error) {
          console.error('❌ Barkod oluşturma hatası:', error)
          if (attempts < maxAttempts) {
            setTimeout(tryRenderBarcode, 200)
          }
        }
      }
      
      // İlk denemeyi başlat
      const timeoutId = setTimeout(tryRenderBarcode, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [barcodeData, barcodeCanvasId, labelSettings.barcode_height])

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
          className="bg-white border-2 border-gray-200 shadow-lg print-label"
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
            paddingTop: '1mm',
            paddingBottom: `${labelSettings.label_padding}mm`,
            paddingLeft: `${labelSettings.label_padding}mm`,
            paddingRight: `${labelSettings.label_padding}mm`,
            boxSizing: 'border-box',
            overflow: 'hidden',
            visibility: 'visible',
            opacity: 1,
            backgroundColor: '#ffffff',
            background: '#ffffff'
          }}
        >
          {/* Logo - Sola hizalı, maksimum genişlik */}
          {(() => {
            const logoHeight = parseFloat(labelSettings.logo_height) || 14
            // Etiket genişliğinden padding'i çıkar - maksimum genişlik kullan
            const availableWidth = parseFloat(labelSettings.label_width) - (parseFloat(labelSettings.label_padding) * 2)
            // Logo genişliğini neredeyse tam genişlik kullan (sadece 0.2mm güvenlik payı)
            const finalLogoWidth = availableWidth - 0.2
            
            return (
              <div style={{ 
                marginBottom: '0.5mm', 
                marginTop: '0',
                height: `${logoHeight}mm`, 
                width: '100%',
                maxWidth: '100%',
                overflow: 'visible', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: '0',
                paddingLeft: '0',
                paddingRight: '0'
              }}>
                <img 
                  src="/logo.png" 
                  alt="LIVA SOFA Logo" 
                  onError={(e) => {
                    console.error('Logo yüklenemedi:', e)
                    e.currentTarget.style.display = 'none'
                  }}
                  style={{ 
                    width: `${finalLogoWidth}mm`,
                    height: `${logoHeight}mm`,
                    maxWidth: `${finalLogoWidth}mm`,
                    maxHeight: `${logoHeight}mm`,
                    minWidth: `${finalLogoWidth}mm`,
                    objectFit: 'fill',
                    imageRendering: '-webkit-optimize-contrast',
                    WebkitImageRendering: '-webkit-optimize-contrast',
                    msInterpolationMode: 'bicubic',
                    filter: 'contrast(1.15) brightness(1.05)',
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1,
                    margin: '0',
                    padding: '0'
                  } as React.CSSProperties}
                />
              </div>
            )
          })()}

          {/* Ürün Adı */}
          <div className="text-center" style={{ marginBottom: '0.8mm' }}>
            <div className="font-black text-black leading-tight" style={{ fontSize: `${labelSettings.product_name_font_size}px`, fontWeight: 900, lineHeight: '1.2', color: '#000000' }}>{barcodeData.product_name}</div>
            <div className="text-black font-bold" style={{ fontSize: '10px', marginTop: '0.3mm', color: '#000000' }}>{barcodeData.sku}</div>
          </div>

          {/* Barkod Görseli */}
          <div className="flex flex-col items-center justify-center" style={{ marginBottom: '0.8mm', width: '100%' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '0.3mm', padding: '0 1mm' }}>
              <canvas 
                id={barcodeCanvasId} 
                style={{ 
                  width: '100%',
                  maxWidth: '100%',
                  height: `${labelSettings.barcode_height}mm`, 
                  maxHeight: `${labelSettings.barcode_height}mm`,
                  display: 'block !important',
                  visibility: 'visible !important',
                  opacity: '1 !important',
                  backgroundColor: '#ffffff'
                }}
              ></canvas>
            </div>
            <div className="text-black font-mono font-bold text-center" style={{ fontSize: '9px', marginTop: '0.3mm', width: '100%', color: '#000000' }}>{barcodeData.barcode}</div>
          </div>

          {/* QR Kod */}
          <div className="flex justify-center" style={{ marginBottom: '0.8mm', width: '100%' }}>
            <QRCodeSVG
              value={qrContent}
              size={parseInt(labelSettings.qr_code_size) || 28}
              level="M"
              includeMargin={false}
              style={{
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                width: `${labelSettings.qr_code_size}px`,
                height: `${labelSettings.qr_code_size}px`
              }}
            />
          </div>

          {/* Üretim Emri Kartı Detayları - Ayarlardan gelen font boyutu */}
          <div className="font-black text-black leading-tight print-details" style={{
            color: '#000000', 
            fontSize: `${labelSettings.detail_font_size}px`,
            flex: 1, 
            display: 'flex !important', 
            visibility: 'visible !important',
            opacity: '1 !important',
            flexDirection: 'column', 
            justifyContent: 'flex-start', 
            gap: '0.4mm', 
            overflow: 'visible',
            lineHeight: '1.2',
            width: '100%'
          }}>
            <div className="flex justify-between items-start">
              <span className="font-black whitespace-nowrap" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 900, color: '#000000' }}>SERİ:</span>
              <span className="font-black font-mono text-right ml-1 break-all" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 700, color: '#000000' }}>{barcodeData.serial_number || '-'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-black whitespace-nowrap" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 900, color: '#000000' }}>SİP TRH:</span>
              <span className="font-black text-right ml-1" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 700, color: '#000000' }}>{formatDate(productionDate)}</span>
            </div>
            {(barcodeData.customer_order_number || barcodeData.production_order_number) && (
              <div className="flex justify-between items-start">
                <span className="font-black whitespace-nowrap" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 900, color: '#000000' }}>TAKİP:</span>
                <span className="font-black font-mono text-right ml-1 break-all" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 700, color: '#000000' }}>{(barcodeData.customer_order_number || barcodeData.production_order_number || '-').substring(0, 18)}</span>
              </div>
            )}
            {barcodeData.dealer_name && (
              <div className="flex justify-between items-start">
                <span className="font-black whitespace-nowrap" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 900, color: '#000000' }}>CARİ:</span>
                <span className="font-black text-right ml-1 break-all" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 700, color: '#000000' }}>{barcodeData.dealer_name.substring(0, 22)}</span>
              </div>
            )}
            {barcodeData.customer_name && (
              <div className="flex justify-between items-start">
                <span className="font-black whitespace-nowrap" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 900, color: '#000000' }}>MÜŞ:</span>
                <span className="font-black text-right ml-1 break-all" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 700, color: '#000000' }}>{barcodeData.customer_name.substring(0, 22)}</span>
              </div>
            )}
            {barcodeData.configuration && barcodeData.configuration !== '-' && (
              <div className="flex justify-between items-start">
                <span className="font-black whitespace-nowrap" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 900, color: '#000000' }}>KONF:</span>
                <span className="font-black text-right ml-1" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 700, color: '#000000' }}>{barcodeData.configuration}</span>
              </div>
            )}
            {(() => {
              // Notes'tan kumaş, ayak, kasa bilgilerini çıkar
              const notes = barcodeData.notes || ''
              const fabricMatch = notes.match(/Kumaş:\s*([^|]+)/i)
              const caseMatch = notes.match(/Kasa:\s*([^|]+)/i)
              const legMatch = notes.match(/Ayak:\s*([^|]+)/i)
              const fabricCode = fabricMatch ? fabricMatch[1].trim() : null
              const caseInfo = caseMatch ? caseMatch[1].trim() : null
              const legInfo = legMatch ? legMatch[1].trim() : null
              
              return (
                <>
                  {fabricCode && (
                    <div className="flex justify-between items-start">
                      <span className="font-black whitespace-nowrap" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 900, color: '#000000' }}>KUMAŞ:</span>
                      <span className="font-black text-right ml-1 break-all" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 700, color: '#000000' }}>{fabricCode.substring(0, 22)}</span>
                    </div>
                  )}
                  {legInfo && (
                    <div className="flex justify-between items-start">
                      <span className="font-black whitespace-nowrap" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 900, color: '#000000' }}>AYAK:</span>
                      <span className="font-black text-right ml-1 break-all" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 700, color: '#000000' }}>{legInfo.substring(0, 22)}</span>
                    </div>
                  )}
                  {caseInfo && (
                    <div className="flex justify-between items-start">
                      <span className="font-black whitespace-nowrap" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 900, color: '#000000' }}>KASA:</span>
                      <span className="font-black text-right ml-1 break-all" style={{ fontSize: `${labelSettings.detail_font_size}px`, fontWeight: 700, color: '#000000' }}>{caseInfo.substring(0, 22)}</span>
                    </div>
                  )}
                </>
              )
            })()}
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
        
        /* Ekran görünümü için canvas */
        canvas {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          background: #ffffff !important;
          image-rendering: crisp-edges !important;
          min-height: 20mm !important;
        }
        
        /* QR kod görünürlüğü */
        svg[data-testid="qr-code-svg"] {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Logo görünürlüğü */
        .print-label img[src="/logo.png"] {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Ürün detayları görünürlüğü */
        .print-details {
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
            background: #ffffff !important;
            background-color: #ffffff !important;
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
          
          /* Barkod canvas görünürlüğü */
          canvas {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 20mm !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            image-rendering: crisp-edges !important;
          }
          
          /* Ekran görünümü için canvas */
          .print-label canvas {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            background: #ffffff !important;
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
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          /* QR kod SVG görünürlüğü */
          svg[data-testid="qr-code-svg"] {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: ${labelSettings.qr_code_size}px !important;
            height: ${labelSettings.qr_code_size}px !important;
          }
          
          /* Logo görünürlüğü */
          img[src="/logo.png"] {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          /* Ürün detayları görünürlüğü */
          .print-details {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #000000 !important;
          }
          
          /* Tüm yazılar siyah */
          .print-label * {
            color: #000000 !important;
          }
          
          .print-label .text-black,
          .print-label .text-gray-900,
          .print-label .text-gray-700 {
            color: #000000 !important;
          }
          
          /* Ürün adı ve SKU görünürlüğü */
          .print-label > div {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
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

