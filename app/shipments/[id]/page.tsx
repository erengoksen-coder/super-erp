'use client'

import { useState, useEffect } from 'react'
import { formatDate, formatDateTime } from '@/lib/utils/dateFormat'
import { useParams, useRouter } from 'next/navigation'
import { Printer, ArrowLeft, Truck, Calendar, User, Package, CheckCircle, Edit, Save, X, AlertCircle, RotateCcw, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'

interface Shipment {
  id: string
  shipment_number: string
  customer_name: string
  customer_code: string
  customer_address: string
  customer_phone: string
  customer_email: string
  shipment_date: string
  created_at?: string
  status: string
  total_quantity: number
  total_amount?: number
  discount_rate?: number | null
  discount_amount?: number | null
  tax_rate?: number
  tax_amount?: number
  final_amount?: number
  notes: string
  end_customer_name?: string | null
  dealer_name?: string | null
  approval_status?: string | null
  approved_by?: string | null
  approved_at?: string | null
  approval_requested_at?: string | null
  approved_by_name?: string | null
  approved_by_username?: string | null
  customer_risk_limit?: number | null
  customer_balance?: number | null
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
  const user = useAuthStore((state) => state.user)
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [cancelReason, setCancelReason] = useState<string>('')
  
  // Kullanıcının onay yetkisi var mı?
  const userRole = (user?.role || '').toString().toLowerCase()
  const hasApprovalPermission = 
    userRole === 'admin' || 
    userRole === 'manager' || 
    userRole === 'muhasebe' ||
    userRole.includes('muhasebe') ||
    userRole.includes('yönetici') ||
    userRole.includes('yonetici')

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
      const payload = (data && typeof data === 'object' && 'data' in data) ? (data as { data: Shipment }).data : data
      setShipment(payload as Shipment)
    } catch (error) {
      console.error('Error loading shipment:', error)
      toast.error('Sevkiyat yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function handleReturnShipment() {
    if (!confirm('Bu sevkiyatı geri almak istediğinize emin misiniz? Ürünler stoka geri eklenecek ve cari hesap düzeltilecektir.')) {
      return
    }

    try {
      const id = params?.id as string
      if (!id || id === 'undefined') return

      const response = await fetch(`/api/shipments/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Sevkiyat geri alınamadı')
      }

      toast.success('Sevkiyat başarıyla geri alındı! Ürünler stoka eklendi ve cari hesap düzeltildi.')
      router.push('/shipments')
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  function handlePrint() {
    window.print()
  }

  function startEditStatus() {
    setEditingStatus(true)
    const currentStatus = shipment?.status === 'delivered' ? 'shipped' : shipment?.status
    setSelectedStatus(currentStatus || 'pending')
  }

  function cancelEditStatus() {
    setEditingStatus(false)
    setSelectedStatus('')
    setCancelReason('')
  }

  async function handleApprove() {
    if (!shipment) return
    if (!confirm('Bu sevkiyatı onaylamak istediğinize emin misiniz? Risk limiti aşıldığı için onay gerekiyor.')) {
      return
    }
    
    setApproving(true)
    try {
      const response = await fetch(`/api/shipments/${shipment.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Onay işlemi başarısız')
      }
      
      toast.success('Sevkiyat başarıyla onaylandı!')
      // Sevkiyatı yeniden yükle
      const id = params?.id as string
      if (id && id !== 'undefined') {
        loadShipment(id)
      }
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    } finally {
      setApproving(false)
    }
  }

  async function saveStatus() {
    if (!shipment || !selectedStatus) return
    
    // İptal ediliyorsa iptal nedeni zorunlu
    if (selectedStatus === 'cancelled' && !cancelReason.trim()) {
      toast.warning('İptal nedeni zorunludur!')
      return
    }

    try {
      const response = await fetch(`/api/shipments/${shipment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
          cancel_reason: selectedStatus === 'cancelled' ? cancelReason.trim() : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Durum güncellenemedi')
      }

      toast.success('Sevkiyat durumu başarıyla güncellendi!')
      setEditingStatus(false)
      setSelectedStatus('')
      setCancelReason('')
      
      // Sevkiyatı yeniden yükle
      const id = params?.id as string
      if (id && id !== 'undefined') {
        loadShipment(id)
      }
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
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
        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={() => router.push('/shipments')}
            className="text-blue-400 hover:text-blue-300 inline-flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Geri</span>
          </button>
          <div className="flex items-center space-x-2">
            {shipment.approval_status === 'pending' && hasApprovalPermission && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition inline-flex items-center space-x-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{approving ? 'Onaylanıyor...' : 'Onayla'}</span>
              </button>
            )}
            {shipment.status !== 'cancelled' && (
              <button
                onClick={handleReturnShipment}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition inline-flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Geri Al</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır</span>
            </button>
          </div>
        </div>

        {/* Sevkiyat Fişi - Yazdırılabilir (A5) */}
        <div className="shipment-slip bg-white rounded-lg shadow-lg p-6 md:p-8 print:p-8 print:shadow-none print:max-w-[148mm] print:mx-auto print:box-border">
          {/* Başlık */}
          <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/LOGO-2.png" alt="LIVASOFTWARE" className="h-6 w-auto object-contain print:h-6" onError={(e) => { const t = e.target as HTMLImageElement; if (t) t.src = '/logo.png'; }} />
              <span className="text-xs text-gray-500">LIVASOFTWARE</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">SEVKİYAT FİŞİ</h1>
            <p className="text-gray-600">LIVASOFTWARE</p>
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
                    {formatDateTime(shipment.shipment_date || shipment.created_at)}
                  </span>
                </div>
                {shipment.approval_status === 'pending' && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Onay Durumu:</span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500 text-white">
                      Onay Bekliyor
                    </span>
                  </div>
                )}
                {shipment.approval_status === 'approved' && shipment.approved_by_name && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Onaylandı:</span>
                    <span className="text-sm font-semibold text-green-600">
                      {shipment.approved_by_name} ({shipment.approved_by_username || 'Kullanıcı'})
                      {shipment.approved_at && (
                        <span className="text-gray-500 ml-2">
                          - {formatDateTime(shipment.approved_at)}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {shipment.approval_status === 'pending' && shipment.customer_risk_limit && shipment.customer_balance && shipment.final_amount && (
                  <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <div className="text-yellow-800 font-semibold mb-1">⚠️ Risk Limiti Aşıldı</div>
                    <div className="text-yellow-700 space-y-1">
                      <div>Risk Limiti: {shipment.customer_risk_limit.toFixed(2)} ₺</div>
                      <div>Mevcut Bakiye: {shipment.customer_balance.toFixed(2)} ₺</div>
                      <div>Yeni Bakiye: {(shipment.customer_balance + shipment.final_amount).toFixed(2)} ₺</div>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Durum:</span>
                  {editingStatus ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="px-3 py-2 border-2 border-gray-400 rounded text-sm font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          style={{ minWidth: '200px' }}
                        >
                          <option value="pending" className="text-gray-900 font-semibold">Beklemede</option>
                          <option value="in_transit" className="text-blue-900 font-semibold">Yolda</option>
                          <option value="shipped" className="text-green-900 font-semibold">Sevk Edildi</option>
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
                      {selectedStatus === 'cancelled' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            İptal Nedeni <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="İptal nedenini yazın..."
                            className="w-full px-3 py-2 border-2 border-gray-400 rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                            rows={3}
                            required
                          />
                          {!cancelReason.trim() && (
                            <p className="text-xs text-red-500 mt-1">İptal nedeni zorunludur</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold text-base px-3 py-2 rounded ${
                        shipment.status === 'delivered' || shipment.status === 'shipped' ? 'bg-green-500 text-white' :
                        shipment.status === 'in_transit' ? 'bg-blue-500 text-white' :
                        shipment.status === 'cancelled' ? 'bg-red-600 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {shipment.status === 'delivered' || shipment.status === 'shipped' ? 'Sevk Edildi' :
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
                  <span className="font-semibold text-gray-900 ml-2">
                    {shipment.customer_name}
                  </span>
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

          {/* Ürün Listesi - Detaylı */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Sevkiyat Kalemleri</span>
            </h2>
            <div className="space-y-4">
              {(shipment.items ?? []).map((item, index) => (
                <div key={item.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Sıra No</div>
                      <div className="text-base font-semibold text-gray-900">{index + 1}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Miktar</div>
                      <div className="text-base font-semibold text-gray-900">{item.quantity} adet</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Ürün Kodu</div>
                      <div className="text-base font-semibold text-gray-900">{item.product_sku}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Ürün Adı</div>
                      <div className="text-base font-semibold text-gray-900">{item.product_name}</div>
                    </div>
                  </div>
                  {item.serial_numbers && item.serial_numbers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="text-sm font-medium text-gray-600 mb-2">Barkod/Seri Numaraları:</div>
                      <div className="flex flex-wrap gap-2">
                        {item.serial_numbers.map((barcode, barcodeIndex) => (
                          <span
                            key={barcodeIndex}
                            className="inline-block px-3 py-1.5 bg-white border border-gray-300 rounded text-base font-mono font-semibold text-gray-900"
                          >
                            {barcode}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="text-sm font-medium text-gray-600 mb-1">Notlar:</div>
                      <div className="text-base text-gray-900">
                        {item.notes}
                        {(shipment.end_customer_name || shipment.customer_name)
                          ? ` (Müşteri: ${shipment.end_customer_name || shipment.customer_name})`
                          : ''}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {shipment.notes && (
                <>
                  {shipment.notes.includes('Kısmi sevk açıklaması:') && (() => {
                    const idx = shipment.notes.indexOf('Kısmi sevk açıklaması:')
                    const after = idx >= 0 ? shipment.notes.slice(idx + 'Kısmi sevk açıklaması:'.length).trim() : ''
                    return (
                      <div className="border-2 border-amber-500 rounded-lg p-5 bg-amber-50">
                        <div className="text-base font-bold text-amber-900 mb-2">Kısmi sevk açıklaması (diğer barkodlar neden sevk edilmedi):</div>
                        <div className="text-lg font-semibold text-gray-900">{after || shipment.notes}</div>
                      </div>
                    )
                  })()}
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="text-sm font-medium text-gray-600 mb-1">Notlar:</div>
                    <div className="text-base text-gray-900">
                      {shipment.notes}
                    </div>
                  </div>
                </>
              )}
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <div className="text-lg font-bold text-gray-900 text-right">
                  TOPLAM ADET: {shipment.total_quantity} adet
                </div>
              </div>
            </div>
          </div>

          {/* Alt Bilgi: logo + metin */}
          <div className="mt-8 pt-4 border-t-2 border-gray-300 text-center text-sm text-gray-600">
            <div className="flex items-center justify-center">
              <img src="/LOGO-2.png" alt="" className="h-12 w-56 min-w-[12rem] object-contain print:h-12 print:w-56" onError={(e) => { const t = e.target as HTMLImageElement; if (t) t.src = '/logo.png'; }} />
            </div>
            <p className="mt-2">Bu belge LIVASOFTWARE tarafından otomatik oluşturulmuştur.</p>
            <p className="mt-1">Yazdırma Tarihi: {formatDateTime(new Date())}</p>
            <p className="mt-2 text-sm font-medium text-blue-600">Powered by LIVASOFTWARE</p>
          </div>
        </div>
      </div>

      {/* Yazdırma Stilleri - A5 boyutu (148×210 mm) */}
      <style jsx global>{`
        @media print {
          @page {
            size: 148mm 210mm;
            margin: 10mm;
          }
          body {
            background: white;
          }
          .bg-gray-900 {
            background: white !important;
          }
          .text-white {
            color: #000 !important;
          }
          .shipment-slip {
            max-width: 128mm;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

