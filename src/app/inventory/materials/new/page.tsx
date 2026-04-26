'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X, Save, ArrowLeft } from 'lucide-react'
import { toast } from '@/lib/notify'
import { materialSchemas } from '@/lib/validation/schemas'
import { fetchApi } from '@/lib/api/client'
import type { z } from 'zod'

interface Category {
  id: string
  name: string
  description: string
}

type MaterialFormData = z.infer<typeof materialSchemas.create>

const defaultValues: MaterialFormData = {
  code: '',
  name: '',
  unit: '',
  category: '',
  unit_cost: 0,
  unit_price: 0,
  min_stock: 0,
  max_stock: 0,
}

export default function NewMaterialPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [codeLoading, setCodeLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchemas.create) as Resolver<MaterialFormData>,
    defaultValues,
  })

  useEffect(() => {
    async function init() {
      // Basit kod üretimi (ileride geliştirilebilir)
      const newCode = `MAT-${Date.now().toString().slice(-6)}`
      setValue('code', newCode)
      setCodeLoading(false)
      await loadCategories()
    }
    init()
  }, [setValue])

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

  const onValid = async (data: MaterialFormData) => {
    setLoading(true)
    try {
      await fetchApi('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      toast.success('Hammadde başarıyla oluşturuldu!')
      router.push('/inventory/materials')
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link href="/inventory/materials" className="text-blue-400 hover:text-blue-300 mb-4 inline-flex items-center space-x-1">
          <ArrowLeft className="w-4 h-4" />
          <span>Geri Dön</span>
        </Link>
        <h1 className="text-3xl font-bold text-white">Yeni Hammadde Ekle</h1>
        <p className="text-gray-400 mt-1">Yeni hammadde kartı oluşturun</p>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-2xl">
        <form onSubmit={handleSubmit(onValid)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Hammadde Kodu *
            </label>
            {codeLoading ? (
              <div className="w-full px-3 py-2 border border-gray-700 rounded-lg bg-gray-800 animate-pulse">
                <span className="text-gray-400 text-sm">Kod oluşturuluyor...</span>
              </div>
            ) : (
              <input
                type="text"
                {...register('code')}
                readOnly
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg cursor-not-allowed opacity-75"
                placeholder="Örn: MAT-001"
              />
            )}
            {errors.code && (
              <p className="mt-1 text-sm text-red-400">{errors.code.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Hammadde Adı *
            </label>
            <input
              type="text"
              {...register('name')}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-700'
              }`}
              placeholder="Örn: Kadife Kumaş"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
            )}
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
              {...register('category')}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.category ? 'border-red-500' : 'border-gray-700'
              }`}
            >
              <option value="">Kategori seçin...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-400">{errors.category.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Birim *
              </label>
              <select
                {...register('unit')}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.unit ? 'border-red-500' : 'border-gray-700'
                }`}
              >
                <option value="">Birim seçin...</option>
                <option value="metre">Metre</option>
                <option value="adet">Adet</option>
                <option value="kg">Kilogram</option>
                <option value="m²">Metrekare</option>
              </select>
              {errors.unit && (
                <p className="mt-1 text-sm text-red-400">{errors.unit.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Birim Maliyet (₺)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('unit_cost', { valueAsNumber: true })}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.unit_cost ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="0.00"
              />
              {errors.unit_cost && (
                <p className="mt-1 text-sm text-red-400">{errors.unit_cost.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Başlangıç Stoku
              </label>
              <input
                type="number"
                step="0.01"
                {...register('min_stock', { valueAsNumber: true })}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.min_stock ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="0.00"
              />
              {errors.min_stock && (
                <p className="mt-1 text-sm text-red-400">{errors.min_stock.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Kritik Stok Seviyesi
              </label>
              <input
                type="number"
                step="0.01"
                {...register('max_stock', { valueAsNumber: true })}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.max_stock ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="0.00"
              />
              {errors.max_stock && (
                <p className="mt-1 text-sm text-red-400">{errors.max_stock.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
            <Link
              href="/inventory/materials"
              className="px-6 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Kaydediliyor...' : 'Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Yeni Kategori Oluşturma Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-md w-full shadow-2xl">
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
