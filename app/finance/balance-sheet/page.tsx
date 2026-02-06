'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DollarSign, Calendar } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchApi } from '@/lib/api/client'

export default function BalanceSheetPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const start = new Date(endDate)
    start.setMonth(start.getMonth() - 1)
    fetchApi(`/api/financial/balance-sheet?period=current&startDate=${start.toISOString().split('T')[0]}&endDate=${endDate}`)
      .then((res: any) => {
        if (cancelled) return
        setData(res?.data ?? res ?? null)
      })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [endDate])

  const totalAssets = data?.assets ? [
    (data.assets.currentAssets?.cash ?? 0) + (data.assets.currentAssets?.bank ?? 0) + (data.assets.currentAssets?.accountsReceivable ?? 0) + (data.assets.currentAssets?.inventory ?? 0),
    (data.assets.fixedAssets?.equipment ?? 0) - (data.assets.fixedAssets?.accumulatedDepreciation ?? 0)
  ].reduce((a, b) => a + b, 0) : 0
  const totalLiab = data?.liabilities ? (data.liabilities.currentLiabilities?.accountsPayable ?? 0) + (data.liabilities.longTermLiabilities?.longTermDebt ?? 0) : 0
  const totalEquity = data?.equity ? (data.equity.ownerEquity ?? 0) + (data.equity.retainedEarnings ?? 0) : 0

  return (
    <AppDashboardLayout title="Bilanço" subtitle="Varlık, borç ve özkaynak" icon={DollarSign}>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href="/finance" className="text-blue-400 hover:text-blue-300 text-sm">← Finans</Link>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <label className="text-sm text-gray-400">Tarih:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm" />
        </div>
      </div>

      {loading ? (
        <PageLoader fullScreen label="Bilanço yükleniyor..." />
      ) : !data ? (
        <EmptyState title="Veri yok" description="Bilanço oluşturulamadı." />
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 space-y-6">
          <section>
            <h3 className="text-sm font-medium text-gray-400 uppercase mb-2">Varlıklar</h3>
            <p className="text-white">Toplam Varlık: <strong>{Number(totalAssets).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong></p>
          </section>
          <section>
            <h3 className="text-sm font-medium text-gray-400 uppercase mb-2">Borçlar</h3>
            <p className="text-white">Toplam Borç: <strong>{Number(totalLiab).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong></p>
          </section>
          <section>
            <h3 className="text-sm font-medium text-gray-400 uppercase mb-2">Özkaynak</h3>
            <p className="text-white">Toplam Özkaynak: <strong>{Number(totalEquity).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong></p>
          </section>
        </div>
      )}
    </AppDashboardLayout>
  )
}
