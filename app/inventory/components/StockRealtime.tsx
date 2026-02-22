'use client'

import Link from 'next/link'
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
    // Kritik stok sayısı sadece malzemeler (Kritik Stok sayfası sadece malzeme listeliyor; sayı eşleşsin)
    const lowStock = inventory.filter(
      (item) => item.item_type === 'material' && (item.min_stock_level ?? 0) > 0 && (item.stock_amount ?? 0) < (item.min_stock_level ?? 0)
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
        <Card variant="flat" className="group transition-colors hover:bg-slate-700/50 dark:hover:bg-slate-700/50">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400 group-hover:text-white dark:group-hover:text-white transition-colors">Toplam Stok</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white group-hover:text-white dark:group-hover:text-white transition-colors">{totalStockValue}</p>
                <p className="text-xs text-gray-500 dark:text-slate-500 group-hover:text-white dark:group-hover:text-white transition-colors">toplam adet</p>
              </div>
              <Package className="h-5 w-5 text-gray-400 dark:text-slate-400 group-hover:text-white dark:group-hover:text-white transition-colors" />
            </div>
          </CardBody>
        </Card>

        <Link
          href="/purchase/critical-stock"
          onClick={(e) => e.stopPropagation()}
          className="block"
        >
          <Card variant="flat" className="group transition-colors hover:bg-amber-500/20 dark:hover:bg-amber-500/20 border-amber-500/30 dark:border-amber-500/30 cursor-pointer">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-200 group-hover:text-amber-100">Düşük Stok</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-300 group-hover:text-amber-200">
                    {lowStockItems.length}
                  </p>
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-300 group-hover:text-amber-100">Kritik stok</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400 group-hover:text-amber-300" />
              </div>
            </CardBody>
          </Card>
        </Link>

        <Card variant="flat" className="group transition-colors hover:bg-slate-700/50 dark:hover:bg-slate-700/50">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400 group-hover:text-white dark:group-hover:text-white transition-colors">Aktif Ürünler</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white group-hover:text-white dark:group-hover:text-white transition-colors">{activeProductCount}</p>
                <p className="text-xs text-gray-500 dark:text-slate-500 group-hover:text-white dark:group-hover:text-white transition-colors">stokta</p>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400 dark:text-slate-400 group-hover:text-white dark:group-hover:text-white transition-colors" />
            </div>
          </CardBody>
        </Card>
      </div>

      {lowStockItems.length > 0 && (
        <Link
          href="/purchase/critical-stock"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 rounded-lg border border-red-500/80 dark:border-red-500 px-4 py-3 text-base font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500 dark:text-red-400" aria-hidden />
          <span>{lowStockItems.length} ürün düşük stok seviyesinde. Acil sipariş önerilir.</span>
        </Link>
      )}

      <Card className="group">
        <div
          className="cursor-pointer"
          onClick={() => setShowDetails((prev) => !prev)}
        >
          <CardHeader title="Canlı Stok Durumu (Hammadde depo)" />
        </div>
        {showDetails && (
          <CardBody className="space-y-2">
            {materialsWithStock.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500 dark:text-slate-400 group-hover:text-white dark:group-hover:text-white transition-colors">Stokta hammadde bulunmuyor.</p>
            ) : (
            materialsWithStock.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-600 p-3 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700/80 transition-colors group/item"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-slate-100 group-hover/item:text-white dark:group-hover/item:text-white">{item.name}</div>
                  <div className="text-sm text-gray-600 dark:text-slate-300 group-hover/item:text-white dark:group-hover/item:text-white transition-colors">
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
