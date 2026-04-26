'use client'

import Link from 'next/link'
import { Settings, Webhook, ShoppingBag, Truck, CreditCard } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'

const INTEGRATIONS = [
  {
    id: 'webhooks',
    name: 'Webhook\'lar',
    description: 'Sipariş, sevkiyat, fatura ve stok olaylarını dış sistemlere iletin.',
    href: '/admin/webhooks',
    icon: Webhook,
    available: true,
  },
  {
    id: 'ecommerce',
    name: 'E-ticaret / Pazaryeri',
    description: 'Trendyol, N11, Hepsiburada vb. pazaryeri sipariş ve stok entegrasyonu.',
    href: null,
    icon: ShoppingBag,
    available: false,
  },
  {
    id: 'kargo',
    name: 'Kargo',
    description: 'Aras Kargo, Yurtiçi Kargo, MNG vb. sevkiyat takip entegrasyonu.',
    href: null,
    icon: Truck,
    available: false,
  },
  {
    id: 'odeme',
    name: 'Ödeme sistemleri',
    description: 'İyzico, PayTR vb. ödeme altyapısı entegrasyonu.',
    href: null,
    icon: CreditCard,
    available: false,
  },
]

export default function IntegrationsPage() {
  return (
    <AppDashboardLayout
      title="Entegrasyonlar"
      subtitle="Webhook, e-ticaret, kargo ve ödeme bağlantıları"
      icon={Settings}
    >
      <div className="space-y-4">
        <p className="text-slate-400 text-sm">
          Dış sistemlerle bağlantıları buradan yönetin. Webhook ile sipariş ve stok olaylarını kendi sunucunuza iletebilirsiniz.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTEGRATIONS.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.id} variant="elevated">
                <CardBody className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-slate-700/50 p-3 shrink-0">
                      <Icon className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white">{item.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                      {item.available ? (
                        <Link
                          href={item.href!}
                          className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium"
                        >
                          Yönet →
                        </Link>
                      ) : (
                        <span className="inline-block mt-3 text-sm text-slate-500">Yakında</span>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      </div>
    </AppDashboardLayout>
  )
}
