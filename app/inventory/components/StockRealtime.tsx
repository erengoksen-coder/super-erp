'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Package, AlertTriangle, TrendingUp } from 'lucide-react'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface InventoryItem {
  id: string
  name: string
  code?: string | null
  sku?: string | null
  stock_amount: number
  min_stock_level: number
  unit?: string | null
  item_type: 'material' | 'product'
}

type StockRealtimeProps = {
  pollMs?: number
}

export function StockRealtime({ pollMs = 15000 }: StockRealtimeProps) {
  const preferLocal = process.env.NEXT_PUBLIC_USE_LOCAL_DB === 'true'
  return preferLocal ? <LocalStockRealtime pollMs={pollMs} /> : <SupabaseStockRealtime />
}

function SupabaseStockRealtime() {
  const { data: inventory, loading, error } = useRealtime<InventoryItem>('inventory')
  return <StockRealtimeView inventory={inventory} loading={loading} error={error} />
}

function LocalStockRealtime({ pollMs }: { pollMs: number }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadInventory = useCallback(async () => {
    try {
      const [materials, products] = await Promise.all([
        fetchApi('/api/inventory/materials'),
        fetchApi('/api/inventory/products'),
      ])

      const materialItems = (Array.isArray(materials) ? materials : []).map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code ?? null,
        sku: null,
        stock_amount: item.stock_amount ?? 0,
        min_stock_level: item.min_stock_level ?? 0,
        unit: item.unit ?? null,
        item_type: 'material' as const,
      }))

      const productItems = (Array.isArray(products) ? products : []).map((item) => ({
        id: item.id,
        name: item.name,
        code: null,
        sku: item.sku ?? null,
        stock_amount: item.stock_amount ?? 0,
        min_stock_level: item.min_stock_level ?? 0,
        unit: item.unit ?? null,
        item_type: 'product' as const,
      }))

      setInventory([...materialItems, ...productItems])
      setLoading(false)
    } catch (err) {
      setError(err as Error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInventory()
    const interval = setInterval(loadInventory, pollMs)
    return () => clearInterval(interval)
  }, [loadInventory, pollMs])

  return <StockRealtimeView inventory={inventory} loading={loading} error={error} />
}

function StockRealtimeView({
  inventory,
  loading,
  error,
}: {
  inventory: InventoryItem[]
  loading: boolean
  error: Error | null
}) {
  const [showDetails, setShowDetails] = useState(true)
  const { lowStockItems, totalStockValue, activeProductCount, materialsWithStock } = useMemo(() => {
    const lowStock = inventory.filter(
      (item) => (item.stock_amount ?? 0) < (item.min_stock_level ?? 0)
    )
    const total = inventory.reduce((sum, item) => sum + (item.stock_amount ?? 0), 0)
    // Aktif ürünler = stokta miktarı > 0 olanlar (veri olarak "stokta olan" sayılır)
    const activeCount = inventory.filter((item) => (item.stock_amount ?? 0) > 0).length
    // Canlı stok listesinde sadece hammadde (material) ve stoku > 0 olanlar
    const materialsOnly = inventory.filter(
      (item) => item.item_type === 'material' && (item.stock_amount ?? 0) > 0
    )
    return { lowStockItems: lowStock, totalStockValue: total, activeProductCount: activeCount, materialsWithStock: materialsOnly }
  }, [inventory])

  if (loading) return <div>Yükleniyor...</div>
  if (error) return <div>Hata: {error.message}</div>

  return (
    <div id="stock-details" className="space-y-4 scroll-mt-24">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="flat">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Stok</p>
                <p className="text-2xl font-semibold text-gray-900">{totalStockValue}</p>
                <p className="text-xs text-gray-500">toplam adet</p>
              </div>
              <Package className="h-5 w-5 text-gray-400" />
            </div>
          </CardBody>
        </Card>

        <Card variant="flat">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Düşük Stok</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {lowStockItems.length}
                </p>
                <p className="text-xs text-gray-500">kritik stok</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
          </CardBody>
        </Card>

        <Card variant="flat">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aktif Ürünler</p>
                <p className="text-2xl font-semibold text-gray-900">{activeProductCount}</p>
                <p className="text-xs text-gray-500">stokta</p>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </CardBody>
        </Card>
      </div>

      {lowStockItems.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {lowStockItems.length} ürün düşük stok seviyesinde. Acil sipariş önerilir.
        </div>
      )}

      <Card>
        <div
          className="cursor-pointer"
          onClick={() => setShowDetails((prev) => !prev)}
        >
          <CardHeader title="Canlı Stok Durumu (Hammadde depo)" />
        </div>
        {showDetails && (
          <CardBody className="space-y-2">
            {materialsWithStock.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">Stokta hammadde bulunmuyor.</p>
            ) : (
            materialsWithStock.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    {item.code || item.sku || 'Kod yok'}
                  </div>
                </div>

                <Badge
                  variant="solid"
                  color={
                    item.stock_amount < item.min_stock_level
                      ? 'error'
                      : item.stock_amount < item.min_stock_level * 2
                      ? 'warning'
                      : 'success'
                  }
                  size="lg"
                >
                {item.stock_amount} {item.unit || 'adet'}
                </Badge>
              </div>
            ))
            )}
          </CardBody>
        )}
      </Card>
    </div>
  )
}
