'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Factory } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface ProductionOrder {
  id: string
  order_number: string
  product_id: string
  product_name: string
  sku: string
  quantity: number
  status: string
  created_at: string
}

export default function ProductionPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      const response = await fetch('/api/production')
      if (!response.ok) throw new Error('Üretim emirleri yüklenemedi')
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: 'Bekliyor', className: 'bg-yellow-900 text-yellow-300' },
      in_progress: { label: 'Üretimde', className: 'bg-blue-900 text-blue-300' },
      completed: { label: 'Tamamlandı', className: 'bg-green-900 text-green-300' },
      cancelled: { label: 'İptal', className: 'bg-red-900 text-red-300' },
    }
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-800 text-gray-300' }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Üretim Emirleri</h1>
          <p className="text-gray-400 mt-1">SAP tarzı iş istasyonu bazlı rota takibi</p>
        </div>
        <Link
          href="/production/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Yeni Üretim Emri</span>
        </Link>
      </div>

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
                <TableHead className="h-8">Emir No</TableHead>
                <TableHead className="h-8">Ürün</TableHead>
                <TableHead className="h-8">SKU</TableHead>
                <TableHead className="h-8">Miktar</TableHead>
                <TableHead className="h-8">Durum</TableHead>
                <TableHead className="h-8">Tarih</TableHead>
                <TableHead className="h-8">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-400 text-xs py-8">
                    Henüz üretim emri oluşturulmamış
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-white text-xs">
                      {order.order_number}
                    </TableCell>
                    <TableCell className="text-white text-xs">
                      {order.product_name}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {order.sku}
                    </TableCell>
                    <TableCell className="text-white text-xs">
                      {order.quantity} adet
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {new Date(order.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Link
                        href={`/production/${order.id}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Detay
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
