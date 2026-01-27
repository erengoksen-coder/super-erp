'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Package, AlertTriangle, ArrowDown, ArrowUp, ShoppingCart, Filter, Edit, Trash2, Save, X, History as HistoryIcon, Clock, RefreshCw } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

// localDB'yi dinamik import et
const getLocalDB = async () => {
  const { localDB } = await import('@/lib/database/client')
  return localDB
}

interface Material {
  id: string
  name: string
  unit: string
  stock_amount: number
  min_stock_level: number
  category?: string
}

export default function MaterialsInventoryPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showStockIn, setShowStockIn] = useState(false)
  const [showStockOut, setShowStockOut] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [stockInQuantity, setStockInQuantity] = useState<number>(0)
  const [stockInInvoiceNumber, setStockInInvoiceNumber] = useState<string>('')
  const [stockInShipmentNumber, setStockInShipmentNumber] = useState<string>('')
  const [stockOutQuantity, setStockOutQuantity] = useState<number>(0)
  const [filterCritical, setFilterCritical] = useState<boolean>(false)
  const [creatingPurchase, setCreatingPurchase] = useState<string | null>(null)
  const [quickActionMaterial, setQuickActionMaterial] = useState<Material | null>(null)
  const [quickActionType, setQuickActionType] = useState<'in' | 'out' | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ stock_amount: number; min_stock_level: number }>({ stock_amount: 0, min_stock_level: 0 })
  const [selectedMaterialForHistory, setSelectedMaterialForHistory] = useState<string | null>(null)
  const [movementHistory, setMovementHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadMaterials()
    // Sayfa yüklendiğinde stok miktarlarını stock_movements'tan yeniden hesapla
    recalculateStocks()
  }, [])

  async function recalculateStocks(showAlert = false) {
    try {
      setLoading(true)
      const response = await fetch('/api/materials/recalculate-stock', { method: 'POST' })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Stoklar yeniden hesaplanamadı')
      }
      
      const data = await response.json()
      
      // Hesaplama sonrası malzemeleri yeniden yükle
      await loadMaterials()
      
      if (showAlert) {
        let message = `✅ ${data.materials_updated || 0} malzemenin stokları stock_movements tablosundan yeniden hesaplandı!`
        
        // Örnek sonuçları göster (ilk 3 malzeme)
        if (data.sample_results && data.sample_results.length > 0) {
          message += '\n\nÖrnek sonuçlar:'
          data.sample_results.slice(0, 3).forEach((m: any) => {
            message += `\n${m.name}: ${m.calculated_in} giriş - ${m.calculated_out} çıkış = ${m.calculated_stock} adet`
          })
        }
        
        alert(message)
      }
    } catch (error: any) {
      console.error('Error recalculating stocks:', error)
      if (showAlert) {
        alert('Hata: ' + (error.message || 'Stoklar yeniden hesaplanamadı'))
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadMaterials() {
    try {
      const db = await getLocalDB()
      const data = await db.getMaterials()
      setMaterials(data)
    } catch (error) {
      console.error('Error loading materials:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleStockIn() {
    if (!selectedMaterial || stockInQuantity <= 0) {
      alert('Lütfen hammadde ve miktar seçin')
      return
    }

    // Fatura no veya sevk no zorunlu
    if (!stockInInvoiceNumber.trim() && !stockInShipmentNumber.trim()) {
      alert('Lütfen Fatura No veya Sevk No girin (en az biri zorunludur)')
      return
    }

    try {
      const response = await fetch('/api/materials/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: selectedMaterial,
          quantity: stockInQuantity,
          invoice_number: stockInInvoiceNumber.trim() || null,
          shipment_number: stockInShipmentNumber.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Stok girişi yapılamadı')
      }

      alert('✅ Stok girişi başarıyla yapıldı!')
      setShowStockIn(false)
      setStockInQuantity(0)
      setStockInInvoiceNumber('')
      setStockInShipmentNumber('')
      setSelectedMaterial('')
      loadMaterials()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  async function handleStockOut() {
    if (!selectedMaterial || stockOutQuantity <= 0) {
      alert('Lütfen hammadde ve miktar seçin')
      return
    }

    try {
      const response = await fetch('/api/materials/stock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: selectedMaterial,
          quantity: stockOutQuantity,
          notes: 'Hammadde depo çıkışı',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Stok çıkışı yapılamadı')
      }

      const result = await response.json()
      alert(`✅ Stok çıkışı başarıyla yapıldı! Yeni stok: ${result.new_stock}`)
      setShowStockOut(false)
      setStockOutQuantity(0)
      setSelectedMaterial('')
      loadMaterials()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  function isLowStock(material: Material): boolean {
    // Negatif stoklar da kritik olarak işaretlenir
    return material.stock_amount < material.min_stock_level
  }

  function startEdit(material: Material) {
    setEditingMaterial(material.id)
    setEditForm({
      stock_amount: material.stock_amount,
      min_stock_level: material.min_stock_level,
    })
  }

  function cancelEdit() {
    setEditingMaterial(null)
    setEditForm({ stock_amount: 0, min_stock_level: 0 })
  }

  async function saveEdit(materialId: string) {
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Malzeme güncellenemedi')
      }

      alert('✅ Malzeme başarıyla güncellendi!')
      setEditingMaterial(null)
      loadMaterials()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  async function deleteMaterial(materialId: string, materialName: string) {
    if (!confirm(`"${materialName}" malzemesini silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Malzeme silinemedi')
      }

      alert('✅ Malzeme başarıyla silindi!')
      loadMaterials()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  async function loadMovementHistory(materialId: string) {
    setLoadingHistory(true)
    setSelectedMaterialForHistory(materialId)
    try {
      const response = await fetch(`/api/materials/${materialId}/movements`)
      if (response.ok) {
        const data = await response.json()
        setMovementHistory(data.movements || [])
      } else {
        throw new Error('Hareket geçmişi yüklenemedi')
      }
    } catch (error: any) {
      alert('Hata: ' + error.message)
      setMovementHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  async function handleCreatePurchaseRequest(materialId: string) {
    if (creatingPurchase === materialId) return

    setCreatingPurchase(materialId)
    
    try {
      const material = materials.find(m => m.id === materialId)
      if (!material) {
        alert('Malzeme bulunamadı')
        setCreatingPurchase(null)
        return
      }

      // Eksik miktarı hesapla (minimum stok seviyesine ulaşmak için gerekli)
      const requiredQuantity = material.min_stock_level - material.stock_amount
      // Biraz fazla talep et (minimum seviyenin 2 katı veya en az minimum seviye kadar)
      const requestedQuantity = Math.max(requiredQuantity * 2, material.min_stock_level)

      if (requestedQuantity <= 0) {
        alert('Talep edilecek miktar hesaplanamadı')
        setCreatingPurchase(null)
        return
      }

      const response = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          requested_quantity: requestedQuantity,
          unit_price: 0, // Kullanıcı daha sonra güncelleyebilir
          notes: `Otomatik oluşturuldu - Kritik stok seviyesi: ${material.stock_amount.toFixed(2)} ${material.unit} < ${material.min_stock_level.toFixed(2)} ${material.unit}`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }))
        throw new Error(errorData.error || 'Satın alma talebi oluşturulamadı')
      }

      const data = await response.json()
      alert(`✅ Satın alma talebi oluşturuldu!\nTalep No: ${data.request?.request_number || 'N/A'}\nMiktar: ${requestedQuantity.toFixed(2)} ${material.unit}`)
    } catch (error: any) {
      console.error('Purchase request error:', error)
      alert('Hata: ' + (error.message || 'Satın alma talebi oluşturulamadı'))
    } finally {
      setCreatingPurchase(null)
    }
  }

  // Kritik seviye filtresi
  const filteredMaterials = filterCritical
    ? materials.filter(m => isLowStock(m))
    : materials

  const materialsByCategory = filteredMaterials.reduce((acc, material) => {
    // Veritabanındaki category alanını kullan, yoksa malzeme adına göre tahmin et
    const category = material.category && material.category.trim() !== '' 
      ? material.category 
      : (material.name.toLowerCase().includes('kumaş') ? 'Kumaş' :
         material.name.toLowerCase().includes('sünger') ? 'Sünger' :
         material.name.toLowerCase().includes('ayak') ? 'Ayak' : 'Diğer')
    
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(material)
    return acc
  }, {} as Record<string, Material[]>)

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Hammadde Depo</h1>
            <p className="text-gray-400 mt-1">Hammadde stokları ve giriş işlemleri</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => recalculateStocks(true)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Stokları stock_movements tablosundan yeniden hesapla"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Stokları Yeniden Hesapla</span>
            </button>
          <button
            onClick={() => setFilterCritical(!filterCritical)}
            className={`px-4 py-2 rounded-lg transition inline-flex items-center space-x-2 ${
              filterCritical
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Filter size={20} />
            <span>Kritik Seviye</span>
          </button>
          <button
            onClick={() => {
              setShowStockIn(!showStockIn)
              setShowStockOut(false)
            }}
            className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-green-700 transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation"
          >
            <ArrowDown size={20} />
            <span>Stok Girişi</span>
          </button>
          <button
            onClick={() => {
              setShowStockOut(!showStockOut)
              setShowStockIn(false)
            }}
            className="bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-red-700 transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation"
          >
            <ArrowUp size={20} />
            <span>Stok Çıkışı</span>
          </button>
          <Link
            href="/inventory/materials/new"
            className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation"
          >
            <Plus size={20} />
            <span>Yeni Hammadde</span>
          </Link>
        </div>
      </div>

      {/* Stok Girişi Formu */}
      {showStockIn && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <ArrowDown className="w-5 h-5" />
            <span>Hammadde Stok Girişi</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Hammadde *
              </label>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Hammadde seçin...</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} ({material.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Miktar *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={stockInQuantity}
                onChange={(e) => setStockInQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Fatura No
              </label>
              <input
                type="text"
                value={stockInInvoiceNumber}
                onChange={(e) => setStockInInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Fatura numarası (opsiyonel)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Sevk No
              </label>
              <input
                type="text"
                value={stockInShipmentNumber}
                onChange={(e) => setStockInShipmentNumber(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Sevk numarası (opsiyonel)"
              />
              <p className="text-xs text-yellow-400 mt-1">
                * Fatura No veya Sevk No'dan en az biri zorunludur
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowStockIn(false)
                setStockInQuantity(0)
                setStockInInvoiceNumber('')
                setStockInShipmentNumber('')
                setSelectedMaterial('')
              }}
              className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </button>
            <button
              onClick={handleStockIn}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Stok Girişi Yap
            </button>
          </div>
        </div>
      )}

      {/* Stok Çıkışı Formu */}
      {showStockOut && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <ArrowUp className="w-5 h-5" />
            <span>Hammadde Stok Çıkışı</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Hammadde *
              </label>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Hammadde seçin...</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} ({material.unit}) - Mevcut: {material.stock_amount}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Miktar *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={selectedMaterial ? materials.find(m => m.id === selectedMaterial)?.stock_amount || 0 : 0}
                value={stockOutQuantity}
                onChange={(e) => setStockOutQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="0.00"
              />
              {selectedMaterial && (
                <p className="text-xs text-gray-400 mt-1">
                  Mevcut stok: {materials.find(m => m.id === selectedMaterial)?.stock_amount || 0}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowStockOut(false)
                setStockOutQuantity(0)
                setSelectedMaterial('')
              }}
              className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </button>
            <button
              onClick={handleStockOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Stok Çıkışı Yap
            </button>
          </div>
        </div>
      )}

      {/* Hızlı İşlem Modal */}
      {quickActionMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setQuickActionMaterial(null)}>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white mb-4">
              {quickActionMaterial.name}
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-400">Mevcut Stok</p>
              <p className="text-2xl font-bold text-white">
                {quickActionMaterial.stock_amount.toFixed(2)} {quickActionMaterial.unit}
              </p>
            </div>
            
            {!quickActionType ? (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setQuickActionType('in')
                    setSelectedMaterial(quickActionMaterial.id)
                    setShowStockIn(true)
                    setShowStockOut(false)
                    setQuickActionMaterial(null)
                  }}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center space-x-2"
                >
                  <ArrowDown className="w-5 h-5" />
                  <span>Stok Girişi</span>
                </button>
                <button
                  onClick={() => {
                    setQuickActionType('out')
                    setSelectedMaterial(quickActionMaterial.id)
                    setShowStockOut(true)
                    setShowStockIn(false)
                    setQuickActionMaterial(null)
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
                setQuickActionMaterial(null)
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
        <div className="space-y-6">
          {Object.entries(materialsByCategory).map(([category, categoryMaterials]) => (
            <div key={category} className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white capitalize flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>{category}</span>
                  <span className="text-sm text-gray-400 font-normal">
                    ({categoryMaterials.length} adet)
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto -mx-3 md:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="h-8">Hammadde Adı</TableHead>
                        <TableHead className="h-8">Birim</TableHead>
                        <TableHead className="h-8">Mevcut Stok</TableHead>
                        <TableHead className="h-8">Min. Stok</TableHead>
                        <TableHead className="h-8">Durum</TableHead>
                        <TableHead className="h-8">İşlemler</TableHead>
                        <TableHead className="h-8">Düzenle/Sil</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryMaterials.map((material) => {
                        const lowStock = isLowStock(material)
                        const isEditing = editingMaterial === material.id
                        return (
                          <TableRow 
                            key={material.id} 
                            className={`${
                              lowStock ? 'bg-red-950/30 border-l-4 border-red-600' : ''
                            } cursor-pointer hover:bg-gray-800/50 transition`}
                            onDoubleClick={() => {
                              setQuickActionMaterial(material)
                              setQuickActionType(null)
                            }}
                          >
                            <TableCell className="font-medium text-white text-xs">
                              {material.name}
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs">
                              {material.unit}
                            </TableCell>
                            <TableCell className={`font-semibold text-xs ${
                              lowStock ? 'text-red-400' : 'text-white'
                            }`}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step={material.unit === 'metre' ? '0.01' : '1'}
                                  value={editForm.stock_amount}
                                  onChange={(e) => setEditForm({ ...editForm, stock_amount: parseFloat(e.target.value) || 0 })}
                                  className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span>
                                  {material.stock_amount.toLocaleString('tr-TR', {
                                    minimumFractionDigits: material.unit === 'metre' ? 2 : 0,
                                    maximumFractionDigits: material.unit === 'metre' ? 2 : 0,
                                  })}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={editForm.min_stock_level}
                                  onChange={(e) => setEditForm({ ...editForm, min_stock_level: parseFloat(e.target.value) || 0 })}
                                  className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span>{material.min_stock_level.toLocaleString('tr-TR')}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lowStock ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-300">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Kritik
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
                                  Normal
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lowStock && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCreatePurchaseRequest(material.id)
                                  }}
                                  disabled={creatingPurchase === material.id}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-600 text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {creatingPurchase === material.id ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                      Oluşturuluyor...
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingCart className="w-3 h-3 mr-1" />
                                      Satın Alma
                                    </>
                                  )}
                                </button>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => saveEdit(material.id)}
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
                                    onClick={() => loadMovementHistory(material.id)}
                                    className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-xs"
                                    title="Hareket Geçmişi"
                                  >
                                    <HistoryIcon className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => startEdit(material)}
                                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs"
                                    title="Düzenle"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => deleteMaterial(material.id, material.name)}
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
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hareket Geçmişi Modal */}
      {selectedMaterialForHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <HistoryIcon className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">
                  Stok Hareket Geçmişi
                </h2>
                <span className="text-sm text-gray-400">
                  {materials.find(m => m.id === selectedMaterialForHistory)?.name}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedMaterialForHistory(null)
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
                        <TableHead className="h-8">Fatura No</TableHead>
                        <TableHead className="h-8">Sevk No</TableHead>
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
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs">
                            {movement.invoice_number || '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs">
                            {movement.shipment_number || '-'}
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

