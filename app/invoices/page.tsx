'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { useApi } from '@/lib/api/client'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { formatDate } from '@/lib/utils/dateFormat'

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

export default function InvoicesPage() {
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const invoicesKey = useMemo(() => {
    let url = '/api/invoices'
    const params = new URLSearchParams()
    if (filterType !== 'all') params.append('type', filterType)
    if (filterStatus !== 'all') params.append('status', filterStatus)
    if (params.toString()) url += `?${params.toString()}`
    return url
  }, [filterType, filterStatus])

  const { data: invoices = [], isLoading } = useApi<Invoice[]>(invoicesKey)

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center space-x-2">
            <FileText className="w-6 h-6 md:w-8 md:h-8" />
            <span>Faturalar</span>
          </h1>
          <LogoWithBackground size="sm" />
        </div>
        <Link
          href="/shipments"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Sevkiyatlardan Fatura Oluştur
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
        >
          <option value="all">Tüm Tipler</option>
          <option value="sale">Satış</option>
          <option value="purchase">Alış</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="issued">Kesildi</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 text-gray-400">
          Kayıtlı fatura bulunamadı.
        </div>
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
    </div>
  )
}

