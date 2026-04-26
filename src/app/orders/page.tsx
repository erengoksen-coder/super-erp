'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
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
  FileDown,
  Zap,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { EmptyState } from '@/components/ui/EmptyState'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useApi, useApiExtended } from '@/lib/hooks/useApi'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'
import { usePolling } from '@/lib/hooks/usePolling'
import { ZenithCard, ZenithHeader } from '@/components/ui/ZenithCard'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/lib/store/authStore'
import { getAuthHeaders } from '@/lib/api/client'
import { useHotkeys } from '@/lib/hooks/useHotkeys'
import { Checkbox } from '@/components/ui/Checkbox'

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
  configuration: string | null
  notes: string | null
  created_at: string
}

const statusColors = {
  pending: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  in_production: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
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

  const knownLabels = ['Yapılandırma', 'Kumaş', 'Kasa', 'Ayak', 'Kirlent', 'Birim', 'KİRLENT', 'Parça', 'PARÇA', 'YAPILANDIRMA'];

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
  onEdit,
  isSelected,
  onSelect
}: { 
  order: Order, 
  onDelete: (o: Order) => void, 
  onEdit: (o: Order) => void,
  isSelected: boolean,
  onSelect: (id: string) => void
}) => {
  return (
    <ZenithCard glow className={cn(
      "group relative overflow-hidden border-white/5 transition-all duration-500 p-0",
      isSelected ? "border-primary/50 shadow-glow-sm scale-[1.02]" : "hover:border-primary/30"
    )}>
      {/* Selection Overlay */}
      <div className="absolute top-4 left-4 z-20">
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => onSelect(order.id)}
          className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      {/* Header - Zenith */}
      <div className={cn("p-5 border-b border-white/5 transition-colors", isSelected ? "bg-primary/5" : "bg-white/[0.02]")}>
        <div className="flex justify-between items-start mb-4 pl-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-[0.2em] text-white/30 uppercase">Sipariş No</span>
              <span className="text-[12px] font-mono text-primary font-bold">#{order.order_number}</span>
            </div>
            <h3 className="text-[16px] font-black text-white line-clamp-1 group-hover:text-primary transition-colors flex items-center gap-2 tracking-tight">
              {order.product_name}
              {(() => {
                const config = order.configuration || parseOrderDetails(order.notes).specs.find(s => s.label === 'Yapılandırma' || s.label === 'YAPILANDIRMA' || s.label === 'PARÇA')?.value;
                return config && (
                  <Badge variant="soft" color="primary" className="text-[9px] px-2 py-0.5 rounded-full font-black border border-primary/20 uppercase tracking-widest">
                    {config}
                  </Badge>
                );
              })()}
            </h3>
          </div>
          <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border", statusColors[order.status])}>
            {statusLabels[order.status]}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-[11px] font-bold">
          <div className="flex items-center gap-1.5 text-white/40">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(order.order_date || order.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-primary">
            <Package className="w-3.5 h-3.5" />
            <span className="uppercase tracking-tighter">{order.quantity} Birim</span>
          </div>
        </div>
      </div>

      {/* Body - Zenith */}
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-6 pb-4 border-b border-white/5">
          <div className="space-y-1">
            <span className="block text-[9px] text-white/20 uppercase tracking-[0.2em] font-black">Cari / Bayi</span>
            <span className="text-[13px] text-white font-bold leading-none">{order.dealer_name || 'Bireysel'}</span>
          </div>
          <div className="space-y-1">
            <span className="block text-[9px] text-white/20 uppercase tracking-[0.2em] font-black">Müşteri</span>
            <span className="text-[13px] text-white font-bold leading-none">{order.customer_name || '-'}</span>
          </div>
        </div>

        <div className="space-y-3">
          {(() => {
            const { specs, description } = parseOrderDetails(order.notes);
            return (
              <>
                <div className="space-y-2">
                  {specs.map((spec, idx) => {
                    const cleanLabel = spec.label.trim().toUpperCase().replace(/I/g, 'İ');
                    const isBirim = cleanLabel === 'BİRİM' || cleanLabel === 'BIRIM';
                    const displayValue = (isBirim && (order.configuration || spec.value)) || spec.value;
                    
                    return (
                      <div key={idx} className="flex justify-between items-center text-[11px] py-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <span className="text-white/30 font-black tracking-widest uppercase">{spec.label}</span>
                        <span className={cn(
                          "font-bold",
                          isBirim && order.configuration ? "text-primary" : "text-white/80"
                        )}>
                          {displayValue}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {description && (
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <span className="block text-[9px] text-white/20 uppercase tracking-widest mb-2 font-black">SİSTEM NOTLARI</span>
                    <p className="text-[11px] text-white/40 leading-relaxed italic bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                      "{description}"
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Footer - Zenith Actions */}
      <div className="px-5 py-4 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-black">Toplam Tutar</span>
          <span className="text-[16px] font-black text-white tracking-tighter">
            ₺{(order.total_amount || 0).toLocaleString('tr-TR')}
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onEdit(order)}
            className="p-2 text-primary bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white rounded-xl transition-all shadow-glow-sm"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(order)}
            className="p-2 text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </ZenithCard>
  )
})

OrderCard.displayName = 'OrderCard'

export default function OrdersPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const debouncedSearchTerm = useDebounce(searchTerm, 400)

  // Hotkeys
  useHotkeys('n', () => router.push('/orders/new'))
  useHotkeys('r', () => mutate())

  // Silme Onay Modal Durumları
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'all';
    orderId?: string;
    loading: boolean;
  }>({
    isOpen: false,
    type: 'single',
    loading: false
  });

  const ordersKey = useMemo(() => {
    let url = '/api/orders'
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.append('status', filterStatus)
    if (debouncedSearchTerm) params.append('q', debouncedSearchTerm)
    params.append('pageSize', '60') // Consistent batch size
    return `${url}?${params.toString()}`
  }, [filterStatus, debouncedSearchTerm])

  const { data: orders, meta, isLoading, isValidating, mutate } = useApiExtended<Order[]>(ordersKey)
  
  // OPTIMIZED POLLING: Slower background refresh to save CPU/Network
  usePolling(() => { void mutate() }, 45000)

  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'

  const handleDeleteOrder = (order: Order) => {
    setConfirmModal({
      isOpen: true,
      type: 'single',
      orderId: order.id,
      loading: false
    });
  }

  const handleDeleteAll = () => {
    setConfirmModal({
      isOpen: true,
      type: 'all',
      loading: false
    });
  }

  const executeDelete = async () => {
    const isAll = confirmModal.type === 'all';
    const orderId = confirmModal.orderId;

    // OPTIMISTIC UPDATE: Silinecek öğeleri hemen listeden çıkar
    if (!isAll && orderId) {
      await mutate(
        (current: any) => ({
          ...current,
          data: current.data.filter((o: Order) => o.id !== orderId)
        }),
        false // Do not revalidate yet
      );
    }

    setConfirmModal(prev => ({ ...prev, loading: true }));
    
    try {
      const url = isAll ? '/api/orders?all=1' : `/api/orders?id=${orderId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Silme işlemi başarısız');

      toast.success(isAll ? 'Tüm siparişler silindi' : 'Sipariş silindi');
      setConfirmModal({ isOpen: false, type: 'single', loading: false });
      mutate(); // Trigger final revalidation
      if (!isAll && orderId) setSelectedOrders(prev => prev.filter(id => id !== orderId));
    } catch (e: any) {
      toast.error(e.message);
      setConfirmModal(prev => ({ ...prev, loading: false }));
      mutate(); // Rollback on error
    }
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedOrders.length === 0) return;
    const loadingToast = toast.loading(`${selectedOrders.length} sipariş güncelleniyor...`);
    
    try {
      const res = await fetch('/api/orders/bulk-status', {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedOrders, status: newStatus })
      });
      if (!res.ok) throw new Error('Güncelleme başarısız');
      toast.dismiss(loadingToast);
      toast.success('Durumlar güncellendi');
      setSelectedOrders([]);
      mutate();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message);
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  const handleEditOrder = (order: Order) => {
    router.push(`/orders/${order.id}/edit`)
  }

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const loadingToast = toast.loading('Excel dosyası işleniyor...')
    
    try {
      const reader = new FileReader()
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result
          const wb = XLSX.read(bstr, { type: 'binary', cellDates: true })
          const wsname = wb.SheetNames[0]
          const ws = wb.Sheets[wsname]
          const data = XLSX.utils.sheet_to_json(ws)

          if (data.length === 0) {
            toast.dismiss(loadingToast)
            toast.error('Excel dosyası boş veya okunamadı')
            return
          }

          const mappedOrders = data.map((row: any) => {
            // Helper to find column case-insensitively with full Turkish character support
            const getVal = (keys: string[]) => {
              const normalize = (s: string) => String(s || '').trim()
                .replace(/İ/g, 'i').replace(/I/g, 'ı')
                .replace(/Ü/g, 'ü').replace(/ü/g, 'ü')
                .replace(/Ö/g, 'ö').replace(/ö/g, 'ö')
                .replace(/Ş/g, 'ş').replace(/ş/g, 'ş')
                .replace(/Ç/g, 'ç').replace(/ç/g, 'ç')
                .replace(/Ğ/g, 'ğ').replace(/ğ/g, 'ğ')
                .toLowerCase();
              
              const foundKey = Object.keys(row).find(k => 
                keys.some(key => normalize(k) === normalize(key))
              )
              return foundKey ? row[foundKey] : undefined
            }

            // Date parsing logic (Excel can give numbers or strings)
            let orderDate = getVal(['SİP TRH', 'SİPARİŞ TARİHİ', 'TARİH', 'DATE'])
            if (typeof orderDate === 'number') {
              // Excel serial date to JS Date
              const dateObj = new Date((orderDate - (25567 + 2)) * 86400 * 1000)
              orderDate = dateObj.toISOString().split('T')[0]
            } else if (orderDate instanceof Date) {
              orderDate = orderDate.toISOString().split('T')[0]
            } else if (typeof orderDate === 'string') {
              // Try to normalize DD.MM.YYYY to YYYY-MM-DD
              const match = orderDate.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
              if (match) orderDate = `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`
            }

            let productName = getVal(['ÜRÜN ADI', 'ÜRÜN', 'PRODUCT']) || 'BELİRSİZ ÜRÜN';
            let configuration = getVal(['PARÇA', 'YAPILANDIRMA', 'PART', 'CONFIG', 'MODÜL', 'ÜRÜN TİPİ', 'CİNSİ', 'MODEL TİPİ', 'TİP']);
            
            // Smart Extraction: If configuration is empty, try to extract it from productName
            if (!configuration) {
              const normalizeStr = (s: string) => s.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');
              const normalizedName = normalizeStr(productName);
              // ultra aggressive regex fallback
              const configMatches = normalizedName.match(/(3[\s\-\'’\.]*l[\s]*[üu]|üçlü|uclü|uclu|berjer|tekli|mod[üu]l|k[öo]se|ikili|sofa|puf|josephin)/i);
              if (configMatches) {
                configuration = configMatches[0].toUpperCase();
              }
            }

            // Greedy Detection: Still empty? Check every single value in the row object!
            if (!configuration) {
              const normalizeAll = (s: any) => String(s || '')
                .replace(/İ/g, 'i').replace(/I/g, 'ı')
                .replace(/Ü/g, 'ü').replace(/ü/g, 'ü')
                .replace(/Ö/g, 'ö').replace(/ö/g, 'ö')
                .replace(/Ş/g, 'ş').replace(/ş/g, 'ş')
                .replace(/Ç/g, 'ç').replace(/ç/g, 'ç')
                .replace(/Ğ/g, 'ğ').replace(/ğ/g, 'ğ')
                .toLowerCase();

              const allValues = Object.values(row).map(v => normalizeAll(v)).join(' ');
              // ultra aggressive regex: matches almost anything starting with 3/2 or containing uclu/berjer
              const greedyMatches = allValues.match(/(3[\s\-\'’\.]*l[\s]*[üu]|\b3[\s\-\'’]+l[\s]*[üu]|üçlü|uclü|uclu|berjer|tekli|mod[üu]l|k[öo]se|ikili|sofa|puf|josephin)/i);
              if (greedyMatches) {
                configuration = greedyMatches[0].toUpperCase();
              }
              
              // Last resort: If still empty, check if any single value is "3" or "2"
              if (!configuration) {
                const values = Object.values(row).map(v => normalizeAll(v));
                if (values.includes('3') || values.includes('3 lü') || values.includes('3lü')) configuration = '3 LÜ';
                else if (values.includes('2') || values.includes('2 li') || values.includes('2li')) configuration = 'İKİLİ';
              }
            }

            return {
              order_date: orderDate || new Date().toISOString().split('T')[0],
              dealer_name: getVal(['CARİ ADI', 'BAYİ', 'CARİ', 'DEALER']) || 'BİREYSEL',
              product_name: productName,
              quantity: parseInt(getVal(['SİP MİKTA', 'MİKTAR', 'QTY', 'QUANTITY']) || '1'),
              unit: getVal(['BRİM', 'BİRİM', 'UNIT']) || 'ADET',
              configuration: configuration,
              fabric_code: getVal(['KUMAŞ KODU', 'KUMAŞ', 'FABRIC']),
              case_info: getVal(['KASA', 'CASE']) || 'KATALOK',
              leg_info: getVal(['AYAK', 'LEG']) || 'KATALOK',
              cushion_info: getVal(['KIRLENT', 'CUSHION']) || 'KATALOK',
              customer_name: getVal(['MÜŞTERİ ADI', 'MÜŞTERİ', 'CUSTOMER']) || 'SHOWROOM',
              notes: getVal(['AÇIKLAMA', 'NOT', 'DESCRIPTION', 'NOTES']) || '',
              status: 'pending'
            }
          })

          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orders: mappedOrders })
          })

          if (!res.ok) throw new Error('Aktarım sırasında hata oluştu')
          
          toast.dismiss(loadingToast)
          toast.success(`${mappedOrders.length} sipariş başarıyla aktarıldı`)
          mutate()
        } catch (err: any) {
          toast.dismiss(loadingToast)
          toast.error(`Hata: ${err.message}`)
        }
      }
      reader.readAsBinaryString(file)
    } catch (e: any) {
      toast.dismiss(loadingToast)
      toast.error('Dosya okunamadı')
    }

    // Reset input
    if (e.target) e.target.value = ''
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
      subtitle={`Toplam ${meta?.total || orders?.length || 0} sipariş kaydı`} 
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
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleExcelImport}
          />
          
          <Button 
            variant="outline" 
            size="sm" 
            className="text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel'den Aktar
          </Button>

          <Button variant="solid" color="primary" size="sm" onClick={() => router.push('/orders/new')}>
            <Plus className="w-4 h-4 mr-2" /> Yeni Sipariş
          </Button>
        </div>
      }
    >
      {/* Zenith Sales Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-reveal">
        <ZenithCard glow className="border-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">TOPLAM SATIŞ</p>
              <p className="text-3xl font-black text-white tracking-tighter italic">₺{(orders?.reduce((acc, o) => acc + (o.total_amount || 0), 0) || 0).toLocaleString('tr-TR')}</p>
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">+8.4% BU AY</p>
            </div>
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <ShoppingCart className="w-7 h-7 text-primary" />
            </div>
          </div>
        </ZenithCard>

        <ZenithCard glow className="border-orange-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2">AKTİF HACİM</p>
              <p className="text-3xl font-black text-white tracking-tighter italic">{orders?.filter(o => o.status === 'pending' || o.status === 'in_production').length || 0}</p>
              <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mt-1">OPERASYONEL YÜK</p>
            </div>
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <Package className="w-7 h-7 text-orange-500" />
            </div>
          </div>
        </ZenithCard>

        <ZenithCard glow className="border-cyan-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-2">TERMİN BAŞARISI</p>
              <p className="text-3xl font-black text-white tracking-tighter italic">%94</p>
              <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest mt-1">ZAMANINDA TESLİM</p>
            </div>
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <Calendar className="w-7 h-7 text-cyan-500" />
            </div>
          </div>
        </ZenithCard>

        <ZenithCard className="border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
          <div className="flex flex-col justify-center h-full">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              SİSTEM DURUMU
            </h4>
            <p className="text-[10px] text-white/30 font-bold leading-relaxed mt-2 italic uppercase">
              Hub AI: Sipariş yoğunluğu %15 arttı. Üretim hattı optimize ediliyor.
            </p>
          </div>
        </ZenithCard>
      </div>

      {/* Filters & Search - Zenith Platinum */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-reveal" style={{ animationDelay: '100ms' }}>
        <div className="md:col-span-2 relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
          </div>
          <Input 
            placeholder="Sipariş no, bayi veya ürün ara..." 
            className="pl-12 h-12 bg-white/[0.03] border-white/5 group-hover:border-white/10 focus:border-primary/50 rounded-2xl transition-all font-bold"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select 
            className="w-full h-12 px-4 bg-white/[0.03] border border-white/5 rounded-2xl text-sm font-bold text-white/70 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">TÜM DURUMLAR</option>
            <option value="pending">BEKLEYENLER</option>
            <option value="in_production">ÜRETİMDEKİLER</option>
            <option value="completed">TAMAMLANANLAR</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1 h-12 bg-white/[0.03] border-white/5 hover:bg-white/10 rounded-2xl text-[11px] font-black tracking-widest uppercase">
            <Filter className="w-4 h-4 mr-2 text-primary" /> Filtrele
          </Button>
          <Button variant="ghost" className="h-12 w-12 bg-white/[0.03] border-white/5 hover:bg-white/10 rounded-2xl p-0">
            <FileDown className="w-5 h-5 text-white/40" />
          </Button>
        </div>
      </div>

      {/* Orders Grid - Optimized with Memoization */}
      {orders && orders.length > 0 ? (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-300 ${isValidating ? 'opacity-50' : 'opacity-100'}`}>
          {orders.map((order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onDelete={handleDeleteOrder} 
              onEdit={handleEditOrder}
              isSelected={selectedOrders.includes(order.id)}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      ) : (
        <EmptyState 
          title="Sipariş Bulunamadı"
          description="Arama kriterlerinize uygun sipariş kaydı bulunmuyor."
          icon={ShoppingCart}
          action={<Button variant="solid" color="primary" onClick={() => router.push('/orders/new')}>Yeni Sipariş Oluştur</Button>}
        />
      )}

      {/* Zenith Bulk Action Bar */}
      <AnimatePresence>
        {selectedOrders.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-6 px-8 py-4 bg-[#030712] border border-primary/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] backdrop-blur-3xl"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{selectedOrders.length} Sipariş Seçili</span>
              <span className="text-[8px] text-white/20 uppercase font-bold">Toplu İşlemler Aktif</span>
            </div>
            
            <div className="h-8 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white/60 hover:text-white uppercase text-[10px] font-black tracking-widest"
                onClick={() => handleBulkStatusChange('in_production')}
              >
                Üretime Al
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white/60 hover:text-white uppercase text-[10px] font-black tracking-widest"
                onClick={() => handleBulkStatusChange('completed')}
              >
                Tamamla
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-500 hover:text-red-400 uppercase text-[10px] font-black tracking-widest"
                onClick={async () => {
                  if (confirm(`${selectedOrders.length} siparişi silmek istediğinize emin misiniz?`)) {
                    const loadingToast = toast.loading(`${selectedOrders.length} sipariş siliniyor...`);
                    try {
                      const res = await fetch('/api/orders/bulk-delete', {
                        method: 'POST',
                        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: selectedOrders })
                      });
                      if (!res.ok) throw new Error('Silme işlemi başarısız');
                      toast.dismiss(loadingToast);
                      toast.success(`${selectedOrders.length} sipariş silindi`);
                      setSelectedOrders([]);
                      mutate();
                    } catch (err: any) {
                      toast.dismiss(loadingToast);
                      toast.error(err.message);
                    }
                  }
                }}
              >
                Sil
              </Button>
            </div>

            <button 
              onClick={() => setSelectedOrders([])}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white/20" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        loading={confirmModal.loading}
        title={confirmModal.type === 'all' ? "TÜMÜNÜ SİL" : "SİPARİŞİ SİL"}
        message={
          confirmModal.type === 'all' 
            ? "Tüm sipariş kayıtlarını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!" 
            : "Bu sipariş kaydını silmek istediğinize emin misiniz?"
        }
        variant="danger"
        confirmText="EVET, SİL"
        cancelText="VAZGEÇ"
      />
    </AppDashboardLayout>
  )
}
