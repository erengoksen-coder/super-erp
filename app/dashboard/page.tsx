'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { 
  LayoutDashboard, Package, Factory, ShoppingCart, BarChart3, 
  Users, Wrench, Truck, FileText, Wallet, Warehouse, 
  ClipboardCheck, TrendingUp, TrendingDown, DollarSign, 
  Clock, Settings2, Eye, EyeOff, X
} from 'lucide-react'

import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { NewFeatureHighlight } from '@/components/dashboard/NewFeatureHighlight'
import { useUIStore } from '@/lib/store/uiStore'

// Performance: Lazy-loading heavy dashboard components
const DashboardSummary = dynamic(() => import('@/app/dashboard/DashboardSummary').then(mod => mod.DashboardSummary), { ssr: false, loading: () => <div className="h-40 bg-slate-800/50 animate-pulse rounded-xl" /> })
const CriticalStockAlert = dynamic(() => import('@/app/dashboard/CriticalStockAlert').then(mod => mod.CriticalStockAlert), { ssr: false })
const PendingApprovalAlert = dynamic(() => import('@/app/dashboard/PendingApprovalAlert').then(mod => mod.PendingApprovalAlert), { ssr: false })
const OverdueOrdersAlert = dynamic(() => import('@/app/dashboard/OverdueOrdersAlert').then(mod => mod.OverdueOrdersAlert), { ssr: false })
const RecentViews = dynamic(() => import('@/app/dashboard/RecentViews').then(mod => mod.RecentViews), { ssr: false })
const RecentActivity = dynamic(() => import('@/app/dashboard/RecentActivity').then(mod => mod.RecentActivity), { ssr: false })
const RevenueChart = dynamic(() => import('@/app/dashboard/RevenueChart').then(mod => mod.RevenueChart), { ssr: false, loading: () => <div className="h-64 bg-slate-800/50 animate-pulse rounded-xl" /> })
const AgingTable = dynamic(() => import('@/app/dashboard/AgingTable').then(mod => mod.AgingTable), { ssr: false, loading: () => <div className="h-64 bg-slate-800/50 animate-pulse rounded-xl" /> })
const AIInsightsCard = dynamic(() => import('@/app/dashboard/AIInsightsCard').then(mod => mod.AIInsightsCard), { ssr: false })
const QuickActionsCard = dynamic(() => import('@/components/dashboard/QuickActionsCard').then(mod => mod.QuickActionsCard), { ssr: false })
const StockRealtime = dynamic(() => import('@/app/inventory/components/StockRealtime').then(mod => mod.StockRealtime), { ssr: false })
const ProductionRealtime = dynamic(() => import('@/app/production/components/ProductionRealtime').then(mod => mod.ProductionRealtime), { ssr: false })
const OrdersRealtime = dynamic(() => import('@/app/orders/components/OrdersRealtime').then(mod => mod.OrdersRealtime), { ssr: false })

const APP_TITLE = 'LIVASOFA ERP'

interface DashboardConfig {
  aiAdvisor: boolean
  recentViews: boolean
  quickActions: boolean
  kpis: boolean
  financial: boolean
  liveStatus: boolean
  orders: boolean
}

const DEFAULT_CONFIG: DashboardConfig = {
  aiAdvisor: true,
  recentViews: true,
  quickActions: true,
  kpis: true,
  financial: true,
  liveStatus: true,
  orders: true,
}

export default function DashboardPage() {
  const { dashboardConfig: config, toggleDashboardSection: toggleSection } = useUIStore()
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    setHasLoaded(true)
    document.title = `Kontrol Paneli - ${APP_TITLE}`
    return () => { document.title = APP_TITLE }
  }, [])

  if (!hasLoaded) return null

  return (
    <AppDashboardLayout
      title="Kontrol Paneli"
      subtitle="Özet metrikler ve canlı veriler"
      icon={LayoutDashboard}
      actions={
        <Button 
          variant={isCustomizing ? "solid" : "outline"} 
          size="sm" 
          onClick={() => setIsCustomizing(!isCustomizing)}
          className="flex items-center gap-2 glass"
        >
          <Settings2 className="w-4 h-4" />
          {isCustomizing ? 'Düzenlemeyi Bitir' : 'Paneli Özelleştir'}
        </Button>
      }
    >
      <div className="space-y-8 pb-10">
        
        {/* Customization Panel */}
        {isCustomizing && (
          <Card variant="elevated" className="bg-primary/5 border-primary/30 animate-in slide-in-from-top-2 glass">
            <CardBody className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> Görünüm Ayarları
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(config).map(([key, value]) => {
                  return (
                    <Button 
                      key={key} 
                      variant={value ? "solid" : "outline"} 
                      size="sm" 
                      onClick={() => toggleSection(key as keyof DashboardConfig)}
                      className="text-xs glass"
                    >
                      {value ? <Eye className="w-3 h-3 mr-2" /> : <EyeOff className="w-3 h-3 mr-2" />}
                      {key === 'aiAdvisor' && 'AI Danışman'}
                      {key === 'recentViews' && 'Son Gezilenler'}
                      {key === 'quickActions' && 'Hızlı Aksiyonlar'}
                      {key === 'kpis' && 'Özet KPIlar'}
                      {key === 'financial' && 'Finansal Analiz'}
                      {key === 'liveStatus' && 'Canlı Durum'}
                      {key === 'orders' && 'Siparişler'}
                    </Button>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            {config.quickActions && (
              <section className="animate-reveal">
                <QuickActionsCard />
              </section>
            )}

            {config.aiAdvisor && (
              <section className="animate-reveal">
                <AIInsightsCard />
              </section>
            )}

            {config.kpis && (
              <section className="space-y-4 animate-reveal">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Genel Durum Özetleri</h2>
                <DashboardSummary />
              </section>
            )}

            {config.financial && (
              <section className="space-y-4 animate-reveal">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Finans Analitik</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RevenueChart />
                  <AgingTable />
                </div>
              </section>
            )}
          </div>

          <div className="space-y-8">
            {config.recentViews && (
              <section className="cv-auto">
                <RecentViews />
              </section>
            )}

            {config.liveStatus && (
              <section className="space-y-4 animate-reveal">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Canlı İstasyon Durumu</h2>
                <div className="space-y-6">
                  <Card variant="elevated" padding="none" hover className="overflow-hidden group glass">
                    <CardHeader
                      className="px-5 pt-5"
                      title="Stok Durumu"
                      actions={<Package className="h-5 w-5 text-slate-400" />}
                    />
                    <CardBody className="px-5 pb-5 pt-0">
                      <StockRealtime />
                    </CardBody>
                  </Card>

                  <Card variant="elevated" padding="none" hover className="overflow-hidden group glass">
                    <CardHeader
                      className="px-5 pt-5"
                      title="Üretim Durumu"
                      actions={<Factory className="h-5 w-5 text-slate-400" />}
                    />
                    <CardBody className="px-5 pb-5 pt-0">
                      <ProductionRealtime />
                    </CardBody>
                  </Card>
                </div>
              </section>
            )}

            {config.orders && (
              <section className="space-y-4 animate-reveal">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Sipariş Takibi</h2>
                <Card variant="elevated" padding="none" hover className="overflow-hidden group glass">
                  <CardBody className="px-5 py-5">
                    <OrdersRealtime />
                  </CardBody>
                </Card>
              </section>
            )}

            <section className="space-y-3 cv-auto text-opacity-80">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Son Hareketler</h2>
              <RecentActivity />
            </section>
          </div>
        </div>

        {/* Alerts Center - Performance optimized with cv-auto */}
        <div className="space-y-4 cv-auto mt-8">
          <NewFeatureHighlight featureId="critical_stock_alert">
            <CriticalStockAlert />
          </NewFeatureHighlight>
          <NewFeatureHighlight featureId="pending_approval_alert">
            <PendingApprovalAlert />
          </NewFeatureHighlight>
          <NewFeatureHighlight featureId="overdue_orders_alert">
            <OverdueOrdersAlert />
          </NewFeatureHighlight>
        </div>
      </div>
    </AppDashboardLayout>
  )
}
