'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FileSpreadsheet, 
  Trash2, 
  Pencil,
  ShoppingCart,
  Package,
  Calendar,
  MoreHorizontal,
  Search,
  Filter,
  Plus,
  FileDown
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useApi } from '@/lib/hooks/useApi'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'
import { usePolling } from '@/lib/hooks/usePolling'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/lib/store/authStore'
import { getAuthHeaders } from '@/lib/api/client'

interface Order {
  id: string
  order_number: string
  dealer_name: string | null
  customer_name: string | null
  customer_code: string | null
  product_name: string
  product_sku: string | null
  product_id: string | null
  quantity: number
  unit_price: number
  total_amount: number
  order_date: string | null
  delivery_date: string | null
  status: 'pending' | 'in_production' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
}

const statusColors = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  in_production: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20'
}

const statusLabels = {
  pending: 'Bekliyor',
  in_production: 'Üretimde',
  completed: 'Tamamlandı',
  cancelled: 'İptal'
}

/** 
 * parseOrderDetails: Combined notları diziye çevirir.
 * "Kumaş: X | Kasa: Y | Açıklama: Z" -> { specs: [{label, value}], description: "Z" }
 */
function parseOrderDetails(notes: string | null) {
  if (!notes) return { specs: [], description: '' };
  
  const parts = notes.split('|').map(p => p.trim()).filter(Boolean);
  const specs: Array<{ label: string, value: string }> = [];
  let description = '';

  const knownLabels = ['Kumaş', 'Kasa', 'Ayak', 'Kirlent', 'Birim', 'KİRLENT', 'Parça', 'PARÇA'];

  parts.forEach(part => {
    const colonIndex = part.indexOf(':');
    if (colonIndex > -1) {
      const label = part.substring(0, colonIndex).trim();
      const value = part.substring(colonIndex + 1).trim();
      
      if (knownLabels.some(kl => kl.toLowerCase() === label.toLowerCase())) {
        specs.push({ label: label.toUpperCase(), value });
      } else {
        description += (description ? ' | ' : '') + part;
      }
    } else {
      description += (description ? ' | ' : '') + part;
    }
  });

  return { specs, description };
}

// MEMOIZED ORDER CARD FOR MAXIMUM RENDERING PERFORMANCE
const OrderCard = React.memo(({ 
  order, 
  onDelete, 
  onEdit 
}: { 
  order: Order, 
  onDelete: (o: Order) => void, 
  onEdit: (o: Order) => void 
}) => {
  return (
    <div className="group relative bg-[#0B0E14] rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-transparent">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-blue-500 uppercase">Sipariş No</span>
              <span className="text-xs font-mono text-gray-300">#{order.order_number}</span>
            </div>
            <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
              {order.product_name}
            </h3>
          </div>
          <Badge className={cn("text-[10px] py-0.5", statusColors[order.status])}>
            {statusLabels[order.status]}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5 bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/10">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-200/80">{formatDate(order.order_date || order.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-purple-500/5 px-2 py-0.5 rounded-full border border-purple-500/10">
            <Package className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-200/80 font-bold">{order.quantity} Adet</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Core Info */}
        <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-800/30">
          <div>
            <span className="block text-[10px] text-gray-500 uppercase tracking-tight mb-0.5 font-bold">Cari / Bayi</span>
            <span className="text-xs text-gray-200 font-medium break-words leading-relaxed">{order.dealer_name || 'Bireysel'}</span>
          </div>
          <div>
            <span className="block text-[10px] text-gray-500 uppercase tracking-tight mb-0.5 font-bold">Müşteri</span>
            <span className="text-xs text-gray-200 font-medium break-words leading-relaxed">{order.customer_name || '-'}</span>
          </div>
        </div>

        {/* Technical Specs & Description */}
        <div className="space-y-4">
          {(() => {
            const { specs, description } = parseOrderDetails(order.notes);
            return (
              <>
                {/* Tech Specs: Individual Rows */}
                <div className="space-y-2">
                  {specs.map((spec, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-gray-800/20 last:border-0">
                      <span className="text-gray-500 font-bold tracking-wider">{spec.label}</span>
                      <span className="text-gray-300 font-medium">{spec.value}</span>
                    </div>
                  ))}
                  {/* Additional spec: Quantity row as requested */}
                  <div className="flex justify-between items-center text-[11px] py-1 border-b border-gray-800/20 last:border-0">
                    <span className="text-gray-500 font-bold tracking-wider">ADET</span>
                    <span className="text-blue-400 font-bold">{order.quantity} Adet</span>
                  </div>
                </div>

                {/* Description: Separate Section */}
                {description && (
                  <div className="mt-3 pt-2 border-t border-gray-800/50">
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">AÇIKLAMA</span>
                    <p className="text-[11px] text-gray-400 leading-relaxed italic bg-gray-900/40 p-2.5 rounded-xl border border-gray-800/30">
                      "{description}"
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="px-4 py-3 bg-gray-900/40 border-t border-gray-800/50 flex justify-between items-center">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-tight mr-1">Tutar</span>
          <span className="text-sm font-bold text-white">
            ₺{(order.total_amount || 0).toLocaleString('tr-TR')}
          </span>
        </div>
        <div className="flex gap-1.5">
          <button 
            onClick={() => onDelete(order)}
            className="p-1.5 text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => onEdit(order)}
            className="p-1.5 text-blue-500 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 rounded-lg transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 text-amber-500 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg transition-all">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
})

OrderCard.displayName = 'OrderCard'

export default function OrdersPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 400) // Increased debounce for performance

  const ordersKey = useMemo(() => {
    let url = '/api/orders'
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.append('status', filterStatus)
    if (debouncedSearchTerm) params.append('q', debouncedSearchTerm)
    params.append('pageSize', '60') // Consistent batch size
    return `${url}?${params.toString()}`
  }, [filterStatus, debouncedSearchTerm])

  const { data: orders, isLoading, mutate } = useApi<Order[]>(ordersKey)
  
  // OPTIMIZED POLLING: Slower background refresh to save CPU/Network
  usePolling(() => { void mutate() }, 45000)

  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'

  const handleDeleteOrder = async (order: Order) => {
    if (!confirm('Bu siparişi silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/orders?id=${order.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error('Silme işlemi başarısız')
      toast.success('Sipariş silindi')
      mutate()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm('TÜM siparişleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return
    try {
      const res = await fetch('/api/orders?all=1', {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error('İşlem başarısız')
      toast.success('Tüm siparişler silindi')
      mutate()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleEditOrder = (order: Order) => {
    // Edit logic placeholder
  }

  if (isLoading && !orders) {
    return (
      <AppDashboardLayout title="Siparişler" icon={FileSpreadsheet}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-gray-900/50 rounded-xl border border-gray-800" />
          ))}
        </div>
      </AppDashboardLayout>
    )
  }

  return (
    <AppDashboardLayout 
      title="Siparişler" 
      subtitle={`Toplam ${orders?.length || 0} sipariş kaydı`} 
      icon={FileSpreadsheet}
      actions={
        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-400 border-red-500/20 hover:bg-red-500/10"
              onClick={handleDeleteAll}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Tümünü Sil
            </Button>
          )}
          <Button variant="solid" color="primary" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Yeni Sipariş
          </Button>
        </div>
      }
    >
      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            placeholder="Sipariş no, bayi veya ürün ara..." 
            className="pl-10 bg-gray-900/50 border-gray-800"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select 
            className="w-full h-10 px-3 bg-gray-900/50 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">Tüm Durumlar</option>
            <option value="pending">Bekleyenler</option>
            <option value="in_production">Üretimdekiler</option>
            <option value="completed">Tamamlananlar</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 bg-gray-900/50 border-gray-800">
            <Filter className="w-4 h-4 mr-2" /> Filtre
          </Button>
          <Button variant="outline" size="sm" className="bg-gray-900/50 border-gray-800">
            <FileDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Orders Grid - Optimized with Memoization */}
      {orders && orders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onDelete={handleDeleteOrder} 
              onEdit={handleEditOrder} 
            />
          ))}
        </div>
      ) : (
        <EmptyState 
          title="Sipariş Bulunamadı"
          description="Arama kriterlerinize uygun sipariş kaydı bulunmuyor."
          icon={ShoppingCart}
          action={<Button variant="solid" color="primary">Yeni Sipariş Oluştur</Button>}
        />
      )}
    </AppDashboardLayout>
  )
}
