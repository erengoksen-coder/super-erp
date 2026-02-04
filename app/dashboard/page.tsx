'use client'

import { LayoutDashboard } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { StockRealtime } from '@/app/inventory/components/StockRealtime'
import { ProductionRealtime } from '@/app/production/components/ProductionRealtime'
import { OrdersRealtime } from '@/app/orders/components/OrdersRealtime'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

export default function DashboardPage() {
  return (
    <AppDashboardLayout
      title="Kontrol Paneli"
      subtitle="Canlı verilerle gerçek zamanlı takip"
      icon={LayoutDashboard}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        </div>

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
