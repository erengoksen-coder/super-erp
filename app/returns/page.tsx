'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RotateCcw, Plus, CheckCircle, Eye, DollarSign, Clock, Package } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'

type ReturnRow = {
  id: string; return_number: string; customer_name: string | null; customer_code: string | null
  return_date: string; status: string; total_amount: number; item_count: number
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: 'Taslak', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-600' },
  confirmed: { label: 'Onaylandı', color: 'bg-green-900/30 text-green-400 border-green-600' },
  cancelled: { label: 'İptal', color: 'bg-gray-700/30 text-gray-400 border-gray-600' },
}

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-3 p-4">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex gap-4 items-center">
        <div className="h-4 bg-gray-700 rounded w-28" />
        <div className="h-4 bg-gray-700 rounded w-20" />
        <div className="h-4 bg-gray-700 rounded w-32" />
        <div className="h-4 bg-gray-700 rounded w-20 ml-auto" />
      </div>
    ))}
  </div>
)

export default function ReturnsPage() {
  const [list, setList] = useState<ReturnRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const data = await fetchApi<ReturnRow[]>(`/api/returns?${params}`)
      setList(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e); setList([]) } finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { document.title = 'İadeler - LIVASOFA ERP' }, [])
  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const totalAmount = list.reduce((s, r) => s + (r.total_amount || 0), 0)
    const drafts = list.filter(r => r.status === 'draft').length
    const confirmed = list.filter(r => r.status === 'confirmed').length
    const totalItems = list.reduce((s, r) => s + (r.item_count || 0), 0)
    return { totalAmount, drafts, confirmed, totalItems }
  }, [list])

  const handleConfirm = async (id: string) => {
    if (!confirm('Bu iadeyi onaylayacaksınız: stok girişi yapılacak ve cari hesaba mahsup edilecek. Onaylıyor musunuz?')) return
    setConfirmingId(id)
    try {
      await fetchApi(`/api/returns/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      toast.success('İade onaylandı. Stok girişi ve cari mahsup yapıldı.')
      load()
    } catch (e: any) { toast.error(e?.message || 'Onaylanamadı') } finally { setConfirmingId(null) }
  }

  const fmt = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

  return (
    <AppDashboardLayout title="İadeler" subtitle="Müşteri iade → stok girişi → cari mahsup" icon={RotateCcw}>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-1"><DollarSign className="w-3.5 h-3.5" />Toplam İade Tutarı</div>
          <div className="text-xl font-bold text-white">{fmt(stats.totalAmount)}</div>
          <div className="text-xs text-gray-500 mt-1">{list.length} iade</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium mb-1"><Clock className="w-3.5 h-3.5" />Onay Bekleyen</div>
          <div className="text-xl font-bold text-white">{stats.drafts}</div>
          <div className="text-xs text-gray-500 mt-1">taslak iade</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-1"><CheckCircle className="w-3.5 h-3.5" />Onaylanan</div>
          <div className="text-xl font-bold text-white">{stats.confirmed}</div>
          <div className="text-xs text-gray-500 mt-1">tamamlanan</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border border-cyan-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-medium mb-1"><Package className="w-3.5 h-3.5" />Toplam Kalem</div>
          <div className="text-xl font-bold text-white">{stats.totalItems}</div>
          <div className="text-xs text-gray-500 mt-1">iade ürün</div>
        </div>
      </div>

      {/* Actions + Filters */}
      <Card className="mb-4">
        <CardBody className="p-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Button variant={statusFilter === '' ? 'solid' : 'outline'} size="sm" onClick={() => setStatusFilter('')}>Tümü ({list.length})</Button>
              <Button variant={statusFilter === 'draft' ? 'solid' : 'outline'} color="warning" size="sm" onClick={() => setStatusFilter('draft')}>Taslak ({stats.drafts})</Button>
              <Button variant={statusFilter === 'confirmed' ? 'solid' : 'outline'} color="success" size="sm" onClick={() => setStatusFilter('confirmed')}>Onaylı ({stats.confirmed})</Button>
            </div>
            <Link href="/returns/new">
              <Button variant="solid" color="primary" size="sm"><Plus className="w-4 h-4 mr-1" />Yeni İade</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`İade listesi (${list.length})`} />
        <CardBody>
          {loading ? <LoadingSkeleton /> :
            list.length === 0 ? (
              <div className="text-center py-16">
                <RotateCcw className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-400 mb-1">İade kaydı yok</h3>
                <p className="text-sm text-gray-500 mb-4">Müşteri iade sürecini başlatmak için yeni iade oluşturun</p>
                <Link href="/returns/new">
                  <Button variant="solid" color="primary" size="sm"><Plus className="w-4 h-4 mr-1" />Yeni İade Oluştur</Button>
                </Link>
              </div>
            ) :
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-gray-400">
                      <th className="py-3 px-3">İade No</th>
                      <th className="py-3 px-3">Tarih</th>
                      <th className="py-3 px-3">Müşteri</th>
                      <th className="py-3 px-3 text-center">Kalem</th>
                      <th className="py-3 px-3 text-right">Tutar</th>
                      <th className="py-3 px-3">Durum</th>
                      <th className="py-3 px-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => {
                      const st = STATUS_MAP[r.status] || STATUS_MAP.draft
                      return (
                        <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-white">{r.return_number}</td>
                          <td className="py-3 px-3 text-gray-300">{formatDate(r.return_date)}</td>
                          <td className="py-3 px-3 text-gray-300">
                            <span className="text-gray-500 font-mono text-xs mr-1">{r.customer_code}</span>
                            {r.customer_name || '-'}
                          </td>
                          <td className="py-3 px-3 text-center"><span className="bg-gray-700/50 px-2 py-0.5 rounded text-gray-300">{r.item_count}</span></td>
                          <td className="py-3 px-3 text-right text-red-400 font-bold">{fmt(r.total_amount)}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${st.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'draft' ? 'bg-yellow-400' : r.status === 'confirmed' ? 'bg-green-400' : 'bg-gray-500'}`} />
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/returns/${r.id}`}><Button variant="ghost" size="sm" className="hover:bg-gray-700/50"><Eye className="w-3 h-3" /></Button></Link>
                              {r.status === 'draft' && (
                                <Button variant="ghost" size="sm" className="text-green-400 hover:bg-green-900/20" onClick={() => handleConfirm(r.id)} disabled={confirmingId === r.id}>
                                  <CheckCircle className="w-3 h-3 mr-1" />{confirmingId === r.id ? '...' : 'Onayla'}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>}
        </CardBody>
      </Card>
    </AppDashboardLayout>
  )
}
