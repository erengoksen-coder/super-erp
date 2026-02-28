'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Package, Factory, ShoppingCart, BarChart3, Users, Wrench, Truck, FileText, Wallet, Warehouse, ClipboardCheck, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { DashboardSummary } from '@/app/dashboard/DashboardSummary'
import { CriticalStockAlert } from '@/app/dashboard/CriticalStockAlert'
import { PendingApprovalAlert } from '@/app/dashboard/PendingApprovalAlert'
import { OverdueOrdersAlert } from '@/app/dashboard/OverdueOrdersAlert'
import { NewFeatureHighlight } from '@/components/NewFeatureHighlight'
import { RecentViews } from '@/app/dashboard/RecentViews'
import { RecentActivity } from '@/app/dashboard/RecentActivity'
import { StockRealtime } from '@/app/inventory/components/StockRealtime'
import { ProductionRealtime } from '@/app/production/components/ProductionRealtime'
import { OrdersRealtime } from '@/app/orders/components/OrdersRealtime'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { useAuthStore } from '@/lib/store/authStore'
import { RevenueChart } from '@/app/dashboard/RevenueChart'
import { AgingTable } from '@/app/dashboard/AgingTable'

const ROLE_SHORTCUTS = [
  {
    id: 'uretim',
    label: 'Üretim / Atölye',
    roleHint: ['admin', 'manager'],
    links: [
      { href: '/production', label: 'Üretim Emirleri', icon: Factory },
      { href: '/production/new', label: 'Yeni Üretim', icon: Factory },
      { href: '/mobile/workstation', label: 'Usta Terminali', icon: Wrench },
      { href: '/inventory/materials', label: 'Hammadde Stok', icon: Package },
      { href: '/quality-control', label: 'Kalite Kontrol', icon: ClipboardCheck },
    ],
  },
  {
    id: 'satis',
    label: 'Satış / Ofis',
    roleHint: ['admin', 'manager'],
    links: [
      { href: '/orders', label: 'Siparişler', icon: ShoppingCart },
      { href: '/quotations', label: 'Teklifler', icon: FileText },
      { href: '/invoices', label: 'Faturalar', icon: FileText },
      { href: '/shipments', label: 'Sevkiyat', icon: Truck },
      { href: '/returns', label: 'İadeler', icon: ClipboardCheck },
      { href: '/accounts', label: 'Cari Hesaplar', icon: Users },
    ],
  },
  {
    id: 'yonetim',
    label: 'Yönetim',
    roleHint: ['admin', 'manager', 'viewer'],
    links: [
      { href: '/reports', label: 'Raporlar', icon: BarChart3 },
      { href: '/reports/costs', label: 'Maliyet Analizi', icon: TrendingDown },
      { href: '/finance', label: 'Finans', icon: Wallet },
      { href: '/checks-notes', label: 'Çek & Senet', icon: DollarSign },
      { href: '/warehouses', label: 'Depolar', icon: Warehouse },
    ],
  },
]

const APP_TITLE = 'LIVASOFA ERP'

export default function DashboardPage() {
  const userRole = useAuthStore((s) => s.user?.role ?? '')
  useEffect(() => { document.title = `Kontrol Paneli - ${APP_TITLE}`; return () => { document.title = APP_TITLE } }, [])

  return (
    <AppDashboardLayout
      title="Kontrol Paneli"
      subtitle="Özet metrikler ve canlı veriler"
      icon={LayoutDashboard}
    >
      <div className="space-y-8">
        {/* Hızlı aksiyonlar: tek tıkla sayfaya git */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Hızlı Aksiyonlar
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link href="/orders">
              <Card variant="elevated" hover className="h-full bg-gradient-to-br from-amber-600/20 to-amber-900/10 border-amber-800/50 hover:border-amber-500/50 transition-all p-4 flex items-center gap-3">
                <div className="shrink-0 p-2 bg-amber-500/20 text-amber-500 rounded-lg">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <span className="font-medium text-amber-100 text-sm">Sipariş Ekle</span>
              </Card>
            </Link>
            <Link href="/invoices/new">
              <Card variant="elevated" hover className="h-full bg-gradient-to-br from-blue-600/20 to-blue-900/10 border-blue-800/50 hover:border-blue-500/50 transition-all p-4 flex items-center gap-3">
                <div className="shrink-0 p-2 bg-blue-500/20 text-blue-500 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="font-medium text-blue-100 text-sm">Fatura Kes</span>
              </Card>
            </Link>
            <Link href="/shipments/new">
              <Card variant="elevated" hover className="h-full bg-gradient-to-br from-green-600/20 to-green-900/10 border-green-800/50 hover:border-green-500/50 transition-all p-4 flex items-center gap-3">
                <div className="shrink-0 p-2 bg-green-500/20 text-green-500 rounded-lg">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="font-medium text-green-100 text-sm">Sevkiyat</span>
              </Card>
            </Link>
            <Link href="/accounts">
              <Card variant="elevated" hover className="h-full bg-gradient-to-br from-slate-600/30 to-slate-900/10 border-slate-700/50 hover:border-slate-500/50 transition-all p-4 flex items-center gap-3">
                <div className="shrink-0 p-2 bg-slate-500/20 text-slate-400 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <span className="font-medium text-slate-200 text-sm">Cari Hesaplar</span>
              </Card>
            </Link>
            <Link href="/waybills">
              <Card variant="elevated" hover className="h-full bg-gradient-to-br from-indigo-600/20 to-indigo-900/10 border-indigo-800/50 hover:border-indigo-500/50 transition-all p-4 flex items-center gap-3">
                <div className="shrink-0 p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <span className="font-medium text-indigo-100 text-sm">İrsaliyeler</span>
              </Card>
            </Link>
            <Link href="/reports/ba-bs">
              <Card variant="elevated" hover className="h-full bg-gradient-to-br from-cyan-600/20 to-cyan-900/10 border-cyan-800/50 hover:border-cyan-500/50 transition-all p-4 flex items-center gap-3">
                <div className="shrink-0 p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="font-medium text-cyan-100 text-sm">BA/BS Formu</span>
              </Card>
            </Link>
          </div>
        </section>

        <RecentViews />

        {/* Rol bazlı hızlı erişim (Parola.com tarzı) */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Hızlı Erişim
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROLE_SHORTCUTS.map((group) => {
              const isRelevant = group.roleHint.includes(userRole)
              return (
                <Card key={group.id} variant="elevated" hover className={isRelevant ? 'ring-1 ring-blue-500/50 bg-gray-900/60' : 'bg-gray-900/30'}>
                  <CardBody className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">{group.label}</p>
                    <ul className="grid grid-cols-2 gap-2">
                      {group.links.map((link) => {
                        const Icon = link.icon
                        return (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="flex items-center gap-2 text-sm text-slate-300 dark:text-slate-300 hover:text-white hover:bg-white/10 rounded-lg px-2.5 py-2 transition-colors border border-transparent hover:border-white/10"
                            >
                              <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="truncate">{link.label}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Özet KPI'lar */}
        <section className="space-y-4">
          <h2 className="sr-only">Özet</h2>
          <DashboardSummary />
        </section>

        <NewFeatureHighlight featureId="critical_stock_alert">
          <CriticalStockAlert />
        </NewFeatureHighlight>
        <NewFeatureHighlight featureId="pending_approval_alert">
          <PendingApprovalAlert />
        </NewFeatureHighlight>
        <NewFeatureHighlight featureId="overdue_orders_alert">
          <OverdueOrdersAlert />
        </NewFeatureHighlight>

        {/* Son işlemler */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Son İşlemler
          </h2>
          <RecentActivity />
        </section>

        {/* Ciro Grafiği & Yaşlandırma Tablosu */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Finansal Analiz
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart />
            <AgingTable />
          </div>
        </section>

        {/* Stok & Üretim widget'ları */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Canlı Durum
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="elevated" padding="none" hover className="overflow-hidden group">
              <CardHeader
                className="px-5 pt-5"
                title="Stok Durumu"
                subtitle="Güncel stok seviyeleri"
                actions={<Package className="h-5 w-5 text-slate-400" aria-hidden />}
              />
              <CardBody className="px-5 pb-5 pt-0">
                <StockRealtime />
              </CardBody>
            </Card>

            <Card variant="elevated" padding="none" hover className="overflow-hidden group">
              <CardHeader
                className="px-5 pt-5"
                title="Üretim Durumu"
                subtitle="Aktif üretim emirleri"
                actions={<Factory className="h-5 w-5 text-slate-400" aria-hidden />}
              />
              <CardBody className="px-5 pb-5 pt-0">
                <ProductionRealtime />
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Sipariş takibi */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Siparişler
          </h2>
          <Card variant="elevated" padding="none" hover className="overflow-hidden group">
            <CardHeader
              className="px-5 pt-5"
              title="Sipariş Takibi"
              subtitle="Son siparişler ve durumları"
              actions={<ShoppingCart className="h-5 w-5 text-slate-400" aria-hidden />}
            />
            <CardBody className="px-5 pb-5 pt-0">
              <OrdersRealtime />
            </CardBody>
          </Card>
        </section>
      </div>
    </AppDashboardLayout>
  )
}
