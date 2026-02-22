'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, X } from 'lucide-react'
import { toast } from '@/lib/notify'

interface Category {
  id: string
  name: string
  description: string
}

export default function NewMaterialPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    // Basit kod üretimi (ileride geliştirilebilir)
    const newCode = `MAT-${Date.now().toString().slice(-6)}`
    setCode(newCode)
    setCodeLoading(false)
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const response = await fetch('/api/materials/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error)
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) {
      toast.warning('Kategori adı gerekli')
      return
    }

    try {
      const response = await fetch('/api/materials/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Kategori oluşturulamadı')
      }

      const data = await response.json()
      setCategories([...categories, data.category])
      setNewCategoryName('')
      setShowCategoryModal(false)
      loadCategories() // Kategorileri yeniden yükle
      toast.success('Kategori başarıyla oluşturuldu!')
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const categoryVal = formData.get('category') as string | null
    const data = {
      code: (code || '').trim() || undefined,
      name: (formData.get('name') as string)?.trim(),
      unit: (formData.get('unit') as string)?.trim(),
      category: categoryVal && categoryVal.trim() ? categoryVal.trim() : undefined,
      unit_cost: parseFloat((formData.get('unit_price') as string) || '0') || 0,
      min_stock: parseFloat((formData.get('min_stock_level') as string) || '0') || 0,
      initial_stock: parseFloat((formData.get('stock_amount') as string) || '0') || 0,
    }

    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Hammadde oluşturulamadı')
      }

      toast.success('Hammadde başarıyla oluşturuldu!')
      router.push('/inventory/materials')
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/inventory/materials" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          ← Geri Dön
        </Link>
        <h1 className="text-3xl font-bold text-white">Yeni Hammadde Ekle</h1>
        <p className="text-gray-400 mt-1">Yeni hammadde kartı oluşturun</p>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Hammadde Kodu *
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
                value={code}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg cursor-not-allowed opacity-75"
                placeholder="Örn: MAT-001"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Hammadde Adı *
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Örn: Kadife Kumaş"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-300">
                Kategori (Sınıf)
              </label>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Yeni Kategori</span>
              </button>
            </div>
            <select
              name="category"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Kategori seçin...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Birim *
              </label>
              <select
                name="unit"
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Birim seçin...</option>
                <option value="metre">Metre</option>
                <option value="adet">Adet</option>
                <option value="kg">Kilogram</option>
                <option value="m²">Metrekare</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Başlangıç Stoku
              </label>
              <input
                type="number"
                name="stock_amount"
                step="0.01"
                min="0"
                defaultValue="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Minimum Stok Seviyesi
            </label>
            <input
              type="number"
              name="min_stock_level"
              step="0.01"
              min="0"
              defaultValue="0"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Link
              href="/inventory/materials"
              className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>

      {/* Yeni Kategori Oluşturma Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Yeni Kategori Oluştur</h2>
              <button
                onClick={() => {
                  setShowCategoryModal(false)
                  setNewCategoryName('')
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Kategori Adı *
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Örn: Özel Aksesuar"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowCategoryModal(false)
                    setNewCategoryName('')
                  }}
                  className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

