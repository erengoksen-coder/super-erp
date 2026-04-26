'use client'

import { PlusCircle, Users, Package, ShoppingCart, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

const ACTIONS = [
  { 
    name: 'Yeni Üretim Emri', 
    href: '/production/new', 
    icon: PlusCircle, 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10' 
  },
  { 
    name: 'Yeni Müşteri Kaydı', 
    href: '/accounts/new', 
    icon: Users, 
    color: 'text-purple-500', 
    bg: 'bg-purple-500/10' 
  },
  { 
    name: 'Hızlı Stok Bakma', 
    href: '/inventory', 
    icon: Package, 
    color: 'text-orange-500', 
    bg: 'bg-orange-500/10' 
  },
  { 
    name: 'Sipariş Oluştur', 
    href: '/orders/new', 
    icon: ShoppingCart, 
    color: 'text-green-500', 
    bg: 'bg-green-500/10' 
  },
]

export function QuickActionsCard() {
  return (
    <Card variant="elevated" className="h-full">
      <CardHeader title="Hızlı İşlemler" subtitle="Sık kullanılan modüllere hızlı erişim" />
      <CardBody className="p-5">
        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map((action) => (
            <Link 
              key={action.name} 
              href={action.href}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-800/50 hover:border-primary/50 hover:bg-primary/5 transition-all group text-center"
            >
              <div className={`p-3 rounded-xl ${action.bg} ${action.color} mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-gray-300 group-hover:text-white leading-tight">
                {action.name}
              </span>
              <ArrowRight className="w-3 h-3 mt-2 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
