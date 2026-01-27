'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { QrCode, Printer } from 'lucide-react'

export default function BarcodePrintPage() {
  const params = useParams()
  const barcode = params?.barcode as string
  const [barcodeData, setBarcodeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (barcode) {
      fetch(`/api/barcodes?barcode=${barcode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setBarcodeData(data[0])
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [barcode])

  // Barkod görselini oluştur (sadece client-side)
  useEffect(() => {
    if (!barcodeData || !barcodeCanvasRef.current || typeof window === 'undefined') {
      return
    }

    const canvas = barcodeCanvasRef.current
    const barcodeValue = barcodeData.barcode.replace(/[^0-9]/g, '') || barcodeData.barcode
    
    // jsbarcode'u sadece client-side'da dinamik import et
    import('jsbarcode').then((JsBarcodeModule) => {
      const JsBarcode = JsBarcodeModule.default || JsBarcodeModule
      
      // Canvas boyutlarını ayarla
      canvas.width = 400
      canvas.height = 150
      
      // Canvas'ı temizle ve beyaz yap
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      
      try {
        const options = {
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 20,
          margin: 20,
          background: '#ffffff',
          lineColor: '#000000',
          textAlign: 'center' as const,
          textPosition: 'bottom' as const,
          textMargin: 8,
        }

        if (barcodeValue.length === 13) {
          // EAN-13 formatı
          JsBarcode(canvas, barcodeValue, {
            ...options,
            format: 'EAN13',
          })
        } else {
          // CODE128 formatı (herhangi bir uzunluk için)
          JsBarcode(canvas, barcodeValue, {
            ...options,
            format: 'CODE128',
          })
        }
        
        console.log('✅ Barkod oluşturuldu:', barcodeValue)
      } catch (error) {
        console.error('Barkod oluşturma hatası:', error)
        // Fallback: Canvas'a metin yaz
        if (ctx) {
          ctx.fillStyle = '#000000'
          ctx.font = '20px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(barcodeData.barcode, canvas.width / 2, canvas.height / 2)
        }
      }
    }).catch((error) => {
      console.error('jsbarcode yükleme hatası:', error)
      // Fallback: Canvas'a metin yaz
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = 400
        canvas.height = 150
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#000000'
        ctx.font = '20px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(barcodeData.barcode, canvas.width / 2, canvas.height / 2)
      }
    })
  }, [barcodeData])

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    )
  }

  if (!barcodeData) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <p>Barkod bulunamadı</p>
      </div>
    )
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(barcodeData.barcode)}`

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-md mx-auto print:max-w-none">
        {/* Etiket - Yazdırma için */}
        <div className="border-2 border-black p-6 print:border-0 print:p-4">
          {/* Üst Bilgi */}
          <div className="flex justify-between items-start mb-4 text-xs print:text-[10px]">
            <div>{new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="font-semibold">Barkod: {barcodeData.barcode}</div>
          </div>

          {/* Ana İçerik */}
          <div className="text-center space-y-4 print:space-y-2">
            <div>
              <h1 className="text-2xl font-bold print:text-xl">{barcodeData.product_name}</h1>
              <p className="text-lg text-gray-600 print:text-base">{barcodeData.sku}</p>
            </div>

            {/* Barkod ve QR Kod Yan Yana */}
            <div className="flex items-center justify-center gap-8 print:gap-6">
              {/* Görsel Barkod (EAN-13/CODE128) */}
              <div className="flex-1 flex flex-col items-center">
                <div className="bg-white p-4 rounded border-2 border-gray-300 print:border-gray-500 w-full flex justify-center">
                  <canvas 
                    ref={barcodeCanvasRef} 
                    id="barcode-canvas"
                    className="block"
                    width={400}
                    height={150}
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto',
                      border: '1px solid #ddd'
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600 print:text-[10px] mt-2 text-center">
                  <div className="font-mono font-semibold">{barcodeData.barcode}</div>
                  <div className="mt-1">SN: {barcodeData.serial_number}</div>
                </div>
              </div>

              {/* QR Kod */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="bg-white p-2 rounded border-2 border-gray-300 print:border-gray-500">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-32 h-32 print:w-28 print:h-28"
                  />
                </div>
                <div className="text-xs text-gray-500 mt-2 print:text-[10px]">QR Kod</div>
              </div>
            </div>
          </div>

          {/* Alt Bilgi */}
          <div className="mt-6 flex justify-between items-end text-xs print:text-[10px] print:mt-4">
            <div className="text-gray-500">LIVASOFA ERP</div>
            <div className="text-gray-500">
              {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Yazdırma Butonu - Sadece ekranda görünür */}
        <div className="mt-8 print:hidden text-center space-y-4">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 mx-auto"
          >
            <Printer className="w-5 h-5" />
            <span>Yazdır</span>
          </button>
          <div className="text-xs text-gray-500">
            <p>📋 EAN-13/CODE128 Standart Barkod + QR Kod</p>
            <p>Her ürün için benzersiz barkod</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

