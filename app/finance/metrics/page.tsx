'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Activity, Calendar } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchApi } from '@/lib/api/client'

type RatioSection = {
  currentRatio?: number
  quickRatio?: number
  cashRatio?: number
  operatingCashFlowRatio?: number
  grossProfitMargin?: number
  operatingProfitMargin?: number
  netProfitMargin?: number
  returnOnAssets?: number
  returnOnEquity?: number
  assetTurnover?: number
  inventoryTurnover?: number
  receivablesTurnover?: number
  debtToEquity?: number
  debtToAssets?: number
  [key: string]: number | undefined
}

type MetricsData = {
  liquidityRatios?: RatioSection
  profitabilityRatios?: RatioSection
  efficiencyRatios?: RatioSection
  solvencyRatios?: RatioSection
  marketRatios?: RatioSection
}

export default function FinanceMetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchApi<{ data?: MetricsData } | MetricsData>(
      `/api/financial/metrics?startDate=${startDate}&endDate=${endDate}`
    )
      .then((res: any) => {
        if (cancelled) return
        setData(res?.data ?? res ?? null)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [startDate, endDate])

  const formatPct = (v: number | undefined) =>
    v != null ? `${Number(v).toFixed(1)}%` : '–'
  const formatNum = (v: number | undefined) =>
    v != null ? Number(v).toFixed(2) : '–'

  const renderSection = (
    title: string,
    ratios: RatioSection | undefined,
    keys: { key: string; label: string; format?: (v: number | undefined) => string }[]
  ) => {
    if (!ratios) return null
    return (
      <section className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {keys.map(({ key, label, format }) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-medium">
                {(format ?? formatPct)(ratios[key])}
              </span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <AppDashboardLayout
      title="Finansal Metrikler"
      subtitle="Likidite, kârlılık, verimlilik ve borçluluk oranları"
      icon={Activity}
    >
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href="/finance" className="text-blue-400 hover:text-blue-300 text-sm">
          ← Finans
        </Link>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm"
          />
          <span className="text-gray-500">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm"
          />
        </div>
      </div>

      {loading ? (
        <PageLoader fullScreen label="Metrikler yükleniyor..." />
      ) : !data ? (
        <EmptyState
          title="Veri yok"
          description="Bu dönem için finansal metrikler hesaplanamadı."
        />
      ) : (
        <div className="space-y-6">
          {renderSection('Likidite', data.liquidityRatios, [
            { key: 'currentRatio', label: 'Cari oran', format: formatNum },
            { key: 'quickRatio', label: 'Asit test oranı', format: formatNum },
            { key: 'cashRatio', label: 'Nakit oranı', format: formatNum },
            { key: 'operatingCashFlowRatio', label: 'Faaliyet nakit oranı', format: formatNum },
          ])}
          {renderSection('Kârlılık', data.profitabilityRatios, [
            { key: 'grossProfitMargin', label: 'Brüt kar marjı' },
            { key: 'operatingProfitMargin', label: 'Faaliyet kar marjı' },
            { key: 'netProfitMargin', label: 'Net kar marjı' },
            { key: 'returnOnAssets', label: 'Varlık getirisi (ROA)' },
            { key: 'returnOnEquity', label: 'Özkaynak getirisi (ROE)' },
          ])}
          {renderSection('Verimlilik', data.efficiencyRatios, [
            { key: 'assetTurnover', label: 'Varlık devir hızı', format: formatNum },
            { key: 'inventoryTurnover', label: 'Stok devir hızı', format: formatNum },
            { key: 'receivablesTurnover', label: 'Alacak devir hızı', format: formatNum },
          ])}
          {renderSection('Borçluluk', data.solvencyRatios, [
            { key: 'debtToEquity', label: 'Borç / Özkaynak', format: formatNum },
            { key: 'debtToAssets', label: 'Borç / Varlık', format: formatNum },
          ])}
        </div>
      )}
    </AppDashboardLayout>
  )
}
