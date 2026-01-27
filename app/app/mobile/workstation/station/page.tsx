'use client'

import { useState, useEffect } from 'react'
import { Factory, CheckCircle, Clock, Package, ArrowLeft, Edit } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

interface ProductionOrder {
  id: string
  order_number: string
  product_name: string
  product_sku: string
  quantity: number
  current_station: string
  created_at: string
  iskelet_started_at?: string
  iskelet_completed_at?: string
  terzihane_started_at?: string
  terzihane_completed_at?: string
  döseme_started_at?: string
  döseme_completed_at?: string
  montaj_started_at?: string
  montaj_completed_at?: string
}

const stationNames: Record<string, string> = {
  iskelet: 'İskelet',
  terzihane: 'Terzihane',
  döseme: 'Döşeme',
  montaj: 'Montaj',
  sevkiyat: 'Sevkiyat',
}

export default function StationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const station = searchParams?.get('station') || 'iskelet'
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 5000) // Her 5 saniyede bir güncelle
    return () => clearInterval(interval)
  }, [station])

  async function loadOrders() {
    try {
      const response = await fetch(`/api/production/station/orders?station=${station}`)
      if (!response.ok) throw new Error('Üretim emirleri yüklenemedi')
      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsCompleted(orderId: string) {
    if (!confirm('Bu üretim emrini tamamlandı olarak işaretlemek istediğinize emin misiniz?')) {
      return
    }

    setProcessing(orderId)
    try {
      const response = await fetch('/api/production/station/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          station: station,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'İşlem başarısız')
      }

      alert('✅ Üretim emri başarıyla bir sonraki istasyona geçirildi!')
      loadOrders()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setProcessing(null)
    }
  }

  function getStationTime(order: ProductionOrder, stationKey: string) {
    if (stationKey === 'iskelet') {
      return order.iskelet_started_at || order.created_at
    } else if (stationKey === 'terzihane') {
      return order.terzihane_started_at
    } else if (stationKey === 'döseme') {
      return order.döseme_started_at
    } else if (stationKey === 'montaj') {
      return order.montaj_started_at
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/mobile/workstation')}
            className="text-blue-400 hover:text-blue-300 inline-flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Geri</span>
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Factory className="w-6 h-6" />
            <span>{stationNames[station] || station} İstasyonu</span>
          </h1>
        </div>

        {/* İstatistikler */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400">Bekleyen İş</div>
              <div className="text-2xl font-bold text-white">{orders.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Toplam Adet</div>
              <div className="text-2xl font-bold text-white">
                {orders.reduce((sum, o) => sum + o.quantity, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Üretim Emirleri Listesi */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-400">Yükleniyor...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Bekleyen İş Yok</h3>
            <p className="text-sm text-gray-400">Bu istasyonda bekleyen üretim emri bulunmuyor</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const startTime = getStationTime(order, station)
              const isProcessing = processing === order.id

              return (
                <div
                  key={order.id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-mono text-sm text-blue-400">{order.order_number}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {order.product_name}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">{order.product_sku}</p>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-gray-300">
                          <Package className="w-4 h-4 inline mr-1" />
                          {order.quantity} adet
                        </span>
                        {startTime && (
                          <span className="text-gray-400">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {new Date(startTime).toLocaleString('tr-TR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => markAsCompleted(order.id)}
                      disabled={isProcessing}
                      className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>İşleniyor...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Bitti</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

