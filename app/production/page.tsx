'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Factory, Trash2, RotateCcw, BarChart3 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { fetchApi } from '@/lib/api/client'
import { KanbanBoard, type ProductionOrder } from '@/components/production/KanbanBoard'
import { formatOrderDateDisplay } from '@/lib/utils/dateFormat'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import ProductionRealtime from '@/app/_components/production-realtime'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'



const APP_TITLE = 'LIVASOFA ERP'

const STATION_LABELS: Record<string, string> = {
  iskelet: 'İskelet',
  terzihane: 'Terzihane',
  berjer: 'Berjer',
  döseme: 'Döşeme',
  montaj: 'Montaj',
  sevkiyat: 'Sevkiyatta',
  completed: 'Üretim tamamlandı',
}

function getStationLabel(station: string | null | undefined): string {
  if (!station || !station.trim()) return 'İskelet'
  const key = station.trim().toLowerCase()
  return STATION_LABELS[key] ?? station
}

export default function ProductionPage() {
  const { t } = useI18n()
  const router = useRouter()
  useEffect(() => { document.title = `Üretim - ${APP_TITLE}`; return () => { document.title = APP_TITLE } }, [])
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [inProgressOrdersCount, setInProgressOrdersCount] = useState(0)
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0)
  const [shippedOrdersCount, setShippedOrdersCount] = useState(0)
  const [convertingOrderId, setConvertingOrderId] = useState<string | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [cancellingProductionOrderId, setCancellingProductionOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [clearing, setClearing] = useState(false)
  const [clearingShipmentData, setClearingShipmentData] = useState(false)
  const userRole = useAuthStore((s) => s.user?.role ?? null)
  const isAdmin = userRole === 'admin' || userRole === 'manager'

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
      console.error('Üretim emirleri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  const loadPendingOrders = useCallback(async () => {
    const tryLoad = async (attempt: number): Promise<void> => {
      try {
        const data = await fetchApi('/api/orders?status=pending')
        setPendingOrders(Array.isArray(data) ? data : [])
      } catch (error) {
        if (attempt < 2 && (error instanceof TypeError || (error instanceof Error && error.message?.includes('fetch')))) {
          await new Promise((r) => setTimeout(r, 2000))
          return tryLoad(attempt + 1)
        }
        console.error('Bekleyen siparişler yüklenirken hata:', error)
        setPendingOrders([])
      }
    }
    return tryLoad(1)
  }, [])

  // Devam Eden / Tamamlanan / Sevk Edilen sayıları liste ile aynı kaynaktan al (entegrasyon)
  const loadOrdersCountsByStatus = useCallback(async () => {
    try {
      const [inProgress, completed, shipped] = await Promise.all([
        fetchApi('/api/orders?status=in_production').then((d) => (Array.isArray(d) ? d.length : 0)).catch(() => 0),
        fetchApi('/api/orders?status=completed').then((d) => (Array.isArray(d) ? d.length : 0)).catch(() => 0),
        fetchApi('/api/orders?status=shipped').then((d) => (Array.isArray(d) ? d.length : 0)).catch(() => 0),
      ])
      setInProgressOrdersCount(inProgress)
      setCompletedOrdersCount(completed)
      setShippedOrdersCount(shipped)
    } catch (error) {
      console.error('Duruma göre sipariş sayıları yüklenirken hata:', error)
      setInProgressOrdersCount(0)
      setCompletedOrdersCount(0)
      setShippedOrdersCount(0)
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

  // Sekme sayıları tutarlı olsun: Tümü = Beklemede + Devam Eden + Tamamlanan + Sevk Edilen
  const pendingCount = orders.filter((o) => o.status === 'pending').length + pendingOrders.length
  const totalCount = pendingCount + inProgressOrdersCount + completedOrdersCount + shippedOrdersCount

  const filteredPendingCards = useMemo(() => {
    let filtered = []
    if (statusFilter === 'all' || statusFilter === 'pending') {
      filtered = pendingCards
    }
    // Müşteri ismine göre sırala
    return [...filtered].sort((a, b) => {
      const customerA = (a.customer_name || '').toLowerCase().trim()
      const customerB = (b.customer_name || '').toLowerCase().trim()
      if (customerA < customerB) return -1
      if (customerA > customerB) return 1
      return 0
    })
  }, [pendingCards, statusFilter])

  // Filtreye göre siparişleri yükle
  const loadOrdersByStatus = useCallback(async (status: string) => {
    try {
      let url = '/api/orders'
      if (status === 'in_progress') {
        url = '/api/orders?status=in_production'
      } else if (status === 'completed') {
        url = '/api/orders?status=completed'
      } else if (status === 'shipped') {
        url = '/api/orders?status=shipped'
      } else if (status === 'pending') {
        url = '/api/orders?status=pending'
      }
      // status === 'all' → url stays '/api/orders' (tüm siparişler)
      const data = await fetchApi(url)
      const ordersList = Array.isArray(data) ? data : []
      // Arama terimine göre filtrele
      const search = normalize(searchTerm).trim()
      if (search) {
        return ordersList.filter((order: any) =>
          [
            order.order_number,
            order.product_name,
            order.product_sku,
            order.customer_name,
            order.dealer_name,
            order.configuration,
          ].some((value) => normalize(value).includes(search))
        )
      }
      return ordersList
    } catch (error) {
      console.error('Duruma göre siparişler yüklenirken hata:', error)
      return []
    }
  }, [searchTerm, normalize])

  const [filteredOrdersByStatus, setFilteredOrdersByStatus] = useState<any[]>([])

  useEffect(() => {
    if (statusFilter === 'in_progress' || statusFilter === 'completed' || statusFilter === 'shipped' || statusFilter === 'all') {
      loadOrdersByStatus(statusFilter).then((list) => {
        setFilteredOrdersByStatus(Array.isArray(list) ? list : [])
      })
    } else {
      setFilteredOrdersByStatus([])
    }
  }, [statusFilter, searchTerm, loadOrdersByStatus])

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

  const clearShipmentData = useCallback(async () => {
    if (!confirm('Sevkiyata verilmiş tüm barkodlar sevkiyattan çıkarılacak; siparişler "Tamamlanan"da görünecek. Emin misiniz?')) return
    setClearingShipmentData(true)
    try {
      const res = await fetchApi<{ message?: string; cleared_barcodes?: number }>('/api/admin/clear-shipment-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const msg = (res as any)?.message ?? (res as any)?.data?.message ?? 'Sevkiyat verileri temizlendi.'
      toast.success(msg)
      loadOrders()
      loadPendingOrders()
      loadOrdersCountsByStatus()
      loadOrdersByStatus(statusFilter).then(setFilteredOrdersByStatus)
    } catch (e: any) {
      toast.error('Hata: ' + (e instanceof Error ? e.message : 'İşlem başarısız'))
    } finally {
      setClearingShipmentData(false)
    }
  }, [loadOrders, loadPendingOrders, loadOrdersCountsByStatus, loadOrdersByStatus, statusFilter])

  const cancelProductionOrder = useCallback(
    async (productionOrderId: string) => {
      if (!productionOrderId) return
      if (!confirm('Bu üretim emri iptal edilecek. BOM malzemeleri depoya iade edilecek, bu emre bağlı siparişler bekleyene alınacak. Onaylıyor musunuz?')) return
      setCancellingProductionOrderId(productionOrderId)
      try {
        const res = await fetchApi<{ success?: boolean; message?: string }>(`/api/production/${productionOrderId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        toast.success(res?.message ?? 'Üretim emri iptal edildi. BOM depoya iade edildi.')
        await loadOrders()
        await loadOrdersCountsByStatus()
        await loadPendingOrders()
        loadOrdersByStatus(statusFilter).then(setFilteredOrdersByStatus)
      } catch (e: unknown) {
        toast.error('Hata: ' + (e instanceof Error ? e.message : 'İptal işlemi başarısız'))
      } finally {
        setCancellingProductionOrderId(null)
      }
    },
    [loadOrders, loadOrdersCountsByStatus, loadPendingOrders, loadOrdersByStatus, statusFilter]
  )

  useEffect(() => {
    loadOrders()
    loadPendingOrders()
    loadOrdersCountsByStatus()
  }, [loadOrders, loadPendingOrders, loadOrdersCountsByStatus])

  const searchTermInitialMount = useRef(true)
  useEffect(() => {
    if (searchTermInitialMount.current) {
      searchTermInitialMount.current = false
      return
    }
    const timeout = setTimeout(() => loadOrders(), 300)
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
            variant="outline"
            color="primary"
            size="sm"
            onClick={() => router.push('/production/dashboard')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Performans Paneli
          </Button>
          <Button
            variant="solid"
            color="primary"
            size="sm"
            onClick={() => router.push('/production/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Üretim Emri
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              color="error"
              size="sm"
              disabled={clearing}
              onClick={async () => {
                if (!confirm('Üretim emirleri, barkodlar ve sevkiyat verileri tamamen silinecek. Siparişler kalacak ama üretim emri bağlantıları temizlenecek. Bu işlem geri alınamaz. Emin misiniz?')) return
                if (!confirm('Son kez: Tüm üretim emirleri, barkodlar ve sevkiyat verilerini silmek istediğinize emin misiniz?')) return
                setClearing(true)
                try {
                  const res = await fetchApi<{ message?: string; total_deleted?: number }>('/api/admin/clear-production-shipment-barcode', {
                    method: 'POST',
                    body: JSON.stringify({ confirm: true }),
                  })
                  const msg = (res as any)?.message ?? (res as any)?.data?.message ?? 'Üretim emri verileri silindi.'
                  toast.success(msg)
                  loadOrders()
                  loadPendingOrders()
                  loadOrdersCountsByStatus()
                } catch (e: unknown) {
                  toast.error('Hata: ' + (e instanceof Error ? e.message : 'Silme işlemi başarısız'))
                } finally {
                  setClearing(false)
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {clearing ? 'Siliniyor...' : 'Üretim Emri Verilerini Sil'}
            </Button>
          )}
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
                Tümü ({totalCount})
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'solid' : 'outline'}
                color="warning"
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Beklemede ({pendingCount})
              </Button>
              <Button
                variant={statusFilter === 'in_progress' ? 'solid' : 'outline'}
                color="primary"
                size="sm"
                onClick={() => setStatusFilter('in_progress')}
              >
                Devam Eden ({inProgressOrdersCount})
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'solid' : 'outline'}
                color="success"
                size="sm"
                onClick={() => setStatusFilter('completed')}
              >
                Tamamlanan ({completedOrdersCount})
              </Button>
              <Button
                variant={statusFilter === 'shipped' ? 'solid' : 'outline'}
                color="primary"
                size="sm"
                onClick={() => setStatusFilter('shipped')}
              >
                Sevk Edilen ({shippedOrdersCount})
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <ProductionRealtime onUpdate={() => { loadOrders(); loadPendingOrders(); loadOrdersCountsByStatus(); }} />

      <Card>
        <CardHeader title={
          statusFilter === 'in_progress' ? 'Devam Eden Siparişler' :
            statusFilter === 'completed' ? 'Tamamlanan Siparişler' :
              statusFilter === 'shipped' ? 'Sevk Edilen Siparişler' :
                statusFilter === 'all' ? 'Tüm Siparişler' :
                  'Yeni Siparişler (Üretim Emirlerine Dönüştür)'
        } />
        <CardBody>
          {statusFilter === 'all' ? (
            filteredOrdersByStatus.length === 0 ? (
              <div className="text-sm text-gray-500">Sipariş yok.</div>
            ) : (
              <div className="space-y-4">
                {filteredOrdersByStatus.map((order: any) => {
                  const notesText = normalizeNotes(order.notes).trim()
                  const unitMatch = notesText.match(/Birim:\s*([^|]+)/i)
                  const fabricMatch = notesText.match(/Kumaş:\s*([^|]+)/i)
                  const caseMatch = notesText.match(/Kasa:\s*([^|]+)/i)
                  const legMatch = notesText.match(/Ayak:\s*([^|]+)/i)
                  const cushionMatch = notesText.match(/Kirlent:\s*([^|]+)/i)
                  const cleanedNotes = notesText
                    .replace(/Kumaş:\s*[^|]+/gi, '')
                    .replace(/Kasa:\s*[^|]+/gi, '')
                    .replace(/Ayak:\s*[^|]+/gi, '')
                    .replace(/Kirlent:\s*[^|]+/gi, '')
                    .replace(/Birim:\s*[^|]+/gi, '')
                    .replace(/\|\s*\|\s*/g, '|')
                    .replace(/^\|\s*|\s*\|$/g, '')
                    .trim()
                  const quantityUnit = (unitMatch?.[1] || order.unit || 'ADET').toString().trim()
                  const isPendingNoProd = order.status === 'pending' && !order.production_order_id
                  const isInProductionOrCompleted = order.status === 'in_production' || order.status === 'completed'
                  const showActionButton = isPendingNoProd || isInProductionOrCompleted
                  const statusBadge =
                    order.display_status === 'shipped'
                      ? { label: 'Sevk Edildi', className: 'bg-green-900/30 text-green-400 border-green-700' }
                      : order.status === 'in_production'
                        ? { label: 'Devam Eden', className: 'bg-blue-900/30 text-blue-400 border-blue-700' }
                        : order.status === 'completed'
                          ? { label: 'Tamamlandı', className: 'bg-green-900/30 text-green-400 border-green-700' }
                          : { label: 'Beklemede', className: 'bg-yellow-900/30 text-yellow-400 border-yellow-700' }
                  return (
                    <div key={order.id} className="bg-gray-900 rounded-lg border-2 border-gray-600 p-4 hover:bg-gray-800/30">
                      <div className="flex justify-between items-start gap-3 mb-4">
                        <span className="text-xl font-bold text-white font-mono tracking-tight">{order.order_number || '-'}</span>
                        {showActionButton && !isInProductionOrCompleted && (
                          <Button variant="solid" color="primary" size="sm" className="!bg-blue-600 !text-white hover:!bg-blue-700 rounded-md shrink-0" onClick={() => createProductionFromOrder(order.id)} disabled={convertingOrderId === order.id}>
                            {convertingOrderId === order.id ? 'Hazırlanıyor...' : 'Üretime Al'}
                          </Button>
                        )}
                        {showActionButton && isInProductionOrCompleted && order.production_order_id && (order.status === 'in_production' || order.status === 'in_progress') && (
                          <Button variant="outline" size="sm" className="!border-red-600 !text-red-400 hover:!bg-red-900/30 rounded-md" onClick={() => cancelProductionOrder(order.production_order_id)} disabled={cancellingProductionOrderId === order.production_order_id}>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            {cancellingProductionOrderId === order.production_order_id ? 'İptal ediliyor...' : 'ÜRETİMİ İPTAL ET'}
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                        <div><div className="text-xs text-gray-400 mb-1">Seç</div><div className="text-white text-sm">-</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">TAKİP NO</div><div className="text-white text-sm font-mono">{order.order_number || '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">KASA</div><div className="text-white text-sm">{caseMatch ? caseMatch[1].trim() : '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">Durum</div><div><span className={`px-2 py-1 rounded text-xs border ${statusBadge.className}`}>{statusBadge.label}</span></div></div>
                        <div><div className="text-xs text-gray-400 mb-1">Nerede devam ediyor</div><div className="text-white font-medium text-blue-300">{(order.status === 'in_production' || order.status === 'in_progress') ? <span className="px-2 py-1 rounded bg-blue-900/40 border border-blue-600">{getStationLabel(order.production_current_station)}</span> : '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">CARİ ADI</div><div className="text-white text-sm">{order.dealer_name || '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div><div className="text-white text-sm break-words whitespace-normal">{cleanedNotes || '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">KUMAŞ KODU</div><div className="text-white text-sm">{fabricMatch ? fabricMatch[1].trim() : '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">Üretim Emri</div><div className="text-white text-sm">{order.production_order_id ? <a href={`/production/${order.production_order_id}`} className="text-blue-400 hover:text-blue-300 underline">{order.production_order_number || order.production_order_id}</a> : '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div><div className="text-white text-sm">{order.product_name || order.matched_product_name || '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">SİP MİKTAR</div><div className="text-white text-sm">{order.quantity || '-'} {quantityUnit || 'ADET'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">KONFİGÜRASYON</div><div className="text-white text-sm">{order.configuration || '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">SİP TRH</div><div className="text-white text-sm">{formatOrderDateDisplay(order.order_date, order.created_at ?? null)}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div><div className="text-white text-sm">{order.customer_name || '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">AYAK</div><div className="text-white text-sm">{legMatch ? legMatch[1].trim() : '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">KİRLENT</div><div className="text-white text-sm">{cushionMatch ? cushionMatch[1].trim() : '-'}</div></div>
                        <div />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : statusFilter === 'shipped' ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  color="warning"
                  size="sm"
                  disabled={clearingShipmentData}
                  onClick={clearShipmentData}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {clearingShipmentData ? 'Temizleniyor...' : 'Sevkiyat Verilerini Sil'}
                </Button>
              </div>
              {filteredOrdersByStatus.length === 0 ? (
                <div className="text-sm text-gray-500">Sevk edilen sipariş yok.</div>
              ) : (
                <div className="space-y-4">
                  {filteredOrdersByStatus.map((order: any) => {
                    const notesText = normalizeNotes(order.notes).trim()
                    const unitMatch = notesText.match(/Birim:\s*([^|]+)/i)
                    const fabricMatch = notesText.match(/Kumaş:\s*([^|]+)/i)
                    const caseMatch = notesText.match(/Kasa:\s*([^|]+)/i)
                    const legMatch = notesText.match(/Ayak:\s*([^|]+)/i)
                    const cushionMatch = notesText.match(/Kirlent:\s*([^|]+)/i)
                    const cleanedNotes = notesText
                      .replace(/Kumaş:\s*[^|]+/gi, '')
                      .replace(/Kasa:\s*[^|]+/gi, '')
                      .replace(/Ayak:\s*[^|]+/gi, '')
                      .replace(/Kirlent:\s*[^|]+/gi, '')
                      .replace(/Birim:\s*[^|]+/gi, '')
                      .replace(/\|\s*\|\s*/g, '|')
                      .replace(/^\|\s*|\s*\|$/g, '')
                      .trim()
                    const quantityUnit = (unitMatch?.[1] || order.unit || 'ADET').toString().trim()
                    return (
                      <div key={order.id} className="bg-gray-900 rounded-lg border-2 border-gray-600 p-4 hover:bg-gray-800/30">
                        <div className="flex justify-between items-start gap-3 mb-4">
                          <span className="text-xl font-bold text-white font-mono tracking-tight">{order.order_number || '-'}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                          <div><div className="text-xs text-gray-400 mb-1">Seç</div><div className="text-white text-sm">-</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">TAKİP NO</div><div className="text-white text-sm font-mono">{order.order_number || '-'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">KASA</div><div className="text-white text-sm">{caseMatch ? caseMatch[1].trim() : '-'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">Durum</div><div><span className="px-2 py-1 rounded text-xs border bg-green-900/30 text-green-400 border-green-700">Sevk Edildi</span></div></div>
                          <div><div className="text-xs text-gray-400 mb-1">CARİ ADI</div><div className="text-white text-sm">{order.dealer_name || '-'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div><div className="text-white text-sm break-words whitespace-normal">{cleanedNotes || '-'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">KUMAŞ KODU</div><div className="text-white text-sm">{fabricMatch ? fabricMatch[1].trim() : '-'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">Üretim Emri</div><div className="text-white text-sm">{order.production_order_id ? <a href={`/production/${order.production_order_id}`} className="text-blue-400 hover:text-blue-300 underline">{order.production_order_number || order.production_order_id}</a> : '-'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div><div className="text-white text-sm">{order.product_name || '-'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">SİP MİKTAR</div><div className="text-white text-sm">{order.quantity || '-'} {quantityUnit || 'ADET'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">KONFİGÜRASYON</div><div className="text-white text-sm">{order.configuration || '-'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">SİP TRH</div><div className="text-white text-sm">{formatOrderDateDisplay(order.order_date, (order as any).created_at ?? null)}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div><div className="text-white text-sm">{order.customer_name || '-'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">AYAK</div><div className="text-white text-sm">{legMatch ? legMatch[1].trim() : '-'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-1">KİRLENT</div><div className="text-white text-sm">{cushionMatch ? cushionMatch[1].trim() : '-'}</div></div>
                          <div />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : statusFilter === 'in_progress' ? (
            filteredOrdersByStatus.length === 0 ? (
              <div className="text-sm text-gray-500">Devam eden sipariş yok.</div>
            ) : (
              <KanbanBoard
                orders={filteredOrdersByStatus as ProductionOrder[]}
                onOrderClick={(order) => router.push(`/production/${order.id}`)}
                onOrderMoved={async (orderId, newStationId) => {
                  try {
                    // Update the local state optimistically
                    setFilteredOrdersByStatus((prev) =>
                      prev.map((order) => {
                        if (order.id === orderId) {
                          // Change the display station optimistically so UI doesn't bounce back
                          return { ...order, current_station: newStationId, production_current_station: newStationId }
                        }
                        return order
                      })
                    )

                    const res = await fetchApi(`/api/production/${orderId}/station`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ station: newStationId })
                    })
                    toast.success('İstasyon güncellendi: ' + getStationLabel(newStationId))
                    // Re-load numbers softly in the background
                    loadOrdersCountsByStatus()

                    // If moving directly to completed/sevk from Kanban
                    if (newStationId === 'completed' || newStationId === 'sevkiyat') {
                      setTimeout(() => {
                        loadOrdersByStatus(statusFilter).then((list) => {
                          setFilteredOrdersByStatus(Array.isArray(list) ? list : [])
                        })
                      }, 1000)
                    }
                  } catch (e: any) {
                    toast.error('İstasyon güncellenemedi: ' + e.message)
                    // Revert optimism
                    loadOrdersByStatus(statusFilter).then((list) => {
                      setFilteredOrdersByStatus(Array.isArray(list) ? list : [])
                    })
                  }
                }}
              />
            )
          ) : statusFilter === 'completed' ? (
            filteredOrdersByStatus.length === 0 ? (
              <div className="text-sm text-gray-500">Tamamlanan sipariş yok.</div>
            ) : (
              <div className="space-y-4">
                {filteredOrdersByStatus.map((order) => {
                  const notesText = normalizeNotes(order.notes).trim()
                  const fabricMatch = notesText.match(/Kumaş:\s*([^|]+)/i)
                  const caseMatch = notesText.match(/Kasa:\s*([^|]+)/i)
                  const legMatch = notesText.match(/Ayak:\s*([^|]+)/i)
                  const cushionMatch = notesText.match(/Kirlent:\s*([^|]+)/i)
                  const unitMatch = notesText.match(/Birim:\s*([^|]+)/i)
                  const cleanedNotes = notesText
                    .replace(/Kumaş:\s*[^|]+/gi, '')
                    .replace(/Kasa:\s*[^|]+/gi, '')
                    .replace(/Ayak:\s*[^|]+/gi, '')
                    .replace(/Kirlent:\s*[^|]+/gi, '')
                    .replace(/Birim:\s*[^|]+/gi, '')
                    .replace(/\|\s*\|\s*/g, '|')
                    .replace(/^\|\s*|\s*\|$/g, '')
                    .trim()
                  const quantityUnit = (unitMatch?.[1] || order.unit || 'ADET').toString().trim()

                  return (
                    <div key={order.id} className="bg-gray-900 rounded-lg border-2 border-gray-600 p-4 hover:bg-gray-800/30">
                      <div className="flex justify-between items-start gap-3 mb-4">
                        <span className="text-xl font-bold text-white font-mono tracking-tight">{order.order_number || '-'}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Takip No</div><div className="text-slate-200 font-medium">{order.order_number || '-'}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Cari Adı</div><div className="text-slate-200 font-medium">{order.dealer_name || '-'}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Müşteri Adı</div><div className="text-slate-200 font-medium">{order.customer_name || '-'}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Sipariş Tarihi</div><div className="text-slate-200 font-medium">{formatOrderDateDisplay(order.order_date, (order as any).created_at ?? null)}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Ürün Adı</div><div className="text-slate-200 font-medium">{order.product_name || '-'}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Sipariş Miktarı</div><div className="text-slate-200 font-medium">{order.quantity || '-'} {quantityUnit || 'ADET'}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Konfigürasyon</div><div className="text-slate-200 font-medium">{order.configuration || '-'}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Kasa</div><div className="text-slate-200 font-medium">{caseMatch ? caseMatch[1].trim() : '-'}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Ayak</div><div className="text-slate-200 font-medium">{legMatch ? legMatch[1].trim() : '-'}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Kumaş Kodu</div><div className="text-slate-200 font-medium">{fabricMatch ? fabricMatch[1].trim() : '-'}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Kırlent</div><div className="text-slate-200 font-medium">{cushionMatch ? cushionMatch[1].trim() : '-'}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Üretim Emri</div><div className="text-slate-200 font-medium">{order.production_order_id ? <a href={`/production/${order.production_order_id}`} className="text-blue-400 hover:text-blue-300 underline font-semibold">{order.production_order_number || order.production_order_id}</a> : '-'}</div></div>
                        <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Durum</div><div><span className="px-2.5 py-1 rounded border bg-emerald-900/20 text-emerald-400 border-emerald-800/50 text-xs font-medium">Tamamlandı</span></div></div>
                        <div className="col-span-full space-y-1"><div className="text-[11px] text-slate-500 font-medium">Açıklama</div><div className="text-slate-300 bg-slate-800/40 border border-slate-700/50 p-3 rounded-md min-h-[40px] text-sm break-words whitespace-normal leading-relaxed">{cleanedNotes || '-'}</div></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : filteredPendingCards.length === 0 ? (
            <div className="text-sm text-gray-500">Bekleyen sipariş yok.</div>
          ) : (
            <div className="space-y-4">
              {filteredPendingCards.map((order) => {
                const notesText = normalizeNotes(order.notes).trim()
                const fabricMatch = notesText.match(/Kumaş:\s*([^|]+)/i)
                const caseMatch = notesText.match(/Kasa:\s*([^|]+)/i)
                const legMatch = notesText.match(/Ayak:\s*([^|]+)/i)
                const cushionMatch = notesText.match(/Kirlent:\s*([^|]+)/i)
                const unitMatch = notesText.match(/Birim:\s*([^|]+)/i)
                const cleanedNotes = notesText
                  .replace(/Kumaş:\s*[^|]+/gi, '')
                  .replace(/Kasa:\s*[^|]+/gi, '')
                  .replace(/Ayak:\s*[^|]+/gi, '')
                  .replace(/Kirlent:\s*[^|]+/gi, '')
                  .replace(/Birim:\s*[^|]+/gi, '')
                  .replace(/\|\s*\|\s*/g, '|')
                  .replace(/^\|\s*|\s*\|$/g, '')
                  .trim()
                const quantityUnit = (unitMatch?.[1] || order.unit || 'ADET').toString().trim()

                return (
                  <div
                    key={order.id}
                    className="bg-gray-900 rounded-lg border-2 border-gray-600 p-4 hover:bg-gray-800/30"
                  >
                    <div className="flex justify-between items-start gap-3 mb-4">
                      <span className="text-xl font-bold text-white font-mono tracking-tight">{order.order_number || '-'}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" className="!border-red-600 !text-red-400 hover:!bg-red-900/30 rounded-md" onClick={() => cancelOrder(order.id)} disabled={cancellingOrderId === order.id}>
                          {cancellingOrderId === order.id ? 'İptal...' : 'Siparişi İptal Et'}
                        </Button>
                        <Button variant="solid" color="primary" size="sm" className="!bg-blue-600 !text-white hover:!bg-blue-700 rounded-md" onClick={() => createProductionFromOrder(order.id)} disabled={convertingOrderId === order.id}>
                          {convertingOrderId === order.id ? 'Hazırlanıyor...' : 'Üretime Al'}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Takip No</div><div className="text-slate-200 font-medium">{order.order_number || '-'}</div></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Cari Adı</div><div className="text-slate-200 font-medium">{order.dealer_name || '-'}</div></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Müşteri Adı</div><div className="text-slate-200 font-medium">{order.customer_name || '-'}</div></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Sipariş Tarihi</div><div className="text-slate-200 font-medium">{formatOrderDateDisplay(order.order_date, (order as any).created_at ?? null)}</div></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Ürün Adı</div><div className="text-slate-200 font-medium">{order.product_name || order.matched_product_name || '-'}</div></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Sipariş Miktarı</div><div className="text-slate-200 font-medium">{order.quantity || '-'} {quantityUnit || 'ADET'}</div></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Konfigürasyon</div><div className="text-slate-200 font-medium">{order.configuration || '-'}</div></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Kasa</div><div className="text-slate-200 font-medium">{caseMatch ? caseMatch[1].trim() : '-'}</div></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Ayak</div><div className="text-slate-200 font-medium">{legMatch ? legMatch[1].trim() : '-'}</div></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Kumaş Kodu</div><div className="text-slate-200 font-medium">{fabricMatch ? fabricMatch[1].trim() : '-'}</div></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Kırlent</div><div className="text-slate-200 font-medium">{cushionMatch ? cushionMatch[1].trim() : '-'}</div></div>
                      <div className="space-y-1"><div className="text-[11px] text-slate-500 font-medium">Durum</div><div><span className="px-2.5 py-1 rounded border bg-amber-900/20 text-amber-400 border-amber-800/50 text-xs font-medium">Beklemede</span></div></div>
                      <div className="col-span-full space-y-1"><div className="text-[11px] text-slate-500 font-medium">Açıklama</div><div className="text-slate-300 bg-slate-800/40 border border-slate-700/50 p-3 rounded-md min-h-[40px] text-sm break-words whitespace-normal leading-relaxed">{cleanedNotes || '-'}</div></div>
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