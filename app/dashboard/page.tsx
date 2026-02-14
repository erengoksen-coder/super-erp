'use client'

import Link from 'next/link'
import { LayoutDashboard, Package, Factory, ShoppingCart, BarChart3, Users, Wrench, Truck, FileText, Wallet } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { DashboardSummary } from '@/app/dashboard/DashboardSummary'
import { StockRealtime } from '@/app/inventory/components/StockRealtime'
import { ProductionRealtime } from '@/app/production/components/ProductionRealtime'
import { OrdersRealtime } from '@/app/orders/components/OrdersRealtime'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { useAuthStore } from '@/lib/store/authStore'

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
    ],
  },
  {
    id: 'satis',
    label: 'Satış / Ofis',
    roleHint: ['admin', 'manager'],
    links: [
      { href: '/orders', label: 'Siparişler', icon: ShoppingCart },
      { href: '/invoices', label: 'Faturalar', icon: FileText },
      { href: '/shipments', label: 'Sevkiyat', icon: Truck },
      { href: '/accounts', label: 'Cari Hesaplar', icon: Users },
    ],
  },
  {
    id: 'yonetim',
    label: 'Yönetim',
    roleHint: ['admin', 'manager', 'viewer'],
    links: [
      { href: '/reports', label: 'Raporlar', icon: BarChart3 },
      { href: '/finance', label: 'Finans', icon: Wallet },
      { href: '/hr', label: 'İnsan Kaynakları', icon: Users },
    ],
  },
]

export default function DashboardPage() {
  const userRole = useAuthStore((s) => s.user?.role ?? '')

  return (
    <AppDashboardLayout
      title="Kontrol Paneli"
      subtitle="Özet metrikler ve canlı veriler"
      icon={LayoutDashboard}
    >
      <div className="space-y-8">
        {/* Rol bazlı hızlı erişim (Parola.com tarzı) */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Hızlı Erişim
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROLE_SHORTCUTS.map((group) => {
              const isRelevant = group.roleHint.includes(userRole)
              return (
                <Card key={group.id} variant="elevated" className={isRelevant ? 'ring-1 ring-blue-500/50' : ''}>
                  <CardBody className="p-4">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">{group.label}</p>
                    <ul className="space-y-1.5">
                      {group.links.map((link) => {
                        const Icon = link.icon
                        return (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="flex items-center gap-2 text-sm text-slate-200 dark:text-slate-300 hover:text-white hover:bg-white/5 rounded px-2 py-1.5 -mx-2 transition"
                            >
                              <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                              {link.label}
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
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Özet
          </h2>
          <DashboardSummary />
        </section>

        {/* Stok & Üretim widget'ları */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Canlı Durum
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="elevated" padding="none" className="overflow-hidden">
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

            <Card variant="elevated" padding="none" className="overflow-hidden">
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
          <Card variant="elevated" padding="none" className="overflow-hidden">
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
