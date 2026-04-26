'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Plus, Search, ChevronLeft, ChevronDown, ChevronRight, Hash, Database } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

type ChartAccount = {
  id: string
  code: string
  name: string
  account_type?: string | null
  type?: string | null
  balance?: number | null
  parent_id?: string | null
  child_count?: number
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: 'Varlık (1-2)',
  liability: 'Yükümlülük (3-4)',
  equity: 'Özkaynak (5)',
  revenue: 'Gelir (6)',
  expense: 'Gider (7)',
}

export default function ChartOfAccountsPage() {
  const { data, isLoading, mutate } = useApi<ChartAccount[]>('/api/accounting/chart-of-accounts')
  const accounts = useMemo(() => data ?? [], [data])
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    account_type: 'asset',
    parent_id: ''
  })

  // Hiyerarşik ağaç oluşturma
  const buildTree = (parentId: string | null = null, level = 0): any[] => {
    return accounts
      .filter(a => a.parent_id === parentId)
      .sort((a, b) => a.code.localeCompare(b.code, 'tr', { numeric: true }))
      .flatMap(a => [
        { ...a, _level: level },
        ...buildTree(a.id, level + 1)
      ])
  }

  const displayList = useMemo(() => {
    let list = buildTree()
    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter((a) => a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term))
    }
    return list
  }, [accounts, search])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetchApi('/api/accounting/chart-of-accounts', {
        method: 'POST',
        body: JSON.stringify(form)
      })
      toast.success('Hesap planına yeni hesap eklendi.')
      setForm({ code: '', name: '', account_type: 'asset', parent_id: '' })
      setShowForm(false)
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppDashboardLayout
      title="Tek Düzen Hesap Planı"
      subtitle="Şirket hesap hiyerarşisi ve anlık bakiyeler"
      icon={BookOpen}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" /> HESAP EKLE
          </Button>
        </div>
      }
    >
      <div className="mb-8 flex items-center gap-4">
        <Link href="/finance">
          <Button variant="ghost" size="sm" className="text-gray-400">
            <ChevronLeft className="w-4 h-4 mr-1" /> Geri
          </Button>
        </Link>
        <div className="h-4 w-px bg-gray-800" />
        <div className="relative flex-1 max-w-md">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
           <Input 
             placeholder="Hesap kodu veya adı ile ara..." 
             className="pl-10 bg-gray-900 border-gray-800 h-10 text-sm"
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
        </div>
      </div>

      {showForm && (
        <Card variant="glass" className="mb-8 border-blue-500/20 bg-blue-500/5">
          <CardBody className="p-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Hesap Kodu</label>
                  <Input 
                    placeholder="Örn: 100.01" 
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    required
                  />
               </div>
               <div className="md:col-span-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Hesap Adı</label>
                  <Input 
                    placeholder="Örn: Merkez Kasa" 
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
               </div>
               <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Hesap Tipi</label>
                  <select 
                    className="w-full bg-gray-800 border-gray-700 text-white p-2 rounded-lg text-sm"
                    value={form.account_type}
                    onChange={e => setForm({ ...form, account_type: e.target.value })}
                  >
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Üst Hesap</label>
                  <select 
                    className="w-full bg-gray-800 border-gray-700 text-white p-2 rounded-lg text-sm"
                    value={form.parent_id}
                    onChange={e => setForm({ ...form, parent_id: e.target.value })}
                  >
                    <option value="">Yok (Ana Hesap)</option>
                    {accounts.filter(a => (a.child_count || 0) >= 0).map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
               </div>
               <div className="md:col-span-4 flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setShowForm(false)}>İPTAL</Button>
                  <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving ? 'KAYDEDİLİYOR...' : 'HESABI KAYDET'}
                  </Button>
               </div>
            </form>
          </CardBody>
        </Card>
      )}

      {isLoading ? (
        <PageLoader label="Hesap planı yükleniyor..." />
      ) : accounts.length === 0 ? (
        <EmptyState title="Hesap Planı Boş" description="Henüz tanımlanmış bir hesap bulunmuyor." />
      ) : (
        <Card variant="elevated" padding="none" className="border-gray-800 overflow-hidden bg-gray-900/40">
           <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-gray-800">
                  <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-widest w-40">HESAP KODU</TableHead>
                  <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-widest">HESAP ADI</TableHead>
                  <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-widest">TİP</TableHead>
                  <TableHead className="text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">BAKİYE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayList.map((row: any) => (
                  <TableRow key={row.id} className="border-gray-800 hover:bg-white/5 transition-colors group">
                    <TableCell className="font-mono text-xs font-black text-blue-400 flex items-center gap-2">
                       <Hash className="w-3 h-3 text-gray-700" /> {row.code}
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2" style={{ paddingLeft: `${row._level * 24}px` }}>
                          {row._level > 0 && <ChevronRight className="w-3 h-3 text-gray-700" />}
                          <span className={`text-sm ${row._level === 0 ? 'font-black text-white' : 'font-medium text-gray-300'}`}>
                            {row.name}
                          </span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-800 px-2 py-0.5 rounded-full">
                          {ACCOUNT_TYPE_LABELS[row.account_type || row.type || ''] || '-'}
                       </span>
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm font-bold ${row.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                       {(row.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
           </Table>
        </Card>
      )}

      {/* Stats Footer */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 opacity-50">
         <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
            <Database className="w-4 h-4" /> Toplam Hesap Sayısı: {accounts.length}
         </div>
         <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
            <Database className="w-4 h-4" /> Multi-tenant İzolasyon: Aktif
         </div>
      </div>
    </AppDashboardLayout>
  )
}
