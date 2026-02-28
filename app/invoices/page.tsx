'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, FileDown, ChevronLeft, ChevronRight, RefreshCw, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { usePaginatedApi, getAuthHeaders } from '@/lib/api/client'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { formatDate } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { useAuthStore } from '@/lib/store/authStore'
import { NewFeatureHighlight } from '@/components/NewFeatureHighlight'

type Invoice = {
  id: string
  invoice_number: string
  customer_name: string
  customer_code: string
  invoice_date: string
  type: string
  status: string
  final_amount: number
  shipment_number?: string | null
  document_kind?: string | null
}

const PAGE_SIZE = 20

function getDateRange(period: string): { start_date?: string; end_date?: string } {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return { start_date: d.toISOString().split('T')[0], end_date: today }
  }
  if (period === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start_date: d.toISOString().split('T')[0], end_date: today }
  }
  return {}
}

const APP_TITLE = 'LIVASOFA ERP'

type SortKey = 'invoice_date' | 'invoice_number' | 'final_amount' | 'customer_name'
export default function InvoicesPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const canExport = user?.can_export !== 0
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('invoice_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  useEffect(() => { document.title = `Faturalar - ${APP_TITLE}`; return () => { document.title = APP_TITLE } }, [])

  useKeyboardShortcut('Enter', () => { if (selectedInvoiceId) router.push(`/invoices/${selectedInvoiceId}`) }, { enabled: !!selectedInvoiceId })
  useKeyboardShortcut('Escape', () => setSelectedInvoiceId(null))

  const invoicesKey = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    if (filterType !== 'all') params.append('type', filterType)
    if (filterStatus !== 'all') params.append('status', filterStatus)
    const range = dateRange === 'week' || dateRange === 'month' ? getDateRange(dateRange) : {}
    if (range.start_date) params.append('start_date', range.start_date)
    if (range.end_date) params.append('end_date', range.end_date)
    return `/api/invoices?${params.toString()}`
  }, [filterType, filterStatus, dateRange, page])

  const { data: invoices = [], meta, isLoading, mutate } = usePaginatedApi<Invoice>(invoicesKey)
  const { total, limit, offset } = meta
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.floor(offset / limit) + 1
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)

  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices
    const q = searchTerm.toLowerCase().trim()
    return invoices.filter(
      (inv) =>
        (inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.customer_name || '').toLowerCase().includes(q) ||
        (inv.customer_code || '').toLowerCase().includes(q)
    )
  }, [invoices, searchTerm])

  const sortedInvoices = useMemo(() => {
    const list = [...filteredInvoices]
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'invoice_date') cmp = (a.invoice_date || '').localeCompare(b.invoice_date || '')
      else if (sortKey === 'invoice_number') cmp = (a.invoice_number || '').localeCompare(b.invoice_number || '', 'tr', { numeric: true })
      else if (sortKey === 'final_amount') cmp = (a.final_amount ?? 0) - (b.final_amount ?? 0)
      else cmp = (a.customer_name || '').localeCompare(b.customer_name || '', 'tr')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filteredInvoices, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'invoice_date' || key === 'final_amount' ? 'desc' : 'asc') }
  }
  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null
    return sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" /> : <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
  }

  async function handleExport() {
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const range = dateRange === 'week' || dateRange === 'month' ? getDateRange(dateRange) : {}
      if (range.start_date) params.set('start_date', range.start_date)
      if (range.end_date) params.set('end_date', range.end_date)
      const res = await fetch(`/api/invoices/export${params.toString() ? '?' + params.toString() : ''}`, { credentials: 'include', headers: getAuthHeaders() })
      if (!res.ok) throw new Error('İndirme başarısız')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `faturalar_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel dosyası indirildi')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'İndirme başarısız')
    }
  }

  return (
    <AppDashboardLayout
      title="Faturalar"
      subtitle={total > 0 ? `${from}-${to} / ${total} fatura` : 'Fatura listesi'}
      icon={FileText}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" color="secondary" size="sm" onClick={() => mutate()} disabled={isLoading} title="Listeyi yenile">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          {canExport && (
          <Button variant="outline" color="secondary" size="sm" onClick={handleExport}>
            <FileDown className="w-4 h-4 mr-2" />
            Excel İndir
          </Button>
          )}
          <Link href="/invoices/new">
            <Button variant="outline" color="secondary" size="sm">
              Alış Faturası / Fiş
            </Button>
          </Link>
          <Link href="/shipments">
            <Button variant="solid" color="primary" size="sm">
              Sevkiyatlardan Fatura Oluştur
            </Button>
          </Link>
        </div>
      }
    >
      <Breadcrumb items={[{ label: 'Panel', href: '/dashboard' }, { label: 'Faturalar' }]} className="mb-4" />
      {!isLoading && total >= 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-1">Toplam kayıt</div>
            <div className="text-2xl font-bold text-white">{total} fatura</div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-1">Bu sayfa</div>
            <div className="text-2xl font-bold text-blue-400">{from}-{to}</div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(0) }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
        >
          <option value="all">Tüm Tipler</option>
          <option value="sale">Satış</option>
          <option value="purchase">Alış</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(0) }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="issued">Kesildi</option>
          <option value="cancelled">İptal</option>
        </select>
        <select
          value={dateRange}
          onChange={(e) => { setDateRange(e.target.value); setPage(0) }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
        >
          <option value="all">Tüm Tarihler</option>
          <option value="week">Bu hafta</option>
          <option value="month">Bu ay</option>
        </select>
        <NewFeatureHighlight featureId="cari_fatura_arama">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Fatura no, cari adı veya kod..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg min-w-[200px] placeholder:text-gray-500"
            />
          </div>
        </NewFeatureHighlight>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="Henüz fatura yok"
          description="Satış faturası için sevkiyattan kesin veya alış faturası/fiş girin."
          icon={FileText}
          action={
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/invoices/new">
                <Button variant="solid" color="primary" size="sm">
                  İlk faturayı kes / Alış fişi
                </Button>
              </Link>
              <Link href="/shipments">
                <Button variant="outline" color="secondary" size="sm">
                  Sevkiyatlardan fatura
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="h-8 px-4 py-2 text-xs cursor-pointer select-none hover:bg-gray-800" onClick={() => handleSort('invoice_number')}>Fatura No <SortIcon column="invoice_number" /></TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs cursor-pointer select-none hover:bg-gray-800" onClick={() => handleSort('customer_name')}>Müşteri <SortIcon column="customer_name" /></TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs cursor-pointer select-none hover:bg-gray-800" onClick={() => handleSort('invoice_date')}>Tarih <SortIcon column="invoice_date" /></TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Tip</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs cursor-pointer select-none hover:bg-gray-800" onClick={() => handleSort('final_amount')}>Tutar <SortIcon column="final_amount" /></TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Durum</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">İrsaliye</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map((invoice) => (
                  <TableRow
                  key={invoice.id}
                  className={`hover:bg-gray-800/50 cursor-pointer ${selectedInvoiceId === invoice.id ? 'bg-blue-900/30 ring-1 ring-blue-500' : ''}`}
                  onClick={() => setSelectedInvoiceId(invoice.id)}
                >
                    <TableCell className="font-medium text-white text-xs px-4 py-2">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="text-white text-xs px-4 py-2">
                      <div>
                        <div className="font-medium">{invoice.customer_name}</div>
                        <div className="text-gray-400 text-xs">{invoice.customer_code}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs px-4 py-2">
                      {formatDate(invoice.invoice_date)}
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs px-4 py-2">
                      {invoice.type === 'sale' ? 'Satış' : invoice.document_kind === 'slip' ? 'Alış (Fiş)' : 'Alış (Fatura)'}
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs px-4 py-2">
                      {(invoice.final_amount || 0).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} ₺
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <StatusBadge type="invoice" status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs px-4 py-2">
                      {invoice.shipment_number || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        Detay
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {!isLoading && total > 0 && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm text-gray-400">
            {from}-{to} / {total} kayıt
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Önceki
            </Button>
            <span className="text-sm text-gray-300 px-2">
              Sayfa {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Sonraki
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </AppDashboardLayout>
  )
}

