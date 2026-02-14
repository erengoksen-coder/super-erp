'use client'

import { LayoutDashboard, Package, Factory, ShoppingCart } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { DashboardSummary } from '@/app/dashboard/DashboardSummary'
import { StockRealtime } from '@/app/inventory/components/StockRealtime'
import { ProductionRealtime } from '@/app/production/components/ProductionRealtime'
import { OrdersRealtime } from '@/app/orders/components/OrdersRealtime'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

export default function DashboardPage() {
  return (
    <AppDashboardLayout
      title="Kontrol Paneli"
      subtitle="Özet metrikler ve canlı veriler"
      icon={LayoutDashboard}
    >
      <div className="space-y-8">
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
