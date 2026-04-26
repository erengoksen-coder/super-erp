'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  PackageSearch, ArrowLeft, ArrowDownCircle, ArrowUpCircle, 
  History, Settings, Edit, Trash2, Calendar, Clock,
  DollarSign, Hash, Layers, AlertTriangle
} from 'lucide-react'
import { useApi } from '@/lib/api/client'
import { fetchApi } from '@/lib/api/fetch'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { toast } from '@/lib/notify'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface Material {
  id: string
  name: string
  code: string | null
  stock_amount: number
  min_stock_level: number
  unit: string
  category: string | null
  unit_price: number | null
}

interface StockMovement {
  id: string
  movement_type: 'in' | 'out'
  quantity: number
  reference_type: string | null
  reference_id: string | null
  invoice_number: string | null
  shipment_number: string | null
  notes: string | null
  created_at: string
  user_name: string | null
}

export default function InventoryMaterialDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : ''
  
  // Veri Çekme (SWR)
  const { data: material, isLoading: loadingMaterial, error: materialError } = useApi<Material>(`/api/materials/${id}`)
  const { data: movementsData, isLoading: loadingMovements } = useApi<{ movements: StockMovement[] }>(`/api/materials/${id}/movements`)
  
  const movements = movementsData?.movements || []
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out'>('all')

  const filteredMovements = movements.filter((m: any) => {
    if (activeTab === 'all') return true
    return m.movement_type === activeTab
  })

  const isCritical = material && material.stock_amount <= material.min_stock_level

  if (materialError) {
    return (
      <AppDashboardLayout title="Hata" subtitle="Veri yüklenemedi" icon={PackageSearch}>
        <Card variant="glass" className="p-8 text-center border-rose-500/20">
          <p className="text-slate-400 mb-4">{materialError.message || 'Malzeme bulunamadı.'}</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
          </Button>
        </Card>
      </AppDashboardLayout>
    )
  }

  return (
    <AppDashboardLayout
      title={loadingMaterial ? 'Yükleniyor...' : material?.name || 'Malzeme Detayı'}
      subtitle={material?.code ? `Kod: ${material.code}` : 'Hammadde detay ve hareket geçmişi'}
      icon={PackageSearch}
      actions={
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
          </Button>
          <Button variant="solid" size="sm" onClick={() => router.push(`/inventory/materials/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" /> Düzenle
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Detail Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card variant="glass" className="border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Mevcut Stok</span>
                <PackageSearch className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className={`text-3xl font-black ${isCritical ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {loadingMaterial ? '...' : material?.stock_amount.toLocaleString('tr-TR')}
                </span>
                <span className="text-slate-400 font-bold">{material?.unit}</span>
              </div>
              {isCritical && <Badge variant="solid" color="error" className="mt-2 animate-pulse">KRİTİK SEVİYE</Badge>}
            </div>
          </Card>

          <Card variant="glass" className="border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Alt Limit (Min. Stok)</span>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-200">
                  {loadingMaterial ? '...' : material?.min_stock_level.toLocaleString('tr-TR')}
                </span>
                <span className="text-slate-400 font-bold">{material?.unit}</span>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Birim Fiyat</span>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-200">
                  {loadingMaterial ? '...' : `₺${material?.unit_price?.toFixed(2) || '0.00'}`}
                </span>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Kategori</span>
                <Layers className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <Badge variant="glass" className="text-base py-1 px-3">
                  {loadingMaterial ? '...' : material?.category || 'Genel'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Movement History Table */}
        <Card variant="glass" className="border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <History className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Stok Hareket Geçmişi</h2>
            </div>
            
            <div className="flex items-center bg-slate-800/50 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Tümü
              </button>
              <button
                onClick={() => setActiveTab('in')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${activeTab === 'in' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <ArrowDownCircle className="w-4 h-4" /> Girişler
              </button>
              <button
                onClick={() => setActiveTab('out')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${activeTab === 'out' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <ArrowUpCircle className="w-4 h-4" /> Çıkışlar
              </button>
            </div>
          </div>

          <Table>
            <TableHeader className="bg-slate-900/80">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 font-bold py-4">İşlem Tarihi</TableHead>
                <TableHead className="text-slate-400 font-bold py-4">Hareket Türü</TableHead>
                <TableHead className="text-slate-400 font-bold py-4">Miktar</TableHead>
                <TableHead className="text-slate-400 font-bold py-4">Referans / Not</TableHead>
                <TableHead className="text-slate-400 font-bold py-4">Kullanıcı</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingMovements ? (
                <TableSkeleton cols={5} rows={5} />
              ) : filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <History className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Bu malzeme için henüz hareket kaydı bulunmuyor.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement: any) => (
                  <TableRow key={movement.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-bold flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {format(new Date(movement.created_at), 'dd MMMM yyyy', { locale: tr })}
                        </span>
                        <span className="text-slate-500 text-xs flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {format(new Date(movement.created_at), 'HH:mm')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {movement.movement_type === 'in' ? (
                        <Badge variant="solid" color="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">STOK GİRİŞİ</Badge>
                      ) : (
                        <Badge variant="solid" color="error" className="bg-rose-500/10 text-rose-400 border-rose-500/20">STOK ÇIKIŞI</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-lg font-black ${movement.movement_type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity.toLocaleString('tr-TR')}
                      </span>
                      <span className="ml-1 text-xs text-slate-500 font-bold">{material?.unit}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-medium truncate max-w-[200px]">
                          {movement.notes || (movement.invoice_number ? `Fatura: ${movement.invoice_number}` : 'Açıklama yok')}
                        </span>
                        {movement.shipment_number && (
                          <span className="text-xs text-slate-500 italic">İrsaliye: {movement.shipment_number}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400 font-medium">
                      {movement.user_name || 'Sistem'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
