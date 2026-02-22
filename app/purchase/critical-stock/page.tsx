'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Download, ShoppingCart, RefreshCw, Package, Info } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'
import { formatDate } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'
import { useAuthStore } from '@/lib/store/authStore'

/** Tam sayıları 100, ondalıklıları 26.5 gibi gösterir (100.00 yerine 100) */
function formatQuantity(n: number): string {
  const rounded = Math.round(n * 100) / 100
  if (Number.isInteger(rounded)) return String(Math.round(rounded))
  return rounded.toFixed(2).replace(/\.?0+$/, '')
}

interface CriticalMaterial {
  id: string
  code: string
  name: string
  category: string
  unit: string
  stock_amount: number
  min_stock_level: number
  purchase_price: number
  supplier_id: string | null
  supplier_name: string | null
  supplier_code: string | null
  supplier_phone: string | null
  supplier_email: string | null
  suggested_quantity: number
  shortage: number
  last_purchase_date: string | null
}

export default function CriticalStockPage() {
  const user = useAuthStore((s) => s.user)
  const canExport = user?.can_export !== 0
  const [materials, setMaterials] = useState<CriticalMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [creatingRequests, setCreatingRequests] = useState(false)

  useEffect(() => {
    loadCriticalMaterials()
  }, [])

  async function loadCriticalMaterials() {
    setLoading(true)
    try {
      const response = await fetch('/api/purchase/critical-stock')
      if (!response.ok) throw new Error('Kritik stok listesi yüklenemedi')
      const data = await response.json()
      setMaterials(data)
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Kritik malzemeler yüklenirken hata:', error)
      toast.error('Kritik stok listesi yüklenirken hata oluştu')
    } finally {
      setLoading(false)
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

  function toggleSelectAll() {
    if (selectedIds.size === materials.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(materials.map((m) => m.id)))
  }

  async function createPurchaseRequestsForSelected() {
    if (selectedIds.size === 0) {
      toast.warning('Lütfen en az bir malzeme seçin')
      return
    }
    setCreatingRequests(true)
    const selected = materials.filter((m) => selectedIds.has(m.id))
    let created = 0
    let failed = 0
    try {
      for (const m of selected) {
        const requested_quantity = Math.ceil(m.suggested_quantity)
        if (requested_quantity <= 0) continue
        const res = await fetch('/api/purchase-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            material_id: m.id,
            requested_quantity,
            unit_price: m.purchase_price ?? 0,
            supplier_name: m.supplier_name ?? undefined,
            notes: `Kritik stok - BOM ve siparişlere göre öneri (mevcut: ${formatQuantity(m.stock_amount)} ${m.unit})`,
          }),
        })
        if (res.ok) created++
        else failed++
      }
      if (created > 0) {
        toast.success(`${created} satın alma talebi oluşturuldu.${failed ? ` ${failed} başarısız.` : ''}`)
        setSelectedIds(new Set())
        loadCriticalMaterials()
      }
      if (failed > 0 && created === 0) toast.error('Satın alma talepleri oluşturulamadı')
    } catch (e) {
      toast.error('Satın alma talepleri oluşturulurken hata oluştu')
    } finally {
      setCreatingRequests(false)
    }
  }

  async function exportToExcel() {
    setExportingExcel(true)
    try {
      const res = await fetch('/api/purchase/critical-stock/export', { credentials: 'include' })
      if (!res.ok) throw new Error('Excel alınamadı')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Kritik_Stok_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel indirildi')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Excel indirilemedi')
    } finally {
      setExportingExcel(false)
    }
  }

  async function exportToPDF() {
    if (typeof window === 'undefined') return
    
    setExporting(true)
    try {
      // jsPDF'yi sadece client-side'da dinamik olarak yükle
      // Next.js'in module resolution sorunlarını önlemek için
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

      // Başlık - Türkçe karakter desteği için
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      // Türkçe karakterleri doğru göstermek için
      const title = 'SATIN ALMA ONERI FORMU'
      doc.text(title, pageWidth / 2, yPos, { align: 'center' })
      yPos += 10

      // Tarih
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const dateStr = formatDate(new Date())
      doc.text(`Tarih: ${dateStr}`, margin, yPos)
      yPos += 6
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('Onerilen miktarlar BOM (recete) ve acik siparislere (bekleyen + uretimde) gore hesaplanmistir.', margin, yPos)
      doc.setTextColor(0, 0, 0)
      yPos += 8

      // Tablo başlıkları - Türkçe karakterleri ASCII'ye çevir
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const headers = ['Kod', 'Malzeme', 'Mevcut', 'Min.', 'Onerilen', 'Birim Fiyat', 'Toplam', 'Tedarikci']
      const colWidths = [20, 50, 15, 15, 20, 20, 20, 30]
      let xPos = margin

      headers.forEach((header, index) => {
        doc.text(header, xPos, yPos)
        xPos += colWidths[index]
      })
      yPos += 5

      // Çizgi
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 3

      // Malzeme satırları
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      let totalAmount = 0

      materials.forEach((material, index) => {
        // Sayfa sonu kontrolü
        if (yPos > pageHeight - 30) {
          doc.addPage()
          yPos = 20
        }

        xPos = margin
        const suggestedQty = Math.ceil(material.suggested_quantity)
        const totalPrice = suggestedQty * material.purchase_price
        totalAmount += totalPrice

        doc.text(material.code || material.id.substring(0, 8), xPos, yPos)
        xPos += colWidths[0]

        // Malzeme adı (uzunsa kısalt) - Türkçe karakterleri ASCII'ye çevir
        const materialNameRaw = material.name.length > 25 
          ? material.name.substring(0, 22) + '...' 
          : material.name
        const materialName = materialNameRaw.replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U').replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C')
        doc.text(materialName, xPos, yPos)
        xPos += colWidths[1]

        doc.text(formatQuantity(material.stock_amount), xPos, yPos, { align: 'right' })
        xPos += colWidths[2]

        doc.text(formatQuantity(material.min_stock_level), xPos, yPos, { align: 'right' })
        xPos += colWidths[3]

        doc.text(suggestedQty.toFixed(0), xPos, yPos, { align: 'right' })
        xPos += colWidths[4]

        doc.text(material.purchase_price.toFixed(2) + ' ₺', xPos, yPos, { align: 'right' })
        xPos += colWidths[5]

        doc.text(totalPrice.toFixed(2) + ' ₺', xPos, yPos, { align: 'right' })
        xPos += colWidths[6]

        const supplierName = (material.supplier_name || 'Belirtilmemis').replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U').replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C')
        const supplierDisplay = supplierName.length > 15 
          ? supplierName.substring(0, 12) + '...' 
          : supplierName
        doc.text(supplierDisplay, xPos, yPos)
        yPos += lineHeight
      })

      // Toplam satırı
      yPos += 3
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('TOPLAM TUTAR:', pageWidth - margin - 50, yPos, { align: 'right' })
      doc.text(totalAmount.toFixed(2) + ' ₺', pageWidth - margin, yPos, { align: 'right' })

      // Alt bilgi - Türkçe karakterleri ASCII'ye çevir
      yPos += 15
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text('Not: Bu form otomatik olarak kritik stok seviyesinin altina dusen malzemeler icin olusturulmustur.', margin, yPos)
      yPos += 5
      doc.text('Onerilen miktarlar minimum stok seviyesine gore hesaplanmistir.', margin, yPos)

      // Dosyayı indir
      const fileName = `Satın_Alma_Formu_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('PDF dışa aktarma hatası:', error)
      toast.error('PDF oluşturulurken hata oluştu')
    } finally {
      setExporting(false)
    }
  }

  const totalAmount = materials.reduce((sum, m) => {
    const qty = Math.ceil(m.suggested_quantity)
    return sum + (qty * m.purchase_price)
  }, 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <span>Kritik Stok ve Satın Alma Önerileri</span>
            </h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-gray-400">Kritik seviyenin altına düşen malzemeler ve satın alma önerileri</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadCriticalMaterials}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
          <button
            onClick={createPurchaseRequestsForSelected}
            disabled={creatingRequests || materials.length === 0 || selectedIds.size === 0}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{creatingRequests ? 'Oluşturuluyor...' : `Seçilenler için talep (${selectedIds.size})`}</span>
          </button>
          {canExport && (
          <>
          <button
            onClick={exportToExcel}
            disabled={exportingExcel || materials.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{exportingExcel ? 'İndiriliyor...' : 'Excel İndir'}</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={exporting || materials.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Oluşturuluyor...' : 'PDF İndir'}</span>
          </button>
          </>
          )}
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Kritik Malzeme Sayısı</div>
          <div className="text-2xl font-bold text-red-400">{materials.length}</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Toplam Eksik Miktar</div>
          <div className="text-2xl font-bold text-orange-400">
            {formatQuantity(materials.reduce((sum, m) => sum + m.shortage, 0))}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Önerilen Toplam Miktar</div>
          <div className="text-2xl font-bold text-yellow-400">
            {materials.reduce((sum, m) => sum + Math.ceil(m.suggested_quantity), 0)}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Tahmini Toplam Tutar</div>
          <div className="text-2xl font-bold text-green-400">
            {totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
          <Package className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Tüm Stoklar Yeterli</h3>
          <p className="text-gray-400">Kritik seviyenin altına düşen malzeme bulunmuyor.</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-2 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={materials.length > 0 && selectedIds.size === materials.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-500 bg-gray-700 text-amber-500 focus:ring-amber-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Kod</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Malzeme</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Kategori</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Mevcut Stok</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Min. Seviye</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Eksik</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                <span className="inline-flex items-center gap-1">
                  Önerilen Miktar
                  <span title="BOM (reçete) ve açık siparişlere (bekleyen + üretimde) göre hesaplanır." className="text-gray-500 cursor-help">
                    <Info className="w-3.5 h-3.5" />
                  </span>
                </span>
              </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Birim Fiyat</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Toplam Tutar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tedarikçi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Son Alış</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {materials.map((material) => {
                const suggestedQty = Math.ceil(material.suggested_quantity)
                const totalPrice = suggestedQty * material.purchase_price
                
                return (
                  <tr key={material.id} className="hover:bg-gray-800/50">
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(material.id)}
                        onChange={() => toggleSelect(material.id)}
                        className="rounded border-gray-500 bg-gray-700 text-amber-500 focus:ring-amber-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-white font-medium text-xs">
                      {material.code || material.id.substring(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-white text-xs">{material.name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{material.category || '-'}</td>
                    <td className={`px-4 py-3 text-right font-semibold text-xs ${
                      material.stock_amount <= 0 ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {formatQuantity(material.stock_amount)} {material.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 text-xs">
                      {formatQuantity(material.min_stock_level)} {material.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400 font-semibold text-xs">
                      {formatQuantity(material.shortage)} {material.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-400 font-semibold text-xs" title="BOM ve açık siparişlere göre öneri">
                      {suggestedQty} {material.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 text-xs">
                      {material.purchase_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold text-xs">
                      {totalPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">
                      {material.supplier_name ? (
                        <div>
                          <div className="font-medium">{material.supplier_name}</div>
                          {material.supplier_code && (
                            <div className="text-gray-400 text-xs">({material.supplier_code})</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Belirtilmemiş</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {formatDate(material.last_purchase_date)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-800">
              <tr>
                <td colSpan={9} className="px-4 py-3 text-right text-sm font-semibold text-white">
                  TOPLAM TUTAR:
                </td>
                <td className="px-4 py-3 text-right text-lg font-bold text-green-400">
                  {totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

