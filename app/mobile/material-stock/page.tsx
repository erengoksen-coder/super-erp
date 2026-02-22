'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Package, Plus, Minus, Save, QrCode, ArrowLeft } from 'lucide-react'
import { toast } from '@/lib/notify'

interface Material {
  id: string
  code: string
  name: string
  category: string
  unit: string
  stock_amount: number
  min_stock_level: number
  purchase_price: number
}

export default function MaterialStockPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [material, setMaterial] = useState<Material | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [stockChange, setStockChange] = useState<number>(0)
  const [stockType, setStockType] = useState<'in' | 'out'>('in')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [scanResultModal, setScanResultModal] = useState<{ message: string; isError: boolean } | null>(null)
  const html5QrCodeRef = useRef<any>(null)
  const scannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // URL'den QR data'yı al
    const qrData = searchParams.get('data')
    if (qrData) {
      loadMaterialFromQR(qrData)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  async function loadMaterialFromQR(qrData: string) {
    try {
      const response = await fetch('/api/materials/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: qrData }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Malzeme yüklenemedi')
      }

      const data = await response.json()
      setMaterial(data.material)
      setScanResultModal({ message: `Barkod okundu: ${data.material?.name || data.material?.code || 'Malzeme'}`, isError: false })
    } catch (error: any) {
      setScanResultModal({ message: error?.message || 'Malzeme yüklenemedi', isError: true })
    } finally {
      setLoading(false)
    }
  }

  async function startScanner() {
    if (scanning) return

    // Tarayıcı desteğini kontrol et
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Tarayıcınız kamera erişimini desteklemiyor. Manuel giriş kullanabilirsiniz.')
      return
    }

    // Önce scanning state'ini true yap ki container görünür olsun
    setScanning(true)
    setErrorMessage('')

    // Container'ın DOM'da olması için bekleme
    await new Promise(resolve => setTimeout(resolve, 400))
    
    // Sayfayı scanner'a scroll et
    if (scannerRef.current) {
      scannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    try {
      const html5QrcodeModule = await import('html5-qrcode')
      const Html5Qrcode = html5QrcodeModule.Html5Qrcode || html5QrcodeModule.default?.Html5Qrcode
      
      if (!Html5Qrcode) {
        throw new Error('Html5Qrcode sınıfı bulunamadı')
      }

      // Container'ı kontrol et - ref veya getElementById ile
      let containerElement = scannerRef.current || document.getElementById('material-qr-reader')
      if (!containerElement) {
        // Bir daha dene
        await new Promise(resolve => setTimeout(resolve, 200))
        containerElement = scannerRef.current || document.getElementById('material-qr-reader')
        if (!containerElement) {
          setScanning(false)
          setErrorMessage('Scanner container bulunamadı. Sayfayı yenileyin.')
          console.error('Tarayıcı kapsayıcısı bulunamadı')
          return
        }
      }
      
      // Container'ın görünür olduğundan emin ol
      if (containerElement) {
        containerElement.style.display = 'block'
        containerElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      const html5QrCode = new Html5Qrcode('material-qr-reader')
      html5QrCodeRef.current = html5QrCode

      // Tüm kamerları al
      let cameras: any[] = []
      try {
        cameras = await Html5Qrcode.getCameras()
      } catch (camError) {
        console.log('Kamera listesi alınamadı, facingMode deneniyor...', camError)
      }

      let startSuccess = false
      let lastError: any = null

      // Yöntem 1: facingMode ile dene - en basit config (sadece gerekli parametreler)
      if (!startSuccess) {
        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 5, // Daha düşük FPS
              qrbox: function(viewfinderWidth, viewfinderHeight) {
                // Dinamik boyutlandırma
                const minEdgePercentage = 0.7
                const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight)
                const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage)
                return {
                  width: qrboxSize,
                  height: qrboxSize
                }
              },
            },
            (decodedText: string) => {
              handleQRScan(decodedText)
            },
            () => {
              // Hata mesajını görmezden gel
            }
          )
          startSuccess = true
          console.log('Kamera başarıyla başlatıldı (facingMode)')
        } catch (err: any) {
          console.log('facingMode başarısız:', err.message)
          lastError = err
        }
      }

      // Yöntem 2: Kamera listesinden arka kamerayı bul
      if (!startSuccess && cameras.length > 0) {
        try {
          let cameraId = null
          
          // Önce arka kamerayı bul
          for (const device of cameras) {
            const label = (device.label || '').toLowerCase()
            if (label.includes('back') || 
                label.includes('rear') ||
                label.includes('environment') ||
                label.includes('arrière') ||
                label.includes('facing back')) {
              cameraId = device.id
              break
            }
          }
          
          // Arka kamera bulunamazsa son kamerayı dene (genelde arka kamera)
          if (!cameraId && cameras.length > 0) {
            cameraId = cameras[cameras.length - 1].id
          }

          if (cameraId) {
            await html5QrCode.start(
              cameraId,
              {
                fps: 5,
                qrbox: function(viewfinderWidth, viewfinderHeight) {
                  const minEdgePercentage = 0.7
                  const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight)
                  const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage)
                  return {
                    width: qrboxSize,
                    height: qrboxSize
                  }
                },
              },
              (decodedText: string) => {
                handleQRScan(decodedText)
              },
              () => {
                // Hata mesajını görmezden gel
              }
            )
            startSuccess = true
            console.log('Kamera başarıyla başlatıldı (camera ID)')
          }
        } catch (deviceError: any) {
          console.log('Kamera ID ile başlatma başarısız:', deviceError.message)
          lastError = deviceError
        }
      }

      // Yöntem 3: İlk kamerayı dene
      if (!startSuccess && cameras.length > 0) {
        try {
          await html5QrCode.start(
            cameras[0].id,
            {
              fps: 5,
              qrbox: function(viewfinderWidth, viewfinderHeight) {
                const minEdgePercentage = 0.7
                const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight)
                const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage)
                return {
                  width: qrboxSize,
                  height: qrboxSize
                }
              },
            },
            (decodedText: string) => {
              handleQRScan(decodedText)
            },
            () => {
              // Hata mesajını görmezden gel
            }
          )
          startSuccess = true
          console.log('Kamera başarıyla başlatıldı (ilk kamera)')
        } catch (firstCamError: any) {
          console.log('İlk kamera ile başlatma başarısız:', firstCamError.message)
          lastError = firstCamError
        }
      }

      // Yöntem 4: user (ön kamera) dene
      if (!startSuccess) {
        try {
          await html5QrCode.start(
            { facingMode: 'user' },
            {
              fps: 5,
              qrbox: function(viewfinderWidth, viewfinderHeight) {
                const minEdgePercentage = 0.7
                const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight)
                const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage)
                return {
                  width: qrboxSize,
                  height: qrboxSize
                }
              },
            },
            (decodedText: string) => {
              handleQRScan(decodedText)
            },
            () => {
              // Hata mesajını görmezden gel
            }
          )
          startSuccess = true
          console.log('Kamera başarıyla başlatıldı (user facingMode)')
        } catch (userError: any) {
          console.log('user facingMode başarısız:', userError.message)
          lastError = userError
        }
      }

      if (!startSuccess) {
        console.error('Tüm kamera başlatma yöntemleri başarısız oldu', lastError)
        let errorMsg = lastError?.message || 'Kamera başlatılamadı'
        
        // Daha açıklayıcı hata mesajları
        if (errorMsg.includes('streaming') || errorMsg.includes('not supported')) {
          errorMsg = 'Kamera desteklenmiyor. Manuel giriş kullanabilirsiniz.'
        } else if (errorMsg.includes('Permission') || errorMsg.includes('NotAllowed')) {
          errorMsg = 'Kamera izni reddedildi. Manuel giriş kullanabilirsiniz.'
        } else if (errorMsg.includes('NotFound') || errorMsg.includes('no camera')) {
          errorMsg = 'Kamera bulunamadı. Manuel giriş kullanabilirsiniz.'
        } else if (errorMsg.includes('NotReadable') || errorMsg.includes('TrackStart')) {
          errorMsg = 'Kamera kullanımda. Manuel giriş kullanabilirsiniz.'
        } else {
          errorMsg = 'Kamera açılamadı. Manuel giriş kullanabilirsiniz.'
        }
        
        setErrorMessage(errorMsg)
        setScanning(false)
      } else {
        setErrorMessage('')
      }
    } catch (error: any) {
      console.error('Kamera hatası:', error)
      setScanning(false)
    }
  }

  async function stopScanner() {
    if (html5QrCodeRef.current && scanning) {
      try {
        await html5QrCodeRef.current.stop()
        await html5QrCodeRef.current.clear()
      } catch (err) {
        console.error('Tarayıcı durdurma hatası:', err)
      }
      html5QrCodeRef.current = null
      setScanning(false)
    }
  }

  async function handleQRScan(decodedText: string) {
    await stopScanner()
    
    try {
      // QR kod içeriğini parse et
      let qrData = decodedText
      
      // Eğer URL ise, data parametresini al
      if (decodedText.includes('?data=')) {
        const url = new URL(decodedText)
        qrData = url.searchParams.get('data') || decodedText
      }

      await loadMaterialFromQR(qrData)
    } catch (error: any) {
      setScanResultModal({ message: error?.message || 'QR kod okunamadı', isError: true })
    }
  }

  async function handleStockChange() {
    if (!material || stockChange === 0) {
      toast.warning('Miktar girin')
      return
    }

    setSaving(true)
    try {
      const quantity = stockType === 'in' ? stockChange : -stockChange
      
      const response = await fetch('/api/materials/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: material.id,
          quantity: quantity,
          movement_type: stockType,
          notes: `Mobil QR: ${stockType === 'in' ? 'Giriş' : 'Çıkış'}`,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Stok güncellenemedi')
      }

      const result = await response.json()
      
      // Malzeme bilgisini yeniden yükle
      const materialResponse = await fetch(`/api/materials/${material.id}`)
      if (materialResponse.ok) {
        const materialData = await materialResponse.json()
        setMaterial(materialData)
      }

      toast.success(`Stok ${stockType === 'in' ? 'artırıldı' : 'azaltıldı'}! Yeni stok: ${result.new_stock} ${material.unit}`)
      setStockChange(0)
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/mobile')}
            className="text-blue-400 hover:text-blue-300 mb-4 inline-flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Geri</span>
          </button>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center space-x-2">
            <Package className="w-6 h-6" />
            <span>Hızlı Stok İşlemi</span>
          </h1>
          <p className="text-gray-400 text-sm">QR kod okutarak malzeme stokunu düzenleyin</p>
        </div>

        {/* Okunan barkod mesajı - Tamam'a basılana kadar ekranda kalır */}
        {scanResultModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">
            <div className={`rounded-xl border-2 p-6 max-w-md w-full shadow-xl ${
              scanResultModal.isError ? 'bg-red-900/95 border-red-600' : 'bg-green-900/95 border-green-600'
            }`}>
              <p className={`text-lg font-semibold mb-4 whitespace-pre-line ${
                scanResultModal.isError ? 'text-red-100' : 'text-green-100'
              }`}>
                {scanResultModal.message}
              </p>
              <button
                type="button"
                onClick={() => setScanResultModal(null)}
                className="w-full py-3 bg-white text-gray-900 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
              >
                Tamam
              </button>
            </div>
          </div>
        )}

        {/* QR Scanner - Manuel giriş öncelikli */}
        {!material && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 md:p-6 mb-6">
            <div className="text-center mb-4">
              <QrCode className="w-12 h-12 text-blue-400 mx-auto mb-2" />
              <p className="text-white font-semibold mb-1">QR Kod veya Malzeme Kodu</p>
              <p className="text-gray-400 text-sm">Manuel giriş veya kamera ile okutun</p>
            </div>

            {/* Manuel Giriş - Öncelikli */}
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Malzeme Kodu veya QR Kod</label>
              <input
                type="text"
                id="manual-qr-input"
                placeholder="Malzeme kodunu buraya yazın veya QR kodu okutun"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-base"
                autoFocus
                onKeyPress={async (e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    await loadMaterialFromQR(e.currentTarget.value.trim())
                    e.currentTarget.value = ''
                  }
                }}
              />
              <p className="text-xs text-gray-400 mt-2 text-center">
                Kodu yazıp Enter'a basın veya aşağıdaki butonla kamera açın
              </p>
            </div>

            {/* Scanner Container - Her zaman render edilsin, görünürlüğü kontrol edelim */}
            <div 
              id="material-qr-reader" 
              ref={scannerRef}
              className={`mb-4 w-full bg-black rounded-lg overflow-hidden ${scanning ? 'block' : 'hidden'}`}
              style={{ minHeight: '250px', maxHeight: '400px', position: 'relative' }}
            ></div>

            {!scanning ? (
              <div className="space-y-2">
                <button
                  onClick={startScanner}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition font-semibold touch-manipulation"
                >
                  📷 Kamerayı Aç (Opsiyonel)
                </button>
                {errorMessage && (
                  <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg mb-2">
                    <p className="text-yellow-300 text-xs mb-1">{errorMessage}</p>
                    <p className="text-yellow-400 text-xs">
                      💡 Sorun yaşıyorsanız yukarıdaki alana malzeme kodunu manuel yazabilirsiniz.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 text-center">
                  Kamerayı QR koda doğrultun...
                </p>
                <button
                  onClick={stopScanner}
                  className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  Durdur
                </button>
              </div>
            )}
          </div>
        )}

        {/* Material Info & Stock Form */}
        {material && (
          <div className="space-y-4">
            {/* Malzeme Bilgileri */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm text-gray-400">Kod</div>
                  <div className="text-white font-semibold">{material.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Mevcut Stok</div>
                  <div className={`text-xl font-bold ${
                    material.stock_amount < material.min_stock_level ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {material.stock_amount} {material.unit}
                  </div>
                </div>
              </div>
              <div className="text-white font-semibold text-lg mb-1">{material.name}</div>
              <div className="text-gray-400 text-sm">{material.category}</div>
              
              {material.stock_amount < material.min_stock_level && (
                <div className="mt-3 p-2 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
                  ⚠️ Kritik seviye! Minimum: {material.min_stock_level} {material.unit}
                </div>
              )}
            </div>

            {/* Stok İşlemi */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">İşlem Tipi</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setStockType('in')}
                    style={{ backgroundColor: stockType === 'in' ? '#16a34a' : '#374151' }}
                    className="flex-1 py-2 rounded-lg transition font-semibold flex items-center justify-center space-x-2 text-white hover:opacity-90"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Giriş</span>
                  </button>
                  <button
                    onClick={() => setStockType('out')}
                    style={{ backgroundColor: stockType === 'out' ? '#dc2626' : '#374151' }}
                    className="flex-1 py-2 rounded-lg transition font-semibold flex items-center justify-center space-x-2 text-white hover:opacity-90"
                  >
                    <Minus className="w-4 h-4" />
                    <span>Çıkış</span>
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Miktar ({material.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={stockChange || ''}
                  onChange={(e) => setStockChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white rounded-lg text-lg focus:ring-2 focus:border-transparent ${
                    stockType === 'in'
                      ? 'focus:ring-green-500'
                      : 'focus:ring-red-500'
                  }`}
                />
              </div>

              <button
                onClick={handleStockChange}
                disabled={saving || stockChange === 0}
                className={`w-full py-3 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center space-x-2 ${
                  stockType === 'in'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
              </button>
            </div>

            {/* Yeni QR Okut */}
            <button
              onClick={() => {
                setMaterial(null)
                setStockChange(0)
                setScanning(false)
              }}
              className="w-full py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-semibold flex items-center justify-center space-x-2"
            >
              <QrCode className="w-5 h-5" />
              <span>Yeni QR Kod Okut</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

