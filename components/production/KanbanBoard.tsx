'use client'

import React from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/utils/dateFormat'
import { 
  MoreHorizontal, 
  Clock, 
  User, 
  Calendar, 
  Package, 
  Plus, 
  LayoutGrid, 
  Activity, 
  ChevronRight,
  Zap,
  Hammer,
  Truck,
  Scissors,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export interface ProductionOrder {
  id: string
  order_number: string
  product_name: string
  sku?: string
  quantity: number
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  current_station?: string | null
  stations?: string[]
  started_at?: string
  estimated_completion?: string
  assigned_to?: string
  status: string
  created_at?: string
  product_id?: string
  dealer_name?: string | null
  customer_name?: string | null
  customer_order_number?: string | null
  order_date?: string | null
  configuration?: string | null
  notes?: string | null
}

interface KanbanColumnProps {
  title: string
  status: string
  orders: ProductionOrder[]
  onOrderClick?: (order: ProductionOrder) => void
  className?: string
  icon?: React.ReactNode
}

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'urgent': return 'error'
    case 'high': return 'warning'
    case 'medium': return 'primary'
    default: return 'secondary'
  }
}

const getPriorityLabel = (priority?: string) => {
  switch (priority) {
    case 'urgent': return 'ACİL'
    case 'high': return 'YÜKSEK'
    case 'medium': return 'ORTA'
    default: return 'DÜŞÜK'
  }
}

export const KanbanColumn = ({ 
  title, 
  status, 
  orders, 
  onOrderClick,
  className,
  icon
}: KanbanColumnProps) => {
  return (
    <div className={cn('flex flex-col min-w-[320px] max-w-[320px] h-full', className)}>
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
             {icon || <LayoutGrid className="w-4 h-4" />}
          </div>
          <h3 className="font-black text-[10px] uppercase tracking-widest text-foreground/60">{title}</h3>
        </div>
        <Badge 
          variant="glass" 
          className="text-[10px] font-black px-2.5 h-6 min-w-[24px] flex items-center justify-center border-white/5 bg-white/5"
        >
          {orders.length}
        </Badge>
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto p-2 custom-scrollbar min-h-[500px] rounded-3xl bg-white/[0.01] border border-white/5 border-dashed">
        {orders.map((order) => (
          <Card
            key={order.id}
            variant="glass"
            className={cn(
               "cursor-pointer group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
               order.priority === 'urgent' && "border-error/20 bg-error/5 shadow-lg shadow-error/5"
            )}
            onClick={() => onOrderClick?.(order)}
          >
            <CardBody className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] font-mono text-primary font-black uppercase tracking-tighter">#{order.order_number}</span>
                     {order.priority === 'urgent' && <div className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />}
                  </div>
                  <h4 className="font-black text-foreground text-sm uppercase tracking-tight truncate leading-tight">
                    {order.product_name}
                  </h4>
                  <p className="text-[9px] font-bold text-foreground/30 font-mono mt-0.5">
                    {order.sku || 'SKU-NONE'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 opacity-0 group-hover:opacity-40 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                  <Package className="w-3.5 h-3.5 text-primary opacity-40" />
                  <span className="text-[11px] font-black text-foreground/80">
                    {order.quantity} <span className="text-[9px] font-medium opacity-30">ADET</span>
                  </span>
                </div>
                <Badge
                  variant="soft"
                  color={getPriorityColor(order.priority)}
                  className="text-[8px] font-black px-3 tracking-widest"
                >
                  {getPriorityLabel(order.priority)}
                </Badge>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                {order.assigned_to && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-foreground/20" />
                    <span className="text-[10px] font-bold text-foreground/60 uppercase truncate">
                      {order.assigned_to}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-foreground/20" />
                      <span className="text-[10px] font-bold text-foreground/40 italic">
                        {order.estimated_completion ? formatDate(order.estimated_completion) : '—'}
                      </span>
                   </div>
                   <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-lg text-primary">
                      <Zap className="w-3 h-3 shadow-glow" />
                      <span className="text-[8px] font-black tracking-widest uppercase">{status.toUpperCase()}</span>
                   </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
        
        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-10">
            <Activity className="w-8 h-8 mb-2" />
            <p className="text-[9px] font-black uppercase tracking-widest">Sıra Boş</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface KanbanBoardProps {
  orders: ProductionOrder[]
  onOrderClick?: (order: ProductionOrder) => void
  className?: string
}

export const KanbanBoard = ({ orders, onOrderClick, className }: KanbanBoardProps) => {
  const stations = [
    { id: 'iskelet', title: 'İiskelet Atölyesi', status: 'iskelet', icon: <Hammer className="w-4 h-4" /> },
    { id: 'terzihane', title: 'Terzihane / Kesim', status: 'terzihane', icon: <Scissors className="w-4 h-4" /> },
    { id: 'döseme', title: 'Döşeme İşlemi', status: 'döseme', icon: <Layers className="w-4 h-4" /> },
    { id: 'montaj', title: 'Montaj & Kalite', status: 'montaj', icon: <Zap className="w-4 h-4" /> },
    { id: 'sevkiyat', title: 'Hazır / Sevkiyat', status: 'sevkiyat', icon: <Truck className="w-4 h-4" /> }
  ]

  const getOrdersByStation = (station: string) => {
    return orders.filter(order =>
      (order.stations && order.stations.includes(station)) || order.current_station === station
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
           <Activity className="w-5 h-5 text-primary shadow-glow" />
           <h2 className="text-xl font-black uppercase tracking-tighter text-foreground/80">
              Canlı Üretim Akışı
           </h2>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="glass" className="text-[10px] font-black px-4 bg-primary/10 border-primary/20 text-primary">
              TOPLAM {orders.length} İŞ EMRİ
           </Badge>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-10 px-2 custom-scrollbar">
        {stations.map((station) => (
          <KanbanColumn
            key={station.id}
            title={station.title}
            status={station.status}
            icon={station.icon}
            orders={getOrdersByStation(station.id)}
            onOrderClick={onOrderClick}
          />
        ))}
      </div>
    </div>
  )
}