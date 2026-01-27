'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Factory, Package, CheckCircle, AlertCircle, FileSpreadsheet, Trash2 } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'
import { useI18n } from '@/lib/i18n'
import { fetchApi } from '@/lib/api/client'

interface ProductionOrder {
  id: string
  order_number: string
  product_id: string
  product_name: string
  sku: string
  quantity: number
  status: string
  created_at: string
  dealer_name: string | null
  customer_name: string | null
  customer_order_number: string | null
  order_date: string | null
  configuration: string | null
  notes: string | null
}

interface CustomerOrder {
  id: string
  order_number: string
  dealer_name: string | null
  customer_name: string | null
  product_name: string
  product_sku: string | null
  product_id: string | null
  quantity: number
  configuration: string | null
  status: string
  production_order_id: string | null
  production_order_number: string | null
  created_at: string
  order_date: string | null // Excel'den gelen sipariş tarihi (SİP TRH)
  notes: string | null
}

export default function ProductionPage() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [hasInitializedFromQuery, setHasInitializedFromQuery] = useState(false)
  const lastClickRef = useRef<{ id: string | null; time: number }>({ id: null, time: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'>('all')
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null)
  const [cancelingCustomerOrderId, setCancelingCustomerOrderId] = useState<string | null>(null)
  const [stockCheckResults, setStockCheckResults] = useState<{
    producible: any[]
    notProducible: any[]
    loading: boolean
  }>({ producible: [], notProducible: [], loading: false })
  const [barcodesMap, setBarcodesMap] = useState<Record<string, string[]>>({})
  const [productionBarcodesMap, setProductionBarcodesMap] = useState<Record<string, string[]>>({})

  useEffect(() => {
    loadOrders(searchTerm || undefined)
    loadCustomerOrders()
  }, [searchTerm])

  const checkStockForSelectedOrders = useCallback(async () => {
    if (selectedOrderIds.size === 0) {
      setStockCheckResults({ producible: [], notProducible: [], loading: false })
      return
    }
    
    setStockCheckResults(prev => ({ ...prev, loading: true }))
    
    try {
      const orderIdsArray = Array.from(selectedOrderIds)
      const data = await fetchApi(`/api/orders/check-stock?order_ids=${orderIdsArray.join(',')}`)
      setStockCheckResults({
        producible: data.producible || [],
        notProducible: data.notProducible || [],
        loading: false
      })
    } catch (error) {
      console.error('Stok kontrolü hatası:', error)
      setStockCheckResults({ producible: [], notProducible: [], loading: false })
    }
  }, [selectedOrderIds])

  useEffect(() => {
    checkStockForSelectedOrders()
  }, [selectedOrderIds, checkStockForSelectedOrders])

  async function loadOrders(term?: string) {
    try {
      const url = term ? `/api/production?search=${encodeURIComponent(term)}` : '/api/production'
      const data = await fetchApi(url)
      setOrders(data)
    } catch (error) {
      console.error('Üretim emirleri yüklenirken hata:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  async function loadCustomerOrders() {
    try {
      const data = await fetchApi<CustomerOrder[] | { orders?: CustomerOrder[] }>('/api/orders')
      const ordersList = Array.isArray(data)
        ? data
        : Array.isArray((data as { orders?: CustomerOrder[] }).orders)
          ? (data as { orders?: CustomerOrder[] }).orders || []
          : []
      // Sadece bekleyen ve production_order_id'si olmayan siparişleri göster
      const pendingOrders = ordersList.filter((order: CustomerOrder) => 
        order.status === 'pending' && 
        (!order.production_order_id || String(order.production_order_id).trim() === '' || String(order.production_order_id).trim() === 'null')
      )
      setCustomerOrders(pendingOrders)
    } catch (error) {
      console.error('Müşteri siparişleri yüklenirken hata:', error)
      setCustomerOrders([])
    }
  }

  const searchLower = searchTerm.trim().toLowerCase()
  const filteredProductionOrders = orders.filter((order) => {
    const statusMatch = statusFilter === 'all' || order.status === statusFilter
    if (!statusMatch) return false
    if (!searchLower) return true
    const fields = [
      order.customer_name,
      order.dealer_name,
      order.product_name,
      order.sku,
      order.order_number,
      order.customer_order_number,
      order.configuration,
    ]
    return fields.some((value) => value?.toLowerCase().includes(searchLower))
  })

  const filteredCustomerOrders = customerOrders.filter((order) => {
    const statusMatch = statusFilter === 'all' || order.status === statusFilter
    if (!statusMatch) return false
    if (!searchLower) return true
    const fields = [
      order.customer_name,
      order.dealer_name,
      order.product_name,
      order.product_sku,
      order.order_number,
      order.configuration,
      order.notes,
    ]
    return fields.some((value) => value?.toLowerCase().includes(searchLower))
  })

  async function loadBarcodes() {
    try {
      const data = await fetchApi('/api/barcodes')
      
      const map: Record<string, string[]> = {}
      data.forEach((barcode: any) => {
        if (barcode.order_id) {
          if (!map[barcode.order_id]) {
            map[barcode.order_id] = []
          }
          map[barcode.order_id].push(barcode.barcode_number)
        }
      })
      setBarcodesMap(map)
    } catch (error) {
      console.error('Barkodlar yüklenirken hata:', error)
    }
  }

  async function loadProductionBarcodes() {
    try {
      const data = await fetchApi('/api/barcodes')
      
      const map: Record<string, string[]> = {}
      data.forEach((barcode: any) => {
        if (barcode.production_order_id) {
          if (!map[barcode.production_order_id]) {
            map[barcode.production_order_id] = []
          }
          map[barcode.production_order_id].push(barcode.barcode_number)
        }
      })
      setProductionBarcodesMap(map)
    } catch (error) {
      console.error('Barkodlar yüklenirken hata:', error)
    }
  }

  useEffect(() => {
    loadBarcodes()
    loadProductionBarcodes()
  }, [])

  function toggleOrderSelection(orderId: string) {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  function handleOrderDoubleClick(orderId: string) {
    router.push(`/production/new?from_orders=${orderId}`)
  }

  function handleOrderClick(orderId: string) {
    const now = Date.now()
    const last = lastClickRef.current
    const isDoubleClick = last.id === orderId && now - last.time < 300
    lastClickRef.current = { id: orderId, time: now }
    if (isDoubleClick) {
      handleOrderDoubleClick(orderId)
    }
  }

  async function createProductionFromOrders() {
    if (selectedOrderIds.size === 0) {
      alert('Lütfen en az bir sipariş seçin')
      return
    }

    setConverting(true)
    try {
      const result = await fetchApi('/api/orders/convert-to-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          order_ids: Array.from(selectedOrderIds)
        })
      })
      alert(result.message || 'Üretim emirleri oluşturuldu')
      setSelectedOrderIds(new Set())
      loadOrders()
      loadCustomerOrders()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setConverting(false)
    }
  }

  async function cancelProductionOrder(orderId: string, orderNumber: string) {
    if (!confirm(`${orderNumber} üretim emrini iptal etmek istediğinize emin misiniz?`)) {
      return
    }
    setCancelingOrderId(orderId)
    try {
      await fetchApi(`/api/production/${orderId}/cancel`, { method: 'POST' })
      await loadOrders(searchTerm || undefined)
    } catch (error: any) {
      alert('Hata: ' + (error.message || 'Üretim emri iptal edilemedi'))
    } finally {
      setCancelingOrderId(null)
    }
  }

  async function cancelCustomerOrder(orderId: string, orderNumber: string) {
    const reason = window.prompt('İptal nedeni (zorunlu):')?.trim()
    if (!reason) {
      alert('İptal nedeni zorunlu.')
      return
    }
    if (!confirm(`${orderNumber} siparişini iptal etmek istediğinize emin misiniz?\nNeden: ${reason}`)) {
      return
    }
    setCancelingCustomerOrderId(orderId)
    try {
      await fetchApi('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'cancelled', cancel_reason: reason })
      })
      await loadCustomerOrders()
    } catch (error: any) {
      alert('Hata: ' + (error.message || 'Sipariş iptal edilemedi'))
    } finally {
      setCancelingCustomerOrderId(null)
    }
  }

  async function handleDelete(orderId: string) {
    if (!confirm('Bu üretim emrini silmek istediğinize emin misiniz?')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/production/${orderId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Üretim emri silinemedi')
      }

      alert('Üretim emri silindi')
      loadOrders()
      loadCustomerOrders()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        // Farklı formatları dene
        if (dateStr.includes('.')) {
          const parts = dateStr.split('.')
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0')
            const month = parts[1].padStart(2, '0')
            const year = parts[2]
            return `${day}.${month}.${year}`
          }
        }
        return dateStr
      }
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}.${month}.${year}`
    } catch (e) {
      return dateStr
    }
  }

  function getStatusBadge(status: string) {
    const statusConfig = {
      pending: { label: 'Beklemede', className: 'bg-yellow-900/30 text-yellow-400 border-yellow-700' },
      in_production: { label: 'Üretimde', className: 'bg-blue-900/30 text-blue-400 border-blue-700' },
      in_progress: { label: 'Üretimde', className: 'bg-blue-900/30 text-blue-400 border-blue-700' },
      completed: { label: 'Tamamlandı', className: 'bg-green-900/30 text-green-400 border-green-700' },
      cancelled: { label: 'İptal Edildi', className: 'bg-red-900/30 text-red-400 border-red-700' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <span className={`px-2 py-1 rounded text-xs border ${config.className}`}>
        {config.label}
      </span>
    )
  }

  function extractFabricCode(notes: string | null): string {
    if (!notes) return '-'
    const fabricMatch = notes.match(/Kumaş:\s*([^|]+)/i)
    return fabricMatch ? fabricMatch[1].trim() : '-'
  }

  function extractCase(notes: string | null): string {
    if (!notes) return '-'
    const caseMatch = notes.match(/Kasa:\s*([^|]+)/i)
    return caseMatch ? caseMatch[1].trim() : '-'
  }

  function extractLeg(notes: string | null): string {
    if (!notes) return '-'
    const legMatch = notes.match(/Ayak:\s*([^|]+)/i)
    return legMatch ? legMatch[1].trim() : '-'
  }

  function extractDescription(notes: string | null): string {
    if (!notes) return '-'
    let desc = notes
      .replace(/Kumaş:\s*[^|]+/gi, '')
      .replace(/Kasa:\s*[^|]+/gi, '')
      .replace(/Ayak:\s*[^|]+/gi, '')
      .replace(/Birim:\s*[^|]+/gi, '')
      .replace(/\|\s*\|\s*/g, '|')
      .replace(/^\|\s*|\s*\|$/g, '')
      .trim()
    return desc || '-'
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center space-x-2">
            <Factory className="w-6 h-6 md:w-8 md:h-8" />
            <span>{t('production.title')}</span>
          </h1>
          <LogoWithBackground size="sm" />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto" />
      </div>

      {(() => {
        if (selectedOrderIds.size > 0) {
          const pendingOrders = customerOrders.filter(o => selectedOrderIds.has(o.id))
          const pendingOrdersLength = pendingOrders.length
          return (
            <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-blue-300 font-medium">
                  {pendingOrdersLength} sipariş seçildi
                </div>
                <Link
                  href={`/production/new?from_orders=${Array.from(selectedOrderIds).join(',')}`}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition inline-flex items-center space-x-2"
                >
                  <Factory size={20} />
                  <span>Yeni Üretim Emri Oluştur</span>
                </Link>
              </div>
            </div>
          )
        }
        return null
      })()}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">{t('common.loading')}</p>
        </div>
      ) : (
        <div>
          {/* Bekleyen Siparişler Bölümü */}
          {filteredCustomerOrders.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Bekleyen Siparişler ({filteredCustomerOrders.length})</h2>
              <div className="flex flex-wrap gap-2 w-full mb-4">
                <div className="relative flex-1 md:flex-none md:w-[520px]">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Sipariş no, bayi, müşteri, ürün ara..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  <option value="pending">Beklemede</option>
                  <option value="in_progress">Üretimde</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">İptal</option>
                </select>
              </div>
              <div className="space-y-4">
                {filteredCustomerOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="bg-gray-900 rounded-lg border-2 border-gray-600 p-4 hover:bg-gray-800/30 cursor-pointer"
                    onDoubleClick={() => handleOrderDoubleClick(order.id)}
                    onDoubleClickCapture={() => handleOrderDoubleClick(order.id)}
                    onClickCapture={() => handleOrderClick(order.id)}
                  >
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="text-white text-sm font-mono">{order.order_number}</div>
                      <button
                        onClick={() => handleOrderDoubleClick(order.id)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-xs"
                        type="button"
                      >
                        Üretime Al
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Sol Sütun */}
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Seç</div>
                        <div>
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            disabled={order.status === 'in_production' || order.status === 'completed' || (order.production_order_id && String(order.production_order_id).trim() !== '' && String(order.production_order_id).trim() !== 'null')}
                            className="rounded border-gray-600"
                          />
                        </div>
                      </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">TAKİP NO</div>
                      <div className="text-white text-sm font-mono">{order.order_number}</div>
                    </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KONFİGÜRASYON</div>
                        <div className="text-white text-sm">{order.configuration || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Durum</div>
                        <div>
                          <span className={`px-2 py-1 rounded text-xs border ${
                            order.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' :
                            order.status === 'in_production' ? 'bg-blue-900/30 text-blue-400 border-blue-700' :
                            order.status === 'completed' ? 'bg-green-900/30 text-green-400 border-green-700' :
                            'bg-red-900/30 text-red-400 border-red-700'
                          }`}>
                            {order.status === 'pending' ? 'Beklemede' :
                             order.status === 'in_production' ? 'Üretimde' :
                             order.status === 'completed' ? 'Tamamlandı' : 'İptal Edildi'}
                          </span>
                        </div>
                        <button
                          onClick={() => cancelCustomerOrder(order.id, order.order_number)}
                          disabled={cancelingCustomerOrderId === order.id || order.status !== 'pending'}
                          className="mt-2 inline-flex items-center px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                          type="button"
                        >
                          {cancelingCustomerOrderId === order.id ? 'İptal Ediliyor...' : 'İptal Et'}
                        </button>
                      </div>

                      {/* Orta Sol Sütun */}
                      <div>
                        <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                        <div className="text-white text-sm">{order.customer_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                        <div className="text-white text-sm">{order.product_name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KUMAŞ KODU</div>
                        <div className="text-white text-sm">
                          {extractFabricCode(order.notes)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Üretim Emri</div>
                        <div className="text-white text-sm">
                          {order.production_order_number ? (
                            <Link
                              href={`/production/${order.production_order_id}`}
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              {order.production_order_number}
                            </Link>
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>

                      {/* Orta Sağ Sütun */}
                      <div>
                        <div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div>
                        <div className="text-white text-sm break-words whitespace-normal">
                          {extractDescription(order.notes)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">SİP MİKTAR</div>
                        <div className="text-white text-sm">{order.quantity} ADET</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KASA</div>
                        <div className="text-white text-sm">
                          {extractCase(order.notes)}
                        </div>
                      </div>

                      {/* Sağ Sütun */}
                      <div>
                        <div className="text-xs text-gray-400 mb-1">SİP TRH</div>
                        <div className="text-white text-sm">{formatDate(order.order_date)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                        <div className="text-white text-sm">{order.dealer_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">AYAK</div>
                        <div className="text-white text-sm">
                          {extractLeg(order.notes)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Üretim Emirleri Bölümü */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Üretim Emirleri ({filteredProductionOrders.length})</h2>
            {filteredProductionOrders.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                {t('production.noOrders')}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProductionOrders.map((order) => {
                  const prodBarcodes = productionBarcodesMap[order.id] || []
                  return (
                    <div key={order.id} className="bg-gray-900 rounded-lg border-2 border-gray-600 p-4 hover:bg-gray-800/30">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Sol Sütun */}
                        <div>
                          <div className="text-xs text-gray-400 mb-1">TAKİP NO</div>
                          <div className="text-white text-sm font-mono">{order.customer_order_number || order.order_number}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">PARÇA</div>
                          <div className="text-white text-sm">{order.configuration || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Durum</div>
                          <div>{getStatusBadge(order.status)}</div>
                          <button
                            onClick={() => cancelProductionOrder(order.id, order.order_number)}
                            disabled={cancelingOrderId === order.id || order.status === 'completed' || order.status === 'cancelled'}
                            className="mt-2 inline-flex items-center px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                            type="button"
                            title={order.status === 'completed' ? 'Tamamlanan emir iptal edilemez' : order.status === 'cancelled' ? 'Bu emir zaten iptal' : 'Üretim emrini iptal et'}
                          >
                            {cancelingOrderId === order.id ? 'İptal Ediliyor...' : 'İptal Et'}
                          </button>
                        </div>

                        {/* Orta Sol Sütun */}
                        <div>
                          <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                          <div className="text-white text-sm">{order.customer_name || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                          <div className="text-white text-sm">{order.product_name}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">KUMAŞ KODU</div>
                          <div className="text-white text-sm">
                            {extractFabricCode(order.notes)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Üretim Emri</div>
                          <div className="text-white text-sm">
                            <Link
                              href={`/production/${order.id}`}
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              {order.order_number}
                            </Link>
                          </div>
                        </div>

                        {/* Orta Sağ Sütun */}
                        <div>
                          <div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div>
                          <div className="text-white text-sm break-words whitespace-normal">
                            {extractDescription(order.notes)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">SİP MİKTAR</div>
                          <div className="text-white text-sm">{order.quantity} ADET</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">KASA</div>
                          <div className="text-white text-sm">
                            {extractCase(order.notes)}
                          </div>
                        </div>

                        {/* Sağ Sütun */}
                        <div>
                          <div className="text-xs text-gray-400 mb-1">SİP TRH</div>
                          <div className="text-white text-sm">{formatDate(order.order_date)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                          <div className="text-white text-sm">{order.dealer_name || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">AYAK</div>
                          <div className="text-white text-sm">
                            {extractLeg(order.notes)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}