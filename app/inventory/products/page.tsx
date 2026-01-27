'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Package, AlertTriangle, ArrowUp, ArrowDown, Edit, Trash2, Save, X, History as HistoryIcon, Clock, Printer, Truck, User } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'
import { getUserRole, isAdmin } from '@/lib/auth'
import { fetchApi } from '@/lib/api/client'
// localDB'yi dinamik import et
const getLocalDB = async () => {
  const { localDB } = await import('@/lib/database/client')
  return localDB
}

interface ProductStock {
  id: string
  name: string
  sku: string
  stock_amount: number
  min_stock_level: number
}

interface BarcodeItem {
  id: string
  barcode: string
  serial_number: string
  product_id: string
  product_name: string
  sku: string
  status: string
  created_at: string
  production_order_number?: string | null
  production_order_created_at?: string | null
  dealer_name?: string | null
  customer_name?: string | null
  customer_order_number?: string | null
  order_date?: string | null
  configuration?: string | null
  notes?: string | null
}

export default function ProductsInventoryPage() {
  const [barcodes, setBarcodes] = useState<BarcodeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showStockIn, setShowStockIn] = useState(false)
  const [showStockOut, setShowStockOut] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [stockInQuantity, setStockInQuantity] = useState<number>(0)
  const [stockOutQuantity, setStockOutQuantity] = useState<number>(0)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<ProductStock[]>([])
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<string | null>(null)
  const [movementHistory, setMovementHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showPrintLabelModal, setShowPrintLabelModal] = useState(false)
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<ProductStock | null>(null)
  const [labelQuantity, setLabelQuantity] = useState<number>(1)
  const [showNewProductModal, setShowNewProductModal] = useState(false)
  const [newProductType, setNewProductType] = useState<'in' | 'out' | null>(null)
  const [showShipmentModal, setShowShipmentModal] = useState(false)
  const [selectedBarcodeForShipment, setSelectedBarcodeForShipment] = useState<BarcodeItem | null>(null)
  const [shipmentCustomerId, setShipmentCustomerId] = useState<string>('')
  const [showCustomerSelectInModal, setShowCustomerSelectInModal] = useState(false)
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    loadBarcodes()
    loadProducts()
    loadCustomers()
    if (typeof window !== 'undefined') {
      setUserRole(getUserRole())
    }
  }, [])

  async function findCustomerId(customerName: string | null | undefined): Promise<string | null> {
    if (!customerName) return null
    const customer = customers.find(c => c.name === customerName)
    return customer?.id || null
  }

  async function handleShipmentClick(barcode: BarcodeItem) {
    const customerName = barcode.dealer_name || barcode.customer_name
    const isUserAdmin = userRole === 'admin' || userRole === 'manager'
    
    if (!customerName) {
      // Müşteri bilgisi yok, sevkiyat sayfasına cari seçme modunda git
      router.push(`/shipments/new?barcode=${barcode.barcode}`)
      return
    }

    if (!isUserAdmin) {
      // Normal kullanıcı: Karttaki müşteriye direkt sevk et (sevkiyat sayfasına git, müşteri seçimi olmadan)
      const customerId = await findCustomerId(customerName)
      if (customerId) {
        // Sevkiyat sayfasına git, müşteri ID ile (müşteri seçimi ekranı çıkmayacak)
        router.push(`/shipments/new?customerId=${customerId}&barcode=${barcode.barcode}`)
      } else {
        alert('Müşteri bulunamadı. Lütfen yöneticiye başvurun.')
      }
      return
    }

    // Admin/yönetici, onay modalı göster (müşteri seçimi yapılabilir)
    setSelectedBarcodeForShipment(barcode)
    setShowShipmentModal(true)
  }

  async function handleShipmentConfirm(useBarcodeCustomer: boolean) {
    if (!selectedBarcodeForShipment) return

    if (!useBarcodeCustomer) {
      // Hayır dedi, modal içinde cari seçim göster
      setShowCustomerSelectInModal(true)
      return
    }

    // Evet dedi, karttaki cariye sevk edilebilir olarak işaretle
    try {
      const customerName = selectedBarcodeForShipment.dealer_name || selectedBarcodeForShipment.customer_name
      const customerId = await findCustomerId(customerName)

      // Ürünü sevk edilebilir olarak işaretle
      const readyResponse = await fetch('/api/shipments/ready-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: selectedBarcodeForShipment.barcode,
          customer_id: customerId,
          ready: true
        })
      })

      if (!readyResponse.ok) {
        const error = await readyResponse.json()
        throw new Error(error.error || 'Ürün sevk edilebilir olarak işaretlenemedi')
      }

      // Başarılı mesajı göster
      alert('✅ Ürün sevk edilebilir olarak işaretlendi!')
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setShowShipmentModal(false)
      setSelectedBarcodeForShipment(null)
      setShowCustomerSelectInModal(false)
    }
  }

  async function handleShipmentWithSelectedCustomer() {
    if (!selectedBarcodeForShipment || !shipmentCustomerId) {
      alert('Lütfen bir cari seçin')
      return
    }

    try {
      // Ürünü sevk edilebilir olarak işaretle
      const readyResponse = await fetch('/api/shipments/ready-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: selectedBarcodeForShipment.barcode,
          customer_id: shipmentCustomerId,
          ready: true
        })
      })

      if (!readyResponse.ok) {
        const error = await readyResponse.json()
        throw new Error(error.error || 'Ürün sevk edilebilir olarak işaretlenemedi')
      }

      // Başarılı mesajı göster
      alert('✅ Ürün sevk edilebilir olarak işaretlendi!')
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setShowShipmentModal(false)
      setSelectedBarcodeForShipment(null)
      setShowCustomerSelectInModal(false)
      setShipmentCustomerId('')
      // Ürün listesini yenile
      loadBarcodes()
    }
  }

  async function loadCustomers() {
    try {
      const data = await fetchApi('/api/accounts?type=customer')
      setCustomers(data)
    } catch (error) {
      console.error('Müşteriler yüklenirken hata:', error)
    }
  }

  async function loadBarcodes() {
    try {
      setLoading(true)
      // Tüm barkodları al
      const data = await fetchApi<any[]>('/api/barcodes')
      const availableBarcodes = data.filter((b) => {
        if (b.production_order_status && b.production_order_status !== 'completed') {
          return false
        }
        return b.status === 'available' || b.status === 'in_stock' || (!b.status || b.status === null) || b.status === ''
      })
      setBarcodes(availableBarcodes)
    } catch (error) {
      console.error('Barkodlar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadProducts() {
    try {
      const db = await getLocalDB()
      const data = await db.getProducts()
      // Ürün stoklarını al
      setProducts(data.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock_amount: p.stock_amount || 0,
        min_stock_level: p.min_stock_level || 5,
      })))
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error)
    }
  }

  async function handleStockIn() {
    if (!selectedProduct || stockInQuantity <= 0) {
      alert('Lütfen ürün ve miktar seçin')
      return
    }

    try {
      const response = await fetch('/api/products/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct,
          quantity: stockInQuantity,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Stok girişi yapılamadı')
      }

      alert('✅ Mamül stok girişi başarıyla yapıldı!')
      setShowStockIn(false)
      setStockInQuantity(0)
      setSelectedProduct('')
      loadProducts()
      loadBarcodes()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  async function handleStockOut() {
    if (!selectedProduct || stockOutQuantity <= 0) {
      alert('Lütfen ürün ve miktar seçin')
      return
    }

    if (!selectedCustomerId) {
      alert('⚠️ Müşteri seçimi zorunludur! Lütfen bir müşteri seçin.')
      return
    }

    try {
      const response = await fetch('/api/products/stock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct,
          quantity: stockOutQuantity,
          customer_id: selectedCustomerId,
          notes: 'Mamül depo çıkışı',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Stok çıkışı yapılamadı')
      }

      const result = await response.json()
      alert(`✅ Mamül stok çıkışı başarıyla yapıldı! Yeni stok: ${result.new_stock} adet`)
      setShowStockOut(false)
      setStockOutQuantity(0)
      setSelectedProduct('')
      loadProducts()
      loadBarcodes()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  function isLowStock(product: ProductStock): boolean {
    return product.stock_amount <= product.min_stock_level
  }

  function startEdit(product: ProductStock) {
    setEditingProduct(product.id)
    setEditForm({
      stock_amount: product.stock_amount,
      min_stock_level: product.min_stock_level,
    })
  }

  function cancelEdit() {
    setEditingProduct(null)
    setEditForm({ stock_amount: 0, min_stock_level: 0 })
  }

  async function saveEdit(productId: string) {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ürün güncellenemedi')
      }

      alert('✅ Ürün başarıyla güncellendi!')
      setEditingProduct(null)
      loadProducts()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  async function deleteProduct(productId: string, productName: string) {
    if (!confirm(`"${productName}" ürününü silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ürün silinemedi')
      }

      alert('✅ Ürün başarıyla silindi!')
      loadProducts()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  async function loadMovementHistory(productId: string) {
    if (!productId) {
      alert('Ürün ID bulunamadı')
      return
    }
    
    setLoadingHistory(true)
    setSelectedProductForHistory(productId)
    try {
      const response = await fetch(`/api/products/${productId}/movements`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }))
        throw new Error(errorData.error || 'Hareket geçmişi yüklenemedi')
      }
      const data = await response.json()
      setMovementHistory(data.movements || [])
    } catch (error: any) {
      console.error('Hareket geçmişi yükleme hatası:', error)
      alert('Hata: ' + error.message)
      setMovementHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
        <div>
          <div className="flex items-center space-x-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Mamül Depo</h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-sm md:text-base text-gray-400 mt-1">Bitmiş ürün stokları ve giriş işlemleri</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowNewProductModal(true)}
            className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation"
          >
            <Plus size={20} />
            <span>Yeni Ürün</span>
          </button>
        </div>
      </div>


      {/* Mamül Depo Barkodları - Kart Görünümü */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Mamül Depo Barkodları ({barcodes.length})</h2>
          {/* Ürün bazında stok sayıları - Profesyonel görünüm */}
          {(() => {
            // Ürün bazında barkod sayısını hesapla
            const productCounts: Record<string, { name: string; count: number; sku: string }> = {}
            barcodes.forEach(barcode => {
              if (!productCounts[barcode.product_id]) {
                productCounts[barcode.product_id] = {
                  name: barcode.product_name,
                  count: 0,
                  sku: barcode.sku
                }
              }
              productCounts[barcode.product_id].count++
            })
            const productEntries = Object.entries(productCounts)
            
            if (productEntries.length > 0) {
              return (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Package className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Ürün Stok Özeti</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {productEntries.map(([productId, data]) => (
                      <div 
                        key={productId} 
                        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-600 p-4 hover:border-blue-500 transition-all shadow-lg hover:shadow-blue-500/20"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-400 font-medium mb-1 truncate" title={data.sku}>
                              {data.sku}
                            </div>
                            <div className="text-sm font-bold text-white truncate" title={data.name}>
                              {data.name}
                            </div>
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            <div className="bg-blue-600/20 border border-blue-500/50 rounded-full px-3 py-1">
                              <span className="text-lg font-black text-blue-300">{data.count}</span>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Stok Miktarı</span>
                            <span className="text-xs font-semibold text-gray-300">{data.count} adet</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return null
          })()}
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-400">Yükleniyor...</p>
          </div>
        ) : barcodes.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>Mamül depoda barkod bulunmuyor</p>
          </div>
        ) : (
          <div className="space-y-4">
            {barcodes.map((barcode) => {
              // Üretim emri tarihini göster (order_date varsa onu, yoksa production_order_created_at, yoksa created_at)
              const productionDate = barcode.order_date || barcode.production_order_created_at || barcode.created_at
              const displayDate = productionDate 
                ? (() => {
                    try {
                      const dateStr = String(productionDate).trim()
                      let date: Date
                      
                      if (dateStr.includes('-')) {
                        if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                          date = new Date(dateStr)
                        } else {
                          const parts = dateStr.split('-')
                          if (parts.length === 3 && parts[0].length <= 2) {
                            date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
                          } else {
                            date = new Date(dateStr)
                          }
                        }
                      } else if (dateStr.includes('.') || dateStr.includes('/')) {
                        const parts = dateStr.split(/[./]/)
                        if (parts.length === 3) {
                          date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
                        } else {
                          date = new Date(dateStr)
                        }
                      } else {
                        date = new Date(dateStr)
                      }
                      
                      if (isNaN(date.getTime())) {
                        return dateStr
                      }
                      
                      const day = date.getDate().toString().padStart(2, '0')
                      const month = (date.getMonth() + 1).toString().padStart(2, '0')
                      const year = date.getFullYear()
                      return `${day}.${month}.${year}`
                    } catch (e) {
                      return String(productionDate)
                    }
                  })()
                : '-'
              
              return (
                <div 
                  key={barcode.id} 
                  className="bg-gray-900 rounded-lg border-2 border-gray-600 p-4 hover:bg-gray-800/30"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">BARKOD</div>
                      <div className="text-white text-sm font-mono">{barcode.barcode}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">SERİ NO</div>
                      <div className="text-white text-sm font-mono">{barcode.serial_number}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                      <div className="text-white text-sm">{barcode.product_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">SKU</div>
                      <div className="text-white text-sm">{barcode.sku}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">ÜRETİM TARİHİ</div>
                      <div className="text-white text-sm">{displayDate}</div>
                    </div>
                    {barcode.production_order_number && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">ÜRETİM EMRİ</div>
                        <div className="text-white text-sm font-mono">{barcode.production_order_number}</div>
                      </div>
                    )}
                    {barcode.dealer_name && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                        <div className="text-white text-sm">{barcode.dealer_name}</div>
                      </div>
                    )}
                    {barcode.customer_name && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                        <div className="text-white text-sm">{barcode.customer_name}</div>
                      </div>
                    )}
                    {barcode.customer_order_number && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">SİPARİŞ NO</div>
                        <div className="text-white text-sm font-mono">{barcode.customer_order_number}</div>
                      </div>
                    )}
                    {barcode.configuration && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">PARÇA</div>
                        <div className="text-white text-sm">{barcode.configuration}</div>
                      </div>
                    )}
                    {barcode.notes && (
                      <>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">KUMAŞ KODU</div>
                          <div className="text-white text-sm">
                            {(() => {
                              const fabricMatch = barcode.notes.match(/Kumaş:\s*([^|]+)/i)
                              return fabricMatch ? fabricMatch[1].trim() : '-'
                            })()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">KASA</div>
                          <div className="text-white text-sm">
                            {(() => {
                              const caseMatch = barcode.notes.match(/Kasa:\s*([^|]+)/i)
                              return caseMatch ? caseMatch[1].trim() : '-'
                            })()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">AYAK</div>
                          <div className="text-white text-sm">
                            {(() => {
                              const legMatch = barcode.notes.match(/Ayak:\s*([^|]+)/i)
                              return legMatch ? legMatch[1].trim() : '-'
                            })()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div>
                          <div className="text-white text-sm break-words whitespace-normal">
                            {(() => {
                              let desc = barcode.notes
                                .replace(/Kumaş:\s*[^|]+/gi, '')
                                .replace(/Kasa:\s*[^|]+/gi, '')
                                .replace(/Ayak:\s*[^|]+/gi, '')
                                .replace(/Birim:\s*[^|]+/gi, '')
                                .replace(/\|\s*\|\s*/g, '|')
                                .replace(/^\|\s*|\s*\|$/g, '')
                                .trim()
                              return desc || '-'
                            })()}
                          </div>
                        </div>
                      </>
                    )}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Durum</div>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs border ${
                          barcode.status === 'available' || barcode.status === 'in_stock' || !barcode.status 
                            ? 'bg-green-900/50 text-green-300 border-green-700' 
                            : barcode.status === 'sold'
                            ? 'bg-red-900/50 text-red-300 border-red-700'
                            : barcode.status === 'shipped'
                            ? 'bg-blue-900/50 text-blue-300 border-blue-700'
                            : 'bg-yellow-900/50 text-yellow-300 border-yellow-700'
                        }`}>
                          {barcode.status === 'available' || barcode.status === 'in_stock' || !barcode.status ? 'Depoda' : 
                           barcode.status === 'sold' ? 'Satıldı' : 
                           barcode.status === 'shipped' ? 'Sevk Edildi' :
                           barcode.status === 'ready_for_shipment' ? 'Sevk Edilebilir' :
                           barcode.status === 'in_production' ? 'Üretimde' : 
                           barcode.status || 'Depoda'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">İşlemler</div>
                      <div className="flex items-center space-x-1">
                        <Link
                          href={`/inventory/products/print-barcode-label?barcodeId=${barcode.barcode}`}
                          target="_blank"
                          className="inline-flex items-center space-x-1 px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition text-xs"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Etiket Yazdır</span>
                        </Link>
                        <button
                          onClick={() => handleShipmentClick(barcode)}
                          className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Sevk Et</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Hareket Geçmişi Modal */}
      {selectedProductForHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <HistoryIcon className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">
                  Stok Hareket Geçmişi
                </h2>
                <span className="text-sm text-gray-400">
                  {products.find(p => p.id === selectedProductForHistory)?.name}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedProductForHistory(null)
                  setMovementHistory([])
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-gray-400">Yükleniyor...</p>
                </div>
              ) : movementHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <LogoWithBackground size="md" className="mb-4" />
                  <p className="text-gray-400 mt-4">Henüz hareket kaydı bulunmuyor</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="h-8">Tarih</TableHead>
                        <TableHead className="h-8">Saat</TableHead>
                        <TableHead className="h-8">Tip</TableHead>
                        <TableHead className="h-8">Miktar</TableHead>
                        <TableHead className="h-8">Kullanıcı</TableHead>
                        <TableHead className="h-8">Referans</TableHead>
                        <TableHead className="h-8">Notlar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movementHistory.map((movement) => (
                        <TableRow key={movement.id} className="border-gray-800">
                          <TableCell className="text-white text-xs">
                            {movement.date}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs">
                            {movement.time}
                          </TableCell>
                          <TableCell>
                            {movement.movement_type === 'in' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
                                <ArrowUp className="w-3 h-3 mr-1" />
                                Giriş
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-300">
                                <ArrowDown className="w-3 h-3 mr-1" />
                                Çıkış
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={`font-semibold text-xs ${
                            movement.movement_type === 'in' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {movement.movement_type === 'in' ? '+' : '-'}
                            {movement.quantity.toLocaleString('tr-TR', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs font-medium">
                            {movement.user_name || movement.user_username || '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs">
                            {movement.reference_type === 'adjustment' ? 'Düzeltme' :
                             movement.reference_type === 'production' ? 'Üretim' :
                             movement.reference_type === 'manual' ? 'Manuel' :
                             movement.reference_type === 'initial' ? 'İlk Stok' :
                             movement.reference_type || '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs max-w-xs truncate" title={movement.notes}>
                            {movement.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Yeni Ürün Modal - Giriş/Çıkış Seçimi */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Yeni Ürün İşlemi</h2>
            {!newProductType ? (
              <div className="space-y-3">
                <p className="text-gray-400 mb-4">İşlem tipini seçin:</p>
                <button
                  onClick={() => {
                    setNewProductType('in')
                    setShowStockIn(true)
                    setShowNewProductModal(false)
                  }}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center space-x-2"
                >
                  <ArrowUp className="w-5 h-5" />
                  <span>Mamül Girişi</span>
                </button>
                <button
                  onClick={() => {
                    setNewProductType('out')
                    setShowStockOut(true)
                    setShowNewProductModal(false)
                  }}
                  className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center space-x-2"
                >
                  <ArrowDown className="w-5 h-5" />
                  <span>Mamül Çıkışı</span>
                </button>
                <button
                  onClick={() => {
                    router.push('/products/new')
                    setShowNewProductModal(false)
                  }}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Yeni Ürün Tanımla</span>
                </button>
              </div>
            ) : null}
            <button
              onClick={() => {
                setShowNewProductModal(false)
                setNewProductType(null)
              }}
              className="mt-4 w-full py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Mamül Stok Girişi Formu */}
      {showStockIn && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <ArrowUp className="w-5 h-5" />
            <span>Mamül Stok Girişi</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Ürün *
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Ürün seçin...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Miktar (Adet) *
              </label>
              <input
                type="number"
                min="1"
                value={stockInQuantity}
                onChange={(e) => setStockInQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowStockIn(false)
                setStockInQuantity(0)
                setSelectedProduct('')
                setNewProductType(null)
              }}
              className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </button>
            <button
              onClick={handleStockIn}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Mamül Girişi Yap
            </button>
          </div>
        </div>
      )}

      {/* Mamül Stok Çıkışı Formu */}
      {showStockOut && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <ArrowDown className="w-5 h-5" />
            <span>Mamül Stok Çıkışı</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Ürün *
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Ürün seçin...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name} - Mevcut: {product.stock_amount} adet
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Miktar (Adet) *
              </label>
              <input
                type="number"
                min="1"
                max={selectedProduct ? products.find(p => p.id === selectedProduct)?.stock_amount || 0 : 0}
                value={stockOutQuantity}
                onChange={(e) => setStockOutQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="0"
              />
              {selectedProduct && (
                <p className="text-xs text-gray-400 mt-1">
                  Mevcut stok: {products.find(p => p.id === selectedProduct)?.stock_amount || 0} adet
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Müşteri * <span className="text-red-400">(Zorunlu)</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                required
              >
                <option value="">Müşteri seçin...</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.code} - {customer.name}
                  </option>
                ))}
              </select>
              {customers.length === 0 && (
                <p className="text-xs text-yellow-400 mt-1">
                  ⚠️ Henüz müşteri tanımlanmamış. Önce <Link href="/accounts/new" className="underline">Cari Hesaplar</Link> sayfasından müşteri ekleyin.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowStockOut(false)
                setStockOutQuantity(0)
                setSelectedProduct('')
                setSelectedCustomerId('')
                setNewProductType(null)
              }}
              className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </button>
            <button
              onClick={handleStockOut}
              disabled={!selectedCustomerId}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mamül Çıkışı Yap
            </button>
          </div>
        </div>
      )}

      {/* Sevkiyat Onay Modal - Admin/Yönetici için */}
      {showShipmentModal && selectedBarcodeForShipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Truck className="w-5 h-5" />
              <span>Sevkiyat Onayı</span>
            </h2>
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Ürün:</p>
              <p className="text-white font-medium">{selectedBarcodeForShipment.product_name}</p>
              <p className="text-gray-400 text-sm">Barkod: {selectedBarcodeForShipment.barcode}</p>
              {(selectedBarcodeForShipment.dealer_name || selectedBarcodeForShipment.customer_name) && !showCustomerSelectInModal && (
                <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Karttaki Cari:</p>
                  <p className="text-white font-semibold">
                    {selectedBarcodeForShipment.dealer_name || selectedBarcodeForShipment.customer_name}
                  </p>
                </div>
              )}
            </div>
            {!showCustomerSelectInModal ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-300 mb-3">Bu cariye mi sevk edilsin?</p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleShipmentConfirm(true)}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                    >
                      Evet, Bu Cariye
                    </button>
                    <button
                      onClick={() => handleShipmentConfirm(false)}
                      className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-semibold"
                    >
                      Hayır, Cari Seç
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowShipmentModal(false)
                    setSelectedBarcodeForShipment(null)
                    setShowCustomerSelectInModal(false)
                    setShipmentCustomerId('')
                  }}
                  className="w-full py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
                >
                  İptal
                </button>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Cari Seçin *
                  </label>
                  <select
                    value={shipmentCustomerId}
                    onChange={(e) => setShipmentCustomerId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Cari seçin...</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.code} - {customer.name}
                      </option>
                    ))}
                  </select>
                  {customers.length === 0 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ Henüz cari tanımlanmamış. Önce <Link href="/accounts/new" className="underline">Cari Hesaplar</Link> sayfasından cari ekleyin.
                    </p>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowCustomerSelectInModal(false)
                      setShipmentCustomerId('')
                    }}
                    className="flex-1 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
                  >
                    Geri
                  </button>
                  <button
                    onClick={handleShipmentWithSelectedCustomer}
                    disabled={!shipmentCustomerId}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sevk Et
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Etiket Yazdırma Modal */}
      {showPrintLabelModal && selectedProductForLabel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Printer className="w-5 h-5" />
              <span>Etiket Yazdır</span>
            </h2>
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">Ürün</p>
              <p className="text-white font-medium">{selectedProductForLabel.name}</p>
              <p className="text-gray-400 text-sm">SKU: {selectedProductForLabel.sku}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Yazdırılacak Adet *
              </label>
              <input
                type="number"
                min="1"
                max={selectedProductForLabel.stock_amount}
                value={labelQuantity}
                onChange={(e) => setLabelQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Maksimum: {selectedProductForLabel.stock_amount} adet
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPrintLabelModal(false)
                  setSelectedProductForLabel(null)
                  setLabelQuantity(1)
                }}
                className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  window.open(
                    `/inventory/products/print-label?productId=${selectedProductForLabel.id}&quantity=${labelQuantity}`,
                    '_blank'
                  )
                  setShowPrintLabelModal(false)
                  setSelectedProductForLabel(null)
                  setLabelQuantity(1)
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                Yazdır
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

