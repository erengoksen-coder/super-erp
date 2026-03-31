'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Package, ArrowLeft } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'

type ProductDetail = {
  id: string
  name: string
  sku?: string | null
  stock_amount: number
  min_stock_level: number
  unit: string
  category?: string | null
  cost_price?: number | null
  selling_price?: number | null
  critical_stock?: number | boolean | null
}

export default function InventoryProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params?.id[0] : ''
    if (!id) {
      setError('Ürün ID bulunamadı.')
      setLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchApi<ProductDetail>(`/api/inventory/products/${id}`)
        if (!cancelled) {
          setProduct(data ?? null)
        }
      } catch (err: any) {
        try {
          const list = await fetchApi<ProductDetail[]>(`/api/inventory/products`)
          const fallback = Array.isArray(list)
            ? list.find((item) => item.id === id || item.sku === id)
            : null
          if (!cancelled) {
            if (fallback) {
              setProduct(fallback)
              setError(null)
            } else {
              setError(err?.message || 'Ürün bilgisi alınamadı.')
            }
          }
        } catch {
          if (!cancelled) {
            setError(err?.message || 'Ürün bilgisi alınamadı.')
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [params])

  if (loading) {
    return (
      <AppDashboardLayout title="Ürün Detayı" subtitle="Yükleniyor..." icon={Package}>
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-xl bg-gray-800" />
          <div className="h-32 rounded-xl bg-gray-800" />
        </div>
      </AppDashboardLayout>
    )
  }

  if (error || !product) {
    return (
      <AppDashboardLayout title="Ürün Detayı" subtitle="Ürün bulunamadı" icon={Package}>
        <Card>
          <CardBody className="space-y-4">
            <p className="text-sm text-gray-400">{error || 'Ürün bulunamadı.'}</p>
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri dön
            </Button>
          </CardBody>
        </Card>
      </AppDashboardLayout>
    )
  }

  const isCritical = !!product.critical_stock || product.stock_amount <= product.min_stock_level

  return (
    <AppDashboardLayout
      title={product.name}
      subtitle={product.sku ? `SKU: ${product.sku}` : 'Ürün detayı'}
      icon={Package}
      actions={
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri dön
        </Button>
      }
    >
      <Card>
        <CardBody className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {product.category && <Badge variant="soft" color="secondary">{product.category}</Badge>}
            {isCritical && <Badge variant="soft" color="error">Kritik stok</Badge>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-400">Stok</div>
              <div className="text-xl font-semibold text-white">
                {product.stock_amount} {product.unit}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Min. Stok</div>
              <div className="text-xl font-semibold text-white">
                {product.min_stock_level} {product.unit}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Birim</div>
              <div className="text-xl font-semibold text-white">{product.unit}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-400">Maliyet Fiyatı</div>
              <div className="text-lg font-semibold text-white">
                {typeof product.cost_price === 'number' ? `₺${product.cost_price.toFixed(2)}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Satış Fiyatı</div>
              <div className="text-lg font-semibold text-white">
                {typeof product.selling_price === 'number' ? `₺${product.selling_price.toFixed(2)}` : '—'}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </AppDashboardLayout>
  )
}
