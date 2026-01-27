'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface Product {
  id: string
  code: string
  name: string
  category: string | null
  base_cost: number
  base_price: number
  unit: string
  is_active: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      // Local database kullan
      const { localDB } = await import('@/lib/database/client')
      const data = await localDB.getProducts()
      
      // API formatını sayfa formatına çevir
      setProducts(data.map((p: any) => ({
        id: p.id,
        code: p.sku,
        name: p.name,
        category: null,
        base_cost: 0,
        base_price: p.price || 0,
        unit: 'adet',
        is_active: true,
      })))
    } catch (err: any) {
      console.error('Error loading products:', err)
      setError(err.message || 'Ürünler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Ürün Yönetimi</h1>
          <p className="text-gray-400 mt-1">Nebim tarzı dinamik varyant yapısı</p>
        </div>
        <Link
          href="/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
        >
          <span>+</span>
          <span>Yeni Ürün</span>
        </Link>
      </div>

        {error && (
          <div className="bg-yellow-900 border border-yellow-700 text-yellow-300 px-4 py-3 rounded mb-4">
            <p className="font-medium">Bilgi:</p>
            <p className="text-sm">{error}</p>
            <p className="text-sm mt-1">Supabase bağlantısı yapılmadığı için demo veriler gösteriliyor.</p>
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
                  <TableHead className="h-8">Kod</TableHead>
                  <TableHead className="h-8">Ürün Adı</TableHead>
                  <TableHead className="h-8">Kategori</TableHead>
                  <TableHead className="h-8">Birim</TableHead>
                  <TableHead className="h-8">Maliyet</TableHead>
                  <TableHead className="h-8">Fiyat</TableHead>
                  <TableHead className="h-8">Durum</TableHead>
                  <TableHead className="h-8">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 text-xs py-8">
                      Henüz ürün eklenmemiş
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium text-white text-xs">
                        {product.code}
                      </TableCell>
                      <TableCell className="text-white text-xs">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">
                        {product.category || '-'}
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">
                        {product.unit}
                      </TableCell>
                      <TableCell className="text-white text-xs">
                        {product.base_cost.toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: 'TRY',
                        })}
                      </TableCell>
                      <TableCell className="text-white text-xs">
                        {product.base_price.toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: 'TRY',
                        })}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                            product.is_active
                              ? 'bg-green-900 text-green-300'
                              : 'bg-red-900 text-red-300'
                          }`}
                        >
                          {product.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Link
                          href={`/products/${product.id}`}
                          className="text-blue-400 hover:text-blue-300 mr-2"
                        >
                          Görüntüle
                        </Link>
                        <Link
                          href={`/products/${product.id}/variants`}
                          className="text-indigo-400 hover:text-indigo-300"
                        >
                          Varyantlar
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
    </div>
  )
}

