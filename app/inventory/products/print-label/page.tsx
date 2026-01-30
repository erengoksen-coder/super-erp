'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { LogoWithBackground } from '@/components/Logo'
import { Printer, ArrowLeft } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  stock_amount: number
  image_url?: string | null
}

export default function PrintLabelPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('productId')
  const quantity = parseInt(searchParams.get('quantity') || '1')
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (productId) {
      loadProduct()
    }
  }, [productId])

  async function loadProduct() {
    try {
      const db = await import('@/lib/database/client')
      const data = await db.localDB.getProducts()
      const foundProduct = data.find((p: any) => p.id === productId)
      
      if (foundProduct) {
        setProduct({
          id: foundProduct.id,
          name: foundProduct.name,
          sku: foundProduct.sku,
          stock_amount: foundProduct.stock_amount || 0,
          image_url: foundProduct.image_url || null
        })
      }
    } catch (error) {
      console.error('Ürün yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
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

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400">Ürün bulunamadı</p>
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

  // QR kod içeriği: ürün ID ve SKU
  const qrContent = JSON.stringify({
    productId: product.id,
    sku: product.sku,
    name: product.name
  })

  return (
    <div className="p-4">
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

      {/* Etiketler - Her biri 100x100mm */}
      <div className="flex flex-wrap gap-4 justify-center">
        {Array.from({ length: quantity }).map((_, index) => (
          <div
            key={index}
            className="bg-white border-2 border-gray-300 print-label"
            style={{
              width: '100mm',
              height: '100mm',
              padding: '3mm',
              boxSizing: 'border-box',
              pageBreakInside: 'avoid',
              breakInside: 'avoid'
            }}
          >
            {/* Logo - En üstte */}
            <div className="flex justify-center mb-2">
              <LogoWithBackground size="sm" />
            </div>

            {/* Ürün Görseli */}
            {product.image_url ? (
              <div className="flex justify-center mb-2">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="max-w-full max-h-32 object-contain"
                />
              </div>
            ) : (
              <div className="flex justify-center mb-2 h-32 items-center bg-gray-100 rounded">
                <span className="text-gray-400 text-xs">Görsel Yok</span>
              </div>
            )}

            {/* Ürün Bilgileri */}
            <div className="text-center mb-2">
              <div className="font-bold text-sm mb-1">{product.name}</div>
              <div className="text-xs text-gray-600">SKU: {product.sku}</div>
            </div>

            {/* QR Kod */}
            <div className="flex justify-center mb-2">
              <QRCodeSVG
                value={qrContent}
                size={60}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Barkod Numarası */}
            <div className="text-center text-xs font-mono text-gray-700">
              {product.sku}
            </div>
          </div>
        ))}
      </div>

      {/* Yazdırma Stilleri */}
      <style jsx global>{`
        @media print {
          @page {
            size: 100mm 100mm;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }

          .print-label {
            width: 100mm !important;
            height: 100mm !important;
            box-sizing: border-box;
            page-break-after: always;
            page-break-inside: avoid;
            overflow: hidden;
          }

          .print-label:last-child {
            page-break-after: auto;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          /* Printte sarmalamayı kapat */
          .print\\:hidden + div {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}


