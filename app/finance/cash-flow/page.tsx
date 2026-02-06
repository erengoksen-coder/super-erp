'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarChart3, Calendar } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchApi } from '@/lib/api/client'

export default function CashFlowPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchApi(`/api/financial/cash-flow?period=current&startDate=${startDate}&endDate=${endDate}`)
      .then((res: any) => {
        if (cancelled) return
        setData(res?.data ?? res ?? null)
      })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [startDate, endDate])

  return (
    <AppDashboardLayout title="Nakit Akışı" subtitle="Nakit giriş ve çıkışları" icon={BarChart3}>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href="/finance" className="text-blue-400 hover:text-blue-300 text-sm">← Finans</Link>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm" />
          <span className="text-gray-500">-</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm" />
        </div>
      </div>

      {loading ? (
        <PageLoader fullScreen label="Nakit akışı yükleniyor..." />
      ) : !data ? (
        <EmptyState title="Veri yok" description="Bu dönem için nakit akışı oluşturulamadı." />
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 space-y-6">
          {data.operatingActivities && (
            <section>
              <h3 className="text-sm font-medium text-gray-400 uppercase mb-2">İşletme Faaliyetleri</h3>
              <p className="text-white">
                Net Nakit: <strong>{Number(data.operatingActivities?.netCashFlow ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong>
              </p>
            </section>
          )}
          {data.investingActivities && (
            <section>
              <h3 className="text-sm font-medium text-gray-400 uppercase mb-2">Yatırım Faaliyetleri</h3>
              <p className="text-white">
                Net Nakit: <strong>{Number(data.investingActivities?.netCashFlow ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong>
              </p>
            </section>
          )}
          {data.financingActivities && (
            <section>
              <h3 className="text-sm font-medium text-gray-400 uppercase mb-2">Finansman Faaliyetleri</h3>
              <p className="text-white">
                Net Nakit: <strong>{Number(data.financingActivities?.netCashFlow ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong>
              </p>
            </section>
          )}
        </div>
      )}
    </AppDashboardLayout>
  )
}
