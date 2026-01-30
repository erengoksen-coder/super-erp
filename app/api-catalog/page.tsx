'use client'

import Link from 'next/link'
import { Boxes, Building2, ClipboardList, Package, ShoppingCart, Wallet } from 'lucide-react'

const categories = [
  { id: 'accounting', name: 'Muhasebe', icon: Wallet },
  { id: 'sales', name: 'Satış', icon: ShoppingCart },
  { id: 'procurement', name: 'Satın Alma', icon: ClipboardList },
  { id: 'inventory', name: 'Stok', icon: Package },
  { id: 'production', name: 'Üretim', icon: Boxes },
  { id: 'hr', name: 'İK', icon: Building2 },
]

export default function ApiCatalogPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">API Katalogu</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((item) => (
          <Link key={item.id} href={`/api-catalog/${item.id}`} className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500 transition">
            <div className="flex items-center space-x-2 text-white">
              <item.icon className="w-5 h-5 text-blue-400" />
              <div className="font-medium">{item.name}</div>
            </div>
            <div className="text-sm text-gray-400 mt-2">API uç noktaları</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
