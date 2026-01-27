'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { ArrowLeft, Package } from 'lucide-react'
import Link from 'next/link'

interface BarcodeDetails {
  barcode: string
  serial_number: string
  product_id: string
  sku: string
  product_name: string
  sip_trh: string
  takip_no: string
  cari_adi: string
  musteri_adi: string
  konfigurasyon: string
  aciklama: string
  uretim_emri: string
}

export default function ScanBarcodePage() {
  const router = useRouter()
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null)
  const [scannedData, setScannedData] = useState<BarcodeDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // QR kod tarayıcıyı başlat
    const html5QrcodeScanner = new Html5QrcodeScanner(
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
        // QR kod okundu
        try {
          const data = JSON.parse(decodedText)
          setScannedData(data as BarcodeDetails)
          html5QrcodeScanner.clear()
          setScanner(null)
        } catch (e) {
          setError('QR kod içeriği geçersiz format')
        }
      },
      (errorMessage) => {
        // Hata mesajlarını görmezden gel (sürekli tarama yapıyor)
      }
    )

    setScanner(html5QrcodeScanner)

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear()
      }
    }
  }, [])

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

        {scannedData ? (
          /* Detaylar Göster - Etiket Görünümü */
          <div className="bg-gray-900 rounded-lg border-2 border-gray-600 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">BARKOD</div>
                <div className="text-white text-sm font-mono">{scannedData.barcode}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">SERİ NO</div>
                <div className="text-white text-sm font-mono">{scannedData.serial_number}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                <div className="text-white text-sm font-bold">{scannedData.product_name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">SKU</div>
                <div className="text-white text-sm">{scannedData.sku}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">ÜRETİM TARİHİ</div>
                <div className="text-white text-sm">{scannedData.sip_trh}</div>
              </div>
              {scannedData.uretim_emri && scannedData.uretim_emri !== '-' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">ÜRETİM EMRİ</div>
                  <div className="text-white text-sm font-mono">{scannedData.uretim_emri}</div>
                </div>
              )}
              {scannedData.cari_adi && scannedData.cari_adi !== '-' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                  <div className="text-white text-sm">{scannedData.cari_adi}</div>
                </div>
              )}
              {scannedData.musteri_adi && scannedData.musteri_adi !== '-' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                  <div className="text-white text-sm">{scannedData.musteri_adi}</div>
                </div>
              )}
              {scannedData.takip_no && scannedData.takip_no !== '-' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">SİPARİŞ NO</div>
                  <div className="text-white text-sm font-mono">{scannedData.takip_no}</div>
                </div>
              )}
              {scannedData.konfigurasyon && scannedData.konfigurasyon !== '-' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">KONFİGÜRASYON</div>
                  <div className="text-white text-sm">{scannedData.konfigurasyon}</div>
                </div>
              )}
              {scannedData.aciklama && scannedData.aciklama !== '-' && (
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div>
                  <div className="text-white text-sm break-words whitespace-normal">{scannedData.aciklama}</div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setScannedData(null)
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
            <div id="qr-reader" className="mb-4"></div>
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300">
                {error}
              </div>
            )}
            <p className="text-gray-400 text-center text-sm mt-4">
              QR kodu kameraya gösterin
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

