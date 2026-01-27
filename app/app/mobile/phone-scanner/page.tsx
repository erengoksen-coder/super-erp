'use client'

import { useState, useEffect, useRef } from 'react'
import { QrCode, Camera, CheckCircle, XCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export default function PhoneScannerPage() {
  const searchParams = useSearchParams()
  const [connectionCode, setConnectionCode] = useState<string>('')
  const [scanning, setScanning] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState<string>('')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [isSecure, setIsSecure] = useState<boolean>(true) // SSR uyumluluğu için
  const scannerRef = useRef<HTMLDivElement>(null)
  const qrCodeScannerRef = useRef<any>(null)

  useEffect(() => {
    if (searchParams) {
      setConnectionCode(searchParams.get('code') || '')
    }
    
    // HTTPS kontrolü (sadece client-side)
    if (typeof window !== 'undefined') {
      const secure = window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1'
      setIsSecure(secure)
    }
  }, [searchParams])

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (qrCodeScannerRef.current) {
        try {
          qrCodeScannerRef.current.stop().catch(() => {})
          qrCodeScannerRef.current.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  async function startScanning() {
    if (!connectionCode) {
      setMessage({ type: 'error', text: 'Bağlantı kodu bulunamadı' })
      return
    }

    // Önce scanning state'ini true yap ki container render edilsin
    setScanning(true)
    setMessage({ type: 'info', text: 'Kamera başlatılıyor...' })

    // Container'ın render edilmesi için kısa bir bekleme
    await new Promise(resolve => setTimeout(resolve, 200))

    try {
      // html5-qrcode kütüphanesini dinamik olarak yükle
      let Html5Qrcode: any
      try {
        const html5QrcodeModule = await import('html5-qrcode')
        Html5Qrcode = html5QrcodeModule.Html5Qrcode || html5QrcodeModule.default?.Html5Qrcode
        if (!Html5Qrcode) {
          throw new Error('Html5Qrcode sınıfı bulunamadı')
        }
      } catch (importError: any) {
        console.error('Import error:', importError)
        setScanning(false)
        throw new Error(`html5-qrcode paketi yüklenemedi: ${importError.message || 'Bilinmeyen hata'}`)
      }
      
      // Container'ı kontrol et
      const containerElement = document.getElementById('phone-scanner')
      if (!containerElement) {
        setScanning(false)
        setMessage({ type: 'error', text: 'Scanner container bulunamadı. Sayfayı yenileyin.' })
        return
      }

      const qrCodeScanner = new Html5Qrcode('phone-scanner')

      // Kamera başlatma - basit ve güvenilir yöntem
      let startSuccess = false
      let lastError: any = null

      // Yöntem 1: facingMode ile dene (en basit, mobilde en iyi çalışır)
      try {
        await qrCodeScanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          async (decodedText: string) => {
            // Barkod okundu
            setScannedBarcode(decodedText)
            setScanning(false)
            
            // Bilgisayara gönder
            await sendBarcodeToComputer(decodedText)
            
            // Scanner'ı durdur
            try {
              await qrCodeScanner.stop()
              qrCodeScanner.clear()
            } catch (e) {
              console.error('Scanner stop error:', e)
            }
          },
          (errorMessage: string) => {
            // Hata mesajlarını sessizce yok say (sürekli log olmasın)
          }
        )
        startSuccess = true
        qrCodeScannerRef.current = qrCodeScanner
        setMessage({ type: 'info', text: 'Kamerayı barkoda doğrultun...' })
      } catch (facingModeError: any) {
        console.log('facingMode ile başarısız, kamera listesi deneniyor...', facingModeError)
        lastError = facingModeError
        
        // Yöntem 2: Kamera listesinden seç
        try {
          const devices = await Html5Qrcode.getCameras()
          
          if (devices && devices.length > 0) {
            // Arka kamerayı bul
            let cameraId = null
            for (const device of devices) {
              const label = (device.label || '').toLowerCase()
              if (label.includes('back') || 
                  label.includes('rear') ||
                  label.includes('environment') ||
                  label.includes('arrière')) {
                cameraId = device.id
                break
              }
            }
            
            // Arka kamera bulunamazsa son kamerayı kullan
            if (!cameraId) {
              cameraId = devices[devices.length - 1].id
            }

            await qrCodeScanner.start(
              cameraId,
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false,
              },
              async (decodedText: string) => {
                setScannedBarcode(decodedText)
                setScanning(false)
                await sendBarcodeToComputer(decodedText)
                try {
                  await qrCodeScanner.stop()
                  qrCodeScanner.clear()
                } catch (e) {
                  console.error('Scanner stop error:', e)
                }
              },
              () => {}
            )
            startSuccess = true
            qrCodeScannerRef.current = qrCodeScanner
            setMessage({ type: 'info', text: 'Kamerayı barkoda doğrultun...' })
          } else {
            throw new Error('Kamera bulunamadı')
          }
        } catch (deviceError: any) {
          console.error('Kamera listesi hatası:', deviceError)
          lastError = deviceError
        }
      }

      if (!startSuccess) {
        throw lastError || new Error('Kamera başlatılamadı')
      }
    } catch (error: any) {
      console.error('Scanner error:', error)
      let errorMsg = 'Kamera erişimi hatası'
      
      if (error.message) {
        if (error.message.includes('Permission denied') || 
            error.message.includes('NotAllowedError') ||
            error.message.includes('NotAllowed') ||
            error.message.includes('permission')) {
          errorMsg = 'Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kamera izni verin ve sayfayı yenileyin.'
        } else if (error.message.includes('NotFoundError') || 
                   error.message.includes('no camera') ||
                   error.message.includes('NotFound') ||
                   error.message.includes('kamera bulunamadı')) {
          errorMsg = 'Kamera bulunamadı. Cihazınızda kamera olduğundan emin olun.'
        } else if (error.message.includes('OverconstrainedError') ||
                   error.message.includes('ConstraintNotSatisfiedError')) {
          errorMsg = 'Kamera ayarları desteklenmiyor. Farklı bir kamera deneyin.'
        } else if (error.message.includes('NotReadableError') ||
                   error.message.includes('TrackStartError')) {
          errorMsg = 'Kamera kullanımda olabilir. Diğer uygulamaları kapatıp tekrar deneyin.'
        } else {
          errorMsg = `Kamera hatası: ${error.message}`
        }
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMsg
      })
      setScanning(false)
    }
  }

  function stopScanning() {
    if (qrCodeScannerRef.current) {
      qrCodeScannerRef.current.stop().then(() => {
        qrCodeScannerRef.current.clear()
        qrCodeScannerRef.current = null
      }).catch((err: any) => {
        console.error('Stop error:', err)
        // Hata olsa bile temizle
        try {
          qrCodeScannerRef.current.clear()
        } catch (e) {
          // Ignore
        }
        qrCodeScannerRef.current = null
      })
    }
    setScanning(false)
    setMessage(null)
  }

  async function sendBarcodeToComputer(barcode: string) {
    try {
      // API'ye barkod bilgisini gönder
      // Base URL'i kullan (ngrok veya normal)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const response = await fetch(`${baseUrl}/api/mobile/save-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: connectionCode,
          barcode: barcode 
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Barkod başarıyla gönderildi!' })
        
        // 2 saniye sonra yeni okutma için hazır ol
        setTimeout(() => {
          setScannedBarcode('')
          setMessage({ type: 'info', text: 'Yeni barkod okutabilirsiniz' })
        }, 2000)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Barkod gönderilemedi')
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Hata: ' + (error.message || 'Barkod gönderilemedi') })
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center justify-center space-x-2">
            <QrCode className="w-6 h-6" />
            <span>Barkod Okutucu</span>
          </h1>
          {connectionCode && (
            <p className="text-gray-400 text-sm">Bağlantı Kodu: <code className="text-blue-400">{connectionCode}</code></p>
          )}
          {typeof window !== 'undefined' && window.location.protocol !== 'https:' && (
            <div className="mt-4 bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
              <p className="text-yellow-300 text-xs">
                💡 Kamera çalışmazsa: Aşağıdaki manuel barkod girişi kullanabilirsiniz.
              </p>
            </div>
          )}
        </div>

        {/* Scanner */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-4">
          {/* Container her zaman render edilsin, sadece görünürlüğü kontrol edelim */}
          <div
            id="phone-scanner"
            ref={scannerRef}
            className={`w-full rounded-lg overflow-hidden mb-4 bg-black ${scanning ? 'block' : 'hidden'}`}
            style={{ minHeight: '300px', position: 'relative' }}
          />
          
          {!scanning ? (
            <div className="space-y-3">
              <button
                onClick={startScanning}
                className="w-full py-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex flex-col items-center justify-center space-y-2"
              >
                <Camera className="w-12 h-12" />
                <span className="text-lg font-semibold">Kamerayı Aç ve Okut</span>
              </button>
              <p className="text-gray-400 text-xs text-center">
                İlk kullanımda tarayıcı kamera izni isteyecektir. Lütfen "İzin Ver" butonuna tıklayın.
              </p>
              
              {/* Manuel Barkod Girişi */}
              <div className="border-t border-gray-700 pt-3 mt-3">
                <p className="text-gray-400 text-xs text-center mb-2">veya</p>
                <input
                  type="text"
                  placeholder="Barkod numarasını buraya yazın"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      sendBarcodeToComputer(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
                <p className="text-gray-500 text-xs text-center mt-2">
                  Barkod numarasını yazıp Enter'a basın
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={stopScanning}
              className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Durdur
            </button>
          )}
        </div>

        {/* Mesaj */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-900/30 border-green-700 text-green-300'
              : message.type === 'error'
              ? 'bg-red-900/30 border-red-700 text-red-300'
              : 'bg-blue-900/30 border-blue-700 text-blue-300'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {message.type === 'error' && <XCircle className="w-5 h-5" />}
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        )}

        {/* Okutulan Barkod */}
        {scannedBarcode && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <p className="text-gray-400 text-sm mb-2">Okutulan Barkod:</p>
            <p className="text-white font-mono text-lg font-bold break-all">{scannedBarcode}</p>
          </div>
        )}

        {/* Bilgilendirme */}
        <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <p className="text-blue-200 text-xs text-center">
            Bu sayfayı kapatmayın. Okutulan barkodlar otomatik olarak bilgisayara gönderilir.
          </p>
        </div>
      </div>
    </div>
  )
}
