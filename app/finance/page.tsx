'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  BookOpenCheck,
  ListChecks,
  Plus,
  DollarSign,
  Wallet,
  CreditCard,
  BarChart3,
  TrendingUp,
  FileText,
  Flame,
  Calculator,
  Activity,
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { fetchApi } from '@/lib/api/client'

function FinanceHubCard({
  href,
  icon: Icon,
  title,
  description,
  color = 'text-blue-400',
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  color?: string
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-blue-500 transition cursor-pointer h-full">
        <CardBody>
          <div className="flex items-center space-x-3 mb-2">
            <Icon className={`w-6 h-6 ${color}`} />
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          <p className="text-sm text-gray-400">{description}</p>
        </CardBody>
      </Card>
    </Link>
  )
}

type MetricsRes = {
  liquidityRatios?: { currentRatio?: number; quickRatio?: number }
  profitabilityRatios?: { netProfitMargin?: number; returnOnEquity?: number }
}

export default function FinancePage() {
  const [kpi, setKpi] = useState<{ totalDebit?: number; totalCredit?: number } | null>(null)
  const [kpiLoading, setKpiLoading] = useState(false)
  const [metrics, setMetrics] = useState<MetricsRes | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setKpiLoading(true)
    fetchApi<{ data?: { accounts?: Array<{ debitBalance?: number; creditBalance?: number }>; totalDebits?: number; totalCredits?: number } }>(
      `/api/financial/trial-balance?period=current&endDate=${new Date().toISOString().split('T')[0]}`
    )
      .then((res: any) => {
        if (cancelled) return
        const data = res?.data ?? res
        const totalDebit = data?.totalDebits ?? (Array.isArray(data?.accounts) ? data.accounts.reduce((s: number, a: any) => s + (Number(a.debitBalance) || 0), 0) : undefined)
        const totalCredit = data?.totalCredits ?? (Array.isArray(data?.accounts) ? data.accounts.reduce((s: number, a: any) => s + (Number(a.creditBalance) || 0), 0) : undefined)
        setKpi({ totalDebit, totalCredit })
      })
      .catch(() => {
        if (!cancelled) setKpi(null)
      })
      .finally(() => {
        if (!cancelled) setKpiLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setMetricsLoading(true)
    const end = new Date().toISOString().split('T')[0]
    const start = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
    fetchApi<{ data?: MetricsRes }>(`/api/financial/metrics?startDate=${start}&endDate=${end}`)
      .then((res: any) => {
        if (cancelled) return
        setMetrics(res?.data ?? res ?? null)
      })
      .catch(() => {
        if (!cancelled) setMetrics(null)
      })
      .finally(() => {
        if (!cancelled) setMetricsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return (
    <AppDashboardLayout
      title="Finans & Muhasebe"
      subtitle="Kayıtlar, hesap planı, raporlar ve maliyet"
      icon={DollarSign}
      actions={
        <Link href="/finance/new">
          <Button variant="solid" color="primary" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Fiş
          </Button>
        </Link>
      }
    >
      {/* Kısa özet / KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Dönem özeti (Mizan)</h3>
          {kpiLoading ? (
            <p className="text-gray-500 text-sm">Yükleniyor...</p>
          ) : kpi && (kpi.totalDebit !== undefined || kpi.totalCredit !== undefined) ? (
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-gray-300">
                Toplam Borç: <strong className="text-white">{Number(kpi.totalDebit || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong>
              </span>
              <span className="text-gray-300">
                Toplam Alacak: <strong className="text-white">{Number(kpi.totalCredit || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong>
              </span>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Mizan ve raporlarda dönem seçerek detayları görüntüleyebilirsiniz.</p>
          )}
        </div>
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Finansal metrikler</h3>
            <Link href="/finance/metrics" className="text-xs text-blue-400 hover:text-blue-300">Tümü</Link>
          </div>
          {metricsLoading ? (
            <p className="text-gray-500 text-sm">Yükleniyor...</p>
          ) : metrics ? (
            <div className="flex flex-wrap gap-4 text-sm">
              {metrics.liquidityRatios?.currentRatio != null && (
                <span className="text-gray-300">
                  Cari oran: <strong className="text-white">{Number(metrics.liquidityRatios.currentRatio).toFixed(2)}</strong>
                </span>
              )}
              {metrics.profitabilityRatios?.netProfitMargin != null && (
                <span className="text-gray-300">
                  Net kâr marjı: <strong className="text-white">%{Number(metrics.profitabilityRatios.netProfitMargin).toFixed(1)}</strong>
                </span>
              )}
              {metrics.profitabilityRatios?.returnOnEquity != null && (
                <span className="text-gray-300">
                  Özkaynak kârlılığı: <strong className="text-white">%{Number(metrics.profitabilityRatios.returnOnEquity).toFixed(1)}</strong>
                </span>
              )}
              {!metrics.liquidityRatios?.currentRatio && !metrics.profitabilityRatios?.netProfitMargin && !metrics.profitabilityRatios?.returnOnEquity && (
                <span className="text-gray-500 text-sm">Metrik verisi yok</span>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Dönem seçerek metrikleri görüntüleyebilirsiniz.</p>
          )}
        </div>
      </div>

      {/* Hızlı işlemler */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link href="/finance/new">
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Fiş
          </Button>
        </Link>
        <Link href="/accounts/new">
          <Button variant="outline" size="sm">
            <Wallet className="w-4 h-4 mr-2" />
            Yeni Cari
          </Button>
        </Link>
        <Link href="/payments">
          <Button variant="outline" size="sm">
            <CreditCard className="w-4 h-4 mr-2" />
            Ödemeler
          </Button>
        </Link>
      </div>

      {/* Kayıtlar */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Kayıtlar</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FinanceHubCard
            href="/finance/journal-entries"
            icon={ListChecks}
            title="Yevmiye Kayıtları"
            description="Günlük muhasebe fişleri"
            color="text-green-400"
          />
          <FinanceHubCard
            href="/finance/new"
            icon={FileText}
            title="Yeni Fiş"
            description="Yeni yevmiye kaydı oluştur"
            color="text-emerald-400"
          />
          <FinanceHubCard
            href="/finance/general-ledger"
            icon={BookOpenCheck}
            title="Defter-i Kebir"
            description="Hesap bazlı hareketler"
            color="text-yellow-400"
          />
        </div>
      </section>

      {/* Hesap & Plan */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Hesap & Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FinanceHubCard
            href="/finance/chart-of-accounts"
            icon={BookOpen}
            title="Hesap Planı"
            description="Hesap kodları ve bakiyeler"
            color="text-blue-400"
          />
        </div>
      </section>

      {/* Cari & Nakit */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Cari & Nakit</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FinanceHubCard
            href="/accounts"
            icon={Wallet}
            title="Cari Hesaplar"
            description="Müşteri ve tedarikçi hesapları"
            color="text-indigo-400"
          />
          <FinanceHubCard
            href="/payments"
            icon={CreditCard}
            title="Ödemeler"
            description="Ödeme işlemleri"
            color="text-purple-400"
          />
        </div>
      </section>

      {/* Raporlar */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Raporlar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FinanceHubCard
            href="/finance/trial-balance"
            icon={BarChart3}
            title="Mizan"
            description="Dönem borç/alacak mizanı"
            color="text-cyan-400"
          />
          <FinanceHubCard
            href="/finance/income-statement"
            icon={TrendingUp}
            title="Gelir Tablosu"
            description="Gelir ve gider özeti"
            color="text-green-400"
          />
          <FinanceHubCard
            href="/finance/balance-sheet"
            icon={DollarSign}
            title="Bilanço"
            description="Varlık, borç, özkaynak"
            color="text-amber-400"
          />
          <FinanceHubCard
            href="/finance/cash-flow"
            icon={BarChart3}
            title="Nakit Akışı"
            description="Nakit giriş ve çıkışları"
            color="text-teal-400"
          />
          <FinanceHubCard
            href="/finance/metrics"
            icon={Activity}
            title="Finansal Metrikler"
            description="Likidite, kârlılık, verimlilik oranları"
            color="text-violet-400"
          />
        </div>
      </section>

      {/* Maliyet & Fire */}
      <section>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Maliyet & Fire</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FinanceHubCard
            href="/finance/fire-analysis"
            icon={Flame}
            title="Fire / Maliyet"
            description="Fire ve maliyet analizi"
            color="text-orange-400"
          />
          <FinanceHubCard
            href="/finance/cost-analysis"
            icon={Calculator}
            title="Maliyet Analizi"
            description="Detaylı maliyet analizi"
            color="text-rose-400"
          />
        </div>
      </section>
    </AppDashboardLayout>
  )
}
