'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, AlertTriangle, CheckCircle, Clock, Truck, Package, User, RotateCcw, Printer, Copy, FileText, Eye } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'
import { pushRecent } from '@/lib/recentViews'

interface ProductionOrder {
  id: string
  order_number: string
  customer_order_number?: string | null
  product_name: string
  sku: string
  quantity: number
  status: string
  created_at: string
  due_date?: string
  material_cost: number
  labor_cost: number
  total_cost: number
  selling_price: number
  profit: number
}

interface ActualConsumption {
  id: string
  material_id: string
  material_name: string
  unit: string
  purchase_price: number
  planned_quantity: number
  actual_quantity: number | null
  fire_quantity: number | null
  variance: number | null
  variance_percentage: number | null
}

interface Barcode {
  id: string
  barcode: string
  serial_number: string
  product_name: string
  product_sku: string
  ready_for_shipment: number
  customer_id: string | null
  status: string
  shipment_id?: string | null
}

export default function ProductionOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<ProductionOrder | null>(null)
  const [consumptions, setConsumptions] = useState<ActualConsumption[]>([])
  const [barcodes, setBarcodes] = useState<Barcode[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [actualQuantities, setActualQuantities] = useState<Record<string, string>>({})
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customers, setCustomers] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [orderId])

  async function loadData() {
    try {
      let foundOrder: ProductionOrder | null = null
      const rawParam = String(orderId || '').trim()

      if (rawParam) {
        try {
          foundOrder = await fetchApi<ProductionOrder>(
            `/api/production/${encodeURIComponent(rawParam)}`
          )
        } catch (error: any) {
          const message = String(error?.message || '')
          if (!message.includes('Üretim emri bulunamadı')) {
            throw error
          }
        }
      }

      if (!foundOrder) {
        const ordersData = await fetchApi<ProductionOrder[] | { orders?: ProductionOrder[] }>('/api/production')
        const orders = Array.isArray(ordersData) ? ordersData : (ordersData?.orders ?? [])
        const normalizedId = decodeURIComponent(rawParam || '').trim()
        const normalizedLower = normalizedId.toLowerCase()
        foundOrder = orders.find((o: ProductionOrder) => {
          if (!o) return false
          const rawId = String(o.id ?? '').trim()
          const rawOrderNumber = String((o as ProductionOrder).order_number ?? '').trim()
          const rawCustomerOrderNumber = String((o as ProductionOrder).customer_order_number ?? '').trim()
          return (
            rawId === normalizedId ||
            rawOrderNumber === normalizedId ||
            rawOrderNumber.toLowerCase() === normalizedLower ||
            rawCustomerOrderNumber === normalizedId ||
            rawCustomerOrderNumber.toLowerCase() === normalizedLower
          )
        }) || null
      }

      if (!foundOrder) {
        setOrder(null)
        setConsumptions([])
        setBarcodes([])
        setCustomers([])
        setEntries([])
        return
      }

      setOrder(foundOrder)
      pushRecent({ type: 'production', id: foundOrder.id, label: foundOrder.order_number, href: `/production/${foundOrder.id}` })
      const productionOrderId = foundOrder.id

      // Fiili harcanan malzemeleri yükle
      const consumptionResponse = await fetch(
        `/api/production/actual-consumption?production_order_id=${productionOrderId}`
      )
      if (consumptionResponse.ok) {
        const data = await consumptionResponse.json()
        setConsumptions(data)

        // Mevcut fiili miktarları state'e yükle
        const quantities: Record<string, string> = {}
        data.forEach((item: ActualConsumption) => {
          if (item.actual_quantity !== null) {
            quantities[item.material_id] = item.actual_quantity.toString()
          }
        })
        setActualQuantities(quantities)
      }

      // Barkodları yükle
      const barcodesResponse = await fetch(`/api/production/${productionOrderId}/barcodes`)
      if (barcodesResponse.ok) {
        const barcodesData = await barcodesResponse.json()
        setBarcodes(barcodesData)
      }

      // Muhasebe kayıtlarını yükle
      const entriesResponse = await fetchApi<any[]>(`/api/accounting/journal-entries?reference_id=${productionOrderId}`)
      setEntries(Array.isArray(entriesResponse) ? entriesResponse : [])

      // Müşterileri yükle (limit=500 ile tüm cariler)
      const customersData = await fetchApi<{ id: string; code: string; name: string }[]>('/api/accounts?type=customer&limit=500')
      setCustomers(Array.isArray(customersData) ? customersData : [])
    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelProduction() {
    if (!order) return
    if (!confirm(`${order.order_number} üretim emrini iptal etmek istiyor musunuz? BOM malzemeleri depoya iade edilecek, bu emre bağlı siparişler bekleyene alınacaktır.`)) {
      return
    }
    setCancelling(true)
    try {
      const res = await fetchApi<{ success?: boolean; message?: string }>(`/api/production/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      toast.success(res?.message ?? 'Üretim emri iptal edildi. BOM malzemeleri depoya iade edildi.')
      await loadData()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'İptal işlemi başarısız'
      toast.error('Hata: ' + message)
    } finally {
      setCancelling(false)
    }
  }

  async function handleMarkForShipment(barcode: string, ready: boolean) {
    const productionOrderId = order?.id || orderId
    try {
      const response = await fetch(`/api/production/${productionOrderId}/barcodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode,
          ready,
          customer_id: selectedCustomerId || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'İşaretleme yapılamadı')
      }

      // Barkodları yeniden yükle
      const barcodesResponse = await fetch(`/api/production/${productionOrderId}/barcodes`)
      if (barcodesResponse.ok) {
        const barcodesData = await barcodesResponse.json()
        setBarcodes(barcodesData)
      }
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function handleSaveActualQuantity(materialId: string) {
    const actualQty = parseFloat(actualQuantities[materialId] || '0')
    if (isNaN(actualQty) || actualQty < 0) {
      toast.warning('Geçerli bir miktar girin')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/production/actual-consumption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_order_id: orderId,
          material_id: materialId,
          actual_quantity: actualQty,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Kayıt yapılamadı')
      }

      const result = await response.json()
      toast.success(`Kaydedildi! Varyans: ${result.variancePercentage}%`)

      // Veriyi yeniden yükle
      await loadData()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: 'Bekliyor', className: 'bg-yellow-900 text-yellow-300', icon: Clock },
      in_progress: { label: 'Üretimde', className: 'bg-blue-900 text-blue-300', icon: Clock },
      completed: { label: 'Tamamlandı', className: 'bg-green-900 text-green-300', icon: CheckCircle },
      cancelled: { label: 'İptal', className: 'bg-red-900 text-red-300', icon: AlertTriangle },
    }
    const statusInfo = statusMap[status] || {
      label: status,
      className: 'bg-gray-800 text-gray-300',
      icon: Clock
    }
    const Icon = statusInfo.icon
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className} space-x-1`}>
        <Icon className="w-4 h-4" />
        <span>{statusInfo.label}</span>
      </span>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-400">Yükleniyor...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Üretim emri bulunamadı</p>
        <Link href="/production" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
          ← Geri Dön
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/production" className="text-blue-400 hover:text-blue-300 mb-4 inline-block flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>← Geri Dön</span>
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-white">{order.order_number}</h1>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(order.order_number); toast.success('Üretim emri no panoya kopyalandı') }}
                className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition"
                title="Üretim emri numarasını kopyala"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-gray-400 mt-1">{order.product_name} ({order.sku})</p>
          </div>
          <div className="flex items-center space-x-2">
            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <button
                type="button"
                onClick={handleCancelProduction}
                disabled={cancelling}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition inline-flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{cancelling ? 'İptal ediliyor...' : 'ÜRETİMİ İPTAL ET'}</span>
              </button>
            )}
            {getStatusBadge(order.status)}
          </div>
        </div>
      </div>

      {/* Üretim Emri Bilgileri */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Üretim Bilgileri</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-400">Miktar</div>
            <div className="text-lg font-semibold text-white">{order.quantity} adet</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Oluşturulma</div>
            <div className="text-lg font-semibold text-white">
              {formatDate(order.created_at)}
            </div>
          </div>
          {order.due_date && (
            <div>
              <div className="text-sm text-gray-400">Teslim Tarihi</div>
              <div className="text-lg font-semibold text-white">
                {formatDate(order.due_date)}
              </div>
            </div>
          )}
          <div>
            <div className="text-sm text-gray-400">Toplam Maliyet</div>
            <div className="text-lg font-semibold text-white">
              {order.total_cost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </div>
          </div>
        </div>
      </div>

      {/* Fiili Harcanan Malzemeler */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Fiili Harcanan Malzemeler</h2>
        <p className="text-sm text-gray-400 mb-4">
          Üretim tamamlandığında gerçek harcanan miktarları girin. Sistem planlanan ile gerçekleşen arasındaki farkı hesaplayacak.
        </p>

        {consumptions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Henüz malzeme kaydı bulunamadı
          </div>
        ) : (
          <div className="space-y-4">
            {consumptions.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-white">{item.material_name}</div>
                    <div className="text-sm text-gray-400">
                      Planlanan: {item.planned_quantity.toFixed(2)} {item.unit}
                    </div>
                  </div>
                  {item.variance !== null && (
                    <div className={`text-sm font-semibold ${item.variance > 0 ? 'text-red-400' : item.variance < 0 ? 'text-green-400' : 'text-gray-400'
                      }`}>
                      {item.variance > 0 ? '+' : ''}{item.variance.toFixed(2)} {item.unit}
                      <br />
                      <span className="text-xs">
                        ({item.variance_percentage !== null ? item.variance_percentage.toFixed(1) : '0'}%)
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-1">Fiili Harcanan</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={actualQuantities[item.material_id] || ''}
                      onChange={(e) =>
                        setActualQuantities({
                          ...actualQuantities,
                          [item.material_id]: e.target.value,
                        })
                      }
                      placeholder={item.planned_quantity.toFixed(2)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="pt-6">
                    <button
                      onClick={() => handleSaveActualQuantity(item.material_id)}
                      disabled={saving || !actualQuantities[item.material_id]}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Kaydet</span>
                    </button>
                  </div>
                </div>

                {item.actual_quantity !== null && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Fiili</div>
                        <div className="text-white font-semibold">
                          {item.actual_quantity.toFixed(2)} {item.unit}
                        </div>
                      </div>
                      {item.fire_quantity !== null && (
                        <div>
                          <div className="text-gray-400">Fire</div>
                          <div className="text-orange-400 font-semibold">
                            {item.fire_quantity.toFixed(2)} {item.unit}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-gray-400">Birim Fiyat</div>
                        <div className="text-white font-semibold">
                          {item.purchase_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barkodlar ve Sevk Edilebilir İşaretleme */}
      {barcodes.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Üretilen Ürünler ve Barkodlar</span>
            </h2>
            <div className="flex items-center space-x-3">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Müşteri seçin (opsiyonel)</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.code} - {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {barcodes.map((barcode) => (
              <div
                key={barcode.id}
                className={`bg-gray-800 rounded-lg border p-3 flex items-center justify-between ${barcode.ready_for_shipment ? 'border-green-700 bg-green-900/20' : 'border-gray-700'
                  }`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="text-white font-mono text-sm">{barcode.barcode}</div>
                      <div className="text-gray-400 text-xs">Seri: {barcode.serial_number}</div>
                    </div>
                    <div className="text-sm text-gray-300">
                      {barcode.product_name} ({barcode.product_sku})
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      window.open(`/inventory/products/print-barcode-label?barcodeId=${barcode.barcode}`, '_blank')
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition flex items-center space-x-1"
                    title="Barkod Yazdır"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Yazdır</span>
                  </button>
                  {barcode.shipment_id ? (
                    <span className="text-blue-400 text-sm font-semibold flex items-center space-x-1 px-3 py-1 bg-blue-900/40 rounded border border-blue-800">
                      <Truck className="w-4 h-4" />
                      <span>Sevk Edildi</span>
                    </span>
                  ) : barcode.ready_for_shipment ? (
                    <>
                      <span className="text-green-400 text-sm font-semibold flex items-center space-x-1">
                        <Truck className="w-4 h-4" />
                        <span>Sevk Edilebilir</span>
                      </span>
                      <button
                        onClick={() => handleMarkForShipment(barcode.barcode, false)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                      >
                        İptal
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleMarkForShipment(barcode.barcode, true)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition flex items-center space-x-1"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Sevk Edilebilir İşaretle</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
            <p className="text-blue-300 text-sm">
              💡 Ürünleri sevk edilebilir olarak işaretledikten sonra, <Link href="/shipments/new" className="underline font-semibold">Sevkiyat</Link> sayfasından sevk fişi oluşturabilirsiniz.
            </p>
          </div>
        </div>
      )}

      {/* Muhasebe Kayıtları */}
      {entries.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Muhasebe Kayıtları
          </h2>
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Yevmiye Fişi #{entry.entry_number}</div>
                    <div className="text-xs text-gray-500">{entry.description || 'Üretim/Satış Kaydı'} • {new Date(entry.entry_date).toLocaleDateString()}</div>
                  </div>
                </div>
                <Link
                  href={`/finance/journal-entries/${entry.id}`}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
                  title="Detayı Gör"
                >
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maliyet Özeti */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Malzeme Maliyeti</div>
          <div className="text-xl font-bold text-white">
            {order.material_cost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">İşçilik Maliyeti</div>
          <div className="text-xl font-bold text-white">
            {order.labor_cost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Satış Fiyatı</div>
          <div className="text-xl font-bold text-green-400">
            {order.selling_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Kar/Zarar</div>
          <div className={`text-xl font-bold ${order.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {order.profit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </div>
        </div>
      </div>
    </div>
  )
}

