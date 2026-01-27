'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Package, QrCode, Download } from 'lucide-react'

interface Material {
  id: string
  code: string
  name: string
  category: string
  unit: string
  stock_amount: number
}

export default function MaterialQRPage() {
  const params = useParams()
  const materialId = params.id as string
  const [material, setMaterial] = useState<Material | null>(null)
  const [qrUrl, setQrUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMaterial()
  }, [materialId])

  async function loadMaterial() {
    try {
      const response = await fetch(`/api/materials/${materialId}`)
      if (!response.ok) throw new Error('Malzeme yüklenemedi')
      const data = await response.json()
      setMaterial(data)

      // QR kod içeriği
      const qrData = JSON.stringify({
        type: 'material',
        id: data.id,
        code: data.code || data.id,
      })

      // QR kod URL'i
      const mobileUrl = `${window.location.origin}/mobile/material-stock?data=${encodeURIComponent(qrData)}`
      setQrUrl(mobileUrl)

      // QR kod görselini oluştur
      generateQRCode(qrData)
    } catch (error) {
      console.error('Error loading material:', error)
      alert('Malzeme yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function generateQRCode(data: string) {
    // QR kod görselini oluştur (api.qrserver.com kullan)
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`
    const img = document.getElementById('qr-image') as HTMLImageElement
    if (img) {
      img.src = qrImageUrl
    }
  }

  function downloadQR() {
    const img = document.getElementById('qr-image') as HTMLImageElement
    if (img && img.src) {
      const link = document.createElement('a')
      link.href = img.src
      link.download = `QR-${material?.code || material?.id}.png`
      link.click()
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

  if (!material) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Malzeme bulunamadı</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          {/* Malzeme Bilgileri */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <Package className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">{material.name}</h1>
                <p className="text-gray-400">Kod: {material.code || material.id}</p>
              </div>
            </div>
            {material.category && (
              <div className="text-sm text-gray-400">Kategori: {material.category}</div>
            )}
          </div>

          {/* QR Kod */}
          <div className="bg-white rounded-lg p-6 mb-6 flex flex-col items-center">
            <div className="mb-4">
              <QrCode className="w-12 h-12 text-gray-800 mx-auto mb-2" />
              <p className="text-gray-600 text-sm text-center">QR Kod</p>
            </div>
            <img
              id="qr-image"
              alt="QR Code"
              className="w-64 h-64 border-2 border-gray-300 rounded"
            />
            <button
              onClick={downloadQR}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>İndir</span>
            </button>
          </div>

          {/* Mobil Link */}
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <div className="text-sm text-gray-400 mb-2">Mobil Link:</div>
            <div className="text-white text-xs break-all bg-gray-800 p-2 rounded">
              {qrUrl}
            </div>
          </div>

          {/* Kullanım Talimatları */}
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">Kullanım:</h3>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>QR kodu yazdırın ve malzeme üzerine yapıştırın</li>
              <li>Telefon kamerası ile QR kodu okutun</li>
              <li>Otomatik olarak stok düzenleme sayfası açılacak</li>
              <li>Stok giriş/çıkış işlemini yapın</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

