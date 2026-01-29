'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, Truck, Printer, Filter, Calendar, User, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { fetchApi, useApi } from '@/lib/api/client'

interface Shipment {
  id: string
  shipment_number: string
  customer_id?: string
  customer_name: string
  customer_code: string
  shipment_date: string
  status: string
  total_quantity: number
  item_count: number
  invoice_id?: string | null
  invoice_number?: string | null
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
  const router = useRouter()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([])
  const [readyProducts, setReadyProducts] = useState<any[]>([])
  const [selectedReadyCustomerId, setSelectedReadyCustomerId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCustomer, setFilterCustomer] = useState<string>('all')
  const [filterPeriod, setFilterPeriod] = useState<string>('all') // all, daily, weekly, monthly
  const [filterCompleted, setFilterCompleted] = useState<string>('all') // all, pending, in_transit, delivered, cancelled
  const [showDetailedView, setShowDetailedView] = useState<boolean>(false) // Detaylı görünüm (müşteri ve ürün bazlı)
  const [customers, setCustomers] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)
  const [creatingInvoiceId, setCreatingInvoiceId] = useState<string | null>(null)

  useEffect(() => {
    loadCustomers()
  }, [])

  const shipmentsKey = useMemo(() => {
    if (filterStatus === 'ready') return null
    let url = '/api/shipments'
    const params = new URLSearchParams()

    if (filterCompleted !== 'all') {
      params.append('status', filterCompleted)
    } else if (filterStatus !== 'all') {
      params.append('status', filterStatus)
    }

    if (filterCustomer !== 'all') params.append('customer_id', filterCustomer)

    if (filterPeriod !== 'all') {
      const now = new Date()
      let startDate: Date

      if (filterPeriod === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (filterPeriod === 'weekly') {
        const dayOfWeek = now.getDay()
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        startDate = new Date(now.getFullYear(), now.getMonth(), diff)
      } else if (filterPeriod === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      } else {
        startDate = new Date(0)
      }

      params.append('start_date', startDate.toISOString().split('T')[0])
      params.append('end_date', now.toISOString().split('T')[0])
    }

    if (params.toString()) url += '?' + params.toString()
    return url
  }, [filterStatus, filterCompleted, filterCustomer, filterPeriod])

  const readyItemsKey = useMemo(() => {
    return filterStatus === 'ready' ? '/api/shipments/ready-items' : null
  }, [filterStatus])

  const readyProductsKey = useMemo(() => {
    if (filterStatus !== 'ready' || !selectedReadyCustomerId) return null
    return `/api/shipments/ready-items?customer_id=${selectedReadyCustomerId}`
  }, [filterStatus, selectedReadyCustomerId])

  const { data: shipmentsData, isLoading: shipmentsLoading, mutate: mutateShipments } = useApi<Shipment[]>(shipmentsKey)
  const { data: readyItemsData, isLoading: readyItemsLoading } = useApi<{ items: any[] }>(readyItemsKey)
  const { data: readyProductsData, isLoading: readyProductsLoading } = useApi<{ items: any[] }>(readyProductsKey)

  const isLoading = shipmentsLoading || readyItemsLoading || readyProductsLoading

  useEffect(() => {
    if (filterStatus === 'ready') {
      const items = readyItemsData?.items || []
      const grouped: Record<string, { customer_id: string; customer_name: string; customer_code: string; count: number }> = {}
      items.forEach((item: any) => {
        const customerId = item.customer_id || 'no-customer'
        const customerName = item.customer_name || 'Müşteri Seçilmemiş'
        const customerCode = item.customer_code || '-'

        if (!grouped[customerId]) {
          grouped[customerId] = {
            customer_id: customerId,
            customer_name: customerName,
            customer_code: customerCode,
            count: 0,
          }
        }
        grouped[customerId].count++
      })

      const sortedCustomers = Object.values(grouped).sort((a, b) => {
        if (a.customer_name === 'Müşteri Seçilmemiş') return 1
        if (b.customer_name === 'Müşteri Seçilmemiş') return -1
        return a.customer_name.localeCompare(b.customer_name, 'tr')
      })

      setReadyItems(sortedCustomers)
      setShipments([])
      if (!selectedReadyCustomerId) {
        setReadyProducts([])
      }
    } else {
      setShipments(shipmentsData ?? [])
      setReadyItems([])
      setReadyProducts([])
    }
  }, [filterStatus, readyItemsData, shipmentsData, selectedReadyCustomerId])

  useEffect(() => {
    if (filterStatus === 'ready' && selectedReadyCustomerId) {
      setReadyProducts(readyProductsData?.items || [])
    }
  }, [filterStatus, selectedReadyCustomerId, readyProductsData])


  async function loadCustomers() {
    try {
      const data = await fetchApi('/api/accounts?type=customer')
      setCustomers(data)
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }


  function handleReadyCustomerClick(customerId: string) {
    // Direkt yeni sevkiyat sayfasına yönlendir
    router.push(`/shipments/new?customerId=${customerId}`)
  }

  // Türkçe karakterleri ASCII'ye çevir
  function toASCII(text: string): string {
    return text
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ç/g, 'c').replace(/Ç/g, 'C')
  }

  async function exportToPDF() {
    if (typeof window === 'undefined' || filterStatus === 'ready') return
    
    setExporting(true)
    try {
      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default || jsPDFModule
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPos = 20
      const margin = 15
      const lineHeight = 7

      // Başlık
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      const title = 'SEVKIYAT RAPORU'
      doc.text(title, pageWidth / 2, yPos, { align: 'center' })
      yPos += 10

      // Tarih ve filtre bilgisi
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const dateStr = new Date().toLocaleDateString('tr-TR')
      doc.text(toASCII(`Rapor Tarihi: ${dateStr}`), margin, yPos)
      yPos += 5
      
      const periodText = filterPeriod === 'daily' ? 'Gunluk' : 
                         filterPeriod === 'weekly' ? 'Haftalik' : 
                         filterPeriod === 'monthly' ? 'Aylik' : 'Tumu'
      doc.text(toASCII(`Periyot: ${periodText}`), margin, yPos)
      yPos += 8

      // Toplam bilgisi
      const totalQuantity = shipments.reduce((sum, s) => sum + s.total_quantity, 0)
      const totalAmount = shipments.reduce((sum, s) => sum + (s.total_amount || 0), 0)
      doc.setFont('helvetica', 'bold')
      doc.text(toASCII(`Toplam Sevkiyat: ${shipments.length} adet`), margin, yPos)
      yPos += 5
      doc.text(toASCII(`Toplam Miktar: ${totalQuantity} adet`), margin, yPos)
      yPos += 5
      doc.text(toASCII(`Toplam Tutar: ${totalAmount.toFixed(2)} TL`), margin, yPos)
      yPos += 8

      // Tablo başlıkları
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const headers = ['Sevk No', 'Musteri', 'Tarih', 'Adet', 'Durum']
      const colWidths = [35, 50, 30, 20, 35]
      let xPos = margin

      headers.forEach((header, index) => {
        doc.text(header, xPos, yPos)
        xPos += colWidths[index]
      })
      yPos += 5

      // Çizgi
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 3

      // Sevkiyat satırları
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      
      shipments.forEach((shipment) => {
        // Sayfa sonu kontrolü
        if (yPos > pageHeight - 30) {
          doc.addPage()
          yPos = 20
        }

        xPos = margin
        const statusText = shipment.status === 'delivered' ? 'Teslim Edildi' :
                          shipment.status === 'in_transit' ? 'Yolda' :
                          shipment.status === 'cancelled' ? 'Iptal' :
                          'Beklemede'
        
        // Tarih formatla
        let shipmentDate = ''
        try {
          if (shipment.shipment_date) {
            const date = new Date(shipment.shipment_date)
            if (!isNaN(date.getTime())) {
              shipmentDate = date.toLocaleDateString('tr-TR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
              })
            }
          }
        } catch (e) {
          shipmentDate = shipment.shipment_date || ''
        }
        
        doc.text(shipment.shipment_number, xPos, yPos)
        xPos += colWidths[0]
        
        // Müşteri adı (uzunsa kısalt ve Türkçe karakterleri çevir)
        const customerName = toASCII(shipment.customer_name || '')
        const customerText = customerName.length > 20 
          ? customerName.substring(0, 20) + '...'
          : customerName
        doc.text(customerText, xPos, yPos)
        xPos += colWidths[1]
        
        doc.text(shipmentDate, xPos, yPos)
        xPos += colWidths[2]
        
        doc.text(shipment.total_quantity.toString(), xPos, yPos)
        xPos += colWidths[3]
        
        doc.text(toASCII(statusText), xPos, yPos)
        
        yPos += lineHeight
        
        // Ürünleri ekle (varsa)
        if (shipment.items && shipment.items.length > 0) {
          shipment.items.forEach((item) => {
            // Sayfa sonu kontrolü
            if (yPos > pageHeight - 20) {
              doc.addPage()
              yPos = 20
            }
            
            xPos = margin + 5 // Girintili
            
            // Ürün adı
            const productName = toASCII(item.product_name || 'Urun Adi Yok')
            const productText = productName.length > 18 
              ? productName.substring(0, 18) + '...'
              : productName
            doc.text('  - ' + productText, xPos, yPos)
            xPos += colWidths[0] + colWidths[1] - 5
            
            // SKU
            const skuText = toASCII(item.product_sku || '-')
            doc.text('SKU: ' + skuText, xPos, yPos)
            xPos += colWidths[2]
            
            // Adet
            doc.text(item.quantity.toString() + ' adet', xPos, yPos)
            
            yPos += lineHeight - 1
          })
        }
      })

      // Dosya adı oluştur
      const periodSuffix = filterPeriod === 'daily' ? '_Gunluk' : 
                          filterPeriod === 'weekly' ? '_Haftalik' : 
                          filterPeriod === 'monthly' ? '_Aylik' : '_Tumu'
      const fileName = `Sevkiyat_Raporu${periodSuffix}_${dateStr.replace(/\//g, '-')}.pdf`
      
      doc.save(fileName)
    } catch (error: any) {
      console.error('PDF export hatası:', error)
      alert('PDF oluşturulurken hata oluştu: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  async function createInvoice(shipmentId: string) {
    setCreatingInvoiceId(shipmentId)
    try {
      const result = await fetchApi('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipment_id: shipmentId })
      })
      if (result?.invoice?.id) {
        router.push(`/invoices/${result.invoice.id}`)
      } else {
        await mutateShipments()
        alert('Fatura oluşturuldu')
      }
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setCreatingInvoiceId(null)
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
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center space-x-2">
              <Truck className="w-6 h-6 md:w-8 md:h-8" />
              <span>Sevkiyat Yönetimi</span>
            </h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-sm text-gray-400">Sevkiyat fişleri ve takibi</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          {filterStatus !== 'ready' && shipments.length > 0 && (
            <button
              onClick={exportToPDF}
              disabled={exporting}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition inline-flex items-center space-x-2 text-sm touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={20} />
              <span>{exporting ? 'PDF Oluşturuluyor...' : 'PDF Aktar'}</span>
            </button>
          )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <option value="in_transit">Yolda</option>
              <option value="delivered">Teslim Edildi</option>
              <option value="cancelled">İptal</option>
              <option value="ready">Sevk Edilebilir</option>
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Yapılan İşlem
            </label>
            <select
              value={filterCompleted}
              onChange={(e) => setFilterCompleted(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Tümü</option>
              <option value="pending">Beklemede</option>
              <option value="in_transit">Yolda</option>
              <option value="delivered">Teslim Edildi</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Tarih Filtresi
            </label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Tümü</option>
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
            </select>
          </div>
        </div>
        {/* Detaylı Filtre - Sadece Tümü seçildiğinde göster */}
        {(filterStatus === 'all' && filterCompleted === 'all') && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDetailedView}
                onChange={(e) => setShowDetailedView(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-300">
                Detaylı Görünüm (Müşteri ve Ürün Bazlı)
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Sevkiyatları müşteri bazında gruplayıp, her müşteri altında ürünleri gösterir
            </p>
          </div>
        )}
      </div>

      {/* Sevkiyat Listesi */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : filterStatus === 'ready' ? (
        <div className="space-y-4">
          {readyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <LogoWithBackground size="lg" className="mb-6" />
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Sevk Edilebilir Ürün Yok</h3>
              <p className="text-sm text-gray-400">Henüz sevk edilebilir ürün bulunmuyor</p>
            </div>
          ) : (
            selectedReadyCustomerId ? (
              // Seçili cariye ait ürünler
              <div>
                <button
                  onClick={() => {
                    setSelectedReadyCustomerId(null)
                    setReadyProducts([])
                  }}
                  className="mb-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition inline-flex items-center space-x-2 text-sm"
                >
                  <span>← Geri</span>
                </button>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-400">Yükleniyor...</p>
                  </div>
                ) : readyProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <LogoWithBackground size="lg" className="mb-6" />
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Sevk Edilebilir Ürün Yok</h3>
                    <p className="text-sm text-gray-400">Bu cari için sevk edilebilir ürün bulunmuyor</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <Link
                        href={`/shipments/new?customerId=${selectedReadyCustomerId}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 text-sm"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Sevk Et</span>
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {readyProducts.map((item: any) => (
                        <div
                          key={item.product_id}
                          className="bg-gray-900 rounded-lg border border-gray-800 p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-white">{item.product_name}</h3>
                              <p className="text-sm text-gray-400">SKU: {item.product_sku}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-blue-400">{item.total_count} adet</div>
                              <div className="text-xs text-gray-500">sevk edilebilir</div>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-800">
                            <div className="text-xs text-gray-400 mb-1">Barkodlar:</div>
                            <div className="flex flex-wrap gap-2">
                              {item.items.map((barcodeItem: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-gray-800 rounded text-xs font-mono text-gray-300"
                                >
                                  {barcodeItem.barcode}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Cari listesi
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readyItems.map((customerItem: any) => (
                  <div
                    key={customerItem.customer_id}
                    onClick={() => handleReadyCustomerClick(customerItem.customer_id)}
                    className="bg-gray-900 rounded-lg border border-gray-800 p-4 hover:border-blue-500 hover:bg-gray-800 transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {customerItem.customer_name}
                        </h3>
                        <p className="text-sm text-gray-400">{customerItem.customer_code}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Sevk Edilebilir Ürün</span>
                        <span className="text-sm font-bold text-blue-400">{customerItem.count} adet</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      ) : shipments.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <LogoWithBackground size="lg" className="mb-6" />
          <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Henüz Sevkiyat Yok</h3>
          <p className="text-sm text-gray-400 mb-4">İlk sevkiyatınızı oluşturun</p>
          <Link
            href="/shipments/new"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Yeni Sevkiyat Oluştur
          </Link>
        </div>
      ) : showDetailedView && filterStatus === 'all' && filterCompleted === 'all' ? (
        // Detaylı görünüm: Müşteri bazlı gruplama
        <div className="space-y-6">
          {(() => {
            // Sevkiyatları müşteriye göre grupla
            const groupedByCustomer: Record<string, Shipment[]> = {}
            shipments.forEach((shipment) => {
              const customerKey = (shipment as any).customer_id || shipment.customer_name || 'no-customer'
              if (!groupedByCustomer[customerKey]) {
                groupedByCustomer[customerKey] = []
              }
              groupedByCustomer[customerKey].push(shipment)
            })

            return Object.entries(groupedByCustomer)
              .sort(([keyA, shipmentsA], [keyB, shipmentsB]) => {
                const nameA = shipmentsA[0]?.customer_name || ''
                const nameB = shipmentsB[0]?.customer_name || ''
                return nameA.localeCompare(nameB, 'tr')
              })
              .map(([customerKey, customerShipments]) => {
                const firstShipment = customerShipments[0]
                const customerName = firstShipment.customer_name || 'Müşteri Seçilmemiş'
                const customerCode = firstShipment.customer_code || '-'
                const totalQuantity = customerShipments.reduce((sum, s) => sum + s.total_quantity, 0)
                const shipmentCount = customerShipments.length

                return (
                  <div key={customerKey} className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6">
                    {/* Müşteri Başlığı */}
                    <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-800">
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold text-white mb-1">
                          {customerName}
                        </h3>
                        <p className="text-sm text-gray-400">Cari Kodu: {customerCode}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-400">
                          {shipmentCount} {shipmentCount === 1 ? 'Sevkiyat' : 'Sevkiyat'}
                        </div>
                        <div className="text-xs text-gray-500">{totalQuantity} adet toplam</div>
                      </div>
                    </div>

                    {/* Sevkiyatlar */}
                    <div className="space-y-4">
                      {customerShipments.map((shipment) => {
                        let shipmentDate = ''
                        try {
                          if (shipment.shipment_date) {
                            const date = new Date(shipment.shipment_date)
                            if (!isNaN(date.getTime())) {
                              shipmentDate = date.toLocaleDateString('tr-TR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })
                            }
                          }
                        } catch (e) {
                          shipmentDate = shipment.shipment_date || ''
                        }

                        return (
                          <div
                            key={shipment.id}
                            className="bg-gray-800 rounded-lg border border-gray-700 p-4"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <Link
                                    href={`/shipments/${shipment.id}`}
                                    className="text-blue-400 hover:text-blue-300 font-semibold text-sm md:text-base"
                                  >
                                    {shipment.shipment_number}
                                  </Link>
                                  {getStatusBadge(shipment.status)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  <span>Tarih: {shipmentDate}</span>
                                  <span className="mx-2">•</span>
                                  <span>Toplam: {shipment.total_quantity} adet</span>
                                </div>
                              </div>
                            </div>

                            {/* Ürünler */}
                            {shipment.items && shipment.items.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                <div className="text-xs font-medium text-gray-400 mb-2">Ürünler:</div>
                                <div className="space-y-2">
                                  {shipment.items.map((item, itemIndex) => (
                                    <div
                                      key={item.id || itemIndex}
                                      className="flex items-center justify-between bg-gray-900 rounded p-2 text-sm"
                                    >
                                      <div className="flex-1">
                                        <div className="text-white font-medium">
                                          {item.product_name || 'Ürün Adı Yok'}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                          SKU: {item.product_sku || '-'}
                                        </div>
                                      </div>
                                      <div className="text-right ml-4">
                                        <div className="text-white font-semibold">
                                          {item.quantity} adet
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
          })()}
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
                  <TableHead className="h-8 px-4 py-2 text-xs">Fatura</TableHead>
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
                      {shipment.invoice_id ? (
                        <Link
                          href={`/invoices/${shipment.invoice_id}`}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          {shipment.invoice_number || 'Fatura'}
                        </Link>
                      ) : (
                        <span className="text-gray-500 text-xs">-</span>
                      )}
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
                        {!shipment.invoice_id && (
                          <button
                            onClick={() => createInvoice(shipment.id)}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-60"
                            type="button"
                            disabled={creatingInvoiceId === shipment.id}
                          >
                            {creatingInvoiceId === shipment.id ? 'Oluşturuluyor...' : 'Fatura'}
                          </button>
                        )}
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

