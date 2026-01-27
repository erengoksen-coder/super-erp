'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Truck, User, Package, Plus, X, AlertCircle, CheckCircle } from 'lucide-react'

interface Customer {
  id: string
  name: string
  code: string
}

interface ReadyItem {
  product_id: string
  product_name: string
  product_sku: string
  total_count: number
  items: Array<{
    id: string
    barcode: string
    serial_number: string
    production_order_number?: string
  }>
}

interface ShipmentItem {
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  barcodes: string[] // Girilen barkodlar
  required_count: number // Gerekli adet
}

export default function NewShipmentPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([])
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    if (selectedCustomerId) {
      loadReadyItems(selectedCustomerId)
    } else {
      setReadyItems([])
      setShipmentItems([])
    }
  }, [selectedCustomerId])

  async function loadCustomers() {
    try {
      const response = await fetch('/api/accounts?type=customer')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  async function loadReadyItems(customerId: string) {
    setLoading(true)
    try {
      const response = await fetch(`/api/shipments/ready-items?customer_id=${customerId}`)
      if (!response.ok) throw new Error('Sevk edilebilir ürünler yüklenemedi')
      const data = await response.json()
      setReadyItems(data.items || [])
      
      // Shipment items'ı başlat - Mevcut barkodları da ekle
      const initialItems: ShipmentItem[] = (data.items || []).map((item: ReadyItem) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.total_count,
        barcodes: item.items.map(b => b.barcode), // Mevcut barkodları otomatik ekle
        required_count: item.total_count,
      }))
      setShipmentItems(initialItems)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  function handleBarcodeInput(productId: string, barcode: string) {
    if (!barcode.trim()) return

    setShipmentItems(items => items.map(item => {
      if (item.product_id === productId) {
        // Barkod zaten eklenmiş mi kontrol et
        if (item.barcodes.includes(barcode.trim())) {
          return item
        }
        // Yeni barkod ekle
        return {
          ...item,
          barcodes: [...item.barcodes, barcode.trim()],
        }
      }
      return item
    }))
  }

  function removeBarcode(productId: string, barcode: string) {
    setShipmentItems(items => items.map(item => {
      if (item.product_id === productId) {
        return {
          ...item,
          barcodes: item.barcodes.filter(b => b !== barcode),
        }
      }
      return item
    }))
  }

  function validateShipment(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!selectedCustomerId) {
      errors.push('⚠️ Müşteri seçimi zorunludur!')
    }

    shipmentItems.forEach(item => {
      if (item.barcodes.length < item.required_count) {
        const missing = item.required_count - item.barcodes.length
        errors.push(`❌ ${item.product_name} (${item.product_sku}) için ${missing} adet eksik barkod var!\n   Gerekli: ${item.required_count} adet\n   Girilen: ${item.barcodes.length} adet\n   Eksik: ${missing} adet`)
      }
    })

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

    setLoading(true)
    setError('')

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Sevkiyat kalemlerini hazırla
      const items = shipmentItems.map(item => ({
        product_id: item.product_id,
        quantity: item.barcodes.length,
        barcodes: item.barcodes,
        notes: `${item.product_name} - ${item.barcodes.length} adet`,
      }))

      // Ürün fiyatlarını hesapla - Tüm ürünleri tek seferde al
      let totalAmount = 0
      try {
        const productsResponse = await fetch('/api/products')
        if (productsResponse.ok) {
          const allProducts = await productsResponse.json()
          for (const item of shipmentItems) {
            const product = allProducts.find((p: any) => p.id === item.product_id)
            if (product && product.selling_price) {
              totalAmount += product.selling_price * item.barcodes.length
            }
          }
        }
      } catch (e) {
        console.warn('Ürün fiyatları alınamadı:', e)
      }

      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          shipment_date: today,
          items,
          total_amount: totalAmount,
          tax_rate: 0, // KDV varsayılan 0, cari hesap sayfasında düzenlenebilir
          notes: 'Mamül depodan sevk edildi',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Sevkiyat oluşturulamadı')
      }

      const shipmentData = await response.json()
      // API response'u shipment objesi olarak dönüyor
      const shipmentId = shipmentData.id || shipmentData.shipment?.id
      if (!shipmentId) {
        console.error('Shipment data:', shipmentData)
        throw new Error('Sevkiyat oluşturuldu ancak ID alınamadı')
      }
      alert('✅ Sevkiyat başarıyla oluşturuldu!')
      // Sevkiyat detay sayfasına yönlendir
      router.push(`/shipments/${shipmentId}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <Truck className="w-6 h-6 md:w-8 md:h-8" />
            <span>Yeni Sevkiyat</span>
          </h1>
          <p className="text-sm text-gray-400">Sevk edilebilir ürünlerden sevkiyat oluşturun</p>
        </div>

        {/* Müşteri Seçimi */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Müşteri *
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
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-400">Yükleniyor...</p>
              </div>
            ) : shipmentItems.length === 0 ? (
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
                <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
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
                      key={item.product_id}
                      className={`bg-gray-900 rounded-lg border ${
                        isComplete ? 'border-green-700' : 'border-red-700'
                      } p-4 md:p-6`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {item.product_name}
                          </h3>
                          <p className="text-sm text-gray-400">SKU: {item.product_sku}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${
                            isComplete ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            {item.barcodes.length} / {item.required_count}
                          </div>
                          <div className="text-xs text-gray-400">Barkod</div>
                        </div>
                      </div>

                      {/* Mevcut Barkodlar Listesi */}
                      {readyItems.find(ri => ri.product_id === item.product_id) && (
                        <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <div className="text-sm font-medium text-gray-300 mb-2">
                            Mevcut Barkodlar ({readyItems.find(ri => ri.product_id === item.product_id)?.items.length || 0} adet):
                          </div>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {readyItems.find(ri => ri.product_id === item.product_id)?.items.map((barcodeItem) => {
                              const isAdded = item.barcodes.includes(barcodeItem.barcode)
                              return (
                                <button
                                  key={barcodeItem.id}
                                  type="button"
                                  onClick={() => {
                                    if (!isAdded) {
                                      handleBarcodeInput(item.product_id, barcodeItem.barcode)
                                    } else {
                                      removeBarcode(item.product_id, barcodeItem.barcode)
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
                                handleBarcodeInput(item.product_id, e.currentTarget.value)
                                e.currentTarget.value = ''
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement
                              if (input.value) {
                                handleBarcodeInput(item.product_id, input.value)
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
                                  onClick={() => removeBarcode(item.product_id, barcode)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Durum */}
                      {!isComplete && (
                        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                          <div className="flex items-start space-x-2 text-red-300 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold mb-1">⚠️ Eksik Barkod!</div>
                              <div>{missing} adet eksik barkod var. Lütfen tüm {item.required_count} adet barkodu girin.</div>
                              <div className="text-xs text-red-400 mt-1">Sevk fişi kesilemez!</div>
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

                {/* Oluştur Butonu */}
                <div className="flex flex-col items-end space-y-3 mt-6">
                  {!validateShipment().valid && (
                    <div className="w-full bg-red-900/30 border border-red-700 rounded-lg p-3">
                      <div className="flex items-start space-x-2 text-red-300 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold mb-1">⚠️ Eksik Barkodlar Var!</div>
                          <div className="text-xs text-red-400">Tüm barkodlar girilmeden sevk fişi kesilemez.</div>
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
                      disabled={loading || !validateShipment().valid}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      title={!validateShipment().valid ? 'Lütfen tüm barkodları girin' : ''}
                    >
                      <Truck className="w-5 h-5" />
                      <span>{loading ? 'Oluşturuluyor...' : 'Sevkiyat Oluştur'}</span>
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

