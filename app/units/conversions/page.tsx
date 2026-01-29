'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Plus, Trash2, Edit, Save, X } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

type Material = {
  id: string
  code?: string
  name: string
  unit?: string
}

type Conversion = {
  id: string
  material_id: string | null
  from_unit: string
  to_unit: string
  factor: number
}

export default function UnitConversionsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [loading, setLoading] = useState(true)
  const [materialId, setMaterialId] = useState<string>('')
  const [fromUnit, setFromUnit] = useState('')
  const [toUnit, setToUnit] = useState('')
  const [factor, setFactor] = useState('')
  const [filterMaterial, setFilterMaterial] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMaterialId, setEditMaterialId] = useState<string>('')
  const [editFromUnit, setEditFromUnit] = useState('')
  const [editToUnit, setEditToUnit] = useState('')
  const [editFactor, setEditFactor] = useState('')

  const filteredConversions = useMemo(() => {
    if (filterMaterial === 'all') return conversions
    return conversions.filter((c) => c.material_id === filterMaterial)
  }, [conversions, filterMaterial])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [materialsRes, conversionsRes] = await Promise.all([
        fetch('/api/materials'),
        fetch('/api/units/conversions'),
      ])
      const materialsJson = materialsRes.ok ? await materialsRes.json() : []
      const conversionsJson = conversionsRes.ok ? await conversionsRes.json() : []
      const materialsData = Array.isArray(materialsJson)
        ? materialsJson
        : Array.isArray(materialsJson?.data)
          ? materialsJson.data
          : []
      const conversionsData = Array.isArray(conversionsJson)
        ? conversionsJson
        : Array.isArray(conversionsJson?.data)
          ? conversionsJson.data
          : []
      setMaterials(materialsData)
      setConversions(conversionsData)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!fromUnit.trim() || !toUnit.trim() || !factor || Number(factor) <= 0) {
      alert('Kaynak birim, hedef birim ve pozitif çarpan gerekli')
      return
    }
    try {
      const response = await fetch('/api/units/conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId || null,
          from_unit: fromUnit.trim().toLowerCase(),
          to_unit: toUnit.trim().toLowerCase(),
          factor: Number(factor),
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Kayıt oluşturulamadı')
      }
      setMaterialId('')
      setFromUnit('')
      setToUnit('')
      setFactor('')
      loadData()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu birim dönüşümünü silmek istediğinize emin misiniz?')) {
      return
    }
    try {
      const response = await fetch(`/api/units/conversions?id=${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Silme işlemi başarısız')
      }
      loadData()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  function startEdit(conversion: Conversion) {
    setEditingId(conversion.id)
    setEditMaterialId(conversion.material_id || '')
    setEditFromUnit(conversion.from_unit || '')
    setEditToUnit(conversion.to_unit || '')
    setEditFactor(conversion.factor?.toString() || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditMaterialId('')
    setEditFromUnit('')
    setEditToUnit('')
    setEditFactor('')
  }

  async function handleUpdate() {
    if (!editingId) return
    if (!editFromUnit.trim() || !editToUnit.trim() || !editFactor || Number(editFactor) <= 0) {
      alert('Kaynak birim, hedef birim ve pozitif çarpan gerekli')
      return
    }
    try {
      const response = await fetch('/api/units/conversions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          material_id: editMaterialId || null,
          from_unit: editFromUnit.trim().toLowerCase(),
          to_unit: editToUnit.trim().toLowerCase(),
          factor: Number(editFactor),
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Güncelleme başarısız')
      }
      cancelEdit()
      loadData()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  function materialLabel(id: string | null) {
    if (!id) return 'Genel'
    const material = materials.find((m) => m.id === id)
    if (!material) return 'Bilinmiyor'
    return `${material.code ? `${material.code} - ` : ''}${material.name}`
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Birim Çevrimleri</h1>
            <p className="text-sm text-gray-400">Malzeme bazlı veya genel birim dönüşümleri</p>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition inline-flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Yenile</span>
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Yeni Dönüşüm</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Malzeme (Opsiyonel)</label>
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
              >
                <option value="">Genel</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.code ? `${material.code} - ` : ''}{material.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Kaynak Birim</label>
              <input
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
                placeholder="ör: m"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Hedef Birim</label>
              <input
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
                placeholder="ör: kg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreate}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition inline-flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-400">
            Örnek: 1 m = 0.35 kg için kaynak birim: m, hedef birim: kg, çarpan: 0.35
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Dönüşüm Listesi</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Filtre:</span>
              <select
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded text-sm"
              >
                <option value="all">Tümü</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.code ? `${material.code} - ` : ''}{material.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Yükleniyor...</div>
          ) : filteredConversions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Kayıt bulunamadı.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="h-8 px-4 py-2 text-xs">Malzeme</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Kaynak Birim</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Hedef Birim</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Çarpan</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConversions.map((conversion) => (
                    <TableRow key={conversion.id} className="border-gray-800">
                      <TableCell className="text-white text-xs px-4 py-2">
                        {editingId === conversion.id ? (
                          <select
                            value={editMaterialId}
                            onChange={(e) => setEditMaterialId(e.target.value)}
                            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                          >
                            <option value="">Genel</option>
                            {materials.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.code ? `${material.code} - ` : ''}{material.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          materialLabel(conversion.material_id)
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {editingId === conversion.id ? (
                          <input
                            value={editFromUnit}
                            onChange={(e) => setEditFromUnit(e.target.value)}
                            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                          />
                        ) : (
                          conversion.from_unit
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {editingId === conversion.id ? (
                          <input
                            value={editToUnit}
                            onChange={(e) => setEditToUnit(e.target.value)}
                            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                          />
                        ) : (
                          conversion.to_unit
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {editingId === conversion.id ? (
                          <input
                            value={editFactor}
                            onChange={(e) => setEditFactor(e.target.value)}
                            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                          />
                        ) : (
                          Number(conversion.factor).toLocaleString('tr-TR')
                        )}
                      </TableCell>
                      <TableCell className="text-right px-4 py-2">
                        {editingId === conversion.id ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={handleUpdate}
                              className="text-green-400 hover:text-green-300 transition"
                              title="Kaydet"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-400 hover:text-gray-200 transition"
                              title="İptal"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => startEdit(conversion)}
                              className="text-blue-400 hover:text-blue-300 transition"
                              title="Düzenle"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(conversion.id)}
                              className="text-red-400 hover:text-red-300 transition"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
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
  )
}
