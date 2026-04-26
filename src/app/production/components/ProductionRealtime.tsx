'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, CheckCircle, XCircle, Factory } from 'lucide-react'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

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
  if (loading) return <div className="p-8 text-center opacity-20 italic">Sistem Verileri Senkronize Ediliyor...</div>
  if (error) return <div className="p-8 text-center text-red-400">Veri bağlantı hatası: {error.message}</div>

  const stats = {
    pending: orders.filter((o) => o.status === 'pending').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    delayed: orders.filter((o) => o.status === 'delayed' || o.status === 'cancelled').length,
  }

  return (
    <div id="production-details" className="space-y-6 scroll-mt-24">
      {/* Platinum Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats).map(([key, value]) => {
          const config = statusConfig[key as keyof typeof statusConfig] || statusConfig.pending
          const Icon = config.icon
          const isActive = key === 'in_progress' && value > 0
          
          return (
            <Card 
              key={key} 
              variant="glass" 
              className={cn(
                "group transition-all duration-500 border-white/5 relative overflow-hidden",
                isActive && "animate-neon-pulse border-primary/30"
              )}
            >
              <CardBody className="p-6 flex flex-col items-center justify-center text-center relative z-10">
                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] mb-2">{config.label}</p>
                <p className="text-4xl font-black text-foreground tracking-tighter">{value}</p>
                
                {/* Decorative Background Icon */}
                <div className={cn(
                  "absolute -right-2 top-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 pointer-events-none",
                  isActive && "opacity-[0.1] text-primary"
                )}>
                  <Icon className="h-20 w-20 rotate-12" />
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      {/* Production Flow List */}
      <Card variant="glass" className="border-white/5 overflow-hidden">
        <CardHeader 
           className="border-b border-white/5 bg-white/[0.02]"
           title={
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-glow" />
               <span className="text-sm font-black uppercase tracking-widest text-foreground/80">Canlı Üretim Hattı Matrisi</span>
             </div>
           }
        />
        <CardBody className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
          {orders.length === 0 ? (
            <div className="py-10 text-center opacity-20 italic text-xs uppercase tracking-widest">Aktif iş emri bulunamadı.</div>
          ) : (
            orders.slice(0, 10).map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending
              const Icon = config.icon
              const inProgress = order.status === 'in_progress'

              return (
                <div
                  key={order.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-[1.25rem] border p-4 transition-all duration-500 group/item relative overflow-hidden",
                    inProgress 
                      ? "bg-primary/5 border-primary/20 shadow-glow shadow-primary/5" 
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                  )}
                >
                  {inProgress && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-glow" />
                  )}
                  
                  <div className="flex items-center justify-between z-10">
                    <div className="space-y-1">
                      <div className="text-sm font-black text-foreground italic group-hover/item:text-primary transition-colors flex items-center gap-2">
                        {order.order_number}
                        {inProgress && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary animate-pulse">AKTİF HÜCRE</span>}
                      </div>
                      <div className="text-[11px] font-bold text-foreground/40 uppercase tracking-tight">
                        {order.product_name || 'Ürün'} · <span className="text-foreground/60">{order.quantity} ADET</span>
                      </div>
                    </div>

                    <Badge variant="soft" color={config.color} className="font-black text-[9px] tracking-widest px-3">
                      <Icon className="h-3 w-3 mr-1.5" />
                      {config.label.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Flow Progress Line */}
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
                    <div 
                       className={cn(
                         "h-full transition-all duration-1000",
                         order.status === 'completed' ? "bg-emerald-500 w-full" : 
                         order.status === 'in_progress' ? "bg-primary w-[65%] animate-pulse shadow-glow" : "bg-white/10 w-[10%]"
                       )} 
                    />
                  </div>
                </div>
              )
            })
          )}
        </CardBody>
      </Card>
    </div>
  )
}
