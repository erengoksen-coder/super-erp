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
  AlertCircle,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react'
import { toast } from '@/lib/notify'
import { fetchApi } from '@/lib/api/fetch'

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
  onMove?: (orderId: string, toStation: string) => void
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
    <div className={cn('flex flex-col min-w-[340px] max-w-[340px] h-full', className)}>
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-white/10 text-primary shadow-2xl">
             {icon || <LayoutGrid className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-white/80">{title}</h3>
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">İstasyon Hattı</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-black text-white/40">
          {orders.length}
        </div>
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto p-3 custom-scrollbar min-h-[600px] rounded-[2.5rem] bg-black/20 border border-white/[0.03] backdrop-blur-3xl">
        {orders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="perspective-1000"
          >
            <ZenithCard
              glow
              className={cn(
                "cursor-pointer group transition-all duration-500 border-white/[0.05] hover:border-primary/30",
                order.priority === 'urgent' && "border-red-500/30 bg-red-500/5"
              )}
              onClick={() => onOrderClick?.(order)}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono text-primary font-black tracking-tighter bg-primary/10 px-2 py-0.5 rounded-md">#{order.order_number}</span>
                       {order.priority === 'urgent' && (
                         <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/30">
                           <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                           <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">ACİL</span>
                         </div>
                       )}
                    </div>
                    <h4 className="font-black text-white text-base uppercase tracking-tight leading-tight group-hover:text-primary transition-colors">
                      {order.product_name}
                    </h4>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all rounded-xl border-white/5">
                    <MoreHorizontal className="w-4 h-4 text-white/40" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
                    <Package className="w-4 h-4 text-primary opacity-40" />
                    <div>
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Miktar</p>
                      <p className="text-xs font-black text-white">
                        {order.quantity} <span className="text-[9px] font-medium opacity-30 italic">ADET</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
                    <User className="px-px w-4 h-4 text-primary opacity-40" />
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Sorumlu</p>
                      <p className="text-xs font-black text-white truncate uppercase">
                        {order.assigned_to || 'Atanmadı'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Production Progress Bar - Zenith Style */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-white/20 uppercase">
                    <span>Aşama İlerlemesi</span>
                    <span className="text-primary">%{(() => {
                      const stages = ['iskelet', 'terzihane', 'döseme', 'montaj', 'sevkiyat', 'completed'];
                      const idx = stages.indexOf(order.current_station || 'iskelet');
                      return Math.round(((idx) / (stages.length - 1)) * 100);
                    })()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(() => {
                        const stages = ['iskelet', 'terzihane', 'döseme', 'montaj', 'sevkiyat', 'completed'];
                        const idx = stages.indexOf(order.current_station || 'iskelet');
                        return ((idx) / (stages.length - 1)) * 100;
                      })()}%` }}
                      className="h-full bg-gradient-to-r from-primary/50 to-primary shadow-[0_0_10px_rgba(var(--color-primary),0.5)]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between gap-3">
                   <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white/5">
                        <Clock className="w-3.5 h-3.5 text-white/20" />
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Tahmini Teslim</p>
                        <p className="text-[10px] font-bold text-white/60 font-mono">
                          {order.estimated_completion ? formatDate(order.estimated_completion) : 'BELİRSİZ'}
                        </p>
                      </div>
                   </div>
                   
                   <Button 
                    variant="glass" 
                    size="xs" 
                    onClick={(e) => {
                      e.stopPropagation();
                      const stages = ['iskelet', 'terzihane', 'döseme', 'montaj', 'sevkiyat', 'completed'];
                      const currentIdx = stages.indexOf(order.current_station || 'iskelet');
                      const nextStage = stages[currentIdx + 1];
                      if (nextStage) {
                        onMove?.(order.id, nextStage);
                      }
                    }}
                    className="flex-1 h-9 rounded-xl border-white/5 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all group/btn"
                   >
                      İLERLET <ArrowUpRight className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                   </Button>
                </div>
              </div>
            </ZenithCard>
          </motion.div>
        ))}
        
        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 opacity-20 group">
            <div className="w-16 h-16 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-700">
              <Activity className="w-8 h-8" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Hatta İş Yok</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface KanbanBoardProps {
  orders: ProductionOrder[]
  onOrderClick?: (order: ProductionOrder) => void
  onMove?: (orderId: string, toStation: string) => void
  className?: string
}

export const KanbanBoard = ({ orders = [], onOrderClick, className }: KanbanBoardProps) => {
  const stations = [
    { id: 'iskelet', title: 'İskelet Hattı', status: 'iskelet', icon: <Hammer className="w-5 h-5" /> },
    { id: 'terzihane', title: 'Kesim & Dikim', status: 'terzihane', icon: <Scissors className="w-5 h-5" /> },
    { id: 'döseme', title: 'Döşeme Ünitesi', status: 'döseme', icon: <Layers className="w-5 h-5" /> },
    { id: 'montaj', title: 'Montaj / QC', status: 'montaj', icon: <Zap className="w-5 h-5" /> },
    { id: 'sevkiyat', title: 'Paket / Sevk', status: 'sevkiyat', icon: <Truck className="w-5 h-5" /> }
  ]

  const getOrdersByStation = (station: string) => {
    return (orders || []).filter(order =>
      (order?.stations && order.stations.includes(station)) || order?.current_station === station
    )
  }

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_20px_rgba(var(--color-primary),0.2)]">
              <Activity className="w-6 h-6 text-primary" />
           </div>
           <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                 Fabrika Canlı Üretim Akışı
              </h2>
              <p className="text-xs font-bold text-white/20 uppercase tracking-widest mt-1">Gerçek zamanlı istasyon takibi ve verimlilik analizi</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="px-6 py-3 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-xl">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Aktif İş Gücü</p>
              <p className="text-xl font-black text-white tracking-tighter">{orders.length} <span className="text-xs opacity-20 italic">Emir</span></p>
           </div>
        </div>
      </div>

      <div className="flex gap-8 overflow-x-auto pb-10 px-4 custom-scrollbar-horizontal select-none">
        {stations.map((station, idx) => (
          <motion.div
            key={station.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <KanbanColumn
              title={station.title}
              status={station.status}
              icon={station.icon}
              orders={getOrdersByStation(station.id)}
              onOrderClick={onOrderClick}
              onMove={onMove}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}