'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, FileDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePaginatedApi, getAuthHeaders } from '@/lib/api/client'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'

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
}

const PAGE_SIZE = 20

export default function InvoicesPage() {
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(0)

  const invoicesKey = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    if (filterType !== 'all') params.append('type', filterType)
    if (filterStatus !== 'all') params.append('status', filterStatus)
    return `/api/invoices?${params.toString()}`
  }, [filterType, filterStatus, page])

  const { data: invoices = [], meta, isLoading } = usePaginatedApi<Invoice>(invoicesKey)
  const { total, limit, offset } = meta
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.floor(offset / limit) + 1
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)

  async function handleExport() {
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterStatus !== 'all') params.set('status', filterStatus)
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
          <Button variant="outline" color="secondary" size="sm" onClick={handleExport}>
            <FileDown className="w-4 h-4 mr-2" />
            Excel İndir
          </Button>
          <Link href="/shipments">
            <Button variant="solid" color="primary" size="sm">
              Sevkiyatlardan Fatura Oluştur
            </Button>
          </Link>
        </div>
      }
    >
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
      </div>

      {isLoading ? (
        <PageLoader label="Faturalar yükleniyor..." />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="Kayıtlı fatura bulunamadı"
          description="Sevkiyatlardan fatura oluşturarak başlayabilirsiniz."
          icon={FileText}
          action={
            <Link href="/shipments">
              <Button variant="solid" color="primary" size="sm">
                Sevkiyatlar
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="h-8 px-4 py-2 text-xs">Fatura No</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Müşteri</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Tarih</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Tip</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Tutar</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">İrsaliye</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-gray-800/50">
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
                      {invoice.type === 'sale' ? 'Satış' : 'Alış'}
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs px-4 py-2">
                      {(invoice.final_amount || 0).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} ₺
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

