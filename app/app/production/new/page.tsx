'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { generateProductionOrderNumber } from '@/lib/utils/codeGenerator'
import { AlertCircle, CheckCircle, Package, Factory } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

interface Product {
  id: string
  sku: string
  name: string
}

interface Stock {
  id: string
  code: string
  name: string
  category: string
  unit: string
  current_quantity: number
}

interface BOMItem {
  stock_id: string
  stock_code: string
  stock_name: string
  stock_category: string
  stock_unit: string
  required_quantity: number
  available_quantity: number
  is_available: boolean
}

export default function NewProductionOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [codeLoading, setCodeLoading] = useState(true)
  
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [dueDate, setDueDate] = useState<string>('')
  const [bomItems, setBomItems] = useState<BOMItem[]>([])
  const [stockCheck, setStockCheck] = useState<{
    allAvailable: boolean
    insufficientItems: BOMItem[]
  } | null>(null)
  const [showInsufficientModal, setShowInsufficientModal] = useState(false)

  useEffect(() => {
    async function loadCode() {
      try {
        const { generateProductionOrderNumber } = await import('@/lib/utils/codeGenerator')
        const newCode = await generateProductionOrderNumber()
        setOrderNumber(newCode)
      } catch (error) {
        console.error('Error generating code:', error)
        setOrderNumber('URE-001')
      } finally {
        setCodeLoading(false)
      }
    }
    loadCode()
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      // Local database kullan
      const { localDB } = await import('@/lib/database/client')
      const data = await localDB.getProducts()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  async function loadBOM(productId: string) {
    if (!productId) {
      setBomItems([])
      setStockCheck(null)
      return
    }

    try {
      // API'den BOM verilerini al
      const response = await fetch(`/api/bom?product_id=${productId}`)
      if (!response.ok) throw new Error('BOM yüklenemedi')
      const bomData = await response.json()

      // Her malzeme için güncel stok bilgisini al
      const items: BOMItem[] = await Promise.all(
        bomData.map(async (item: any) => {
          // Malzeme stok bilgisini al
          const materialResponse = await fetch(`/api/materials/${item.material_id}`)
          let availableStock = 0
          if (materialResponse.ok) {
            const material = await materialResponse.json()
            availableStock = parseFloat(material.stock_amount) || 0
          }

          const totalRequired = parseFloat(item.quantity_required) * quantity
          const isAvailable = availableStock >= totalRequired

          return {
            stock_id: item.material_id,
            stock_code: item.material_code || item.material_id,
            stock_name: item.material_name,
            stock_category: item.material_category || 
                           (item.material_name.toLowerCase().includes('kumaş') ? 'kumaş' : 
                            item.material_name.toLowerCase().includes('sünger') ? 'sünger' : 
                            item.material_name.toLowerCase().includes('ayak') ? 'ayak' : 'diğer'),
            stock_unit: item.material_unit,
            required_quantity: parseFloat(item.quantity_required),
            available_quantity: availableStock,
            is_available: isAvailable,
          }
        })
      )

      setBomItems(items)
      checkStockAvailability(items)
    } catch (error) {
      console.error('Error loading BOM:', error)
    }
  }

  function checkStockAvailability(items: BOMItem[]) {
    const insufficient = items.filter(
      (item) => item.available_quantity < item.required_quantity * quantity
    )
    
    setStockCheck({
      allAvailable: insufficient.length === 0,
      insufficientItems: insufficient,
    })
  }

  useEffect(() => {
    if (selectedProductId && quantity > 0) {
      loadBOM(selectedProductId)
    }
  }, [selectedProductId, quantity])

  async function handleStartProduction() {
    if (!selectedProductId || quantity <= 0) {
      alert('Lütfen ürün ve miktar seçin')
      return
    }

    // Reçeteyi kontrol et - API'den güncel stok bilgilerini al
    setLoading(true)
    try {
      const { localDB } = await import('@/lib/database/client')
      const bomData = await localDB.getBOM(selectedProductId)
      
      // Güncel stok kontrolü yap
      const insufficientItems: BOMItem[] = []
      
      for (const item of bomData) {
        const totalRequired = parseFloat(item.quantity_required) * quantity
        const available = parseFloat(item.available_stock)
        
        if (available < totalRequired) {
          insufficientItems.push({
            stock_id: item.material_id,
            stock_code: item.material_id,
            stock_name: item.material_name,
            stock_category: item.material_name.toLowerCase().includes('kumaş') ? 'kumaş' : 
                           item.material_name.toLowerCase().includes('sünger') ? 'sünger' : 
                           item.material_name.toLowerCase().includes('ayak') ? 'ayak' : 'diğer',
            stock_unit: item.material_unit,
            required_quantity: parseFloat(item.quantity_required),
            available_quantity: available,
            is_available: false,
          })
        }
      }

      // Eğer eksik malzeme varsa modal göster ve işlemi durdur
      if (insufficientItems.length > 0) {
        setStockCheck({
          allAvailable: false,
          insufficientItems: insufficientItems,
        })
        setShowInsufficientModal(true)
        setLoading(false)
        return
      }

      // Tüm stoklar yeterli, üretim emrini oluştur
      await localDB.createProductionOrder({
        order_number: orderNumber,
        product_id: selectedProductId,
        quantity: quantity,
        due_date: dueDate || null,
      })

      alert('✅ Üretim emri oluşturuldu ve stoklar otomatik düşüldü!')
      router.push('/production')
    } catch (error: any) {
      console.error('Error creating production order:', error)
      alert('Hata: ' + (error.message || 'Üretim emri oluşturulamadı'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/production" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          ← Geri Dön
        </Link>
        <h1 className="text-3xl font-bold text-white">Yeni Üretim Emri</h1>
        <p className="text-gray-400 mt-1">Üretim emri oluşturun ve stokları otomatik düşürün</p>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 space-y-6">
        {/* Üretim Emri Bilgileri */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Factory className="w-5 h-5" />
            <span>Üretim Emri Bilgileri</span>
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Emir No *
              </label>
              {codeLoading ? (
                <div className="w-full px-3 py-2 border border-gray-700 rounded-lg bg-gray-800">
                  <span className="text-gray-400">Kod oluşturuluyor...</span>
                </div>
              ) : (
                <input
                  type="text"
                  required
                  readOnly
                  value={orderNumber}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg cursor-not-allowed opacity-75"
                  placeholder="Örn: URE-001"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Miktar *
              </label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Teslim Tarihi
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Ürün Seçimi */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Ürün Seçimi</span>
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Koltuk Modeli *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Ürün seçin...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} - {product.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* BOM Listesi */}
        {bomItems.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Ürün Reçetesi (BOM)
            </h2>
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Hammadde
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Gereken
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Mevcut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Toplam Gereken
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {bomItems.map((item) => {
                    const totalRequired = item.required_quantity * quantity
                    const isAvailable = item.available_quantity >= totalRequired
                    
                    return (
                      <tr key={item.stock_id} className="hover:bg-gray-750">
                        <td className="px-4 py-3 text-sm text-white">
                          {item.stock_name}
                          <span className="text-gray-400 ml-2">({item.stock_code})</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 capitalize">
                          {item.stock_category}
                        </td>
                        <td className="px-4 py-3 text-sm text-white">
                          {item.required_quantity} {item.stock_unit}
                        </td>
                        <td className={`px-4 py-3 text-sm ${
                          isNaN(item.available_quantity) || item.available_quantity < totalRequired 
                            ? 'text-red-400 font-semibold' 
                            : 'text-white'
                        }`}>
                          {isNaN(item.available_quantity) ? '0' : item.available_quantity.toLocaleString('tr-TR', { 
                            minimumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                            maximumFractionDigits: item.stock_unit === 'metre' ? 2 : 0
                          })} {item.stock_unit}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-white">
                          {totalRequired} {item.stock_unit}
                        </td>
                        <td className="px-4 py-3">
                          {isAvailable ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Yeterli
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900 text-red-300">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Yetersiz
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stok Uyarısı */}
        {stockCheck && !stockCheck.allAvailable && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-300 mt-0.5" />
              <div>
                <h3 className="text-red-300 font-semibold mb-2">Stok Yetersiz!</h3>
                <p className="text-red-200 text-sm mb-2">
                  Aşağıdaki hammaddeler yetersiz:
                </p>
                <ul className="list-disc list-inside text-red-200 text-sm space-y-1">
                  {stockCheck.insufficientItems.map((item) => (
                    <li key={item.stock_id}>
                      {item.stock_name}: Gereken {item.required_quantity * quantity} {item.stock_unit}, 
                      Mevcut {item.available_quantity} {item.stock_unit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Başarı Mesajı */}
        {stockCheck && stockCheck.allAvailable && bomItems.length > 0 && (
          <div className="bg-green-900 border border-green-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <p className="text-green-300 font-medium">
                Tüm hammaddeler yeterli. Üretimi başlatabilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* Butonlar */}
        <div className="flex justify-end space-x-3 pt-4">
          <Link
            href="/production"
            className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
          >
            İptal
          </Link>
          <button
            onClick={handleStartProduction}
            disabled={loading || !stockCheck?.allAvailable || !selectedProductId}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>İşleniyor...</span>
              </>
            ) : (
              <>
                <Factory className="w-4 h-4" />
                <span>Üretimi Başlat</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Eksik Malzeme Modal */}
      <Modal
        isOpen={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        title="Eksik Malzeme Listesi"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-red-300 font-semibold mb-2">
                  Stok Yetersiz - Üretim Başlatılamadı!
                </h3>
                <p className="text-red-200 text-sm">
                  Aşağıdaki hammaddeler üretim miktarı için yetersiz. Lütfen stokları kontrol edin veya üretim miktarını azaltın.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Hammadde
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Birim
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Gereken
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Mevcut
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Eksik
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {stockCheck?.insufficientItems.map((item) => {
                  const totalRequired = item.required_quantity * quantity
                  const shortage = totalRequired - item.available_quantity
                  
                  return (
                    <tr key={item.stock_id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {item.stock_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {item.stock_unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-white text-right">
                        {totalRequired.toLocaleString('tr-TR', {
                          minimumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                          maximumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 text-right">
                        {item.available_quantity.toLocaleString('tr-TR', {
                          minimumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                          maximumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-400 font-semibold text-right">
                        {shortage.toLocaleString('tr-TR', {
                          minimumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                          maximumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              onClick={() => setShowInsufficientModal(false)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
            >
              Kapat
            </button>
            <Link
              href="/inventory/materials"
              onClick={() => setShowInsufficientModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Stok Yönetimine Git
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  )
}
