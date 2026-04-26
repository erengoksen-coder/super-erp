'use client'

import { useState, useEffect } from 'react'
import { fetchApi } from '@/lib/api/client'
import { CheckCircle, Clock, Factory, XCircle, ShoppingBag, Calendar } from 'lucide-react'
import { formatOrderDateDisplay } from '@/lib/utils/dateFormat'
import { Badge } from '@/components/ui/Badge'

interface Order {
  id: string
  order_number: string
  dealer_name: string | null
  customer_name: string | null
  product_name: string
  status: 'pending' | 'in_production' | 'completed' | 'cancelled'
  order_date: string | null
  created_at: string
}

export function OrdersRealtime() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const data = await fetchApi<Order[]>('/api/orders?pageSize=5')
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Realtime data error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-900/50 rounded-xl border border-gray-800" />
        ))}
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="p-4 text-center border border-dashed border-gray-800 rounded-xl">
        <p className="text-xs text-gray-500 italic">Henüz sipariş kaydı bulunmuyor.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <div 
          key={order.id} 
          className="group p-3 bg-gray-900/50 border border-gray-800 hover:border-gray-700 rounded-xl flex justify-between items-center transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-200 line-clamp-1 truncate w-32 md:w-48">
                {order.product_name}
              </div>
              <div className="text-[10px] text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="font-mono text-blue-500/80">#{order.order_number}</span>
                <span className="w-1 h-1 rounded-full bg-gray-700" />
                <span>{order.dealer_name || 'Bireysel'}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-[10px] font-medium text-gray-400 flex items-center justify-end gap-1 mb-1">
              <Calendar className="w-3 h-3 text-gray-600" />
              {formatOrderDateDisplay(order.order_date, order.created_at)}
            </div>
            <div className="inline-flex items-center">
              <Badge 
                variant="outline" 
                color={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : 'info'} 
                className="text-[9px] scale-90 origin-right"
              >
                {order.status}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
