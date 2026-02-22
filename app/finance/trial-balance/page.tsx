'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarChart3, Calendar } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

type TrialBalanceAccount = {
  accountCode: string
  accountName: string
  category: string
  debitBalance: number
  creditBalance: number
}

type TrialBalanceData = {
  period?: string
  accounts?: TrialBalanceAccount[]
  totalDebits?: number
  totalCredits?: number
}

export default function TrialBalancePage() {
  const [data, setData] = useState<TrialBalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchApi<TrialBalanceData | { data: TrialBalanceData }>(
      `/api/financial/trial-balance?period=current&endDate=${endDate}`
    )
      .then((res: any) => {
        if (cancelled) return
        setData(res?.data ?? res ?? null)
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.message || 'Mizan yüklenemedi')
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [endDate])

  const accounts = data?.accounts ?? []
  const totalDebits = data?.totalDebits ?? accounts.reduce((s, a) => s + (a.debitBalance || 0), 0)
  const totalCredits = data?.totalCredits ?? accounts.reduce((s, a) => s + (a.creditBalance || 0), 0)

  return (
    <AppDashboardLayout
      title="Mizan"
      subtitle="Dönem borç ve alacak mizanı"
      icon={BarChart3}
    >
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href="/finance" className="text-blue-400 hover:text-blue-300 text-sm">
          ← Finans
        </Link>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <label className="text-sm text-gray-400">Bitiş tarihi:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm"
          />
        </div>
      </div>

      {loading ? (
        <PageLoader fullScreen label="Mizan yükleniyor..." />
      ) : !data || accounts.length === 0 ? (
        <EmptyState
          title="Mizan verisi yok"
          description="Seçilen dönemde hesap hareketi bulunamadı veya hesap planı boş."
          icon={BarChart3}
        />
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="w-24">Kod</TableHead>
                <TableHead>Hesap Adı</TableHead>
                <TableHead className="text-right">Borç</TableHead>
                <TableHead className="text-right">Alacak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((row) => (
                <TableRow key={row.accountCode} className="border-gray-800">
                  <TableCell className="font-mono text-sm">{row.accountCode}</TableCell>
                  <TableCell>{row.accountName}</TableCell>
                  <TableCell className="text-right text-green-400">
                    {(row.debitBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </TableCell>
                  <TableCell className="text-right text-amber-400">
                    {(row.creditBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 border-gray-700 bg-gray-800/50 font-semibold">
                <TableCell colSpan={2} className="text-right">Toplam</TableCell>
                <TableCell className="text-right text-green-400">
                  {Number(totalDebits).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </TableCell>
                <TableCell className="text-right text-amber-400">
                  {Number(totalCredits).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </AppDashboardLayout>
  )
}
