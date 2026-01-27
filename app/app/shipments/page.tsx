'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Truck, Printer, Filter, Calendar, User, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface Shipment {
  id: string
  shipment_number: string
  customer_name: string
  customer_code: string
  shipment_date: string
  status: string
  total_quantity: number
  item_count: number
  items?: Array<{
    id: string
    product_name: string
    product_sku: string
    quantity: number
  }>
}

interface ReadyItem {
  customer_id: string
  customer_name: string
  customer_code: string
  products: Array<{
    product_id: string
    product_name: string
    product_sku: string
    available_count: number
    barcodes: string[]
  }>
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCustomer, setFilterCustomer] = useState<string>('all')
  const [customers, setCustomers] = useState<any[]>([])

  useEffect(() => {
    loadShipments()
    loadCustomers()
  }, [filterStatus, filterCustomer])

  async function loadShipments() {
    setLoading(true)
    try {
      // Eğer "Sevk Edilebilir" filtresi seçildiyse, ready items yükle
      if (filterStatus === 'ready') {
        const response = await fetch('/api/shipments/ready-items')
        if (!response.ok) throw new Error('Sevk edilebilir ürünler yüklenemedi')
        const data = await response.json()
        
        // API'den gelen items array'ini kullan
        const items = data.items || []
        
        // Müşterilere göre grupla
        const grouped: Record<string, ReadyItem> = {}
        items.forEach((item: any) => {
          const customerId = item.customer_id || 'no-customer'
          const customerName = item.customer_name || 'Müşteri Seçilmemiş'
          const customerCode = item.customer_code || '-'
          
          if (!grouped[customerId]) {
            grouped[customerId] = {
              customer_id: customerId,
              customer_name: customerName,
              customer_code: customerCode,
              products: [],
            }
          }
          
          const productIndex = grouped[customerId].products.findIndex(
            p => p.product_id === item.product_id
          )
          
          if (productIndex >= 0) {
            grouped[customerId].products[productIndex].available_count += 1
            if (item.barcode && !grouped[customerId].products[productIndex].barcodes.includes(item.barcode)) {
              grouped[customerId].products[productIndex].barcodes.push(item.barcode)
            }
          } else {
            grouped[customerId].products.push({
              product_id: item.product_id,
              product_name: item.product_name,
              product_sku: item.product_sku,
              available_count: 1,
              barcodes: item.barcode ? [item.barcode] : [],
            })
          }
        })
        
        setReadyItems(Object.values(grouped))
        setShipments([])
      } else {
        // Normal sevkiyat listesi
        let url = '/api/shipments'
        const params = new URLSearchParams()
        if (filterStatus !== 'all') params.append('status', filterStatus)
        if (filterCustomer !== 'all') params.append('customer_id', filterCustomer)
        if (params.toString()) url += '?' + params.toString()

        const response = await fetch(url)
        if (!response.ok) throw new Error('Sevkiyatlar yüklenemedi')
        const data = await response.json()
        setShipments(data)
        setReadyItems([])
      }
    } catch (error) {
      console.error('Error loading shipments:', error)
      alert('Sevkiyatlar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

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

  function getStatusBadge(status: string) {
    const badges: Record<string, { color: string; icon: any; text: string }> = {
      pending: { color: 'bg-yellow-900 text-yellow-300', icon: Clock, text: 'Beklemede' },
      in_transit: { color: 'bg-blue-900 text-blue-300', icon: Truck, text: 'Yolda' },
      delivered: { color: 'bg-green-900 text-green-300', icon: CheckCircle, text: 'Teslim Edildi' },
      cancelled: { color: 'bg-red-900 text-red-300', icon: XCircle, text: 'İptal' },
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <Truck className="w-6 h-6 md:w-8 md:h-8" />
            <span>Sevkiyat Yönetimi</span>
          </h1>
          <p className="text-sm text-gray-400">Sevkiyat fişleri ve takibi</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <Link
            href="/shipments/new"
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 text-sm touch-manipulation"
          >
            <Package size={20} />
            <span>Yeni Sevkiyat</span>
          </Link>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Durum
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Tümü</option>
              <option value="pending">Beklemede</option>
              <option value="ready">Sevk Edilebilir</option>
              <option value="delivered">Teslim Edildi</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Müşteri
            </label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Tümü</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.code} - {customer.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sevkiyat Listesi */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : filterStatus === 'ready' ? (
        <div className="space-y-4">
          {readyItems.length === 0 ? (
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Sevk Edilebilir Ürün Yok</h3>
              <p className="text-sm text-gray-400">Henüz sevk edilebilir ürün bulunmuyor</p>
            </div>
          ) : (
            readyItems.map((customerGroup) => (
              <div key={customerGroup.customer_id} className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {customerGroup.customer_name}
                    </h3>
                    <p className="text-sm text-gray-400">{customerGroup.customer_code}</p>
                  </div>
                  <Link
                    href={`/shipments/new?customer_id=${customerGroup.customer_id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 text-sm"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Sevk Et</span>
                  </Link>
                </div>
                <div className="space-y-2">
                  {customerGroup.products.map((product) => (
                    <div
                      key={product.product_id}
                      className="bg-gray-800 rounded-lg p-3 flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-white text-sm">{product.product_name}</div>
                        <div className="text-xs text-gray-400">{product.product_sku}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {product.available_count} adet sevk edilebilir
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                          {product.barcodes.length} barkod
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : shipments.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
          <Truck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Henüz Sevkiyat Yok</h3>
          <p className="text-sm text-gray-400 mb-4">İlk sevkiyatınızı oluşturun</p>
          <Link
            href="/shipments/new"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Yeni Sevkiyat Oluştur
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="h-8 px-4 py-2 text-xs">Sevk No</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Müşteri</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Tarih</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Adet</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Kalem</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Durum</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shipment) => (
                  <TableRow key={shipment.id} className="hover:bg-gray-800/50">
                    <TableCell className="font-medium text-white text-xs px-4 py-2">
                      {shipment.shipment_number}
                    </TableCell>
                    <TableCell className="text-white text-xs px-4 py-2">
                      <div>
                        <div className="font-medium">{shipment.customer_name}</div>
                        <div className="text-gray-400 text-xs">{shipment.customer_code}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs px-4 py-2">
                      {new Date(shipment.shipment_date).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-white text-xs px-4 py-2">
                      {shipment.total_quantity} adet
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs px-4 py-2">
                      {shipment.item_count} kalem
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {getStatusBadge(shipment.status)}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/shipments/${shipment.id}`}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition touch-manipulation"
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          Fiş
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

