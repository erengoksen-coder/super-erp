'use client'

import { useState, useEffect } from 'react'
import { Factory, CheckCircle, Clock, Package, ArrowLeft, Edit, RotateCcw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogoWithBackground } from '@/components/Logo'
import { formatDateTime } from '@/lib/utils/dateFormat'

interface ProductionOrder {
  id: string
  order_number: string
  product_name: string
  product_sku: string
  quantity: number
  current_station: string
  created_at: string
  dealer_name?: string | null
  customer_name?: string | null
  order_notes?: string | null
  order_configuration?: string | null
  order_product_name?: string | null
  iskelet_started_at?: string
  iskelet_completed_at?: string
  terzihane_started_at?: string
  terzihane_completed_at?: string
  döseme_started_at?: string
  döseme_completed_at?: string
  montaj_started_at?: string
  montaj_completed_at?: string
  berjer_started_at?: string
  berjer_completed_at?: string
  sevkiyat_started_at?: string
  sevkiyat_completed_at?: string
  item_index?: number // 1'den başlayan sıra numarası
  item_total?: number // Toplam adet
  display_quantity?: number // Her kart için gösterilecek miktar (her zaman 1)
  barcode?: string | null // Barkod numarası
  serial_number?: string | null // Seri numarası
}

const stationNames: Record<string, string> = {
  iskelet: 'İskelet',
  terzihane: 'Terzihane',
  berjer: 'Berjer',
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
      const ordersData = data.orders || []
      console.log('Yüklenen üretim emirleri:', ordersData.length, 'adet')
      if (ordersData.length > 0) {
        console.log('İlk emir örneği:', {
          order_number: ordersData[0].order_number,
          dealer_name: ordersData[0].dealer_name,
          customer_name: ordersData[0].customer_name,
          order_id: ordersData[0].order_id,
          order_production_order_id: ordersData[0].order_production_order_id
        })
      }
      setOrders(ordersData)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsCompleted(orderId: string, itemIndex?: number, itemTotal?: number) {
    const order = orders.find(o => o.id === orderId)
    const confirmMessage = itemIndex && itemTotal 
      ? `Bu kartı (${itemIndex}/${itemTotal}) tamamlandı olarak işaretlemek istediğinize emin misiniz?`
      : 'Bu üretim emrini tamamlandı olarak işaretlemek istediğinize emin misiniz?'
    
    if (!confirm(confirmMessage)) {
      return
    }

    setProcessing(orderId)
    try {
      console.log('[Frontend] Sending request:', {
        order_id: orderId,
        station: station,
        item_index: itemIndex,
        item_total: itemTotal,
        barcode: order?.barcode,
        serial_number: order?.serial_number
      })
      
      const response = await fetch('/api/production/station/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          station: station,
          item_index: itemIndex,
          item_total: itemTotal,
          barcode: order?.barcode || null,
          serial_number: order?.serial_number || null,
        }),
      })

      console.log('[Frontend] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      // Response'u text olarak oku
      let responseText: string
      try {
        responseText = await response.text()
        console.log('[Frontend] Response text length:', responseText.length, 'First 500 chars:', responseText.substring(0, 500))
      } catch (textError: any) {
        console.error('[Frontend] Error reading response text:', textError)
        throw new Error('Sunucu yanıtı okunamadı: ' + (textError.message || 'Bilinmeyen hata'))
      }
      
      if (!response.ok) {
        let errorData: any = {}
        try {
          if (responseText && responseText.trim()) {
            errorData = JSON.parse(responseText)
          } else {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
          }
        } catch (e) {
          console.error('[Frontend] Error parsing error response:', e, 'Response text:', responseText)
          errorData = { error: `Sunucu hatası: ${response.status} ${response.statusText}. Yanıt: ${responseText.substring(0, 100)}` }
        }
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        console.error('[Frontend] Error from server:', errorMessage, 'Full error data:', errorData)
        throw new Error(errorMessage)
      }

      // Başarılı response'u parse et
      let result: any
      try {
        if (!responseText || responseText.trim() === '') {
          throw new Error('Sunucudan boş yanıt alındı')
        }
        result = JSON.parse(responseText)
        console.log('[Frontend] Success response:', result)
      } catch (parseError: any) {
        console.error('[Frontend] JSON parse error:', parseError, 'Response text:', responseText)
        throw new Error('Sunucu yanıtı geçersiz format: ' + (parseError.message || 'Bilinmeyen hata') + '. Yanıt: ' + responseText.substring(0, 200))
      }
      
      // Eğer tüm kartlar tamamlanmadıysa, sadece bu kart tamamlandı mesajı göster
      if (result.all_completed === false) {
        alert(`✅ ${result.message || 'Kart tamamlandı!'}`)
      } else {
        alert('✅ Üretim emri başarıyla bir sonraki istasyona geçirildi!')
      }
      
      loadOrders()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setProcessing(null)
    }
  }

  function getPreviousStation(currentStation: string): string | null {
    // İskelet istasyonundan geriye dönülemez
    if (currentStation === 'iskelet') return null
    
    // Berjer istasyonu özel durum: Terzihane'den direkt geliyor, geri dönüşte de terzihane'ye gider
    if (currentStation === 'berjer') return 'terzihane'
    
    // Diğer istasyonlar için normal sıralama
    const stationOrder = ['iskelet', 'terzihane', 'döseme', 'montaj', 'sevkiyat', 'completed']
    const currentIndex = stationOrder.indexOf(currentStation)
    if (currentIndex <= 0) return null
    return stationOrder[currentIndex - 1]
  }

  async function revertToPreviousStation(orderId: string, itemIndex?: number, itemTotal?: number) {
    const order = orders.find(o => o.id === orderId)
    const previousStation = getPreviousStation(station)
    
    if (!previousStation) {
      alert('Bu istasyondan geriye dönülemez!')
      return
    }

    const previousStationName = stationNames[previousStation] || previousStation
    const confirmMessage = itemIndex && itemTotal 
      ? `Bu kartı (${itemIndex}/${itemTotal}) ${previousStationName} istasyonuna geri göndermek istediğinize emin misiniz?`
      : `Bu üretim emrini ${previousStationName} istasyonuna geri göndermek istediğinize emin misiniz?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    setProcessing(orderId)
    try {
      const response = await fetch('/api/production/station/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          station: station, // Mevcut istasyon (geri çevirme için)
          item_index: itemIndex,
          item_total: itemTotal,
          barcode: order?.barcode || null,
          serial_number: order?.serial_number || null,
          revert: true, // Geri çevirme işlemi
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'İşlem başarısız')
      }

      const result = await response.json()
      alert(`✅ Üretim emri ${previousStationName} istasyonuna geri gönderildi!`)
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
    } else if (stationKey === 'berjer') {
      return (order as any).berjer_started_at
    } else if (stationKey === 'döseme') {
      return order.döseme_started_at
    } else if (stationKey === 'montaj') {
      return order.montaj_started_at
    } else if (stationKey === 'sevkiyat') {
      return (order as any).sevkiyat_started_at
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
                {orders.length} {/* Her kart 1 adet temsil ediyor */}
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
          <div className="flex flex-col items-center justify-center py-16">
            <LogoWithBackground size="lg" className="mb-6" />
            <h3 className="text-lg font-semibold text-white mb-2">Bekleyen İş Yok</h3>
            <p className="text-sm text-gray-400 mt-4">Bu istasyonda bekleyen üretim emri bulunmuyor</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => {
              const startTime = getStationTime(order, station)
              const isProcessing = processing === order.id
              // Benzersiz key: order.id + item_index kombinasyonu
              const uniqueKey = `${order.id}-${order.item_index || index}`

              return (
                <div
                  key={uniqueKey}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-mono text-sm text-blue-400">{order.order_number}</span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(order.created_at)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {order.order_product_name || order.product_name}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">{order.product_sku}</p>
                      {/* Barkod Numarası */}
                      {order.barcode && (
                        <div className="mb-2 p-2 bg-gray-700/50 rounded border border-gray-600">
                          <div className="text-xs text-purple-300">
                            <span className="font-semibold">Barkod:</span> {order.barcode}
                          </div>
                          {order.serial_number && (
                            <div className="text-xs text-purple-300 mt-1">
                              <span className="font-semibold">Seri No:</span> {order.serial_number}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Bayi ve Müşteri Bilgileri - Her zaman göster */}
                      <div className="mb-2 p-2 bg-gray-700/50 rounded border border-gray-600">
                        {order.dealer_name ? (
                          <div className="text-xs text-blue-300 mb-1">
                            <span className="font-semibold">Bayi:</span> {order.dealer_name}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 mb-1">
                            <span className="font-semibold">Bayi:</span> <span className="italic">Belirtilmemiş</span>
                          </div>
                        )}
                        {order.customer_name ? (
                          <div className="text-xs text-green-300 mb-1">
                            <span className="font-semibold">Müşteri:</span> {order.customer_name}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 mb-1">
                            <span className="font-semibold">Müşteri:</span> <span className="italic">Belirtilmemiş</span>
                          </div>
                        )}
                        {/* Konfigürasyon */}
                        {order.order_configuration && (
                          <div className="text-xs text-yellow-300 mb-1">
                            <span className="font-semibold">Konfigürasyon:</span> {order.order_configuration}
                          </div>
                        )}
                        {/* Açıklama/Notlar */}
                        {order.order_notes && (
                          <div className="text-xs text-gray-300 mt-1 pt-1 border-t border-gray-600">
                            <span className="font-semibold">Açıklama:</span> {order.order_notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-gray-300">
                          <Package className="w-4 h-4 inline mr-1" />
                          {order.display_quantity !== undefined ? order.display_quantity : 1} adet
                          {order.item_index && order.item_total && order.item_total > 1 && (
                            <span className="text-gray-500 ml-1">
                              ({order.item_index}/{order.item_total})
                            </span>
                          )}
                        </span>
                        {startTime && (
                          <span className="text-gray-400">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {formatDateTime(startTime)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => markAsCompleted(order.id, order.item_index, order.item_total)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                      {getPreviousStation(station) && (
                        <button
                          onClick={() => revertToPreviousStation(order.id, order.item_index, order.item_total)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Geri Çevir</span>
                        </button>
                      )}
                    </div>
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


