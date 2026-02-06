'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Plus, Edit, Trash2, Save, X, Factory } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'

interface Product {
  id: string
  sku: string
  name: string
}

interface Material {
  id: string
  code: string
  name: string
  unit: string
  category: string
  unit_price?: number
}

interface BOMItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  material_id: string
  material_name: string
  material_code: string
  material_unit: string
  material_category: string
  material_unit_price: number
  quantity: number
  fire_percentage: number
  unit?: string | null
}

interface GroupedBOM {
  product_id: string
  product_name: string
  product_sku: string
  items: BOMItem[]
}

interface BomVersion {
  id: string
  version_no: number
  effective_date: string
  revision_reason?: string | null
  is_active: number
}

export default function BOMPage() {
  const [bomGroups, setBomGroups] = useState<GroupedBOM[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [bomVersions, setBomVersions] = useState<BomVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string>('')
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [pendingVersionProduct, setPendingVersionProduct] = useState<string | null>(null)
  const [pendingCopyFrom, setPendingCopyFrom] = useState<string | null>(null)
  const [versionReason, setVersionReason] = useState('Malzeme güncellemesi')
  const [versionDate, setVersionDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [firePercentage, setFirePercentage] = useState<string>('0')
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [materialList, setMaterialList] = useState<Array<{
    material_id: string
    quantity: string
    fire_percentage: string
    unit_price: string
    unit: string
  }>>([{ material_id: '', quantity: '', fire_percentage: '0', unit_price: '0', unit: '' }])
  
  const [productName, setProductName] = useState<string>('')
  const [unitPrice, setUnitPrice] = useState<string>('0')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      loadVersions(selectedProduct)
    } else {
      setBomVersions([])
      setSelectedVersionId('')
    }
  }, [selectedProduct])

  async function loadData() {
    setLoading(true)
    try {
      const [bomData, productsData, materialsData] = await Promise.all([
        fetchApi<GroupedBOM[]>('/api/bom'),
        fetchApi<Product[]>('/api/products'),
        fetchApi<Material[]>('/api/materials'),
      ])
      setBomGroups(bomData)
      setProducts(productsData)
      setMaterials(materialsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadVersions(productId: string) {
    try {
      const versions = await fetchApi<BomVersion[]>(`/api/bom/versions?product_id=${productId}`)
      setBomVersions(versions)
      const active = versions.find((v: BomVersion) => v.is_active === 1)
      setSelectedVersionId(active?.id || versions[0]?.id || '')
    } catch (error) {
      console.error('BOM versiyonları yüklenemedi:', error)
      setBomVersions([])
      setSelectedVersionId('')
    }
  }

  async function createNewVersion(
    productId: string,
    copyFrom?: string,
    options?: { reason?: string; effectiveDate?: string }
  ) {
    const reason = options?.reason?.trim() || 'Malzeme güncellemesi'
    const effectiveDate = options?.effectiveDate || new Date().toISOString().split('T')[0]
    const payload = {
      product_id: productId,
      effective_date: effectiveDate,
      revision_reason: reason,
      copy_from_version_id: copyFrom || undefined,
    }
    const response = await fetchApi<{ id: string }>('/api/bom/versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await loadVersions(productId)
    return response?.id || null
  }

  async function ensureVersionId(productId: string) {
    if (selectedVersionId) return selectedVersionId
    const created = await createNewVersion(productId, undefined, {
      reason: 'İlk versiyon',
      effectiveDate: new Date().toISOString().split('T')[0],
    })
    if (created) {
      setSelectedVersionId(created)
      return created
    }
    return ''
  }

  function openVersionModal(productId: string, copyFrom?: string) {
    setPendingVersionProduct(productId)
    setPendingCopyFrom(copyFrom || null)
    setVersionReason('Malzeme güncellemesi')
    setVersionDate(new Date().toISOString().split('T')[0])
    setShowVersionModal(true)
  }

  async function handleCreateVersion() {
    if (!pendingVersionProduct) return
    const productId = pendingVersionProduct // Değişkeni kaydet
    const newId = await createNewVersion(productId, pendingCopyFrom || undefined, {
      reason: versionReason,
      effectiveDate: versionDate,
    })
    if (newId) {
      setSelectedVersionId(newId)
      // Modal'ı kapat
      setShowVersionModal(false)
      const savedProductId = productId // Ürün ID'sini kaydet
      setPendingVersionProduct(null)
      setPendingCopyFrom(null)
      // BOM verilerini yeniden yükle
      await loadData()
      // Düzenleme modunu aç
      startEditProduct(savedProductId)
    } else {
      setShowVersionModal(false)
      setPendingVersionProduct(null)
      setPendingCopyFrom(null)
    }
  }

  function addMaterialRow() {
    setMaterialList([...materialList, { material_id: '', quantity: '', fire_percentage: '0', unit_price: '0', unit: '' }])
  }

  function removeMaterialRow(index: number) {
    if (materialList.length > 1) {
      setMaterialList(materialList.filter((_, i) => i !== index))
    }
  }

  function updateMaterialRow(index: number, field: 'material_id' | 'quantity' | 'fire_percentage' | 'unit_price' | 'unit', value: string) {
    const updated = [...materialList]
    // Eğer unit_price undefined ise, '0' olarak ayarla
    if (!updated[index].unit_price) {
      updated[index].unit_price = '0'
    }
    updated[index] = { ...updated[index], [field]: value || (field === 'unit_price' ? '0' : '') }
    
    // Eğer malzeme seçildiyse, birim fiyatını otomatik doldur
    if (field === 'material_id' && value) {
      const selectedMaterial = materials.find(m => m.id === value)
      if (selectedMaterial && selectedMaterial.unit_price) {
        updated[index].unit_price = selectedMaterial.unit_price.toString()
      } else if (!updated[index].unit_price) {
        updated[index].unit_price = '0'
      }
      if (selectedMaterial?.unit) {
        updated[index].unit = selectedMaterial.unit
      }
    }
    
    setMaterialList(updated)
  }

  function buildUnitOptions(materialId?: string) {
    const baseUnit = materials.find(m => m.id === materialId)?.unit?.toLowerCase() || ''
    const defaults = ['adet', 'm', 'kg', 'm3']
    const options = [baseUnit, ...defaults].filter(Boolean)
    return Array.from(new Set(options))
  }

  async function handleSave() {
    if (!productName.trim()) {
      alert('Lütfen ürün adı girin')
      return
    }

    // Önce ürünü oluştur veya bul
    let productId = selectedProduct
    if (!productId) {
      // Yeni ürün oluştur
      try {
        const productPayload = {
          name: productName.trim(),
          sku: `PRD-${Date.now().toString().slice(-6)}`,
          price: 0,
          selling_price: 0,
        }
        const productParams = new URLSearchParams({
          name: productPayload.name,
          sku: productPayload.sku,
          price: String(productPayload.price),
          selling_price: String(productPayload.selling_price),
        })
        const newProduct = await fetchApi<{ id: string }>(`/api/products?${productParams.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productPayload),
        })
        productId = newProduct.id
        await ensureVersionId(productId)
      } catch (error: any) {
        alert('Hata: ' + error.message)
        return
      }
    }

    // Tüm malzemeleri kontrol et
    const validMaterials = materialList.filter(m => m.material_id && m.quantity && parseFloat(m.quantity) > 0)
    
    if (validMaterials.length === 0) {
      alert('Lütfen en az bir malzeme ekleyin')
      return
    }

    try {
      const versionId = productId ? await ensureVersionId(productId) : selectedVersionId

      // Malzeme birim fiyatlarını güncelle
      const updatePricePromises = validMaterials.map((material) => {
        if (material.unit_price && parseFloat(material.unit_price) > 0) {
          return fetchApi(`/api/materials/${material.material_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              unit_price: parseFloat(material.unit_price),
            }),
          })
        }
        return Promise.resolve(null)
      })
      await Promise.all(updatePricePromises)

      // Tüm malzemeleri tek tek kaydet
      const errors: string[] = []
      await Promise.all(
        validMaterials.map(async (material) => {
          try {
            await fetchApi('/api/bom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_id: productId,
                version_id: versionId || undefined,
                material_id: material.material_id,
                quantity: parseFloat(material.quantity),
                unit: material.unit || undefined,
                fire_percentage: parseFloat(material.fire_percentage) || 0,
              }),
            })
          } catch (error: any) {
            errors.push(error?.message || 'BOM kaydı oluşturulamadı')
          }
        })
      )

      if (errors.length > 0) {
        throw new Error(errors.join(', '))
      }

      alert(`✅ ${validMaterials.length} adet BOM kaydı başarıyla oluşturuldu!`)
      setShowAddForm(false)
      setSelectedProduct('')
      setProductName('')
      setSelectedUnit('')
      setMaterialList([{ material_id: '', quantity: '', fire_percentage: '0', unit_price: '0', unit: '' }])
      loadData()
    } catch (error: any) {
      alert('Hata: ' + (error?.message || 'BOM kaydı oluşturulamadı'))
    }
  }

  async function handleDelete(bomId: string) {
    if (!confirm('Bu BOM kaydını silmek istediğinize emin misiniz?')) {
      return
    }

    // Sayfayı yukarı kaydır
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)

    try {
      const response = await fetch(`/api/bom?id=${bomId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'BOM kaydı silinemedi')
      }

      alert('✅ BOM kaydı silindi!')
      loadData()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  async function handleDeleteProductBOM(productId: string, productName: string) {
    if (!confirm(`"${productName}" ürününün TÜM BOM kayıtlarını silmek istediğinize emin misiniz?`)) {
      return
    }

    // Sayfayı yukarı kaydır
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)

    try {
      const response = await fetch(`/api/bom/product?product_id=${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'BOM kayıtları silinemedi')
      }

      alert('✅ Ürünün tüm BOM kayıtları silindi!')
      loadData()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  function startEditProduct(productId: string) {
    setEditingProduct(productId)
    // Bu ürün için BOM kayıtlarını yükle
    const group = bomGroups.find(g => g.product_id === productId)
    if (group && group.items.length > 0) {
      setSelectedProduct(productId)
      // Ürün adını yükle
      const product = products.find(p => p.id === productId)
      if (product) {
        setProductName(product.name)
      }
      // Tüm malzemeleri listeye ekle
      setMaterialList(group.items.map(item => ({
        material_id: item.material_id,
        quantity: item.quantity.toString(),
        fire_percentage: item.fire_percentage.toString(),
        unit_price: (item.material_unit_price || 0).toString(),
        unit: (item.unit || item.material_unit || '').toString(),
      })))
      setShowAddForm(true)
      setEditingItem(null)
      // Sayfayı yukarı kaydır
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function startEdit(item: BOMItem) {
    setEditingItem(item.id)
    setSelectedProduct(item.product_id)
    setSelectedMaterial(item.material_id)
    setQuantity(item.quantity.toString())
    setFirePercentage(item.fire_percentage.toString())
    setUnitPrice((item.material_unit_price || 0).toString())
    setSelectedUnit((item.unit || item.material_unit || '').toString())
    // Tek malzeme için eski formu kullan
    setMaterialList([{
      material_id: item.material_id,
      quantity: item.quantity.toString(),
      fire_percentage: item.fire_percentage.toString(),
      unit_price: (item.material_unit_price || 0).toString(),
      unit: (item.unit || item.material_unit || '').toString(),
    }])
    setShowAddForm(true)
    // Sayfayı yukarı kaydır
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleUpdate(bomId: string) {
    if (!selectedProduct || !selectedMaterial || !quantity || parseFloat(quantity) <= 0) {
      alert('Lütfen tüm alanları doldurun ve miktarı pozitif girin')
      return
    }

    try {
      // Malzeme birim fiyatını güncelle
      if (unitPrice && parseFloat(unitPrice) > 0) {
        await fetchApi(`/api/materials/${selectedMaterial}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unit_price: parseFloat(unitPrice),
          }),
        })
      }

      const versionId = await ensureVersionId(selectedProduct)
      await fetchApi('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct,
          version_id: versionId || undefined,
          material_id: selectedMaterial,
          quantity: parseFloat(quantity),
          unit: selectedUnit || undefined,
          fire_percentage: parseFloat(firePercentage) || 0,
        }),
      })

      alert('✅ BOM kaydı güncellendi!')
      setShowAddForm(false)
      setEditingItem(null)
      setSelectedProduct('')
      setSelectedMaterial('')
      setQuantity('')
      setFirePercentage('0')
      setUnitPrice('0')
      setSelectedUnit('')
      setMaterialList([{ material_id: '', quantity: '', fire_percentage: '0', unit_price: '0', unit: '' }])
      loadData()
    } catch (error: any) {
      alert('Hata: ' + (error?.message || 'BOM kaydı güncellenemedi'))
    }
  }

  async function handleUpdateProductBOM(productId: string) {
    // Ürünün tüm BOM kayıtlarını güncelle
    if (!selectedProduct) {
      alert('Lütfen ürün seçin')
      return
    }

    const validMaterials = materialList.filter(m => m.material_id && m.quantity && parseFloat(m.quantity) > 0)
    
    if (validMaterials.length === 0) {
      alert('Lütfen en az bir malzeme ekleyin')
      return
    }

    try {
      // Ürün adını güncelle (eğer değiştirildiyse)
      if (productName && productName.trim()) {
        await fetchApi(`/api/products/${selectedProduct}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: productName.trim(),
          }),
        })
      }

      // Önce mevcut BOM kayıtlarını sil
      const versionId = await ensureVersionId(selectedProduct)
      await fetchApi(`/api/bom/product?product_id=${productId}&version_id=${versionId || ''}`, {
        method: 'DELETE',
      })

      // Yeni malzemeleri ekle
      const versionIdForSave = await ensureVersionId(selectedProduct)
      const errors: string[] = []
      await Promise.all(
        validMaterials.map(async (material) => {
          try {
            await fetchApi('/api/bom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_id: selectedProduct,
                version_id: versionIdForSave || undefined,
                material_id: material.material_id,
                quantity: parseFloat(material.quantity),
                unit: material.unit || undefined,
                fire_percentage: parseFloat(material.fire_percentage) || 0,
              }),
            })
          } catch (error: any) {
            errors.push(error?.message || 'BOM kaydı oluşturulamadı')
          }
        })
      )

      if (errors.length > 0) {
        throw new Error(errors.join(', '))
      }

      alert(`✅ ${validMaterials.length} adet BOM kaydı güncellendi!`)
      setShowAddForm(false)
      setEditingProduct(null)
      setSelectedProduct('')
      setProductName('')
      setSelectedUnit('')
      setMaterialList([{ material_id: '', quantity: '', fire_percentage: '0', unit_price: '0', unit: '' }])
      loadData()
    } catch (error: any) {
      alert('Hata: ' + (error?.message || 'BOM kaydı güncellenemedi'))
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center space-x-2">
              <Factory className="w-6 h-6 md:w-8 md:h-8" />
              <span>Ürün Reçetesi</span>
            </h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-sm text-gray-400">Her ürün için gerekli malzemeleri tanımlayın</p>
          <p className="text-sm text-green-400 mt-1 font-medium">
            BOM&apos;da kayıtlı ürün: <strong>{bomGroups.length}</strong> adet
            {bomGroups.length > 0 && (
              <span className="text-gray-400 font-normal ml-2">
                ({bomGroups.map(g => g.product_sku).join(', ')})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingItem(null)
            setEditingProduct(null)
            setSelectedProduct('')
            setSelectedVersionId('')
            setBomVersions([])
            setMaterialList([{ material_id: '', quantity: '', fire_percentage: '0', unit_price: '0', unit: '' }])
          }}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 text-sm touch-manipulation mt-4 md:mt-0"
        >
          <Plus size={20} />
          <span>Yeni BOM Kaydı</span>
        </button>
      </div>

      {/* BOM Ekleme/Düzenleme Formu */}
      {showAddForm && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>
              {editingItem 
                ? 'BOM Kaydını Düzenle' 
                : editingProduct 
                  ? 'Ürün BOM\'unu Düzenle'
                  : 'Yeni BOM Kaydı'}
            </span>
          </h2>
          
          {/* Tek Malzeme Düzenleme (editingItem için) */}
          {editingItem ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Ürün *
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={!!editingItem}
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
                  BOM Versiyonu
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedVersionId}
                    onChange={(e) => setSelectedVersionId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={!selectedProduct}
                  >
                    <option value="">Versiyon seçin...</option>
                    {bomVersions.map((version) => (
                      <option key={version.id} value={version.id}>
                        v{version.version_no} {version.is_active === 1 ? '(aktif)' : ''} - {version.effective_date}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedProduct) openVersionModal(selectedProduct, selectedVersionId || undefined)
                    }}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-xs"
                    disabled={!selectedProduct}
                  >
                    Yeni
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Malzeme *
                </label>
                <select
                  value={selectedMaterial}
                  onChange={(e) => {
                    const value = e.target.value
                    setSelectedMaterial(value)
                    const defaultUnit = materials.find(m => m.id === value)?.unit || ''
                    setSelectedUnit(defaultUnit)
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Malzeme seçin...</option>
                  {(() => {
                    // Kumaş kategorisi için tek bir seçenek göster
                    const hasFabric = materials.some(m => m.category && m.category.toLowerCase() === 'kumaş')
                    const nonFabricMaterials = materials.filter(m => !m.category || m.category.toLowerCase() !== 'kumaş')
                    
                    const options = []
                    if (hasFabric) {
                      // Kumaş kategorisindeki ilk malzemeyi kullan (sistem üretim emrindeki kumaş koduna göre seçecek)
                      const firstFabric = materials.find(m => m.category && m.category.toLowerCase() === 'kumaş')
                      if (firstFabric) {
                        options.push(
                          <option key="fabric" value={firstFabric.id}>
                            Kumaş
                          </option>
                        )
                      }
                    }
                    // Diğer kategoriler için normal format
                    nonFabricMaterials.forEach((material) => {
                      options.push(
                        <option key={material.id} value={material.id}>
                          {material.code} - {material.name}
                        </option>
                      )
                    })
                    return options
                  })()}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Miktar *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="0.00"
                />
                {selectedMaterial && (
                  <p className="text-xs text-gray-400 mt-1">
                    Birim: {materials.find(m => m.id === selectedMaterial)?.unit || '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Fire Yüzdesi (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={firePercentage}
                  onChange={(e) => setFirePercentage(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="0"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Üretim sırasında ekstra harcanacak miktar yüzdesi
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Birim Fiyat (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice || '0'}
                  onChange={(e) => setUnitPrice(e.target.value || '0')}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="0.00"
                />
                {selectedMaterial && (
                  <p className="text-xs text-gray-400 mt-1">
                    Mevcut: {materials.find(m => m.id === selectedMaterial)?.unit_price?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || '₺0,00'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Çoklu Malzeme Ekleme */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Ürün Adı *
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Örn: Chester Koltuk"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Mevcut Ürün Seç (İsteğe Bağlı)
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => {
                      setSelectedProduct(e.target.value)
                      if (e.target.value) {
                        const product = products.find(p => p.id === e.target.value)
                        if (product) {
                          setProductName(product.name)
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={!!editingProduct}
                  >
                    <option value="">Mevcut ürün seçin...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedProduct && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      BOM Versiyonu
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedVersionId}
                        onChange={(e) => setSelectedVersionId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">Versiyon seçin...</option>
                        {bomVersions.map((version) => (
                          <option key={version.id} value={version.id}>
                            v{version.version_no} {version.is_active === 1 ? '(aktif)' : ''} - {version.effective_date}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedProduct) openVersionModal(selectedProduct, selectedVersionId || undefined)
                        }}
                        className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-xs"
                      >
                        Yeni
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Çoklu Malzeme Listesi */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Malzemeler *
                  </label>
                  <button
                    type="button"
                    onClick={addMaterialRow}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Malzeme Ekle</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {materialList.map((material, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">Malzeme</label>
                        <select
                          value={material.material_id}
                          onChange={(e) => updateMaterialRow(index, 'material_id', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="">Malzeme seçin...</option>
                          {(() => {
                            // Kumaş kategorisi için tek bir seçenek göster
                            const hasFabric = materials.some(m => m.category && m.category.toLowerCase() === 'kumaş')
                            const nonFabricMaterials = materials.filter(m => !m.category || m.category.toLowerCase() !== 'kumaş')
                            
                            const options = []
                            if (hasFabric) {
                              // Kumaş kategorisindeki ilk malzemeyi kullan (sistem üretim emrindeki kumaş koduna göre seçecek)
                              const firstFabric = materials.find(m => m.category && m.category.toLowerCase() === 'kumaş')
                              if (firstFabric) {
                                options.push(
                                  <option key="fabric" value={firstFabric.id}>
                                    Kumaş
                                  </option>
                                )
                              }
                            }
                            // Diğer kategoriler için normal format
                            nonFabricMaterials.forEach((m) => {
                              options.push(
                                <option key={m.id} value={m.id}>
                                  {m.code} - {m.name}
                                </option>
                              )
                            })
                            return options
                          })()}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Miktar</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={material.quantity}
                          onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="0.00"
                        />
                      </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Birim *
                </label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Birim seçin...</option>
                  {buildUnitOptions(selectedMaterial).map((unitOption) => (
                    <option key={unitOption} value={unitOption}>
                      {unitOption}
                    </option>
                  ))}
                </select>
              </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Birim</label>
                        <select
                          value={material.unit}
                          onChange={(e) => updateMaterialRow(index, 'unit', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="">Birim seçin...</option>
                          {buildUnitOptions(material.material_id).map((unitOption) => (
                            <option key={unitOption} value={unitOption}>
                              {unitOption}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Birim Fiyat (TL)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={material.unit_price || '0'}
                          onChange={(e) => updateMaterialRow(index, 'unit_price', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="0.00"
                        />
                        {material.material_id && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {materials.find(m => m.id === material.material_id)?.unit_price?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || '₺0,00'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-end space-x-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">Fire %</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={material.fire_percentage}
                            onChange={(e) => updateMaterialRow(index, 'fire_percentage', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="0"
                          />
                        </div>
                        {materialList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMaterialRow(index)}
                            className="px-2 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                            title="Malzeme satırını kaldır"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowAddForm(false)
                setEditingItem(null)
                setSelectedProduct('')
                setProductName('')
                setUnitPrice('0')
                setSelectedUnit('')
                setMaterialList([{ material_id: '', quantity: '', fire_percentage: '0', unit_price: '0', unit: '' }])
              }}
              className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white text-sm touch-manipulation"
            >
              <X className="w-4 h-4 inline mr-1" />
              İptal
            </button>
            <button
              onClick={
                editingItem 
                  ? () => handleUpdate(editingItem) 
                  : editingProduct 
                    ? () => handleUpdateProductBOM(editingProduct)
                    : handleSave
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm touch-manipulation"
            >
              <Save className="w-4 h-4 inline mr-1" />
              {editingItem ? 'Güncelle' : editingProduct ? 'Tümünü Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      {showVersionModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Yeni BOM Versiyonu</h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Geçerlilik Tarihi</label>
              <input
                type="date"
                value={versionDate}
                onChange={(e) => setVersionDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Revizyon Nedeni</label>
              <textarea
                value={versionReason}
                onChange={(e) => setVersionReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                rows={3}
                placeholder="Örn: Sünger kalitesi değişti"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleCreateVersion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : bomGroups.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Henüz BOM Kaydı Yok</h3>
          <p className="text-sm text-gray-400 mb-4">İlk BOM kaydınızı oluşturun</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Yeni BOM Kaydı</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {bomGroups.map((group) => (
            <div key={group.product_id} className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {group.product_sku} - {group.product_name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {group.items.length} adet malzeme
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openVersionModal(group.product_id)}
                      className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 transition flex items-center space-x-1"
                      title="Yeni BOM versiyonu oluştur"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Yeni Versiyon</span>
                    </button>
                    <button
                      onClick={() => startEditProduct(group.product_id)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition flex items-center space-x-1"
                      title="Ürün BOM'unu düzenle"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Düzenle</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProductBOM(group.product_id, group.product_name)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition flex items-center space-x-1"
                      title="Ürünün tüm BOM kayıtlarını sil"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Sil</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="h-8 px-4 py-2 text-xs">Malzeme Kodu</TableHead>
                      <TableHead className="h-8 px-4 py-2 text-xs">Malzeme Adı</TableHead>
                      <TableHead className="h-8 px-4 py-2 text-xs">Miktar</TableHead>
                      <TableHead className="h-8 px-4 py-2 text-xs">Birim</TableHead>
                      <TableHead className="h-8 px-4 py-2 text-xs">Birim Fiyat</TableHead>
                      <TableHead className="h-8 px-4 py-2 text-xs">Fire %</TableHead>
                      <TableHead className="h-8 px-4 py-2 text-xs">Toplam (Fire Dahil)</TableHead>
                      <TableHead className="h-8 px-4 py-2 text-xs">Toplam Maliyet</TableHead>
                      <TableHead className="h-8 px-4 py-2 text-xs">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item, index) => {
                      const totalWithFire = item.quantity * (1 + item.fire_percentage / 100)
                      const unitPrice = item.material_unit_price || 0
                      const totalCost = totalWithFire * unitPrice
                      const displayUnit = (item.unit || item.material_unit || '').toString() || '-'
                      return (
                        <TableRow key={item.id} className="border-gray-800">
                          <TableCell className="font-medium text-white text-xs px-4 py-2">
                            {index + 1}
                          </TableCell>
                          <TableCell className="text-white text-xs px-4 py-2">
                            {item.material_category && item.material_category.toLowerCase() === 'kumaş' ? 'Kumaş' : item.material_name}
                          </TableCell>
                          <TableCell className="text-white text-xs px-4 py-2">
                            {item.quantity.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs px-4 py-2">
                            {displayUnit}
                          </TableCell>
                          <TableCell className="text-blue-400 font-semibold text-xs px-4 py-2">
                            {unitPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs px-4 py-2">
                            {item.fire_percentage.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-yellow-400 font-semibold text-xs px-4 py-2">
                            {totalWithFire.toFixed(2)} {displayUnit}
                          </TableCell>
                          <TableCell className="text-green-400 font-bold text-xs px-4 py-2">
                            {totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="px-4 py-2">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => startEdit(item)}
                                className="text-blue-400 hover:text-blue-300 transition"
                                title="Düzenle"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-red-400 hover:text-red-300 transition"
                                title="Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Toplam Maliyet */}
              <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Toplam Maliyet:</span>
                  <span className="text-xl font-bold text-green-400">
                    {group.items.reduce((sum, item) => {
                      const totalWithFire = item.quantity * (1 + item.fire_percentage / 100)
                      const unitPrice = item.material_unit_price || 0
                      return sum + (totalWithFire * unitPrice)
                    }, 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

