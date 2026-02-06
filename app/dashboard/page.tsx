'use client'

import { LayoutDashboard } from 'lucide-react'
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
      <div className="space-y-6">
        {/* Tek istekle özet KPI'lar — hızlı bakış */}
        <section>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Özet</h2>
          <DashboardSummary />
        </section>

        {/* Detay widget'ları */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="📦 Stok Durumu" />
            <CardBody>
              <StockRealtime />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="🏭 Üretim Durumu" />
            <CardBody>
              <ProductionRealtime />
            </CardBody>
          </Card>
        </section>

        <Card>
          <CardHeader title="🛒 Sipariş Takibi" />
          <CardBody>
            <OrdersRealtime />
          </CardBody>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
