'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { generateProductCode } from '@/lib/utils/codeGenerator'

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(true)

  useEffect(() => {
    async function loadCode() {
      try {
        const newCode = await generateProductCode()
        setCode(newCode)
      } catch (error) {
        console.error('Kod oluşturulurken hata:', error)
        setCode('KOL-001')
      } finally {
        setCodeLoading(false)
      }
    }
    loadCode()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    // TODO: Supabase'e kaydet
    setTimeout(() => {
      setLoading(false)
      router.push('/products')
    }, 1000)
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/products" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          ← Geri Dön
        </Link>
        <h1 className="text-3xl font-bold text-white">Yeni Ürün Ekle</h1>
        <p className="text-gray-400 mt-1">Yeni ürün kartı oluşturun</p>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Ürün Kodu *
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
                  placeholder="Örn: KOL-001"
                />
              )}
              <p className="text-xs text-gray-400 mt-1">Kod otomatik oluşturuldu</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Ürün Adı *
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Suna Koltuk"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Örn: Koltuk"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Birim *
                </label>
                <select
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="adet">Adet</option>
                  <option value="metre">Metre</option>
                  <option value="m²">m²</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Temel Maliyet (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Temel Fiyat (₺)
                </label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Açıklama
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ürün açıklaması..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Link
                href="/products"
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
    </div>
  )
}

