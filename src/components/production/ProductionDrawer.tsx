'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, BarChart3, PieChart, Activity, Box, Clock, CheckCircle2, Factory } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

interface Order {
  id: string
  order_number: string
  product_name: string
  quantity: number
  status: string
  customer_name?: string | null
}

interface ProductionDrawerProps {
  isOpen: boolean
  onClose: () => void
  status: 'pending' | 'in_production' | 'completed' | 'all'
  orders: Order[]
  totalCount: number
}

export const ProductionDrawer: React.FC<ProductionDrawerProps> = ({ 
  isOpen, 
  onClose, 
  status, 
  orders,
  totalCount
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log('ProductionDrawer Portal Mounted:', true)
  }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!mounted) return null

  // Debug log for checking if drawer is triggered
  if (isOpen) {
    console.log('ProductionDrawer is OPEN with status:', status)
  }

  const safeOrders = orders || []
  const data = [
    { name: 'Bekleyen', value: safeOrders.filter(o => o?.status === 'pending').length, color: '#FF8000' },
    { name: 'Üretimde', value: safeOrders.filter(o => o?.status === 'in_production').length, color: '#2563EB' },
    { name: 'Tamamlanan', value: safeOrders.filter(o => o?.status === 'completed').length, color: '#10B981' },
  ]

  const statusColors = {
    pending: 'text-[#FF8000] border-[#FF8000]',
    in_production: 'text-[#2563EB] border-[#2563EB]',
    completed: 'text-[#10B981] border-[#10B981]',
    all: 'text-cyan-400 border-cyan-400'
  }

  const statusLabels = {
    pending: 'BEKLEYEN EMİRLER',
    in_production: 'ÜRETİMDEKİLER',
    completed: 'TAMAMLANANLAR',
    all: 'TÜM OPERASYONLAR'
  }

  const statusIcons = {
    pending: Clock,
    in_production: Factory,
    completed: CheckCircle2,
    all: Box
  }

  const StatusIcon = statusIcons[status] || Box

  const drawerElement = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed inset-y-0 right-0 w-full max-w-md pointer-events-auto",
              "bg-[#0b101d]/95 backdrop-blur-[60px] border-l border-cyan-500/20 shadow-[-25px_0_80px_rgba(0,0,0,0.9)]",
              "flex flex-col overflow-hidden"
            )}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl bg-white/5 border", statusColors[status])}>
                  <StatusIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.2em] leading-tight">DETAY PANELİ</h3>
                  <h2 className="text-lg font-black text-white tracking-tighter uppercase italic">{statusLabels[status]}</h2>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="rounded-full hover:bg-white/5 text-white/20 hover:text-white"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Analytics Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">TOPLAM SAYI</span>
                  <p className="text-2xl font-black text-white italic">{orders.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">ORAN</span>
                  <p className="text-2xl font-black text-cyan-400 italic">
                    %{totalCount > 0 ? Math.round((orders.length / totalCount) * 100) : 0}
                  </p>
                </div>
              </div>

              {/* Distribution Chart */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-500" />
                  DAĞILIM ANALİZİ
                </h4>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                     <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-bold text-white/40 uppercase tracking-widest">
                           <span>BÖLGE-{i+1} VERİMLİLİK</span>
                           <span>%{85 - (i * 7)}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/[0.02]">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${85 - (i * 7)}%` }}
                              transition={{ duration: 1, delay: i * 0.1 }}
                              className="h-full bg-gradient-to-r from-cyan-500/50 to-cyan-400 shadow-[0_0_10px_#06b6d4]"
                           />
                        </div>
                     </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders List */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#FF8000]" />
                  SON İŞLEMLER (MAX 10)
                </h4>
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <div className="py-10 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Kayıt Bulunamadı</p>
                    </div>
                  ) : (
                    orders.slice(0, 10).map((order) => (
                      <div key={order.id} className="group p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[11px] font-black text-cyan-400 tracking-tighter italic">{order.order_number}</span>
                          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{order.quantity} Adet</span>
                        </div>
                        <div className="text-[13px] font-black text-white/80 uppercase truncate">{order.product_name}</div>
                        <div className="mt-2 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-white/20 truncate max-w-[150px] italic">{order.customer_name || 'BİREYSEL'}</span>
                            <ArrowRight className="w-3 h-3 text-white/10 group-hover:text-cyan-500 transition-colors" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-white/[0.02] border-t border-white/5">
              <Button className="w-full h-12 bg-white/5 border-white/10 text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white/10 rounded-2xl">
                TAM LİSTEYİ GÖRÜNTÜLE
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return createPortal(drawerElement, document.body)
}
