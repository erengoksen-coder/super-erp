"use client"

import { useMemo, useState } from 'react'
import { BookOpenCheck, Calendar } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { useApi } from '@/lib/api/client'
import { PageLoader } from '@/components/ui/PageLoader'
import { formatDate } from '@/lib/utils/dateFormat'

type LedgerEntry = {
  id: string
  account_id: string
  entry_date: string
  debit: number
  credit: number
  balance: number
  description: string
  account_code: string
  account_name: string
  entry_number?: string
  entry_description?: string
}

type ChartAccount = {
  id: string
  code: string
  name: string
}

export default function GeneralLedgerPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [accountId, setAccountId] = useState<string>('all')

  const { data: accountsData } = useApi<ChartAccount[]>('/api/accounting/chart-of-accounts')
  const accounts = useMemo(() => accountsData ?? [], [accountsData])

  const ledgerUrl = useMemo(() => {
    const params = new URLSearchParams({
      start_date: dateRange.start,
      end_date: dateRange.end,
    })
    if (accountId !== 'all') {
      params.set('account_id', accountId)
    }
    return `/api/accounting/general-ledger?${params.toString()}`
  }, [dateRange, accountId])

  const { data, isLoading } = useApi<LedgerEntry[]>(ledgerUrl)
  const entries = useMemo(() => data ?? [], [data])

  const summary = useMemo(() => {
    const totalDebit = entries.reduce((s, e) => s + (Number(e.debit) || 0), 0)
    const totalCredit = entries.reduce((s, e) => s + (Number(e.credit) || 0), 0)
    const lastBalance = accountId !== 'all' && entries.length > 0
      ? Number(entries[entries.length - 1].balance) || 0
      : null
    return { totalDebit, totalCredit, lastBalance }
  }, [entries, accountId])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <BookOpenCheck className="w-8 h-8" />
            <span>Defter-i Kebir</span>
          </h1>
          <p className="text-gray-400">Hesap bazlı kayıtlar</p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <label className="text-sm text-gray-400">Başlangıç:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Bitiş:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              <option value="all">Tüm Hesaplar</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <PageLoader fullScreen label="Defter-i kebir yükleniyor..." />
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="h-8">Tarih</TableHead>
                <TableHead className="h-8">Hesap</TableHead>
                <TableHead className="h-8">Açıklama</TableHead>
                <TableHead className="h-8 text-right">Borç</TableHead>
                <TableHead className="h-8 text-right">Alacak</TableHead>
                <TableHead className="h-8 text-right">Bakiye</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 text-xs py-8">
                    Seçilen filtrelerde kayıt bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-gray-400 text-xs">
                        {formatDate(entry.entry_date)}
                      </TableCell>
                      <TableCell className="text-white text-xs">
                        {entry.account_code} - {entry.account_name}
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">
                        {entry.description || entry.entry_description || '-'}
                      </TableCell>
                      <TableCell className="text-right text-white text-xs">
                        {Number(entry.debit || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </TableCell>
                      <TableCell className="text-right text-white text-xs">
                        {Number(entry.credit || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </TableCell>
                      <TableCell className="text-right text-white text-xs">
                        {Number(entry.balance || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-gray-700 bg-gray-800/50">
                    <TableCell colSpan={3} className="text-gray-300 text-xs font-medium py-2">
                      Dönem özeti
                    </TableCell>
                    <TableCell className="text-right text-red-400 text-xs font-medium py-2">
                      {summary.totalDebit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </TableCell>
                    <TableCell className="text-right text-green-400 text-xs font-medium py-2">
                      {summary.totalCredit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </TableCell>
                    <TableCell className="text-right text-white text-xs font-medium py-2">
                      {summary.lastBalance !== null
                        ? summary.lastBalance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
                        : '—'}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
