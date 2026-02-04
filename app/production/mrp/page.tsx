'use client'

import { useEffect, useMemo, useState } from 'react'
import { Factory, RefreshCw, ShoppingCart } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { LogoWithBackground } from '@/components/Logo'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'

type Product = {
  id: string
  name: string
  sku: string
}

type MrpItem = {
  material_id: string
  material_name: string
  material_code: string | null
  unit: string
  unit_price: number
  required_quantity: number
  available_quantity: number
  shortage: number
  supplier_name: string | null
}

type MrpResult = {
  product: Product
  quantity: number
  items: MrpItem[]
  totals: {
    total_required: number
    total_shortage: number
    shortage_count: number
  }
}

export default function MrpPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('1')
  const [result, setResult] = useState<MrpResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      const data = await fetchApi<Product[]>('/api/products')
      setProducts(data)
      if (data.length && !productId) {
        setProductId(data[0].id)
      }
    } catch (error) {
      console.error('Products load error:', error)
    }
  }

  const selectedProduct = useMemo(() => {
    return products.find((product) => product.id === productId) || null
  }, [products, productId])

  async function handleCalculate() {
    if (!productId) {
      alert('Lütfen ürün seçin')
      return
    }

    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      alert('Miktar pozitif olmalı')
      return
    }

    setLoading(true)
    try {
      const data = await fetchApi<MrpResult>(`/api/mrp?product_id=${productId}&quantity=${qty}`)
      setResult(data)
    } catch (error: any) {
      console.error('MRP error:', error)
      alert(error?.message || 'MRP hesaplama hatası')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateRequests() {
    if (!result) return
    if (!result.items.some((item) => item.shortage > 0)) {
      alert('Eksik malzeme yok')
      return
    }

    setCreating(true)
    try {
      const response = await fetchApi<{ created_count: number; request_numbers: string[] }>('/api/mrp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: result.product.id,
          quantity: result.quantity,
        }),
      })
      alert(`Satın alma talepleri oluşturuldu: ${response.created_count}`)
    } catch (error: any) {
      console.error('Create request error:', error)
      alert(error?.message || 'Satın alma talebi oluşturulamadı')
    } finally {
      setCreating(false)
    }
  }

  return (
    <AppDashboardLayout
      title="MRP - Malzeme İhtiyaç Planlama"
      subtitle="Ürün reçetesine göre malzeme ihtiyacı ve satın alma önerileri"
      icon={Factory}
      actions={
        <Button
          onClick={handleCalculate}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Hesapla
        </Button>
      }
    >
      {/* Form Card */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Ürün</label>
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="">Ürün seçin</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Planlanan Miktar</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex-1 flex items-end">
              <Button
                onClick={handleCreateRequests}
                disabled={creating || !result}
                variant="solid"
                color="success"
                size="sm"
                className="w-full"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {creating ? 'Oluşturuluyor...' : 'Satın Alma Talebi Oluştur'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Results Section */}
      {result && (
        <>
          {/* Stats Cards - Flex layout like Kanban */}
          <div className="flex flex-col sm:flex-row gap-6">
            <Card className="flex-1">
              <CardBody>
                <div className="text-sm text-gray-400">Ürün</div>
                <div className="text-white font-semibold">
                  {result.product.sku} - {result.product.name}
                </div>
              </CardBody>
            </Card>
            <Card className="flex-1">
              <CardBody>
                <div className="text-sm text-gray-400">Toplam İhtiyaç</div>
                <div className="text-white font-semibold">{result.totals.total_required.toFixed(2)}</div>
              </CardBody>
            </Card>
            <Card className="flex-1">
              <CardBody>
                <div className="text-sm text-gray-400">Eksik Kalem</div>
                <div className="text-white font-semibold">{result.totals.shortage_count}</div>
              </CardBody>
            </Card>
          </div>

          {/* Table Card */}
          <Card>
            <CardBody className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-800/80 text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left">Malzeme</th>
                      <th className="px-4 py-3 text-right">Gereken</th>
                      <th className="px-4 py-3 text-right">Mevcut</th>
                      <th className="px-4 py-3 text-right">Eksik</th>
                      <th className="px-4 py-3 text-right">Birim Fiyat</th>
                      <th className="px-4 py-3 text-left">Tedarikçi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {result.items.map((item) => (
                      <tr key={item.material_id} className={item.shortage > 0 ? 'bg-red-500/5' : ''}>
                        <td className="px-4 py-3 text-white">
                          <div className="font-medium">{item.material_name}</div>
                          <div className="text-xs text-gray-400">{item.material_code || item.material_id}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-100">
                          {item.required_quantity.toFixed(2)} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-100">
                          {item.available_quantity.toFixed(2)} {item.unit}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${item.shortage > 0 ? 'text-red-400' : 'text-gray-200'}`}>
                          {item.shortage.toFixed(2)} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-100">
                          {item.unit_price.toFixed(2)} ₺
                        </td>
                        <td className="px-4 py-3 text-gray-200">
                          {item.supplier_name || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </AppDashboardLayout>
  )
}
