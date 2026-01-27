'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Package, AlertTriangle, ArrowUp, ArrowDown, Edit, Trash2, Save, X, History as HistoryIcon, Clock } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
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

export default function ProductsInventoryPage() {
  const [products, setProducts] = useState<ProductStock[]>([])
  const [loading, setLoading] = useState(true)
  const [showStockIn, setShowStockIn] = useState(false)
  const [showStockOut, setShowStockOut] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [stockInQuantity, setStockInQuantity] = useState<number>(0)
  const [stockOutQuantity, setStockOutQuantity] = useState<number>(0)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customers, setCustomers] = useState<any[]>([])
  const [quickActionProduct, setQuickActionProduct] = useState<ProductStock | null>(null)
  const [quickActionType, setQuickActionType] = useState<'in' | 'out' | null>(null)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ stock_amount: number; min_stock_level: number }>({ stock_amount: 0, min_stock_level: 0 })
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<string | null>(null)
  const [movementHistory, setMovementHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadProducts()
    loadCustomers()
  }, [])

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
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Mamül Depo</h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">Bitmiş ürün stokları ve giriş işlemleri</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setShowStockIn(!showStockIn)
              setShowStockOut(false)
            }}
            className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-green-700 transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation"
          >
            <ArrowUp size={20} />
            <span>Mamül Girişi</span>
          </button>
          <button
            onClick={() => {
              setShowStockOut(!showStockOut)
              setShowStockIn(false)
            }}
            className="bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-red-700 transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation"
          >
            <ArrowDown size={20} />
            <span>Mamül Çıkışı</span>
          </button>
          <Link
            href="/products/new"
            className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation"
          >
            <Plus size={20} />
            <span>Yeni Ürün</span>
          </Link>
        </div>
      </div>

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

      {/* Hızlı İşlem Modal */}
      {quickActionProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setQuickActionProduct(null)}>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white mb-4">
              {quickActionProduct.name}
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-400">SKU</p>
              <p className="text-lg font-medium text-gray-300 mb-2">
                {quickActionProduct.sku}
              </p>
              <p className="text-sm text-gray-400">Mevcut Stok</p>
              <p className="text-2xl font-bold text-white">
                {quickActionProduct.stock_amount} adet
              </p>
            </div>
            
            {!quickActionType ? (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setQuickActionType('in')
                    setSelectedProduct(quickActionProduct.id)
                    setShowStockIn(true)
                    setShowStockOut(false)
                    setQuickActionProduct(null)
                  }}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center space-x-2"
                >
                  <ArrowDown className="w-5 h-5" />
                  <span>Stok Girişi</span>
                </button>
                <button
                  onClick={() => {
                    setQuickActionType('out')
                    setSelectedProduct(quickActionProduct.id)
                    setShowStockOut(true)
                    setShowStockIn(false)
                    setSelectedCustomerId('') // Müşteri seçimini sıfırla
                    setQuickActionProduct(null)
                  }}
                  className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center space-x-2"
                >
                  <ArrowUp className="w-5 h-5" />
                  <span>Stok Çıkışı</span>
                </button>
              </div>
            ) : null}
            
            <button
              onClick={() => {
                setQuickActionProduct(null)
                setQuickActionType(null)
              }}
              className="mt-4 w-full py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="h-8">SKU</TableHead>
                <TableHead className="h-8">Ürün Adı</TableHead>
                <TableHead className="h-8">Mevcut Stok</TableHead>
                <TableHead className="h-8">Min. Stok</TableHead>
                <TableHead className="h-8">Durum</TableHead>
                <TableHead className="h-8">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 text-xs py-8">
                    Henüz ürün eklenmemiş
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const lowStock = isLowStock(product)
                  const isEditing = editingProduct === product.id
                  return (
                    <TableRow 
                      key={product.id}
                      className={`cursor-pointer hover:bg-gray-800/50 transition ${
                        lowStock ? 'bg-red-950/30 border-l-4 border-red-600' : ''
                      }`}
                      onDoubleClick={() => {
                        setQuickActionProduct(product)
                        setQuickActionType(null)
                      }}
                    >
                      <TableCell className="font-medium text-white text-xs">
                        {product.sku}
                      </TableCell>
                      <TableCell className="text-white text-xs">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-white text-xs">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editForm.stock_amount}
                            onChange={(e) => setEditForm({ ...editForm, stock_amount: parseFloat(e.target.value) || 0 })}
                            className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span>{product.stock_amount} adet</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editForm.min_stock_level}
                            onChange={(e) => setEditForm({ ...editForm, min_stock_level: parseFloat(e.target.value) || 0 })}
                            className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span>{product.min_stock_level} adet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lowStock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-300">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Düşük
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
                            Normal
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => saveEdit(product.id)}
                              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-xs"
                              title="Kaydet"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                              title="İptal"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => loadMovementHistory(product.id)}
                              className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-xs"
                              title="Hareket Geçmişi"
                            >
                              <HistoryIcon className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => startEdit(product)}
                              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs"
                              title="Düzenle"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id, product.name)}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                              title="Sil"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

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
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Henüz hareket kaydı bulunmuyor</p>
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
                          <TableCell className="text-gray-400 text-xs">
                            {movement.reference_type || '-'}
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
    </div>
  )
}

