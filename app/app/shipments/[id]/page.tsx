'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Printer, ArrowLeft, Truck, Calendar, User, Package, CheckCircle, Edit, Save, X, AlertCircle } from 'lucide-react'

interface Shipment {
  id: string
  shipment_number: string
  customer_name: string
  customer_code: string
  customer_address: string
  customer_phone: string
  customer_email: string
  shipment_date: string
  status: string
  total_quantity: number
  total_amount?: number
  tax_rate?: number
  tax_amount?: number
  final_amount?: number
  notes: string
  items: Array<{
    id: string
    product_name: string
    product_sku: string
    quantity: number
    serial_numbers?: string[]
    notes?: string
  }>
}

export default function ShipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingStatus, setEditingStatus] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  useEffect(() => {
    const id = params?.id as string
    if (id && id !== 'undefined') {
      loadShipment(id)
    }
  }, [params?.id])

  async function loadShipment(id: string) {
    setLoading(true)
    try {
      const response = await fetch(`/api/shipments/${id}`)
      if (!response.ok) throw new Error('Sevkiyat yüklenemedi')
      const data = await response.json()
      setShipment(data)
    } catch (error) {
      console.error('Error loading shipment:', error)
      alert('Sevkiyat yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function startEditStatus() {
    setEditingStatus(true)
    setSelectedStatus(shipment?.status || 'pending')
  }

  function cancelEditStatus() {
    setEditingStatus(false)
    setSelectedStatus('')
  }

  async function saveStatus() {
    if (!shipment || !selectedStatus) return

    try {
      const response = await fetch(`/api/shipments/${shipment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Durum güncellenemedi')
      }

      alert('✅ Sevkiyat durumu başarıyla güncellendi!')
      setEditingStatus(false)
      setSelectedStatus('')
      
      // Sevkiyatı yeniden yükle
      const id = params?.id as string
      if (id && id !== 'undefined') {
        loadShipment(id)
      }
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Sevkiyat bulunamadı</p>
          <button
            onClick={() => router.push('/shipments')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/shipments')}
            className="text-blue-400 hover:text-blue-300 inline-flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Geri</span>
          </button>
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Yazdır</span>
          </button>
        </div>

        {/* Sevkiyat Fişi - Yazdırılabilir */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 print:p-8 print:shadow-none">
          {/* Başlık */}
          <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">SEVKİYAT FİŞİ</h1>
            <p className="text-gray-600">LIVASOFA ERP Sistemi</p>
          </div>

          {/* Sevkiyat Bilgileri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Truck className="w-5 h-5" />
                <span>Sevkiyat Bilgileri</span>
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sevk No:</span>
                  <span className="font-semibold text-gray-900">{shipment.shipment_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tarih:</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(shipment.shipment_date).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Durum:</span>
                  {editingStatus ? (
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-3 py-2 border-2 border-gray-400 rounded text-sm font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        style={{ minWidth: '200px' }}
                      >
                        <option value="pending" className="text-gray-900 font-semibold">Beklemede</option>
                        <option value="in_transit" className="text-blue-900 font-semibold">Yolda</option>
                        <option value="delivered" className="text-green-900 font-semibold">Sevk Edildi</option>
                        <option value="cancelled" className="text-red-900 font-semibold">Sevk İptal Edildi</option>
                      </select>
                      <button
                        onClick={saveStatus}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                        title="Kaydet"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditStatus}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                        title="İptal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold text-base px-3 py-2 rounded ${
                        shipment.status === 'delivered' ? 'bg-green-500 text-white' :
                        shipment.status === 'in_transit' ? 'bg-blue-500 text-white' :
                        shipment.status === 'cancelled' ? 'bg-red-600 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {shipment.status === 'delivered' ? 'Sevk Edildi' :
                         shipment.status === 'in_transit' ? 'Yolda' :
                         shipment.status === 'cancelled' ? 'Sevk İptal Edildi' :
                         'Beklemede'}
                      </span>
                      <button
                        onClick={startEditStatus}
                        className="ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs"
                        title="Durum Düzenle"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Müşteri Bilgileri</span>
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Müşteri:</span>
                  <span className="font-semibold text-gray-900 ml-2">{shipment.customer_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Kod:</span>
                  <span className="font-semibold text-gray-900 ml-2">{shipment.customer_code}</span>
                </div>
                {shipment.customer_address && (
                  <div>
                    <span className="text-gray-600">Adres:</span>
                    <span className="text-gray-900 ml-2">{shipment.customer_address}</span>
                  </div>
                )}
                {shipment.customer_phone && (
                  <div>
                    <span className="text-gray-600">Telefon:</span>
                    <span className="text-gray-900 ml-2">{shipment.customer_phone}</span>
                  </div>
                )}
                {shipment.customer_email && (
                  <div>
                    <span className="text-gray-600">E-posta:</span>
                    <span className="text-gray-900 ml-2">{shipment.customer_email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ürün Listesi */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Sevkiyat Kalemleri</span>
            </h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">Sıra</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">Ürün Kodu</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">Ürün Adı</th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-900">Miktar</th>
                </tr>
              </thead>
              <tbody>
                {shipment.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{item.product_sku}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{item.quantity} adet</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={3} className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">TOPLAM ADET:</td>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{shipment.total_quantity} adet</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Fiyat Bilgileri */}
          {(shipment.total_amount || shipment.final_amount) && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Fiyat Bilgileri</h2>
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600 bg-gray-50">Ara Toplam:</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                      {shipment.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || '0,00 ₺'}
                    </td>
                  </tr>
                  {shipment.tax_rate > 0 && (
                    <>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600 bg-gray-50">KDV Oranı:</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">
                          %{shipment.tax_rate}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600 bg-gray-50">KDV Tutarı:</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">
                          {shipment.tax_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || '0,00 ₺'}
                        </td>
                      </tr>
                    </>
                  )}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">GENEL TOPLAM:</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">
                      {shipment.final_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || shipment.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || '0,00 ₺'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Notlar */}
          {shipment.notes && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Notlar:</h3>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">{shipment.notes}</p>
            </div>
          )}

          {/* Alt Bilgi */}
          <div className="mt-8 pt-4 border-t-2 border-gray-300 text-center text-xs text-gray-500">
            <p>Bu belge LIVASOFA ERP sistemi tarafından otomatik oluşturulmuştur.</p>
            <p className="mt-1">Yazdırma Tarihi: {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR')}</p>
          </div>
        </div>
      </div>

      {/* Yazdırma Stilleri */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .bg-gray-900 {
            background: white !important;
          }
          .text-white {
            color: #000 !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

