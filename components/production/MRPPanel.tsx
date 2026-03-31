'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  RefreshCw, 
  Activity, 
  TrendingUp, 
  BarChart3, 
  Info,
  Calendar,
  Layers,
  Zap,
  Boxes,
  ArrowRight
} from 'lucide-react'
import { fetchApi } from '@/lib/api/fetch'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'

interface MRPItem {
  material_id: string
  material_code: string
  material_name: string
  unit: string
  required_qty: number
  in_stock: number
  reserved_qty: number
  available_qty: number
  shortage_qty: number
}

export const MRPPanel = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  const loadMRP = async () => {
    setLoading(true)
    try {
      const response = await fetchApi('/api/mrp/requirements')
      setData(response)
    } catch (error: any) {
      toast.error('MRP verileri yüklenemedi: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMRP()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6 animate-pulse">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin shadow-glow shadow-primary/20" />
        <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em]">Malzeme İhtiyaçları Hesaplanıyor</p>
      </div>
    )
  }

  const items = data?.requirements || []

  return (
    <div className="space-y-8 animate-reveal">
      {/* MRP Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="glass" className="hover:scale-[1.02] transition-transform group">
          <CardBody className="p-6 flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Toplam İhtiyaç</p>
              <p className="text-3xl font-black text-foreground group-hover:text-primary transition-colors">{data?.total_items || 0} <span className="text-sm font-medium opacity-30 italic">Kalem</span></p>
            </div>
            <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <Boxes className="w-6 h-6 shadow-glow" />
            </div>
          </CardBody>
        </Card>

        <Card variant="glass" className={cn("hover:scale-[1.02] transition-transform group", (data?.items_with_shortage || 0) > 0 && "border-error/20 bg-error/5")}>
          <CardBody className="p-6 flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Kritik Eksik</p>
              <p className={cn("text-3xl font-black", (data?.items_with_shortage || 0) > 0 ? "text-error" : "text-success")}>
                {data?.items_with_shortage || 0} <span className="text-sm font-medium opacity-30 italic">Kalem</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all">
              <AlertTriangle className={cn("w-6 h-6", (data?.items_with_shortage || 0) > 0 ? "text-error shadow-glow-sm shadow-error/40" : "text-success")} />
            </div>
          </CardBody>
        </Card>

        <Card variant="glass" className="hover:scale-[1.02] transition-transform group">
          <CardBody className="p-6 flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Hesaplama Tarihi</p>
              <p className="text-xs font-black text-foreground/80 tracking-tight flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-primary opacity-40" />
                 {data?.calculation_date ? new Date(data.calculation_date).toLocaleString('tr-TR') : '-'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-success/10 text-success group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 shadow-glow" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Requirements Table */}
      <Card variant="glass" className="overflow-hidden border-white/5">
        <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-primary" />
              <h3 className="font-black uppercase tracking-widest text-sm text-foreground/80">Malzeme İhtiyaç Listesi (MRP)</h3>
           </div>
           <button onClick={loadMRP} className="p-2 rounded-xl hover:bg-white/5 transition-colors group">
              <RefreshCw className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
           </button>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-[9px] font-black text-foreground/40 uppercase tracking-widest">
                  <th className="p-4 text-left">Hammadde / Malzeme</th>
                  <th className="p-4 text-right">Brüt İhtiyaç</th>
                  <th className="p-4 text-right">Mevcut Stok</th>
                  <th className="p-4 text-right">Rezerve / Kullanılabilir</th>
                  <th className="p-4 text-right">Net Eksik</th>
                  <th className="p-4 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                         <CheckCircle className="w-12 h-12 text-success" />
                         <p className="font-black uppercase tracking-widest text-xs">Tüm üretimler için yeterli malzeme mevcut</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item: MRPItem) => (
                    <tr key={item.material_id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <Package className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-sm font-black uppercase text-foreground group-hover:text-primary transition-colors tracking-tight">{item.material_name}</span>
                              <span className="text-[10px] font-mono opacity-20 font-bold">{item.material_code}</span>
                           </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-base font-black tracking-tighter">{item.required_qty}</span>
                        <span className="ml-1 text-[9px] font-bold opacity-30 italic">{item.unit.toUpperCase()}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-xs font-bold text-foreground/60">{item.in_stock} {item.unit}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] font-bold text-warning/60">REZ: {item.reserved_qty}</span>
                           <span className="text-xs font-black text-success">AVAL: {item.available_qty}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-black">
                        {item.shortage_qty > 0 ? (
                          <div className="text-error text-lg tracking-tighter shadow-glow-sm shadow-error/10">
                            - {item.shortage_qty} <span className="text-[10px] font-medium opacity-30 italic">{item.unit}</span>
                          </div>
                        ) : (
                          <span className="text-success text-xs opacity-40">✓</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="soft" color={item.shortage_qty > 0 ? "error" : "success"} className="text-[8px] font-black px-3 tracking-widest">
                          {item.shortage_qty > 0 ? "KRİTİK EKSİK" : "TAMAM"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* MRP footer info */}
      <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 flex items-center justify-between group">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
               <Info className="w-5 h-5 shadow-glow" />
            </div>
            <div>
               <p className="text-xs font-black uppercase tracking-widest opacity-80">MRP Motoru Uyarıları</p>
               <p className="text-[11px] font-medium opacity-40 leading-relaxed italic">Malzeme ihtiyaçları bekleyen üretim emirlerine göre rezerve edilerek hesaplanmıştır.</p>
            </div>
         </div>
         <Button variant="ghost" size="sm" className="hidden md:flex gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/5">
            Planlamaya Git
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
         </Button>
      </div>
    </div>
  )
}
