'use client'

import { useState, useEffect } from 'react'
import { Factory, CheckCircle, AlertCircle, ArrowRight, Package, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoWithBackground } from '@/components/Logo'

interface StationInfo {
  station: string
  station_name: string
  count: number
  total_quantity: number
}

const stationNames: Record<string, string> = {
  iskelet: 'İskelet',
  terzihane: 'Terzihane',
  berjer: 'Berjer',
  döseme: 'Döşeme',
  montaj: 'Montaj',
  sevkiyat: 'Sevkiyat',
}

interface ReadyProduct {
  product_id: string
  product_name: string
  product_sku: string
  ready_count: number
  warehouse_stock: number
}

interface ReadyCustomer {
  customer_id: string
  customer_name: string
  customer_code: string
  products: ReadyProduct[]
}

function ReadyProductsSection() {
  const [readyData, setReadyData] = useState<{ customers: ReadyCustomer[]; total_ready: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReadyProducts()
    const interval = setInterval(loadReadyProducts, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadReadyProducts() {
    try {
      const response = await fetch('/api/production/station/ready-products')
      if (response.ok) {
        const data = await response.json()
        setReadyData(data)
      }
    } catch (error) {
      console.error('Sevk edilebilir ürünler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!readyData || readyData.customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LogoWithBackground size="md" className="mb-4" />
        <p className="text-sm text-gray-400 mt-4">Sevk edilebilir ürün bulunmuyor</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-400 mb-2">
        Toplam: <span className="text-white font-semibold">{readyData.total_ready} adet</span> sevk edilebilir
      </div>
      {readyData.customers.slice(0, 5).map((customer) => (
        <div key={customer.customer_id} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-white text-sm">{customer.customer_name}</h3>
              <p className="text-xs text-gray-400">{customer.customer_code}</p>
            </div>
            <Link
              href={`/shipments/new?customer_id=${customer.customer_id}`}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs flex items-center space-x-1"
            >
              <Truck className="w-3 h-3" />
              <span>Sevk Et</span>
            </Link>
          </div>
          <div className="space-y-1 mt-2">
            {customer.products.map((product) => (
              <div key={product.product_id} className="text-xs text-gray-300 flex justify-between">
                <span>{product.product_sku} - {product.product_name}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400">Sevk: {product.ready_count}</span>
                  <span className="text-green-400">Depo: {product.warehouse_stock}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {readyData.customers.length > 5 && (
        <Link
          href="/shipments?filterStatus=ready"
          className="block text-center text-sm text-blue-400 hover:text-blue-300 mt-2"
        >
          Tümünü Gör ({readyData.customers.length} müşteri)
        </Link>
      )}
    </div>
  )
}

export default function WorkstationPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StationInfo[]>([])

  async function loadStats() {
    try {
      const response = await fetch('/api/production/station')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stations || [])
      }
    } catch (error) {
      console.error('Stats yüklenemedi:', error)
    }
  }

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 5000) // Her 5 saniyede bir güncelle
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <Factory className="w-8 h-8" />
            <span>Usta Terminali</span>
          </h1>
          <p className="text-gray-400">İstasyon seçin ve üretim emirlerini yönetin</p>
        </div>

        {/* İstasyon Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {['iskelet', 'terzihane', 'berjer', 'döseme', 'montaj'].map((station) => {
            const stat = stats.find((s) => s.station === station)
            const count = stat?.count || 0
            const totalQuantity = stat?.total_quantity || 0

            return (
              <Link
                key={station}
                href={`/mobile/workstation/station?station=${station}`}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    {stationNames[station] || station}
                  </h2>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Bekleyen İş</span>
                    <span className="text-lg font-bold text-white">{count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Toplam Adet</span>
                    <span className="text-lg font-bold text-blue-400">{totalQuantity}</span>
                  </div>
                </div>
                {count > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center space-x-2 text-yellow-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Bekleyen iş var</span>
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        {/* Özel: Döşeme İstasyonu - Döşeme ve Montaj Sekmeleri */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Döşeme İstasyonu</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/mobile/workstation/station?station=döseme"
              className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">Döşeme</h3>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-sm text-gray-400">
                {stats.find((s) => s.station === 'döseme')?.count || 0} bekleyen iş
              </div>
            </Link>
            <Link
              href="/mobile/workstation/station?station=montaj"
              className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">Montaj</h3>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-sm text-gray-400">
                {stats.find((s) => s.station === 'montaj')?.count || 0} bekleyen iş
              </div>
            </Link>
          </div>
        </div>

        {/* Sevkiyat Bölümü - Sevk Edilebilir Ürünler */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Sevkiyat - Sevk Edilebilir Ürünler</span>
          </h2>
          <ReadyProductsSection />
        </div>

        {/* İstatistikler */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Genel Durum</h2>
          <div className="space-y-2">
            {stats.map((stat) => (
              <div key={stat.station} className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">{stat.station_name}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-white font-medium">{stat.count} iş</span>
                  <span className="text-blue-400 font-medium">{stat.total_quantity} adet</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
