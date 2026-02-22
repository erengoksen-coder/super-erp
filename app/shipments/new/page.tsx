'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Truck, User, Package, Plus, X, AlertCircle, CheckCircle, QrCode } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { useAuthStore } from '@/lib/store/authStore'

interface Customer {
  id: string
  name: string
  code: string
}

interface ReadyItem {
  product_id: string
  production_order_id: string | null
  production_order_number?: string | null
  product_name: string
  product_sku: string
  total_count: number
  /** Üretim emrindeki toplam barkod sayısı (sevk edilebilir + üretimde); kısmi sevk için required_count */
  total_barcodes_in_po: number
  items: Array<{
    id: string
    barcode: string
    serial_number: string
    production_order_number?: string
  }>
  /** Aynı emirde daha önce sevk edilmiş kartlar */
  already_shipped?: Array<{
    barcode: string
    shipment_date: string
    product_name: string
    product_sku?: string | null
    configuration?: string | null
  }>
}

interface ShipmentItem {
  product_id: string
  production_order_id: string | null
  production_order_number?: string | null
  product_name: string
  product_sku: string
  quantity: number
  barcodes: string[]
  /** Üretim emrindeki toplam barkod sayısı; bu kadar barkod okutulmadan kısmi sevk sayılır */
  required_count: number
}

/** Tekil kart anahtarı (aynı ürün farklı üretim emirlerinde ayrı satır) */
function itemKey(item: { product_id: string; production_order_id?: string | null }) {
  return `${item.product_id}\n${item.production_order_id ?? ''}`
}

export default function NewShipmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([])
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [partialShipmentReason, setPartialShipmentReason] = useState('')
  const user = useAuthStore((state) => state.user)
  const userRole = (user?.role ?? '').toString().trim().toLowerCase()
  const position = (user?.position ?? (user as any)?.job_title ?? '').toString().trim().toLowerCase()
  const isUserAdmin = userRole === 'admin' || userRole === 'manager' || userRole === 'yönetici' || userRole === 'yonetici'
  const canScanBarcode = isUserAdmin || position === 'sevkiyat'

  useEffect(() => {
    // URL parametresinden customerId'yi oku (barcode otomatik işlenmez)
    const customerIdFromUrl = searchParams.get('customerId')
    
    if (customerIdFromUrl) {
      setSelectedCustomerId(customerIdFromUrl)
    }
    
    // Barcode otomatik okunmaz - kullanıcı elle veya cihazla okutmalı
  }, [searchParams])

  useEffect(() => {
    if (!selectedCustomerId) {
      setReadyItems([])
      setShipmentItems([])
    }
  }, [selectedCustomerId])

  const { data: customersData } = useApi<Customer[]>('/api/accounts?type=customer&limit=500')

  useEffect(() => {
    setCustomers(customersData ?? [])
  }, [customersData])

  const readyItemsKey = useMemo(() => {
    return selectedCustomerId
      ? `/api/shipments/ready-items?customer_id=${selectedCustomerId}`
      : null
  }, [selectedCustomerId])

  const { data: readyItemsData, isLoading } = useApi<{ items: ReadyItem[] }>(readyItemsKey)
  type PendingScan = { barcode: string; product_id: string; production_order_id: string | null }
  const pendingScansRef = useRef<PendingScan[]>([])
  const [barcodeFirstInput, setBarcodeFirstInput] = useState('')

  const readyBarcodeIndex = useMemo(() => {
    const map = new Map<string, { product_id: string; production_order_id: string | null; product_name: string }>()
    readyItems.forEach((item) => {
      item.items.forEach((barcodeItem) => {
        map.set(barcodeItem.barcode, {
          product_id: item.product_id,
          production_order_id: item.production_order_id ?? null,
          product_name: item.product_name,
        })
      })
    })
    return map
  }, [readyItems])

  useEffect(() => {
    if (!readyItemsData?.items) return
    setReadyItems(readyItemsData.items)
    const initialItems: ShipmentItem[] = readyItemsData.items.map((item) => ({
      product_id: item.product_id,
      production_order_id: item.production_order_id ?? null,
      production_order_number: item.production_order_number ?? undefined,
      product_name: item.product_name,
      product_sku: item.product_sku,
      quantity: item.total_count,
      barcodes: [],
      required_count: item.total_barcodes_in_po ?? item.total_count,
    }))
    const pending = pendingScansRef.current.splice(0, pendingScansRef.current.length)
    const withPending = initialItems.map((it) => {
      const toAdd = pending.filter(
        (p) => p.product_id === it.product_id && (p.production_order_id ?? '') === (it.production_order_id ?? '')
      )
      const barcodes = toAdd.map((p) => p.barcode).filter((b) => b)
      return { ...it, barcodes }
    })
    setShipmentItems(withPending)
    setError('')
  }, [readyItemsData])

  useEffect(() => {
    const onScan = (event: Event) => {
      const detail = (event as CustomEvent).detail as { barcode?: string }
      const barcode = detail?.barcode
      if (!barcode) return
      handleGlobalScan(barcode)
    }

    window.addEventListener('barcode:scanned', onScan as EventListener)
    return () => window.removeEventListener('barcode:scanned', onScan as EventListener)
  }, [selectedCustomerId, shipmentItems])

  async function handleGlobalScan(barcode: string): Promise<void> {
    if (!barcode) return
    try {
      const response = await fetch(`/api/shipments/ready-items?barcode=${encodeURIComponent(barcode)}`)
      if (!response.ok) {
        // Sevke hazır değilse ürün durumunu göster
        try {
          const fallback = await fetch(`/api/barcodes?barcode=${encodeURIComponent(barcode)}`)
          if (fallback.ok) {
            const items = await fallback.json()
            const info = Array.isArray(items) && items.length > 0 ? items[0] : null
            if (info) {
              // Sevk edilmiş ürün kontrolü
              if (info.shipment_id || info.shipment_date) {
                setError(`Bu barkod zaten sevk edilmiş. Sevk numarası: ${info.shipment_number || 'Bilinmiyor'}`)
                return
              }
              const stage = info.status === 'in_stock' ? 'Depoda' : (info.status || 'Bilinmiyor')
              setError(`Bu barkod sevke hazır değil. Aşama: ${stage}`)
              return
            }
          }
        } catch {
          // ignore
        }
        return
      }
      const payload = await response.json()
      const data = payload?.data ?? payload
      const item = data?.item
      const suggestedCustomerId = data?.suggested_customer_id ?? item?.customer_id ?? (item as { customer_id?: string })?.customer_id
      if (!item?.product_id) return

      if (!selectedCustomerId && suggestedCustomerId) {
        setSelectedCustomerId(suggestedCustomerId)
        pendingScansRef.current.push({
          barcode,
          product_id: item.product_id,
          production_order_id: item.production_order_id ?? null,
        })
        setError('')
        toast.success('Müşteri otomatik seçildi. Barkod sevkiyata eklenecek.')
        return
      }
      if (selectedCustomerId && suggestedCustomerId && suggestedCustomerId !== selectedCustomerId) {
        setError('Bu barkod seçili müşteriye ait değil. Siparişteki carie sevk edilecek.')
        return
      }

      if (!shipmentItems.length) {
        pendingScansRef.current.push({
          barcode,
          product_id: item.product_id,
          production_order_id: item.production_order_id ?? null,
        })
        return
      }

      setError('')
      handleBarcodeInput(item.product_id, item.production_order_id ?? null, barcode)
    } catch (e) {
      // ignore
    }
  }

  function handleBarcodeInput(productId: string, productionOrderId: string | null, barcode: string) {
    if (!barcode.trim()) return
    const cleaned = barcode.trim()
    const indexed = readyBarcodeIndex.get(cleaned)
    if (!indexed) {
      setError(`Bu barkod sevke hazır değil veya bulunamadı: ${cleaned}`)
      return
    }
    if (indexed.product_id !== productId || (indexed.production_order_id ?? '') !== (productionOrderId ?? '')) {
      setError(`Barkod farklı ürüne/emre ait: ${indexed.product_name}`)
      return
    }

    setShipmentItems(items => items.map(item => {
      if (item.product_id === productId && (item.production_order_id ?? '') === (productionOrderId ?? '')) {
        if (item.barcodes.includes(cleaned)) {
          setError(`Bu barkod zaten eklendi: ${cleaned}`)
          return item
        }
        setError('')
        return { ...item, barcodes: [...item.barcodes, cleaned] }
      }
      return item
    }))
  }

  function removeBarcode(productId: string, productionOrderId: string | null, barcode: string) {
    setShipmentItems(items => items.map(item => {
      if (item.product_id === productId && (item.production_order_id ?? '') === (productionOrderId ?? '')) {
        return { ...item, barcodes: item.barcodes.filter(b => b !== barcode) }
      }
      return item
    }))
  }

  const isPartialShipment = useMemo(() => {
    return shipmentItems.some(
      (item) => item.barcodes.length > 0 && item.barcodes.length < item.required_count
    )
  }, [shipmentItems])

  function validateShipment(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!selectedCustomerId) {
      errors.push('⚠️ Müşteri seçimi zorunludur!')
    }

    // Barkod kontrolü: En az bir barkod okutulmuş olmalı
    const totalBarcodes = shipmentItems.reduce((sum, item) => sum + item.barcodes.length, 0)
    if (totalBarcodes === 0) {
      errors.push('⚠️ Sevk fişi kesmek için en az bir barkod okutmanız gerekmektedir!')
    }

    // Kısmi sevk: Barkod okutulsa bile diğer kartlar neden sevk edilmiyor açıklaması zorunlu
    if (isPartialShipment && !(partialShipmentReason || '').trim()) {
      errors.push(
        '⚠️ Sevk edilebilir ürün barkodu okutulmuş olsa bile, diğer barkodlar neden sevk edilmiyor açıklaması yazılmadan sevkiyat oluşturulamaz. Aşağıdaki "Diğer barkodlar neden sevk edilmiyor?" alanını doldurun (örn: Diğer 2 kart üretimde, sevk edilemez).'
      )
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async function handleCreateShipment() {
    const validation = validateShipment()
    
    if (!validation.valid) {
      setError(validation.errors.join('\n'))
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Sevkiyat kalemlerini hazırla (sadece en az bir barkodu olan kalemler)
      const items = shipmentItems
        .filter((item) => item.barcodes.length > 0)
        .map((item) => ({
          product_id: item.product_id,
          quantity: item.barcodes.length,
          barcodes: item.barcodes,
          notes: `${item.product_name} - ${item.barcodes.length} adet`,
        }))

      // Ürün fiyatlarını hesapla - Tüm ürünleri tek seferde al
      let totalAmount = 0
      try {
        const allProducts = await fetchApi<any[]>('/api/products')
        for (const item of shipmentItems) {
          const product = allProducts.find((p) => p.id === item.product_id)
          if (product && product.selling_price) {
            totalAmount += product.selling_price * item.barcodes.length
          }
        }
      } catch (e) {
        console.warn('Ürün fiyatları alınamadı:', e)
      }

      const shipmentData = await fetchApi<any>('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          shipment_date: today,
          items,
          total_amount: totalAmount,
          tax_rate: 0, // KDV varsayılan 0, cari hesap sayfasında düzenlenebilir
          notes: 'Mamül depodan sevk edildi',
          ...(isPartialShipment && (partialShipmentReason || '').trim()
            ? { partial_shipment_reason: partialShipmentReason.trim() }
            : {}),
        }),
      })
      // API response'u shipment objesi olarak dönüyor
      const shipmentId = shipmentData.id || shipmentData.shipment?.id
      if (!shipmentId) {
        console.error('Sevkiyat verisi:', shipmentData)
        throw new Error('Sevkiyat oluşturuldu ancak ID alınamadı')
      }
      toast.success('Sevkiyat oluşturuldu!')
      // Sevkiyat listesine geri dön
      router.push('/shipments')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center space-x-2">
              <Truck className="w-6 h-6 md:w-8 md:h-8" />
              <span>Yeni Sevkiyat</span>
            </h1>
            <p className="text-sm text-gray-400">Sevk edilebilir ürünlerden sevkiyat oluşturun</p>
          </div>
          {canScanBarcode && (
            <Link
              href="/barcodes/scan"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-600 text-white px-3 py-2 rounded-lg hover:bg-amber-700 transition inline-flex items-center space-x-2 text-sm touch-manipulation shrink-0"
              title="Telefondan veya bu cihazdan üretim barkodlarını okutun"
            >
              <QrCode size={20} />
              <span>Telefondan Barkod Okut</span>
            </Link>
          )}
        </div>

        {/* Barkod ile başla: Müşteri seçmeden barkod okutunca müşteri otomatik seçilir */}
        {!selectedCustomerId && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 md:p-6 mb-6">
            <label className="block text-sm font-medium text-blue-200 mb-2">
              <Package className="w-4 h-4 inline mr-1" />
              Önce barkod okutun — müşteri otomatik seçilir
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Barkod okuttuğunuzda ürünün kayıtlı olduğu müşteri otomatik seçilir; müşteri seçmeye gerek kalmaz.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcodeFirstInput}
                onChange={(e) => setBarcodeFirstInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const v = barcodeFirstInput.trim()
                    if (v) handleGlobalScan(v).then(() => setBarcodeFirstInput(''))
                  }
                }}
                placeholder="Barkod okutun veya yazın"
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={async () => {
                  const v = barcodeFirstInput.trim()
                  if (v) {
                    await handleGlobalScan(v)
                    setBarcodeFirstInput('')
                  }
                }}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Müşteri Seçimi - Sadece Admin/Yönetici için */}
        {isUserAdmin ? (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Müşteri * {!selectedCustomerId && <span className="text-gray-500 font-normal">(veya yukarıdan barkod okutun)</span>}
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Müşteri seçin...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.code} - {customer.name}
                </option>
              ))}
            </select>
          </div>
        ) : selectedCustomerId ? (
          // Normal kullanıcı için müşteri bilgisi göster (değiştirilemez)
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Müşteri
            </label>
            <div className="px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg">
              {customers.find(c => c.id === selectedCustomerId)?.name || 
               customers.find(c => c.id === selectedCustomerId)?.code || 
               'Müşteri yükleniyor...'}
            </div>
          </div>
        ) : null}

        {/* Hata Mesajı */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-300 font-semibold mb-2">Hata</h3>
                <div className="text-white text-sm whitespace-pre-line">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Sevk Edilebilir Ürünler */}
        {selectedCustomerId && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-400">Yükleniyor...</p>
              </div>
            ) : shipmentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <LogoWithBackground size="lg" className="mb-6" />
                <h3 className="text-lg font-semibold text-white mb-2">Sevk Edilebilir Ürün Yok</h3>
                <p className="text-sm text-gray-400">Bu müşteri için sevk edilebilir ürün bulunmuyor.</p>
              </div>
            ) : (
              <>
                {shipmentItems.map((item) => {
                  const isComplete = item.barcodes.length >= item.required_count
                  const missing = item.required_count - item.barcodes.length

                  return (
                    <div
                      key={itemKey(item)}
                      className={`bg-gray-900 rounded-lg border ${
                        isComplete ? 'border-green-700' : 'border-red-700'
                      } p-4 md:p-6`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {item.production_order_number ? `${item.production_order_number} – ` : ''}{item.product_name}
                          </h3>
                          <p className="text-sm text-gray-400">SKU: {item.product_sku}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400 mb-1">Üretim emri: {item.required_count} barkod</div>
                          <div className={`text-sm font-semibold ${
                            isComplete ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            Sevk edilen: {item.barcodes.length} / {item.required_count} Barkod
                          </div>
                        </div>
                      </div>

                      {/* Mevcut Barkodlar Listesi */}
                      {readyItems.find(ri => itemKey(ri) === itemKey(item)) && (
                        <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <div className="text-sm font-medium text-gray-300 mb-2">
                            Mevcut Barkodlar (mamül depo, {readyItems.find(ri => itemKey(ri) === itemKey(item))?.items.length || 0} adet):
                          </div>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {readyItems.find(ri => itemKey(ri) === itemKey(item))?.items.map((barcodeItem) => {
                              const isAdded = item.barcodes.includes(barcodeItem.barcode)
                              return (
                                <button
                                  key={barcodeItem.id}
                                  type="button"
                                  onClick={() => {
                                    if (!isAdded) {
                                      handleBarcodeInput(item.product_id, item.production_order_id ?? null, barcodeItem.barcode)
                                    } else {
                                      removeBarcode(item.product_id, item.production_order_id ?? null, barcodeItem.barcode)
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                                    isAdded
                                      ? 'bg-green-600 text-white hover:bg-green-700'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  }`}
                                  title={isAdded ? 'Kaldırmak için tıklayın' : 'Eklemek için tıklayın'}
                                >
                                  {barcodeItem.barcode}
                                  {isAdded && ' ✓'}
                                </button>
                              )
                            })}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            💡 Barkodlara tıklayarak ekleyebilir veya elle yazabilirsiniz
                          </p>
                        </div>
                      )}

                      {/* Bu emirde daha önce sevk edilmiş kartlar: sevk tarihi, barkod, ürün adı, konfigürasyon */}
                      {(() => {
                        const ri = readyItems.find(r => itemKey(r) === itemKey(item))
                        const shipped = ri?.already_shipped
                        if (!shipped || shipped.length === 0) return null
                        return (
                          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                            <div className="text-sm font-medium text-gray-400 mb-2">
                              Bu emirle ilişkili kartlar – daha önce sevk edildi
                            </div>
                            <ul className="space-y-2 text-sm">
                              {shipped.map((s, idx) => (
                                <li key={idx} className="text-gray-300">
                                  <span className="font-semibold text-amber-400">
                                    {new Date(s.shipment_date).toLocaleDateString('tr-TR')}
                                  </span>
                                  {' tarihinde sevk edildi — '}
                                  <span className="font-mono text-white">Barkod: {s.barcode}</span>
                                  {' · '}
                                  <span className="text-white">{s.product_name}</span>
                                  {s.product_sku && <span className="text-gray-400"> ({s.product_sku})</span>}
                                  {s.configuration && s.configuration.trim() && (
                                    <span className="text-gray-400"> · Konfigürasyon: {s.configuration.trim()}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      })()}

                      {/* Barkod Girişi */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Barkod Girişi *
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Barkod okutun veya yazın"
                            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleBarcodeInput(item.product_id, item.production_order_id ?? null, e.currentTarget.value)
                                e.currentTarget.value = ''
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement
                              if (input.value) {
                                handleBarcodeInput(item.product_id, item.production_order_id ?? null, input.value)
                                input.value = ''
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Girilen Barkodlar */}
                      {item.barcodes.length > 0 && (
                        <div className="mb-4">
                          <div className="text-sm text-gray-300 mb-2">Girilen Barkodlar:</div>
                          <div className="flex flex-wrap gap-2">
                            {item.barcodes.map((barcode) => (
                              <div
                                key={barcode}
                                className="inline-flex items-center space-x-2 px-3 py-1 bg-gray-800 rounded-lg border border-gray-700"
                              >
                                <span className="text-white text-sm font-mono">{barcode}</span>
                                <button
                                  onClick={() => removeBarcode(item.product_id, item.production_order_id ?? null, barcode)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Durum - Kısmi sevk: Sipariş adedi görünsün, barkod okutulsa bile açıklama olmadan sevke izin yok */}
                      {!isComplete && (
                        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-3">
                          <div className="flex items-start space-x-2 text-amber-200 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold mb-1">Kısmi sevk – açıklama zorunlu</div>
                              <div>
                                Sipariş toplam <strong>{item.required_count} adet</strong>, sevk edilen <strong>{item.barcodes.length} adet</strong>. Diğer <strong>{missing} barkod</strong> neden sevk edilmiyor? (Örn: Bu {missing} kart üretimde, sevk edilemez.) Aşağıdaki alanı doldurmadan sevkiyat oluşturulamaz.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isComplete && (
                        <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                          <div className="flex items-center space-x-2 text-green-300 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>Tüm barkodlar girildi. Sevkiyat için hazır.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Kısmi sevk açıklaması: Sipariş kaç adetse görünür; barkod okutulsa bile bu alan doldurulmadan sevke izin verilmez, açıklama sevk fişinde görünür */}
                {isPartialShipment && (
                  <div className="mt-6 w-full bg-amber-900/20 border border-amber-700 rounded-lg p-4">
                    <label className="block text-sm font-medium text-amber-200 mb-2">
                      Diğer barkodlar neden sevk edilmiyor? (zorunlu) *
                    </label>
                    <p className="text-xs text-amber-200/80 mb-2">
                      Sevk edilebilir ürünün barkodu okutulsa bile, eksik kalan kartlar için açıklama yazılmadan sevkiyat oluşturulamaz. Bu açıklama sevk fişinde görünecektir.
                    </p>
                    <textarea
                      value={partialShipmentReason}
                      onChange={(e) => setPartialShipmentReason(e.target.value)}
                      placeholder="Örn: Diğer 2 kart üretimde olduğu için sevk edilemez."
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-gray-500"
                    />
                  </div>
                )}

                {/* Oluştur Butonu */}
                <div className="flex flex-col items-end space-y-3 mt-6">
                  {!validateShipment().valid && (
                    <div className="w-full bg-red-900/30 border border-red-700 rounded-lg p-3">
                      <div className="flex items-start space-x-2 text-red-300 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold mb-1">⚠️ Eksik bilgi</div>
                          <div className="text-xs text-red-400 whitespace-pre-line">{validateShipment().errors.join('\n')}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => router.push('/shipments')}
                      className="px-6 py-3 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleCreateShipment}
                      disabled={isSubmitting || isLoading || !validateShipment().valid}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      title={!validateShipment().valid ? 'Lütfen zorunlu alanları doldurun (barkod ve gerekirse kısmi sevk açıklaması)' : ''}
                    >
                      <Truck className="w-5 h-5" />
                      <span>{isSubmitting ? 'Oluşturuluyor...' : 'Sevkiyat Oluştur'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

