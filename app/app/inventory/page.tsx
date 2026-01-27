import Link from 'next/link'
import { Package, Factory, ArrowRight } from 'lucide-react'

export default function InventoryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Stok Yönetimi</h1>
        <p className="text-gray-400 mt-1">Hammadde ve mamül depo yönetimi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hammadde Depo */}
        <Link
          href="/inventory/materials"
          className="bg-gray-900 rounded-lg border border-gray-800 p-8 hover:border-blue-600 transition group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Hammadde Depo</h2>
          <p className="text-gray-400 mb-4">
            Kumaş, sünger, ayak gibi hammaddelerin stok takibi ve giriş işlemleri
          </p>
          <div className="flex items-center text-blue-400 text-sm font-medium">
            Depoya Git
            <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        </Link>

        {/* Mamül Depo */}
        <Link
          href="/inventory/products"
          className="bg-gray-900 rounded-lg border border-gray-800 p-8 hover:border-green-600 transition group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-600 rounded-lg">
              <Factory className="w-8 h-8 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Mamül Depo</h2>
          <p className="text-gray-400 mb-4">
            Üretilen bitmiş ürünlerin stok takibi ve depo giriş işlemleri
          </p>
          <div className="flex items-center text-green-400 text-sm font-medium">
            Depoya Git
            <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        </Link>
      </div>

      {/* Hızlı İstatistikler */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <div className="text-sm text-gray-400 mb-1">Toplam Hammadde</div>
          <div className="text-2xl font-bold text-white">-</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <div className="text-sm text-gray-400 mb-1">Toplam Mamül</div>
          <div className="text-2xl font-bold text-white">-</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <div className="text-sm text-gray-400 mb-1">Düşük Stok</div>
          <div className="text-2xl font-bold text-red-400">-</div>
        </div>
      </div>
    </div>
  )
}
