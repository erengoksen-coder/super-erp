'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Factory } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { fetchApi } from '@/lib/api/client'
import { type ProductionOrder } from '@/components/production/KanbanBoard'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import ProductionRealtime from '@/app/_components/production-realtime'



export default function ProductionPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [convertingOrderId, setConvertingOrderId] = useState<string | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadOrders = useCallback(async () => {
    try {
      let data: unknown = null
      const search = searchTerm.trim()
      const query = search ? `?search=${encodeURIComponent(search)}` : ''
      try {
        data = await fetchApi(`/api/production/board${query}`)
      } catch {
        try {
          data = await fetchApi('/api/production-orders')
        } catch {
          data = await fetchApi(`/api/production${query}`)
        }
      }
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading production orders:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  const loadPendingOrders = useCallback(async () => {
    try {
      const data = await fetchApi('/api/orders?status=pending')
      setPendingOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading pending orders:', error)
    }
  }, [])

  const normalizeNotes = useCallback((value: unknown) => String(value ?? ''), [])
  const normalize = useCallback((value: unknown) => String(value ?? '').toLowerCase(), [])

  const pendingCards = useMemo(() => {
    const search = normalize(searchTerm).trim()
    if (!search) return pendingOrders
    return pendingOrders.filter((order) =>
      [
        order.order_number,
        order.product_name,
        order.matched_product_name,
        order.customer_name,
        order.dealer_name,
        order.configuration,
        order.product_sku,
      ].some((value) => normalize(value).includes(search))
    )
  }, [pendingOrders, searchTerm, normalize])

  const filteredPendingCards = useMemo(() => {
    if (statusFilter === 'all' || statusFilter === 'pending') {
      return pendingCards
    }
    return []
  }, [pendingCards, statusFilter])

  const createProductionFromOrder = useCallback(
    async (orderId: string) => {
      setConvertingOrderId(orderId)
      try {
        const queryParams = new URLSearchParams()
        queryParams.set('from_orders', orderId)
        router.push(`/production/new?${queryParams.toString()}`)
      } finally {
        setConvertingOrderId(null)
      }
    },
    [router]
  )

  const cancelOrder = useCallback(
    async (orderId: string) => {
      const reason = window.prompt('İptal nedeni girin:')
      if (!reason) return
      setCancellingOrderId(orderId)
      try {
        await fetchApi('/api/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: 'cancelled', cancel_reason: reason }),
        })
        await loadPendingOrders()
      } catch (error) {
        console.error('Sipariş iptal edilirken hata:', error)
      } finally {
        setCancellingOrderId(null)
      }
    },
    [loadPendingOrders]
  )

  useEffect(() => {
    loadOrders()
    loadPendingOrders()
    const interval = setInterval(loadOrders, 30000) // 30 saniyede bir güncelle
    return () => clearInterval(interval)
  }, [loadOrders, loadPendingOrders])

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadOrders()
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchTerm, loadOrders])

  const filteredOrders = orders.filter(order => {
    const search = normalize(searchTerm).trim()
    const matchesSearch = !search || [
      order.order_number,
      order.product_name,
      order.sku,
      order.customer_name,
      order.dealer_name,
      order.customer_order_number,
      order.configuration,
    ].some((value) => normalize(value).includes(search))
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <AppDashboardLayout
        title="Üretim Yönetimi"
        icon={Factory}
      >
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </AppDashboardLayout>
    )
  }

  return (
    <AppDashboardLayout
      title="Üretim Yönetimi"
      subtitle="Tüm üretim emirlerinin canlı durumu"
      icon={Factory}
      actions={
        <>
          <Button
            variant="solid"
            color="primary"
            size="sm"
            onClick={() => router.push('/production/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Üretim Emri
          </Button>
        </>
      }
    >
      {/* Filters */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Müşteri, cari, ürün, takip no, SKU ara..."
                leftIcon={<Search className="w-4 h-4" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={statusFilter === 'all' ? 'solid' : 'outline'}
                color="primary"
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Tümü ({orders.length + pendingOrders.length})
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'solid' : 'outline'}
                color="warning"
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Beklemede ({orders.filter(o => o.status === 'pending').length + pendingOrders.length})
              </Button>
              <Button
                variant={statusFilter === 'in_progress' ? 'solid' : 'outline'}
                color="primary"
                size="sm"
                onClick={() => setStatusFilter('in_progress')}
              >
                Devam Eden ({orders.filter(o => o.status === 'in_progress').length})
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'solid' : 'outline'}
                color="success"
                size="sm"
                onClick={() => setStatusFilter('completed')}
              >
                Tamamlanan ({orders.filter(o => o.status === 'completed').length})
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <ProductionRealtime onUpdate={loadOrders} />

      <Card>
        <CardHeader title="Yeni Siparişler (Üretim Emirlerine Dönüştür)" />
        <CardBody>
          {filteredPendingCards.length === 0 ? (
            <div className="text-sm text-gray-500">Bekleyen sipariş yok.</div>
          ) : (
            <div className="space-y-4">
              {filteredPendingCards.map((order) => {
                const notesText = normalizeNotes(order.notes).trim()
                const fabricMatch = notesText.match(/Kumaş:\s*([^|]+)/i)
                const caseMatch = notesText.match(/Kasa:\s*([^|]+)/i)
                const legMatch = notesText.match(/Ayak:\s*([^|]+)/i)
                const unitMatch = notesText.match(/Birim:\s*([^|]+)/i)
                const cleanedNotes = notesText
                  .replace(/Kumaş:\s*[^|]+/gi, '')
                  .replace(/Kasa:\s*[^|]+/gi, '')
                  .replace(/Ayak:\s*[^|]+/gi, '')
                  .replace(/Birim:\s*[^|]+/gi, '')
                  .replace(/\|\s*\|\s*/g, '|')
                  .replace(/^\|\s*|\s*\|$/g, '')
                  .trim()
                const quantityUnit = (unitMatch?.[1] || order.unit || 'ADET').toString().trim()

                return (
                  <div
                    key={order.id}
                    className="bg-gray-900 rounded-lg border-2 border-gray-600 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-end gap-2 mb-3">
                      <Button
                        variant="solid"
                        color="primary"
                        size="sm"
                        className="!bg-blue-600 !text-white hover:!bg-blue-700 active:!bg-blue-800"
                        onClick={() => createProductionFromOrder(order.id)}
                        disabled={convertingOrderId === order.id}
                      >
                        {convertingOrderId === order.id ? 'Hazırlanıyor...' : 'Üretime Al'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Seç</div>
                        <div>
                          <input type="checkbox" className="rounded border-gray-600" />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">TAKİP NO</div>
                        <div className="text-white text-sm font-mono">{order.order_number || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KONFİGÜRASYON</div>
                        <div className="text-white text-sm">{order.configuration || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Durum</div>
                        <div className="space-y-2">
                          {order.display_status === 'shipped' ? (
                            <span className="px-2 py-1 rounded text-xs border bg-green-900/30 text-green-400 border-green-700">
                              Sevk Edildi
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs border bg-yellow-900/30 text-yellow-400 border-yellow-700">
                              Beklemede
                            </span>
                          )}
                          {order.display_status !== 'shipped' && (
                            <div>
                              <Button
                                variant="solid"
                                color="error"
                                size="sm"
                                className="!bg-red-600 !text-white hover:!bg-red-700 active:!bg-red-800"
                                onClick={() => cancelOrder(order.id)}
                                disabled={cancellingOrderId === order.id}
                              >
                                {cancellingOrderId === order.id ? 'İptal...' : 'İptal'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Üretim Emri</div>
                        <div className="text-white text-sm">-</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                        <div className="text-white text-sm">{order.customer_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                        <div className="text-white text-sm">
                          {order.product_name || order.matched_product_name || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KUMAŞ KODU</div>
                        <div className="text-white text-sm">
                          {fabricMatch ? fabricMatch[1].trim() : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div>
                        <div className="text-white text-sm break-words whitespace-normal">
                          {cleanedNotes || '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 mb-1">SİP MİKTAR</div>
                        <div className="text-white text-sm">
                          {order.quantity || '-'} {quantityUnit || 'ADET'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KASA</div>
                        <div className="text-white text-sm">
                          {caseMatch ? caseMatch[1].trim() : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">SİP TRH</div>
                        <div className="text-white text-sm">
                          {order.order_date
                            ? new Date(order.order_date).toLocaleDateString('tr-TR')
                            : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                        <div className="text-white text-sm">{order.dealer_name || '-'}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 mb-1">AYAK</div>
                        <div className="text-white text-sm">
                          {legMatch ? legMatch[1].trim() : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

    </AppDashboardLayout>
  )
}