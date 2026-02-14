'use client'

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Factory, Trash2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { fetchApi } from '@/lib/api/client'
import { type ProductionOrder } from '@/components/production/KanbanBoard'
import { formatOrderDateDisplay } from '@/lib/utils/dateFormat'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import ProductionRealtime from '@/app/_components/production-realtime'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'



export default function ProductionPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [inProgressOrdersCount, setInProgressOrdersCount] = useState(0)
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0)
  const [shippedOrdersCount, setShippedOrdersCount] = useState(0)
  const [convertingOrderId, setConvertingOrderId] = useState<string | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [removingOrderId, setRemovingOrderId] = useState<string | null>(null)
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
      console.error('Error loading production orders:', error)
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
        console.error('Error loading pending orders:', error)
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
      console.error('Error loading order counts by status:', error)
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
      console.error('Error loading orders by status:', error)
      return []
    }
  }, [searchTerm, normalize])

  const [filteredOrdersByStatus, setFilteredOrdersByStatus] = useState<any[]>([])

  const RECENTLY_REMOVED_KEY = 'production_recently_removed'
  const RECENTLY_REMOVED_TTL_MS = 45_000

  function getRecentlyRemovedOrderIds(): Set<string> {
    const set = new Set<string>()
    try {
      const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(RECENTLY_REMOVED_KEY) : null
      if (!raw) return set
      const arr = JSON.parse(raw) as { id: string; ts: number }[]
      const now = Date.now()
      const valid = (arr || []).filter((x) => x?.id && now - (x.ts || 0) < RECENTLY_REMOVED_TTL_MS)
      valid.forEach((x) => set.add(x.id))
      if (valid.length !== (arr?.length ?? 0)) {
        sessionStorage.setItem(RECENTLY_REMOVED_KEY, JSON.stringify(valid))
      }
    } catch {
      // ignore
    }
    return set
  }

  function addRecentlyRemovedOrderId(orderId: string) {
    try {
      const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(RECENTLY_REMOVED_KEY) : null
      const arr: { id: string; ts: number }[] = raw ? JSON.parse(raw) : []
      const now = Date.now()
      const filtered = arr.filter((x) => x?.id && now - (x.ts || 0) < RECENTLY_REMOVED_TTL_MS && x.id !== orderId)
      filtered.push({ id: orderId, ts: now })
      sessionStorage.setItem(RECENTLY_REMOVED_KEY, JSON.stringify(filtered))
    } catch {
      // ignore
    }
  }

  function removeRecentlyRemovedOrderId(orderId: string) {
    try {
      const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(RECENTLY_REMOVED_KEY) : null
      const arr: { id: string; ts: number }[] = raw ? JSON.parse(raw) : []
      const now = Date.now()
      const filtered = arr.filter((x) => x?.id && now - (x.ts || 0) < RECENTLY_REMOVED_TTL_MS && x.id !== orderId)
      sessionStorage.setItem(RECENTLY_REMOVED_KEY, JSON.stringify(filtered))
    } catch {
      // ignore
    }
  }

  // Üretimden çıkarılan siparişler yenilemede/remount'ta tekrar görünmesin
  const recentlyRemovedOrderIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (statusFilter === 'in_progress' || statusFilter === 'completed' || statusFilter === 'shipped' || statusFilter === 'all') {
      loadOrdersByStatus(statusFilter).then((list) => {
        const orders = Array.isArray(list) ? list : []
        // Sadece "Devam Eden" sekmesinde üretimden çıkarılanları gizle; Beklemede'de görünsün
        const filtered =
          statusFilter === 'in_progress'
            ? (() => {
                const fromRef = recentlyRemovedOrderIdsRef.current
                const fromStorage = getRecentlyRemovedOrderIds()
                const removed = new Set([...fromRef, ...fromStorage])
                return orders.filter((o: any) => !removed.has(o.id))
              })()
            : orders
        setFilteredOrdersByStatus(filtered)
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

  const REMOVE_FROM_PRODUCTION_TIMEOUT_MS = 30_000

  const removeFromProduction = useCallback(
    (orderId: string) => {
      if (!confirm('Bu siparişi üretimden çıkarıp tekrar bekleyen siparişlere almak istediğinize emin misiniz? BOM malzemeleri depoya iade edilecek ve üretim emri (URE) iptal sayılacaktır.')) return
      setRemovingOrderId(orderId)
      setFilteredOrdersByStatus((prev) => prev.filter((o: any) => o.id !== orderId))
      setInProgressOrdersCount((n) => Math.max(0, n - 1))
      recentlyRemovedOrderIdsRef.current.add(orderId)
      addRecentlyRemovedOrderId(orderId)
      setTimeout(() => recentlyRemovedOrderIdsRef.current.delete(orderId), RECENTLY_REMOVED_TTL_MS)
      const currentFilter = statusFilter
      const run = () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), REMOVE_FROM_PRODUCTION_TIMEOUT_MS)
        fetchApi<{ message?: string; production_order_number?: string }>('/api/orders/remove-from-production', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
          signal: controller.signal,
        })
          .then((data) => {
            clearTimeout(timeoutId)
        const ure = (data as { production_order_number?: string })?.production_order_number
        const msg = (data as { message?: string })?.message ?? (ure ? `İptal olan URE: ${ure}` : 'Sipariş üretimden çıkarıldı.')
        toast.success(`${msg} Sipariş Beklemede sekmesinde görünecektir.`)
        setRemovingOrderId(null)
        // Yenilemeyi sırayla yap (aynı anda 4 istek ngrok’ta Failed to fetch’e yol açabiliyor)
        const doRefresh = async () => {
          try {
            await Promise.all([loadOrders(), loadOrdersCountsByStatus()])
            await new Promise((r) => setTimeout(r, 400))
            await loadPendingOrders()
            await new Promise((r) => setTimeout(r, 300))
            let url = '/api/orders'
            if (currentFilter === 'in_progress') url = '/api/orders?status=in_production'
            else if (currentFilter === 'completed') url = '/api/orders?status=completed'
            else if (currentFilter === 'shipped') url = '/api/orders?status=shipped'
            else if (currentFilter === 'pending') url = '/api/orders?status=pending'
            const list = await fetchApi(url)
            const ordersList = Array.isArray(list) ? list : []
            const removedSet = new Set([orderId, ...recentlyRemovedOrderIdsRef.current, ...getRecentlyRemovedOrderIds()])
            const filtered =
              currentFilter === 'in_progress'
                ? ordersList.filter((o: any) => !removedSet.has(o.id))
                : ordersList
            startTransition(() => setFilteredOrdersByStatus(filtered))
          } catch {
            // Arka plan yenilemesi hata verdi; iyimser güncelleme korunuyor
          }
        }
        setTimeout(doRefresh, 300)
          })
          .catch((error) => {
            clearTimeout(timeoutId)
            recentlyRemovedOrderIdsRef.current.delete(orderId)
            removeRecentlyRemovedOrderId(orderId)
            loadOrdersByStatus(currentFilter).then((list) => {
              const arr = Array.isArray(list) ? list : []
              setFilteredOrdersByStatus(currentFilter === 'in_progress' ? arr.filter((o: any) => !recentlyRemovedOrderIdsRef.current.has(o.id) && !getRecentlyRemovedOrderIds().has(o.id)) : arr)
            }).catch(() => {})
            const isAbort = error instanceof Error && error.name === 'AbortError'
            const message = isAbort
              ? 'İstek zaman aşımına uğradı. Sunucu yanıt vermedi; sayfayı yenileyip tekrar deneyin.'
              : (error instanceof Error ? error.message : 'Üretimden çıkarılamadı')
            toast.error(message)
          })
          .finally(() => setRemovingOrderId(null))
      }
      // 250ms gecikme: click handler hemen biter; POST ayrı task’te, violation "click took 1.3s" kaybolur
      setTimeout(run, 250)
    },
    [loadOrders, loadPendingOrders, loadOrdersCountsByStatus, loadOrdersByStatus, statusFilter]
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
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <span className="text-xs text-gray-400 font-mono">{order.order_number || '-'}</span>
                        {showActionButton && (
                          isInProductionOrCompleted ? (
                            <Button variant="outline" size="sm" className="!border-amber-600 !text-amber-400 hover:!bg-amber-900/30" onClick={() => removeFromProduction(order.id)} disabled={removingOrderId === order.id}>
                              {removingOrderId === order.id ? 'Çıkarılıyor...' : 'Üretimden Çıkar'}
                            </Button>
                          ) : (
                            <Button variant="solid" color="primary" size="sm" className="!bg-blue-600 !text-white hover:!bg-blue-700" onClick={() => createProductionFromOrder(order.id)} disabled={convertingOrderId === order.id}>
                              {convertingOrderId === order.id ? 'Hazırlanıyor...' : 'Üretime Al'}
                            </Button>
                          )
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><div className="text-xs text-gray-400 mb-1">TAKİP NO</div><div className="text-white text-sm font-mono">{order.order_number || '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">KASA</div><div className="text-white text-sm">{caseMatch ? caseMatch[1].trim() : '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">Durum</div><div><span className={`px-2 py-1 rounded text-xs border ${statusBadge.className}`}>{statusBadge.label}</span></div></div>
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
                        <div className="flex justify-between items-start gap-3 mb-3">
                          <span className="text-xs text-gray-400 font-mono">{order.order_number || '-'}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <span className="text-xs text-gray-400 font-mono">{order.order_number || '-'}</span>
                        <Button variant="outline" size="sm" className="!border-amber-600 !text-amber-400 hover:!bg-amber-900/30" onClick={() => removeFromProduction(order.id)} disabled={removingOrderId === order.id}>
                          {removingOrderId === order.id ? 'Çıkarılıyor...' : 'Üretimden Çıkar'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><div className="text-xs text-gray-400 mb-1">TAKİP NO</div><div className="text-white text-sm font-mono">{order.order_number || '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">KASA</div><div className="text-white text-sm">{caseMatch ? caseMatch[1].trim() : '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">Durum</div><div><span className="px-2 py-1 rounded text-xs border bg-blue-900/30 text-blue-400 border-blue-700">Devam Eden</span></div></div>
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
                      </div>
                    </div>
                  )
                })}
              </div>
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
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <span className="text-xs text-gray-400 font-mono">{order.order_number || '-'}</span>
                        <Button variant="outline" size="sm" className="!border-amber-600 !text-amber-400 hover:!bg-amber-900/30" onClick={() => removeFromProduction(order.id)} disabled={removingOrderId === order.id}>
                          {removingOrderId === order.id ? 'Çıkarılıyor...' : 'Üretimden Çıkar'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><div className="text-xs text-gray-400 mb-1">TAKİP NO</div><div className="text-white text-sm font-mono">{order.order_number || '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">KASA</div><div className="text-white text-sm">{caseMatch ? caseMatch[1].trim() : '-'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-1">Durum</div><div><span className="px-2 py-1 rounded text-xs border bg-green-900/30 text-green-400 border-green-700">Tamamlandı</span></div></div>
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
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : filteredPendingCards.length === 0 ? (
            <div className="text-sm text-gray-500">Bekleyen sipariş yok.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    className="bg-gray-900 rounded-lg border-2 border-gray-600 p-4 max-w-5xl mx-auto"
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
                      {/* Sol Sütun */}
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
                        <div className="text-xs text-gray-400 mb-1">KASA</div>
                        <div className="text-white text-sm">
                          {caseMatch ? caseMatch[1].trim() : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Durum</div>
                        <div>
                          {order.display_status === 'shipped' ? (
                            <span className="px-2 py-1 rounded text-xs border bg-green-900/30 text-green-400 border-green-700">
                              Sevk Edildi
                            </span>
                          ) : (
                            <>
                              <span className="px-2 py-1 rounded text-xs border bg-yellow-900/30 text-yellow-400 border-yellow-700 block mb-2">
                                Beklemede
                              </span>
                              <Button
                                variant="solid"
                                color="error"
                                size="sm"
                                className="!bg-red-600 !text-white hover:!bg-red-700 active:!bg-red-800 w-full"
                                onClick={() => cancelOrder(order.id)}
                                disabled={cancellingOrderId === order.id}
                              >
                                {cancellingOrderId === order.id ? 'İptal...' : 'İptal'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Orta Sol Sütun */}
                      <div>
                        <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                        <div className="text-white text-sm">{order.dealer_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div>
                        <div className="text-white text-sm break-words whitespace-normal">
                          {cleanedNotes || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KUMAŞ KODU</div>
                        <div className="text-white text-sm">
                          {fabricMatch ? fabricMatch[1].trim() : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Üretim Emri</div>
                        <div className="text-white text-sm">-</div>
                      </div>

                      {/* Orta Sağ Sütun */}
                      <div>
                        <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                        <div className="text-white text-sm">
                          {order.product_name || order.matched_product_name || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">SİP MİKTAR</div>
                        <div className="text-white text-sm">
                          {order.quantity || '-'} {quantityUnit || 'ADET'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KONFİGÜRASYON</div>
                        <div className="text-white text-sm">{order.configuration || '-'}</div>
                      </div>

                      {/* Sağ Sütun */}
                      <div>
                        <div className="text-xs text-gray-400 mb-1">SİP TRH</div>
                        <div className="text-white text-sm">
                          {formatOrderDateDisplay(order.order_date, (order as any).created_at ?? null)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                        <div className="text-white text-sm">{order.customer_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">AYAK</div>
                        <div className="text-white text-sm">
                          {legMatch ? legMatch[1].trim() : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KİRLENT</div>
                        <div className="text-white text-sm">
                          {cushionMatch ? cushionMatch[1].trim() : '-'}
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