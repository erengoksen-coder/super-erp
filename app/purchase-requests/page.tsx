'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { ShoppingCart, Package, CheckCircle, XCircle, Clock, RefreshCw, X, Save, Download, FileText } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'
import { formatDate, formatDateTime } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'
import { useAuthStore } from '@/lib/store/authStore'

interface PurchaseRequest {
  id: string
  request_number: string
  material_id: string
  material_name: string
  material_code: string
  material_unit: string
  requested_quantity: number
  received_quantity?: number
  unit_price: number
  total_amount: number
  status: 'draft' | 'ordered' | 'completed' | 'cancelled'
  supplier_name: string | null
  material_supplier_name?: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export default function PurchaseRequestsPage() {
  const user = useAuthStore((s) => s.user)
  const canExport = user?.can_export !== 0
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null)
  const [editQuantity, setEditQuantity] = useState<number>(0)
  const [editUnitPrice, setEditUnitPrice] = useState<number>(0)
  const [editSupplierName, setEditSupplierName] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [creatingOrder, setCreatingOrder] = useState(false)
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight') ?? null
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null)

  useEffect(() => {
    loadRequests()
  }, [filterStatus])

  useEffect(() => {
    if (!highlightId || !requests.length) return
    const found = requests.some((r) => r.id === highlightId)
    if (found && highlightRowRef.current) {
      highlightRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [highlightId, requests])

  async function loadRequests() {
    setLoading(true)
    try {
      const url = filterStatus === 'all' 
        ? '/api/purchase-requests'
        : `/api/purchase-requests?status=${filterStatus}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Satın alma talepleri yüklenemedi')
      const data = await response.json()
      // "completed" olanları filtrele (sadece aktif olanları göster)
      const activeData = data.filter((r: PurchaseRequest) => r.status !== 'completed')
      setRequests(activeData)
    } catch (error) {
      console.error('Satın alma talepleri yüklenirken hata:', error)
      toast.error('Satın alma talepleri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function handleDoubleClick(request: PurchaseRequest) {
    setEditingRequest(request)
    setEditQuantity(request.requested_quantity)
    setEditUnitPrice(request.unit_price)
    
    // Önce mevcut tedarikçi bilgisini kullan, yoksa malzemeden otomatik çek
    const supplierName = request.supplier_name || (request as any).material_supplier_name || ''
    setEditSupplierName(supplierName)
  }

  function cancelEdit() {
    setEditingRequest(null)
    setEditQuantity(0)
    setEditUnitPrice(0)
    setEditSupplierName('')
  }

  async function saveEdit() {
    if (!editingRequest) return

    if (editQuantity <= 0) {
      toast.warning('Miktar pozitif bir değer olmalıdır')
      return
    }

    try {
      const response = await fetch(`/api/purchase-requests/${editingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_quantity: editQuantity,
          unit_price: editUnitPrice,
          supplier_name: editSupplierName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Talebi güncellenemedi')
      }

      toast.success('Miktar başarıyla güncellendi!')
      cancelEdit()
      loadRequests()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function updateStatus(requestId: string, newStatus: 'ordered' | 'completed' | 'cancelled') {
    try {
      const response = await fetch(`/api/purchase-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Durum güncellenemedi')
      }

      toast.success('Durum başarıyla güncellendi!')
      loadRequests()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllDraft() {
    const draftIds = requests.filter((r) => r.status === 'draft').map((r) => r.id)
    if (selectedIds.size >= draftIds.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(draftIds))
  }

  async function createOrderFromSelected() {
    if (selectedIds.size === 0) {
      toast.warning('Lütfen en az bir talep seçin (taslak olanlar)')
      return
    }
    setCreatingOrder(true)
    try {
      const res = await fetch('/api/purchase-requests/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sipariş oluşturulamadı')
      toast.success(data.message || 'Satın alma siparişi oluşturuldu')
      setSelectedIds(new Set())
      loadRequests()
    } catch (e: any) {
      toast.error(e.message || 'Sipariş oluşturulamadı')
    } finally {
      setCreatingOrder(false)
    }
  }

  async function deleteRequest(requestId: string) {
    if (!confirm('Bu satın alma talebini silmek istediğinize emin misiniz?')) {
      return
    }

    try {
      const response = await fetch(`/api/purchase-requests/${requestId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Talebi silinemedi')
      }

      toast.success('Satın alma talebi silindi!')
      loadRequests()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function exportToPDF() {
    if (typeof window === 'undefined') return
    
    // Sadece "ordered" (Sipariş Edildi) durumundaki talepleri al
    const orderedRequests = requests.filter(r => r.status === 'ordered')
    
    if (orderedRequests.length === 0) {
      toast.warning('Sipariş edilmiş talep bulunmuyor!')
      return
    }

    setExporting(true)
    try {
      // jsPDF'yi dinamik olarak yükle
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
      const title = 'SIPARIS EDILMIS SATIN ALMA TALEPLERI'
      doc.text(title, pageWidth / 2, yPos, { align: 'center' })
      yPos += 10

      // Tarih
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const dateStr = formatDate(new Date())
      doc.text(`Tarih: ${dateStr}`, margin, yPos)
      yPos += 8

      // Toplam bilgisi
      const totalAmount = orderedRequests.reduce((sum, r) => sum + r.total_amount, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(`Toplam Talep: ${orderedRequests.length} adet`, margin, yPos)
      yPos += 5
      doc.text(`Toplam Tutar: ${totalAmount.toFixed(2)} TL`, margin, yPos)
      yPos += 8

      // Tablo başlıkları - Kolon genişliklerini düzenle
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const headers = ['Talep No', 'Malzeme', 'Tedarikçi', 'Kod', 'Miktar', 'Birim', 'Birim Fiyat', 'Toplam']
      // Kolon genişliklerini ayarla: Talep No, Malzeme, Tedarikçi, Kod, Miktar, Birim, Birim Fiyat, Toplam
      const colWidths = [28, 35, 30, 15, 15, 10, 20, 20]
      let xPos = margin

      headers.forEach((header, index) => {
        if (index === 3 || index === 4 || index === 6 || index === 7) {
          // Kod, Miktar, Birim Fiyat, Toplam için sağa hizalı
          doc.text(header, xPos + colWidths[index] - 2, yPos, { align: 'right' })
        } else {
          doc.text(header, xPos, yPos)
        }
        xPos += colWidths[index]
      })
      yPos += 5

      // Çizgi
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 3

      // Talep satırları
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      
      orderedRequests.forEach((request, index) => {
        // Sayfa sonu kontrolü
        if (yPos > pageHeight - 30) {
          doc.addPage()
          yPos = 20
          // Yeni sayfada başlıkları tekrar yaz
          xPos = margin
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          headers.forEach((header, idx) => {
            if (idx === 3 || idx === 4 || idx === 6 || idx === 7) {
              doc.text(header, xPos + colWidths[idx] - 2, yPos, { align: 'right' })
            } else {
              doc.text(header, xPos, yPos)
            }
            xPos += colWidths[idx]
          })
          yPos += 5
          doc.line(margin, yPos, pageWidth - margin, yPos)
          yPos += 3
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
        }

        xPos = margin

        // Talep No
        doc.text(request.request_number, xPos, yPos)
        xPos += colWidths[0]

        // Malzeme adı (uzunsa kısalt)
        const materialNameRaw = request.material_name.length > 15 
          ? request.material_name.substring(0, 12) + '...' 
          : request.material_name
        const materialName = materialNameRaw.replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U').replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C')
        doc.text(materialName, xPos, yPos)
        xPos += colWidths[1]

        // Tedarikçi
        const supplierName = (request.supplier_name || '-').replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U').replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C')
        const supplierNameShort = supplierName.length > 12 ? supplierName.substring(0, 9) + '...' : supplierName
        doc.text(supplierNameShort, xPos, yPos)
        xPos += colWidths[2]

        // Kod - sağa hizalı
        const code = request.material_code || request.material_id.substring(0, 8)
        doc.text(code, xPos + colWidths[3] - 2, yPos, { align: 'right' })
        xPos += colWidths[3]

        // Miktar - sağa hizalı
        doc.text(request.requested_quantity.toFixed(2), xPos + colWidths[4] - 2, yPos, { align: 'right' })
        xPos += colWidths[4]

        // Birim
        doc.text(request.material_unit, xPos, yPos)
        xPos += colWidths[5]

        // Birim Fiyat - sağa hizalı
        doc.text(request.unit_price.toFixed(2) + ' TL', xPos + colWidths[6] - 2, yPos, { align: 'right' })
        xPos += colWidths[6]

        // Toplam - sağa hizalı
        doc.text(request.total_amount.toFixed(2) + ' TL', xPos + colWidths[7] - 2, yPos, { align: 'right' })
        
        yPos += lineHeight
      })

      // Toplam satırı
      yPos += 3
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('GENEL TOPLAM:', pageWidth - margin - 50, yPos, { align: 'right' })
      doc.text(totalAmount.toFixed(2) + ' TL', pageWidth - margin, yPos, { align: 'right' })

      // Alt bilgi
      yPos += 15
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text('Not: Bu belge siparis edilmis satin alma taleplerini icermektedir.', margin, yPos)
      yPos += 5
      doc.text(`Toplam ${orderedRequests.length} adet siparis edilmis talep bulunmaktadir.`, margin, yPos)

      // Dosyayı indir
      const fileName = `Siparis_Edilmis_Talepler_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
      toast.success(`PDF başarıyla oluşturuldu. ${orderedRequests.length} adet sipariş edilmiş talep PDF'e aktarıldı.`)
    } catch (error) {
      console.error('PDF dışa aktarma hatası:', error)
      toast.error('PDF oluşturulurken hata oluştu')
    } finally {
      setExporting(false)
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'draft':
        return 'Taslak'
      case 'ordered':
        return 'Sipariş Edildi'
      case 'completed':
        return 'Tamamlandı'
      case 'cancelled':
        return 'İptal Edildi'
      default:
        return status
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'draft':
        return 'bg-gray-600 text-gray-200'
      case 'ordered':
        return 'bg-blue-600 text-white'
      case 'completed':
        return 'bg-green-600 text-white'
      case 'cancelled':
        return 'bg-red-600 text-white'
      default:
        return 'bg-gray-600 text-gray-200'
    }
  }

  const filteredRequests = filterStatus === 'all' 
    ? requests 
    : requests.filter(r => r.status === filterStatus)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
              <ShoppingCart className="w-8 h-8 text-blue-400" />
              <span>Satın Alma Talepleri</span>
            </h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-gray-400">Satın alma talepleri ve sipariş takibi</p>
        </div>
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <button
            onClick={createOrderFromSelected}
            disabled={creatingOrder || selectedIds.size === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            title="Seçili taslak taleplerden satın alma siparişi oluşturur (tedarikçiye göre gruplanır)"
          >
            {creatingOrder ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>{creatingOrder ? 'Oluşturuluyor...' : `Seçilenlerden sipariş (${selectedIds.size})`}</span>
          </button>
          {canExport && (
          <button
            onClick={exportToPDF}
            disabled={exporting || requests.filter(r => r.status === 'ordered').length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            title="Sipariş Edildi durumundaki talepleri PDF'e aktar"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Oluşturuluyor...' : 'PDF İndir'}</span>
          </button>
          )}
          <button
            onClick={loadRequests}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Filtre */}
      <div className="mb-4 flex items-center space-x-2">
        <label className="text-gray-300 text-sm">Durum:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
        >
          <option value="all">Tümü</option>
          <option value="draft">Taslak</option>
          <option value="ordered">Sipariş Edildi</option>
          <option value="cancelled">İptal Edildi</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <LogoWithBackground size="lg" className="mb-6" />
          <h3 className="text-xl font-semibold text-white mb-2">Satın Alma Talebi Bulunmuyor</h3>
          <p className="text-gray-400">Henüz satın alma talebi oluşturulmamış veya tüm talepler tamamlanmış.</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-2 py-3 text-left">
                  {requests.some((r) => r.status === 'draft') && (
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size >= requests.filter((r) => r.status === 'draft').length}
                      onChange={toggleSelectAllDraft}
                      className="w-4 h-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500"
                      title="Tüm taslakları seç / kaldır"
                    />
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Talep No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Malzeme</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tedarikçi</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">İstenen</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Gelen</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Kalan</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Birim Fiyat</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Toplam</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tarih</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredRequests.map((request) => {
                const received = request.received_quantity || 0
                const remaining = Math.max(0, request.requested_quantity - received)
                const isIncomplete = remaining > 0 && request.status === 'ordered'
                const isHighlighted = highlightId === request.id
                return (
                <tr 
                  key={request.id}
                  ref={isHighlighted ? (el) => { highlightRowRef.current = el } : undefined}
                  className={`hover:bg-gray-800/50 cursor-pointer ${
                    isIncomplete ? 'bg-red-900/20 border-l-4 border-red-500' : ''
                  } ${isHighlighted ? 'bg-amber-900/40 border-l-4 border-amber-500' : ''}`}
                  onDoubleClick={(e) => {
                    // İşlemler kolonuna tıklanırsa modal açılmasın
                    const target = e.target as HTMLElement
                    if (target.closest('button') || target.closest('td:last-child')) {
                      return
                    }
                    handleDoubleClick(request)
                  }}
                  title={isIncomplete ? `Eksik gelen: ${remaining.toFixed(2)} ${request.material_unit}` : "Çift tıklayarak miktarı düzenleyin"}
                >
                  <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                    {request.status === 'draft' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(request.id)}
                        onChange={() => toggleSelect(request.id)}
                        className="w-4 h-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-white font-medium text-xs">
                    {request.request_number}
                  </td>
                  <td className="px-4 py-3 text-white text-xs">
                    <div>
                      <div className="font-medium">{request.material_name}</div>
                      {request.material_code && (
                        <div className="text-gray-400 text-xs">({request.material_code})</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white text-xs">
                    {request.supplier_name || (request as any).material_supplier_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 text-xs">
                    {request.requested_quantity.toFixed(2)} {request.material_unit}
                  </td>
                  <td className={`px-4 py-3 text-right text-xs font-medium ${
                    received > 0 ? 'text-blue-400' : 'text-gray-400'
                  }`}>
                    {received.toFixed(2)} {request.material_unit}
                  </td>
                  <td className={`px-4 py-3 text-right text-xs font-bold ${
                    isIncomplete ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {remaining.toFixed(2)} {request.material_unit}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 text-xs">
                    {request.unit_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </td>
                  <td className="px-4 py-3 text-right text-green-400 font-semibold text-xs">
                    {request.total_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDateTime(request.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {request.status === 'draft' && (
                        <button
                          onClick={() => updateStatus(request.id, 'ordered')}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                          title="Sipariş Edildi olarak işaretle"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </button>
                      )}
                      {request.status === 'ordered' && (
                        <button
                          onClick={() => updateStatus(request.id, 'completed')}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
                          title="Tamamlandı olarak işaretle"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </button>
                      )}
                      {(request.status === 'draft' || request.status === 'ordered') && (
                        <button
                          onClick={() => updateStatus(request.id, 'cancelled')}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
                          title="İptal Et"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteRequest(request.id)}
                        className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition"
                        title="Sil"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Düzenleme Modal */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Miktar Düzenle</h2>
              <button
                onClick={cancelEdit}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Malzeme</div>
              <div className="text-white font-medium">{editingRequest.material_name}</div>
              {editingRequest.material_code && (
                <div className="text-gray-400 text-xs">({editingRequest.material_code})</div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Miktar ({editingRequest.material_unit})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editQuantity}
                onChange={(e) => setEditQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Birim Fiyat (₺)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editUnitPrice}
                onChange={(e) => setEditUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tedarikçi
              </label>
              <input
                type="text"
                value={editSupplierName}
                onChange={(e) => setEditSupplierName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tedarikçi adı"
              />
            </div>

            <div className="mb-4 p-3 bg-gray-800 rounded">
              <div className="text-sm text-gray-400 mb-1">Toplam Tutar</div>
              <div className="text-lg font-semibold text-green-400">
                {(editQuantity * editUnitPrice).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                İptal
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

