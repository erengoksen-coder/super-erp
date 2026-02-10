'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, CheckCircle, XCircle, Factory } from 'lucide-react'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface ProductionOrder {
  id: string
  order_number: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'delayed'
  quantity: number
  created_at: string
  updated_at: string
  created_by?: string | null
  product_name?: string | null
}

const statusConfig = {
  pending: { label: 'Beklemede', color: 'warning' as const, icon: Clock },
  in_progress: { label: 'Üretimde', color: 'primary' as const, icon: Factory },
  completed: { label: 'Tamamlandı', color: 'success' as const, icon: CheckCircle },
  cancelled: { label: 'İptal', color: 'error' as const, icon: XCircle },
  delayed: { label: 'Gecikmeli', color: 'warning' as const, icon: Clock },
}

type ProductionRealtimeProps = {
  pollMs?: number
}

export function ProductionRealtime({ pollMs = 15000 }: ProductionRealtimeProps) {
  const preferLocal = process.env.NEXT_PUBLIC_USE_LOCAL_DB === 'true'
  return preferLocal ? <LocalProductionRealtime pollMs={pollMs} /> : <SupabaseProductionRealtime />
}

function SupabaseProductionRealtime() {
  const { data: orders, loading, error } = useRealtime<ProductionOrder>('production_orders')
  return <ProductionRealtimeView orders={orders} loading={loading} error={error} />
}

function LocalProductionRealtime({ pollMs }: { pollMs: number }) {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchApi('/api/production')
      setOrders(Array.isArray(data) ? data : [])
      setLoading(false)
    } catch (err) {
      setError(err as Error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, pollMs)
    return () => clearInterval(interval)
  }, [loadOrders, pollMs])

  return <ProductionRealtimeView orders={orders} loading={loading} error={error} />
}

function ProductionRealtimeView({
  orders,
  loading,
  error,
}: {
  orders: ProductionOrder[]
  loading: boolean
  error: Error | null
}) {
  const [showDetails, setShowDetails] = useState(false)
  if (loading) return <div>Yükleniyor...</div>
  if (error) return <div>Hata: {error.message}</div>

  const stats = {
    pending: orders.filter((o) => o.status === 'pending').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }

  return (
    <div id="production-details" className="space-y-4 scroll-mt-24">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats).map(([key, value]) => {
          const config = statusConfig[key as keyof typeof statusConfig]
          const Icon = config.icon
          return (
            <Card key={key} variant="flat">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{config.label}</p>
                    <p className="text-2xl font-semibold text-gray-900">{value}</p>
                  </div>
                  <Icon className="h-5 w-5 text-gray-400" />
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      <Card>
        <div
          className="cursor-pointer"
          onClick={() => setShowDetails((prev) => !prev)}
        >
          <CardHeader title="Canlı Üretim Durumu" />
        </div>
        {showDetails && (
          <CardBody className="space-y-3">
            {orders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending
              const Icon = config.icon

              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{order.order_number}</div>
                    <div className="text-sm text-gray-500">
                      {order.product_name || 'Ürün'} · {order.quantity} adet
                    </div>
                  </div>

                  <Badge variant="soft" color={config.color}>
                    <Icon className="h-4 w-4 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              )
            })}
          </CardBody>
        )}
      </Card>
    </div>
  )
}
