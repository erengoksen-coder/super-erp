'use client'

import { useState } from 'react'
import { 
  Plus, RefreshCw, Trash2, Calendar, 
  User, Package, FileText, Filter, AlertCircle
} from 'lucide-react'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { useApi } from '@/lib/api/client'
import { fetchApi } from '@/lib/api/fetch'
import { toast } from '@/lib/notify'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface Material {
  id: string
  code: string | null
  name: string
  unit: string
}

interface Customer {
  id: string
  code: string | null
  name: string
}

interface Reservation {
  id: string
  material_id: string
  customer_id: string | null
  reference_type: string | null
  reference_id: string | null
  quantity: number
  status: string | null
  notes: string | null
  created_at: string
  material_name?: string
  material_code?: string
  customer_name?: string
}

export default function MaterialReservationsPage() {
  // Veri Çekme (SWR)
  const { data: materials = [], isLoading: loadingMaterials } = useApi<Material[]>('/api/materials')
  const { data: customers = [], isLoading: loadingCustomers } = useApi<Customer[]>('/api/accounts?type=customer')
  const { data: reservations = [], isLoading: loadingReservations, mutate } = useApi<Reservation[]>('/api/materials/reservations')

  // Local State (Form)
  const [materialId, setMaterialId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [quantity, setQuantity] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Filtering
  const [filterMaterial, setFilterMaterial] = useState('all')
  const [filterCustomer, setFilterCustomer] = useState('all')
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)

  const filteredReservations = reservations.filter((item) => {
    if (filterMaterial !== 'all' && item.material_id !== filterMaterial) return false
    if (filterCustomer !== 'all' && item.customer_id !== filterCustomer) return false
    return true
  })

  // İşlemler
  const handleCreate = async () => {
    if (!materialId || quantity <= 0) {
      toast.warning('Lütfen malzeme ve geçerli bir miktar seçin.')
      return
    }

    setIsSaving(true)
    try {
      await fetchApi('/api/materials/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          customer_id: customerId || null,
          quantity,
          notes: notes.trim() || null,
        })
      })
      toast.success('Rezervasyon oluşturuldu.')
      mutate()
      // Reset form
      setMaterialId('')
      setCustomerId('')
      setQuantity(0)
      setNotes('')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelConfirm) return
    try {
      await fetchApi(`/api/materials/reservations?id=${cancelConfirm}`, { method: 'DELETE' })
      toast.success('Rezervasyon iptal edildi.')
      setCancelConfirm(null)
      mutate()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Stok Rezervasyonları</h1>
            <p className="text-slate-400 font-medium">Müşteri veya üretim bazlı hammadde blokajı</p>
          </div>
        </div>
        
        <button
          onClick={() => mutate()}
          disabled={loadingReservations}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loadingReservations ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* New Reservation Form */}
      <Card variant="elevated" className="border-slate-800">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Plus className="text-blue-400" /> Yeni Rezervasyon Kaydı
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400">Hammadde *</label>
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="">Seçiniz...</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400">Müşteri (Opsiyonel)</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="">Seçiniz...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400">Miktar *</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2 flex flex-col justify-end">
              <button
                onClick={handleCreate}
                disabled={isSaving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-lg shadow-blue-900/40 flex items-center justify-center space-x-2"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                <span>Rezervasyon Oluştur</span>
              </button>
            </div>
          </div>
          
          <div className="mt-6">
            <label className="text-sm font-bold text-slate-400 mb-2 block">Notlar / Açıklama</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Rezervasyon sebebi, proje adı vb."
            />
          </div>
        </div>
      </Card>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-900/30 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 text-slate-400 px-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-bold">Filtrele:</span>
        </div>
        
        <select
          value={filterMaterial}
          onChange={(e) => setFilterMaterial(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-white px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="all">Tüm Malzemeler</option>
          {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <select
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-white px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="all">Tüm Müşteriler</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* List Table */}
      <Card variant="glass" className="border-slate-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900/80">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 font-bold py-4">Tarih</TableHead>
              <TableHead className="text-slate-400 font-bold py-4">Malzeme / Hammadde</TableHead>
              <TableHead className="text-slate-400 font-bold py-4">Müşteri</TableHead>
              <TableHead className="text-slate-400 font-bold py-4">Rezerv Miktar</TableHead>
              <TableHead className="text-slate-400 font-bold py-4">Açıklama</TableHead>
              <TableHead className="text-slate-400 font-bold py-4 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingReservations ? (
              <TableSkeleton cols={6} rows={5} />
            ) : filteredReservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium text-lg">Aktif rezervasyon bulunamadı.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredReservations.map((res) => (
                <TableRow key={res.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <TableCell className="py-4">
                    <span className="text-slate-400 font-mono text-xs flex items-center gap-2">
                       <Calendar className="w-3 h-3" />
                       {format(new Date(res.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-slate-200 font-bold">{res.material_name || 'Malzeme'}</span>
                      <span className="text-slate-500 text-xs font-mono">{res.material_code || 'KODSUZ'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="w-3 h-3 text-slate-500" />
                      {res.customer_name || <span className="text-slate-600 italic">Genel Rezervasyon</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-amber-500">{res.quantity.toLocaleString('tr-TR')}</span>
                      <span className="text-xs text-slate-500 font-bold">BİRİM</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-2 text-slate-400 max-w-[200px] truncate">
                      <FileText className="w-3 h-3 mt-1 shrink-0" />
                      <span className="text-xs">{res.notes || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCancelConfirm(res.id)}
                      className="h-9 w-9 rounded-xl text-red-500 hover:bg-error/10 transition-all"
                      title="Rezervasyonu Kaldır"
                    >
                      <Trash2 className="w-4 h-4 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={!!cancelConfirm}
        onClose={() => setCancelConfirm(null)}
        onConfirm={handleCancel}
        title="Rezervasyonu İptal Et"
        message="Bu hammadde rezervasyonunu iptal edip stoğu serbest bırakmak istediğinize emin misiniz?"
        variant="warning"
      />
    </div>
  )
}
