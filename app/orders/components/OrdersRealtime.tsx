'use client'

import { useCallback, useEffect, useState } from 'react'
import { Package, TrendingUp, TrendingDown } from 'lucide-react'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Order {
  id: string
  order_number: string
  customer_name?: string | null
  status?: string | null
  total_amount?: number | null
  created_at: string
  updated_at?: string | null
}

type OrdersRealtimeProps = {
  pollMs?: number
}

export function OrdersRealtime({ pollMs = 15000 }: OrdersRealtimeProps) {
  const preferLocal = process.env.NEXT_PUBLIC_USE_LOCAL_DB === 'true'
  return preferLocal ? <LocalOrdersRealtime pollMs={pollMs} /> : <SupabaseOrdersRealtime />
}

function SupabaseOrdersRealtime() {
  const { data: orders, loading, error } = useRealtime<Order>('orders')
  return <OrdersRealtimeView orders={orders} loading={loading} error={error} />
}

function LocalOrdersRealtime({ pollMs }: { pollMs: number }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchApi('/api/orders')
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

  return <OrdersRealtimeView orders={orders} loading={loading} error={error} />
}

function OrdersRealtimeView({
  orders,
  loading,
  error,
}: {
  orders: Order[]
  loading: boolean
  error: Error | null
}) {
  const [showDetails, setShowDetails] = useState(false)
  if (loading) return <div>Yükleniyor...</div>
  if (error) return <div>Hata: {error.message}</div>

  const today = new Date().toDateString()
  const todayOrders = orders.filter(
    (order) => new Date(order.created_at).toDateString() === today
  )

  const totalToday = todayOrders.reduce(
    (sum, order) => sum + (order.total_amount ?? 0),
    0
  )
  const avgOrderValue = todayOrders.length > 0 ? totalToday / todayOrders.length : 0

  return (
    <div id="orders-details" className="space-y-4 scroll-mt-24">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="flat">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bugünkü Siparişler</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {todayOrders.length}
                </p>
                <p className="text-xs text-gray-500">sipariş</p>
              </div>
              <Package className="h-5 w-5 text-gray-400" />
            </div>
          </CardBody>
        </Card>

        <Card variant="flat">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Ciro</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ₺{totalToday.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">bugün</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardBody>
        </Card>

        <Card variant="flat">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ortalama Sipariş</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ₺{avgOrderValue.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">değer</p>
              </div>
              <TrendingDown className="h-5 w-5 text-gray-400" />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <div
          className="cursor-pointer"
          onClick={() => setShowDetails((prev) => !prev)}
        >
          <CardHeader title="Canlı Sipariş Listesi" />
        </div>
        {showDetails && (
          <CardBody className="space-y-3">
            {todayOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="font-medium text-gray-900">#{order.order_number}</div>
                  <div className="text-sm text-gray-500">
                    {order.customer_name || 'Müşteri'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    ₺{(order.total_amount ?? 0).toLocaleString('tr-TR', {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <Badge variant="outline" color="secondary" size="sm">
                    {new Date(order.created_at).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Badge>
                </div>
              </div>
            ))}

            {todayOrders.length === 0 && (
              <div className="text-sm text-gray-500">Bugün için sipariş yok.</div>
            )}
          </CardBody>
        )}
      </Card>
    </div>
  )
}
