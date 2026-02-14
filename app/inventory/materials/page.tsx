'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Package, AlertTriangle, ArrowDown, ArrowUp, ShoppingCart, Filter, Edit, Trash2, Save, X, History as HistoryIcon, Clock, RefreshCw, Download } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { useAuthStore } from '@/lib/store/authStore'
import { getAuthHeaders, fetchApi } from '@/lib/api/fetch'
import { toast } from '@/lib/notify'
import { getReferenceTypeLabel } from '@/lib/utils/referenceTypeLabels'

// localDB'yi dinamik import et
const getLocalDB = async () => {
  const { localDB } = await import('@/lib/database/client')
  return localDB
}

interface Material {
  id: string
  code?: string
  name: string
  unit: string
  stock_amount: number
  total_in?: number
  total_out?: number
  min_stock_level: number
  category?: string
}

export default function MaterialsInventoryPage() {
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showStockIn, setShowStockIn] = useState(false)
  const [showStockOut, setShowStockOut] = useState(false)
  const [activeTab, setActiveTab] = useState<'stockIn' | 'stockOut' | 'list'>('stockIn')
  const [showList, setShowList] = useState(false)
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
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü')
  const [categorySearch, setCategorySearch] = useState<string>('')
  const [exporting, setExporting] = useState(false)

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
        let message = `✅ ${data.materials_updated || 0} malzemenin stokları stok hareketleri tablosundan yeniden hesaplandı!`
        
        // Örnek sonuçları göster (ilk 3 malzeme)
        if (data.sample_results && data.sample_results.length > 0) {
          message += '\n\nÖrnek sonuçlar:'
          data.sample_results.slice(0, 3).forEach((m: any) => {
            message += `\n${m.name}: ${m.calculated_in} giriş - ${m.calculated_out} çıkış = ${m.calculated_stock} adet`
          })
        }
        
        toast.warning(message)
      }
    } catch (error: any) {
      console.error('Stoklar yeniden hesaplanırken hata:', error)
      if (showAlert) {
        toast.error('Hata: ' + (error.message || 'Stoklar yeniden hesaplanamadı'))
      }
    } finally {
      setLoading(false)
    }
  }

  const [creatingFromOrders, setCreatingFromOrders] = useState(false)

  async function createMaterialsFromOrders() {
    if (!confirm('Siparişlerden kumaş kodlarını çıkarıp hammadde deposuna malzeme kartları oluşturmak istediğinize emin misiniz?')) {
      return
    }

    setCreatingFromOrders(true)
    try {
      const response = await fetch('/api/materials/create-from-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.details || 'Malzemeler oluşturulamadı')
      }

      const result = await response.json()
      
      if (result.created > 0) {
        toast.success(`${result.created} kumaş malzemesi başarıyla oluşturuldu!${result.skipped > 0 ? `\n\n${result.skipped} malzeme atlandı (zaten mevcut).` : ''}`)
        // Malzemeleri yeniden yükle
        await loadMaterials()
      } else {
        toast.info(`Yeni malzeme oluşturulmadı.${result.skipped > 0 ? `\n\n${result.skipped} malzeme zaten mevcut.` : ''}`)
      }
    } catch (error: any) {
      console.error('Kumaş malzemeleri oluşturulurken hata:', error)
      toast.error(`Hata: ${error.message}`)
    } finally {
      setCreatingFromOrders(false)
    }
  }


  async function loadMaterials() {
    try {
      const db = await getLocalDB()
      const data = await db.getMaterials()
      setMaterials(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Malzemeler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleStockIn() {
    if (!selectedMaterial || stockInQuantity <= 0) {
      toast.warning('Lütfen hammadde ve miktar seçin')
      return
    }

    // Fatura no veya sevk no zorunlu
    if (!stockInInvoiceNumber.trim() && !stockInShipmentNumber.trim()) {
      toast.warning('Lütfen Fatura No veya Sevk No girin (en az biri zorunludur)')
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
          user_id: userId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Stok girişi yapılamadı')
      }

      toast.success('Stok girişi başarıyla yapıldı!')
      setShowStockIn(false)
      setStockInQuantity(0)
      setStockInInvoiceNumber('')
      setStockInShipmentNumber('')
      setSelectedMaterial('')
      loadMaterials()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function handleStockOut() {
    if (!selectedMaterial || stockOutQuantity <= 0) {
      toast.warning('Lütfen hammadde ve miktar seçin')
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
          user_id: userId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Stok çıkışı yapılamadı')
      }

      const result = await response.json()
      toast.success(`Stok çıkışı başarıyla yapıldı! Yeni stok: ${result.new_stock}`)
      setShowStockOut(false)
      setStockOutQuantity(0)
      setSelectedMaterial('')
      loadMaterials()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
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
    // Sayfayı yukarı kaydır (işlem alanına)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
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
        body: JSON.stringify({
          ...editForm,
          user_id: userId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Malzeme güncellenemedi')
      }

      toast.success('Malzeme başarıyla güncellendi!')
      setEditingMaterial(null)
      loadMaterials()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function deleteMaterial(materialId: string, materialName: string) {
    if (!confirm(`"${materialName}" malzemesini silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      const response = await fetch(`/api/materials/${encodeURIComponent(materialId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      })

      if (response.status === 404) {
        await loadMaterials()
        toast.info('Malzeme bulunamadı veya zaten silinmiş. Liste güncellendi.')
        return
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Malzeme silinemedi')
      }

      // Listeyi önbelleği atlayarak taze çek; silinen malzeme ekrandan gitsin
      const fresh = await fetchApi<Material[] | unknown>(`/api/materials?_=${Date.now()}`)
      setMaterials(Array.isArray(fresh) ? (fresh as Material[]) : [])

      toast.success('Malzeme başarıyla silindi!')
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function loadMovementHistory(materialId: string) {
    setLoadingHistory(true)
    setSelectedMaterialForHistory(materialId)
    // Sayfayı yukarı kaydır (modal açılacak)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
    try {
      const response = await fetch(`/api/materials/${materialId}/movements`)
      if (response.ok) {
        const data = await response.json()
        setMovementHistory(data.movements || [])
      } else {
        throw new Error('Hareket geçmişi yüklenemedi')
      }
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
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
        toast.warning('Malzeme bulunamadı')
        setCreatingPurchase(null)
        return
      }

      // Eksik miktarı hesapla (minimum stok seviyesine ulaşmak için gerekli)
      const requiredQuantity = material.min_stock_level - material.stock_amount
      // Biraz fazla talep et (minimum seviyenin 2 katı veya en az minimum seviye kadar)
      const requestedQuantity = Math.max(requiredQuantity * 2, material.min_stock_level)

      if (requestedQuantity <= 0) {
        toast.warning('Talep edilecek miktar hesaplanamadı')
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
      toast.success(`Satın alma talebi oluşturuldu!\nTalep No: ${data.request?.request_number || 'Yok'}\nMiktar: ${requestedQuantity.toFixed(2)} ${material.unit}`)
    } catch (error: any) {
      console.error('Satın alma talebi hatası:', error)
      toast.error('Hata: ' + (error.message || 'Satın alma talebi oluşturulamadı'))
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

  const categoryTabs = ['Tümü', ...Object.keys(materialsByCategory).sort((a, b) => a.localeCompare(b, 'tr'))]

  useEffect(() => {
    if (selectedCategory !== 'Tümü' && !materialsByCategory[selectedCategory]) {
      setSelectedCategory('Tümü')
    }
  }, [materialsByCategory, selectedCategory])

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-white">Hammadde Depo</h1>
              <LogoWithBackground size="sm" />
            </div>
            <p className="text-gray-400 mt-1">Hammadde stokları ve giriş işlemleri</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                setExporting(true)
                try {
                  const res = await fetch('/api/materials/export', { credentials: 'include', headers: getAuthHeaders() })
                  if (!res.ok) throw new Error('Export başarısız')
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `malzeme_listesi_${new Date().toISOString().split('T')[0]}.xlsx`
                  a.click()
                  URL.revokeObjectURL(url)
                  toast.success('Excel dosyası indirildi')
                } catch (e: any) {
                  toast.error(e?.message || 'Excel indirilemedi')
                } finally {
                  setExporting(false)
                }
              }}
              disabled={exporting}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Malzeme listesini Excel olarak indir"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">{exporting ? 'İndiriliyor...' : 'Excel İndir'}</span>
            </button>
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
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 inline-flex items-center space-x-2 font-bold ${
              filterCritical
                ? 'bg-red-950 text-red-100 hover:bg-red-900 border-2 border-red-700 shadow-xl shadow-red-900/70'
                : 'bg-red-900/60 text-red-200 hover:bg-red-800/80 border-2 border-red-800/50'
            }`}
          >
            <Filter size={20} />
            <span>Kritik Seviye</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('stockIn')
              setShowStockIn(true)
              setShowStockOut(false)
              setShowList(false)
            }}
            style={{ backgroundColor: activeTab === 'stockIn' ? '#16a34a' : '#166534' }}
            className={`px-3 md:px-4 py-2.5 rounded-lg transition-all duration-200 inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation font-bold text-white hover:opacity-90`}
          >
            <ArrowDown size={20} />
            <span>Stok Girişi</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('stockOut')
              setShowStockOut(true)
              setShowStockIn(false)
              setShowList(false)
            }}
            style={{ backgroundColor: activeTab === 'stockOut' ? '#dc2626' : '#991b1b' }}
            className={`px-3 md:px-4 py-2.5 rounded-lg transition-all duration-200 inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation font-bold text-white hover:opacity-90`}
          >
            <ArrowUp size={20} />
            <span>Stok Çıkışı</span>
          </button>
          <button
            onClick={createMaterialsFromOrders}
            disabled={creatingFromOrders || loading}
            className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-green-700 transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            title="Siparişlerden kumaş kodlarını çıkarıp hammadde deposuna malzeme kartları oluştur"
          >
            {creatingFromOrders ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Oluşturuluyor...</span>
              </>
            ) : (
              <>
                <Plus size={20} />
                <span>Siparişlerden Kumaş Oluştur</span>
              </>
            )}
          </button>
          <button
            onClick={async () => {
              if (!confirm('Tüm malzemeleri (hammadde) silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return
              try {
                const res = await fetch('/api/materials?all=1', { method: 'DELETE', credentials: 'include' })
                if (!res.ok) throw new Error((await res.json()).error || 'Silinemedi')
                const data = await res.json()
                await loadMaterials()
                toast.success(data?.message || 'Malzemeler silindi.')
              } catch (e: any) {
                toast.error('Hata: ' + (e instanceof Error ? e.message : 'Malzemeler silinemedi'))
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-3 md:px-4 py-2 rounded-lg transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation"
          >
            <Trash2 size={20} />
            <span>Tüm Malzemeleri Sil</span>
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
      {showStockIn && activeTab === 'stockIn' && (
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
                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-700 text-white rounded-lg focus:border-green-500 focus:outline-none"
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
                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-700 text-white rounded-lg focus:border-green-500 focus:outline-none"
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
                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-700 text-white rounded-lg focus:border-green-500 focus:outline-none"
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
                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-700 text-white rounded-lg focus:border-green-500 focus:outline-none"
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
              style={{ backgroundColor: '#16a34a' }}
              className="px-6 py-3 hover:opacity-90 active:opacity-80 text-white rounded-lg transition-all duration-200 font-bold text-base"
            >
              Stok Girişi Yap
            </button>
          </div>
        </div>
      )}

      {/* Stok Çıkışı Formu */}
      {showStockOut && activeTab === 'stockOut' && (
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
                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-700 text-white rounded-lg focus:border-red-500 focus:outline-none"
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
              style={{ backgroundColor: '#dc2626' }}
              className="px-6 py-3 hover:opacity-90 active:opacity-80 text-white rounded-lg transition-all duration-200 font-bold text-base"
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
                    setActiveTab('stockIn')
                    setShowList(false)
                    setShowStockIn(true)
                    setShowStockOut(false)
                    setQuickActionMaterial(null)
                    // Sayfayı yukarı kaydır (stok girişi formu açılacak)
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }, 100)
                  }}
                  style={{ backgroundColor: '#16a34a' }}
                  className="w-full py-4 hover:opacity-90 active:opacity-80 text-white rounded-lg transition-all duration-200 font-bold text-lg flex items-center justify-center space-x-3"
                >
                  <ArrowDown className="w-6 h-6" />
                  <span>↓ Stok Girişi</span>
                </button>
                <button
                  onClick={() => {
                    setQuickActionType('out')
                    setSelectedMaterial(quickActionMaterial.id)
                    setActiveTab('stockOut')
                    setShowList(false)
                    setShowStockOut(true)
                    setShowStockIn(false)
                    setQuickActionMaterial(null)
                    // Sayfayı yukarı kaydır (stok çıkışı formu açılacak)
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }, 100)
                  }}
                  style={{ backgroundColor: '#dc2626' }}
                  className="w-full py-4 hover:opacity-90 active:opacity-80 text-white rounded-lg transition-all duration-200 font-bold text-lg flex items-center justify-center space-x-3"
                >
                  <ArrowUp className="w-6 h-6" />
                  <span>↑ Stok Çıkışı</span>
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

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {categoryTabs.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category)
                setShowList(true)
                setActiveTab('list')
                setShowStockIn(false)
                setShowStockOut(false)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        {showList && activeTab === 'list' && (
          <>
            <div className="flex justify-end">
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Bu sekmede ara..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-400">Yükleniyor...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(selectedCategory === 'Tümü'
                  ? Object.entries(materialsByCategory)
                  : Object.entries(materialsByCategory).filter(([category]) => category === selectedCategory)
                ).map(([category, categoryMaterials]) => {
                  const searchLower = categorySearch.trim().toLowerCase()
                  const filteredCategoryMaterials = searchLower
                    ? categoryMaterials.filter((material) => {
                        const nameMatch = material.name.toLowerCase().includes(searchLower)
                        const codeMatch = material.code?.toLowerCase().includes(searchLower) ?? false
                        const unitMatch = material.unit.toLowerCase().includes(searchLower)
                        return nameMatch || codeMatch || unitMatch
                      })
                    : categoryMaterials
                  const sortedMaterials = [...filteredCategoryMaterials].sort((a, b) => {
                    const normalizeName = (value: string) =>
                      value.replace(/^Kumaş\s+/i, '').trim()
                    const left = normalizeName((a.name || '').toString())
                    const right = normalizeName((b.name || '').toString())
                    return left.localeCompare(right, 'tr', { numeric: true })
                  })

                  return (
                    <div key={category} className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white capitalize flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>{category}</span>
                  <span className="text-sm text-gray-400 font-normal">
                    ({filteredCategoryMaterials.length} adet)
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto -mx-3 md:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="h-8">Kod</TableHead>
                        <TableHead className="h-8">Hammadde Adı</TableHead>
                        <TableHead className="h-8">Birim</TableHead>
                        <TableHead className="h-8">Giriş</TableHead>
                        <TableHead className="h-8">Çıkış</TableHead>
                        <TableHead className="h-8">Mevcut Stok</TableHead>
                        <TableHead className="h-8">Min. Stok</TableHead>
                        <TableHead className="h-8">Durum</TableHead>
                        <TableHead className="h-8">İşlemler</TableHead>
                        <TableHead className="h-8">Düzenle/Sil</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMaterials.map((material, index) => {
                        const lowStock = isLowStock(material)
                        const isEditing = editingMaterial === material.id
                        const displayCode = String(index + 1).padStart(4, '0')
                        const displayName = material.name.replace(/^Kumaş\s+/i, '')
                        return (
                          <TableRow 
                            key={material.id} 
                            className={`${
                              lowStock ? 'bg-red-950/80 border-l-4 border-red-700 shadow-lg shadow-red-900/50' : ''
                            } cursor-pointer hover:bg-gray-800/50 transition`}
                            onDoubleClick={() => {
                              setQuickActionMaterial(material)
                              setQuickActionType(null)
                              // Sayfayı yukarı kaydır (modal açılacak)
                              setTimeout(() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }, 100)
                            }}
                          >
                            <TableCell className="font-medium text-white text-xs">
                              {displayCode}
                            </TableCell>
                            <TableCell className="font-medium text-white text-xs">
                              {displayName}
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs">
                              {material.unit}
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs">
                              {(material.total_in || 0).toLocaleString('tr-TR', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs">
                              {(material.total_out || 0).toLocaleString('tr-TR', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}
                            </TableCell>
                            <TableCell className={`font-semibold text-xs ${
                              lowStock ? 'text-red-300 font-bold' : 'text-white'
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
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
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
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-950 border-2 border-red-600 text-red-200 shadow-md shadow-red-900/50 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  KRİTİK
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
                                      // Sayfayı yukarı kaydır
                                      setTimeout(() => {
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                      }, 100)
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
                                    onClick={() => {
                                      loadMovementHistory(material.id)
                                    }}
                                    className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-xs"
                                    title="Hareket Geçmişi"
                                  >
                                    <HistoryIcon className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      startEdit(material)
                                    }}
                                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs"
                                    title="Düzenle"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      deleteMaterial(material.id, material.name)
                                      setTimeout(() => {
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                      }, 100)
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                                    title="Malzemeyi sil"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Sil
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
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

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
                          <TableCell className="text-gray-300 text-xs font-medium">
                            {movement.user_name || movement.user_username || '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs">
                            {movement.invoice_number || '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs">
                            {movement.shipment_number || '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs">
                            {getReferenceTypeLabel(movement.reference_type)}
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

