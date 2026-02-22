'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, Package, AlertTriangle, ArrowDown, ArrowUp, ShoppingCart, Filter, Edit, Trash2, Save, X, History as HistoryIcon, Clock, RefreshCw, Download } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { useAuthStore } from '@/lib/store/authStore'
import { getAuthHeaders, fetchApi } from '@/lib/api/fetch'
import { toast } from '@/lib/notify'
import { getReferenceTypeLabel } from '@/lib/utils/referenceTypeLabels'

/** Tam sayıları 100, ondalıklıları 26.5 gibi gösterir */
function formatQuantity(n: number): string {
  const rounded = Math.round(n * 100) / 100
  if (Number.isInteger(rounded)) return String(Math.round(rounded))
  return rounded.toFixed(2).replace(/\.?0+$/, '')
}

// localDB'yi dinamik import et
const getLocalDB = async () => {
  const { localDB } = await import('@/lib/database/client')
  return localDB
}

interface Material {
  id: string
  code?: string
  name: string
  unit: string
  stock_amount: number
  total_in?: number
  total_out?: number
  min_stock_level: number
  category?: string
}

export default function MaterialsInventoryPage() {
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const canExport = useAuthStore((state) => state.user?.can_export !== 0)
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showStockIn, setShowStockIn] = useState(false)
  const [showStockOut, setShowStockOut] = useState(false)
  const [activeTab, setActiveTab] = useState<'stockIn' | 'stockOut' | 'list'>('stockIn')
  const [showList, setShowList] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [stockInQuantity, setStockInQuantity] = useState<number>(0)
  const [stockInInvoiceNumber, setStockInInvoiceNumber] = useState<string>('')
  const [stockInShipmentNumber, setStockInShipmentNumber] = useState<string>('')
  const [stockOutQuantity, setStockOutQuantity] = useState<number>(0)
  const [filterCritical, setFilterCritical] = useState<boolean>(false)
  const [creatingPurchase, setCreatingPurchase] = useState<string | null>(null)
  const [quickActionMaterial, setQuickActionMaterial] = useState<Material | null>(null)
  const [quickActionType, setQuickActionType] = useState<'in' | 'out' | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; stock_amount: number; min_stock_level: number }>({ name: '', stock_amount: 0, min_stock_level: 0 })
  const [selectedMaterialForHistory, setSelectedMaterialForHistory] = useState<string | null>(null)
  const [movementHistory, setMovementHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const selectedCategoryRef = useRef<string | null>(null)
  useEffect(() => {
    selectedCategoryRef.current = selectedCategory
  }, [selectedCategory])
  const [categorySearch, setCategorySearch] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  const [showAllCodesDetailModal, setShowAllCodesDetailModal] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await loadMaterials()
      if (cancelled) return
      // Stok miktarlarını stock_movements'tan yeniden hesapla (hata verirse sessizce devam et)
      try {
        await recalculateStocks(false)
      } catch {
        // Yetkilendirme vb. hatalarda liste zaten yüklendi, recalculate atlanır
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function recalculateStocks(showAlert = false) {
    try {
      setLoading(true)
      const response = await fetch('/api/materials/recalculate-stock', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Stoklar yeniden hesaplanamadı')
      }
      
      const data = await response.json()
      
      // Hesaplama sonrası malzemeleri yeniden yükle
      await loadMaterials()
      
      if (showAlert) {
        let message = `✅ ${data.materials_updated || 0} malzemenin stokları stok hareketleri tablosundan yeniden hesaplandı!`
        
        // Örnek sonuçları göster (ilk 3 malzeme)
        if (data.sample_results && data.sample_results.length > 0) {
          message += '\n\nÖrnek sonuçlar:'
          data.sample_results.slice(0, 3).forEach((m: any) => {
            message += `\n${m.name}: ${m.calculated_in} giriş - ${m.calculated_out} çıkış = ${m.calculated_stock} adet`
          })
        }
        
        toast.warning(message)
      }
    } catch (error: any) {
      console.error('Stoklar yeniden hesaplanırken hata:', error)
      if (showAlert) {
        toast.error('Hata: ' + (error.message || 'Stoklar yeniden hesaplanamadı'))
      }
    } finally {
      setLoading(false)
    }
  }

  const [creatingFromOrders, setCreatingFromOrders] = useState(false)

  async function createMaterialsFromOrders() {
    if (!confirm('Siparişlerden kumaş kodlarını çıkarıp hammadde deposuna malzeme kartları oluşturmak istediğinize emin misiniz?')) {
      return
    }

    setCreatingFromOrders(true)
    try {
      const response = await fetch('/api/materials/create-from-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.details || 'Malzemeler oluşturulamadı')
      }

      const result = await response.json()
      
      if (result.created > 0) {
        toast.success(`${result.created} kumaş malzemesi başarıyla oluşturuldu!${result.skipped > 0 ? `\n\n${result.skipped} malzeme atlandı (zaten mevcut).` : ''}`)
        await loadMaterials()
      } else {
        // Listeyi yine de yenile ki sayı mesajla uyumlu olsun (62 diyorsa listede de 62 görünsün)
        await loadMaterials()
        const totalFromOrders = result.totalFound ?? result.skipped ?? 0
        toast.info(
          totalFromOrders > 0
            ? `Yeni malzeme oluşturulmadı. Siparişlerdeki ${totalFromOrders} kumaş zaten depoda kayıtlı. Liste güncellendi.`
            : 'Siparişlerde kumaş bilgisi bulunamadı.'
        )
      }
    } catch (error: any) {
      console.error('Kumaş malzemeleri oluşturulurken hata:', error)
      toast.error(`Hata: ${error.message}`)
    } finally {
      setCreatingFromOrders(false)
    }
  }


  async function loadMaterials() {
    try {
      const db = await getLocalDB()
      const data = await db.getMaterials()
      setMaterials(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Malzemeler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleStockIn() {
    if (!selectedMaterial || stockInQuantity <= 0) {
      toast.warning('Lütfen hammadde ve miktar seçin')
      return
    }

    // Fatura no veya sevk no zorunlu
    if (!stockInInvoiceNumber.trim() && !stockInShipmentNumber.trim()) {
      toast.warning('Lütfen Fatura No veya Sevk No girin (en az biri zorunludur)')
      return
    }

    try {
      const response = await fetch('/api/materials/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: selectedMaterial,
          quantity: stockInQuantity,
          invoice_number: stockInInvoiceNumber.trim() || null,
          shipment_number: stockInShipmentNumber.trim() || null,
          user_id: userId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Stok girişi yapılamadı')
      }

      toast.success('Stok girişi başarıyla yapıldı!')
      setShowStockIn(false)
      setStockInQuantity(0)
      setStockInInvoiceNumber('')
      setStockInShipmentNumber('')
      setSelectedMaterial('')
      loadMaterials()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function handleStockOut() {
    if (!selectedMaterial || stockOutQuantity <= 0) {
      toast.warning('Lütfen hammadde ve miktar seçin')
      return
    }

    try {
      const response = await fetch('/api/materials/stock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: selectedMaterial,
          quantity: stockOutQuantity,
          notes: 'Hammadde depo çıkışı',
          user_id: userId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Stok çıkışı yapılamadı')
      }

      const result = await response.json()
      toast.success(`Stok çıkışı başarıyla yapıldı! Yeni stok: ${result.new_stock}`)
      setShowStockOut(false)
      setStockOutQuantity(0)
      setSelectedMaterial('')
      loadMaterials()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  function isLowStock(material: Material): boolean {
    // Negatif stoklar da kritik olarak işaretlenir
    return material.stock_amount < material.min_stock_level
  }

  function startEdit(material: Material) {
    setEditingMaterial(material.id)
    setEditForm({
      name: material.name || '',
      stock_amount: material.stock_amount,
      min_stock_level: material.min_stock_level,
    })
    // Sayfayı yukarı kaydır (işlem alanına)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function cancelEdit() {
    setEditingMaterial(null)
    setEditForm({ name: '', stock_amount: 0, min_stock_level: 0 })
  }

  async function saveEdit(materialId: string) {
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          user_id: userId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Malzeme güncellenemedi')
      }

      toast.success('Malzeme başarıyla güncellendi!')
      setEditingMaterial(null)
      loadMaterials()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function deleteMaterial(materialId: string, materialName: string) {
    if (!confirm(`"${materialName}" malzemesini silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      const response = await fetch(`/api/materials/${encodeURIComponent(materialId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      })

      if (response.status === 404) {
        await loadMaterials()
        toast.info('Malzeme bulunamadı veya zaten silinmiş. Liste güncellendi.')
        return
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Malzeme silinemedi')
      }

      // Listeyi önbelleği atlayarak taze çek; silinen malzeme ekrandan gitsin
      const fresh = await fetchApi<Material[] | unknown>(`/api/materials?_=${Date.now()}`)
      setMaterials(Array.isArray(fresh) ? (fresh as Material[]) : [])

      toast.success('Malzeme başarıyla silindi!')
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function loadMovementHistory(materialId: string) {
    setLoadingHistory(true)
    setSelectedMaterialForHistory(materialId)
    // Sayfayı yukarı kaydır (modal açılacak)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
    try {
      const response = await fetch(`/api/materials/${materialId}/movements`)
      if (response.ok) {
        const data = await response.json()
        setMovementHistory(data.movements || [])
      } else {
        throw new Error('Hareket geçmişi yüklenemedi')
      }
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
      setMovementHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  function trForPdf(s: string | null | undefined): string {
    if (s == null || s === '') return '-'
    return String(s)
      .replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C')
  }

  async function exportMovementHistoryPdf() {
    if (!selectedMaterialForHistory || movementHistory.length === 0) return
    setExportingPdf(true)
    try {
      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default || jsPDFModule
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const contentWidth = pageWidth - margin * 2
      let y = 22
      const rowH = 8
      const fontSmall = 8
      const fontNorm = 10
      const fontTitle = 14

      const materialName = materials.find(m => m.id === selectedMaterialForHistory)?.name || 'Malzeme'
      const unit = materials.find(m => m.id === selectedMaterialForHistory)?.unit || ''
      const reportDate = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

      // Başlık satırı: solda başlık, sağda tarih
      doc.setFontSize(fontTitle)
      doc.setFont('helvetica', 'bold')
      doc.text(trForPdf('Stok Hareket Gecmisi'), margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(fontNorm)
      doc.text(trForPdf(materialName), margin, y + 6)
      doc.text(reportDate, pageWidth - margin, y, { align: 'right' })
      y += 16

      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 12

      const outMovements = movementHistory.filter((m: any) => m.movement_type === 'out')
      const totalOut = outMovements.reduce((s: number, m: any) => s + (m.quantity || 0), 0)

      // Bölüm 1: Çıkışlar (sadece çıkış varsa)
      if (outMovements.length > 0) {
        doc.setFontSize(fontNorm)
        doc.setFont('helvetica', 'bold')
        doc.text(trForPdf('Cikislar - nerede kullanildi'), margin, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(fontSmall)
        doc.text(trForPdf(`Toplam cikis: ${totalOut.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`), margin, y)
        y += 10

        const outCols = [24, 20, 22, 55, contentWidth - 24 - 20 - 22 - 55]
        const outHeaders = ['Tarih', 'Saat', 'Miktar', 'Kullanım', 'Not']
        let x = margin
        doc.setFont('helvetica', 'bold')
        outHeaders.forEach((h, i) => { doc.text(trForPdf(h), x + (i === 0 ? 0 : 2), y); x += outCols[i] })
        y += 6
        doc.line(margin, y, pageWidth - margin, y)
        y += 6
        doc.setFont('helvetica', 'normal')
        outMovements.forEach((mov: any) => {
          if (y > pageHeight - 28) { doc.addPage(); y = 22 }
          x = margin
          doc.text(trForPdf(mov.date), x, y); x += outCols[0]
          doc.text(trForPdf(mov.time), x, y); x += outCols[1]
          doc.text(`-${Number(mov.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, x, y); x += outCols[2]
          const where = getReferenceTypeLabel(mov.reference_type) + (mov.reference_id ? ` (${String(mov.reference_id).slice(0, 8)}...)` : '')
          doc.text(trForPdf(where.length > 30 ? where.slice(0, 27) + '...' : where), x, y); x += outCols[3]
          doc.text(trForPdf((mov.notes || '-').toString().slice(0, 40)), x, y)
          y += rowH
        })
        y += 14
      }

      // Bölüm 2: Tüm hareketler (sade tablo: Tarih, Saat, Tip, Miktar, Referans, Not)
      doc.setFontSize(fontNorm)
      doc.setFont('helvetica', 'bold')
      doc.text(trForPdf('Tum hareketler (giris + cikis)'), margin, y)
      y += 10

      const allCols = [24, 18, 16, 20, 42, contentWidth - 24 - 18 - 16 - 20 - 42]
      const allHeaders = ['Tarih', 'Saat', 'Tip', 'Miktar', 'Referans', 'Not']
      let x = margin
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(fontSmall)
      allHeaders.forEach((h, i) => { doc.text(trForPdf(h), x + (i === 0 ? 0 : 2), y); x += allCols[i] })
      y += 6
      doc.line(margin, y, pageWidth - margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      movementHistory.forEach((mov: any) => {
        if (y > pageHeight - 28) { doc.addPage(); y = 22 }
        x = margin
        doc.text(trForPdf(mov.date), x, y); x += allCols[0]
        doc.text(trForPdf(mov.time), x, y); x += allCols[1]
        doc.text(mov.movement_type === 'in' ? 'Giris' : 'Cikis', x, y); x += allCols[2]
        const qty = (mov.movement_type === 'in' ? '+' : '-') + Number(mov.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        doc.text(qty, x, y); x += allCols[3]
        doc.text(trForPdf(getReferenceTypeLabel(mov.reference_type).slice(0, 22)), x, y); x += allCols[4]
        doc.text(trForPdf((mov.notes || '-').toString().slice(0, 42)), x, y)
        y += rowH
      })

      const safeName = materialName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 30)
      doc.save(`stok_hareket_gecmisi_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF indirildi.')
    } catch (err: any) {
      toast.error('PDF oluşturulamadı: ' + (err?.message || 'Bilinmeyen hata'))
    } finally {
      setExportingPdf(false)
    }
  }

  async function handleCreatePurchaseRequest(materialId: string) {
    if (creatingPurchase === materialId) return

    setCreatingPurchase(materialId)
    
    try {
      const material = materials.find(m => m.id === materialId)
      if (!material) {
        toast.warning('Malzeme bulunamadı')
        setCreatingPurchase(null)
        return
      }

      // Eksik miktarı hesapla (minimum stok seviyesine ulaşmak için gerekli)
      const requiredQuantity = material.min_stock_level - material.stock_amount
      // Biraz fazla talep et (minimum seviyenin 2 katı veya en az minimum seviye kadar)
      const requestedQuantity = Math.max(requiredQuantity * 2, material.min_stock_level)

      if (requestedQuantity <= 0) {
        toast.warning('Talep edilecek miktar hesaplanamadı')
        setCreatingPurchase(null)
        return
      }

      const response = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          requested_quantity: requestedQuantity,
          unit_price: 0, // Kullanıcı daha sonra güncelleyebilir
          notes: `Otomatik oluşturuldu - Kritik stok seviyesi: ${formatQuantity(material.stock_amount)} ${material.unit} < ${formatQuantity(material.min_stock_level)} ${material.unit}`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }))
        throw new Error(errorData.error || 'Satın alma talebi oluşturulamadı')
      }

      const data = await response.json()
      toast.success(`Satın alma talebi oluşturuldu!\nTalep No: ${data.request?.request_number || 'Yok'}\nMiktar: ${formatQuantity(requestedQuantity)} ${material.unit}`)
    } catch (error: any) {
      console.error('Satın alma talebi hatası:', error)
      toast.error('Hata: ' + (error.message || 'Satın alma talebi oluşturulamadı'))
    } finally {
      setCreatingPurchase(null)
    }
  }

  // Kritik seviye filtresi
  const filteredMaterials = filterCritical
    ? materials.filter(m => isLowStock(m))
    : materials

  const materialsByCategory = filteredMaterials.reduce((acc, material) => {
    // Veritabanındaki category alanını kullan, yoksa malzeme adına göre tahmin et
    const category = material.category && material.category.trim() !== '' 
      ? material.category 
      : (material.name.toLowerCase().includes('kumaş') ? 'Kumaş' :
         material.name.toLowerCase().includes('sünger') ? 'Sünger' :
         material.name.toLowerCase().includes('ayak') ? 'Ayak' : 'Diğer')
    
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(material)
    return acc
  }, {} as Record<string, Material[]>)

  const categoryTabs = ['Tümü', ...Object.keys(materialsByCategory).sort((a, b) => a.localeCompare(b, 'tr'))]

  // Sayfada görünen tüm malzemeler (seçili kategori + arama) — tek toplam satırı için
  const allDisplayedMaterials = (() => {
    const categoriesToShow = selectedCategory === null || selectedCategory === 'Tümü'
      ? Object.keys(materialsByCategory)
      : [selectedCategory]
    const searchLower = categorySearch.trim().toLowerCase()
    return categoriesToShow.flatMap((cat) => {
      const categoryMaterials = materialsByCategory[cat] || []
      if (!searchLower) return categoryMaterials
      return categoryMaterials.filter((m) => {
        const nameMatch = m.name.toLowerCase().includes(searchLower)
        const codeMatch = m.code?.toLowerCase().includes(searchLower) ?? false
        const unitMatch = m.unit.toLowerCase().includes(searchLower)
        return nameMatch || codeMatch || unitMatch
      })
    })
  })()

  useEffect(() => {
    if (selectedCategory != null && selectedCategory !== 'Tümü' && !materialsByCategory[selectedCategory]) {
      setSelectedCategory(null)
    }
  }, [materialsByCategory, selectedCategory])

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-white">Hammadde Depo</h1>
              <LogoWithBackground size="sm" />
            </div>
            <p className="text-gray-400 mt-1">Hammadde stokları ve giriş işlemleri</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canExport && (
            <button
              onClick={async () => {
                setExporting(true)
                try {
                  const res = await fetch('/api/materials/export', { credentials: 'include', headers: getAuthHeaders() })
                  if (!res.ok) throw new Error('Dışa aktarma başarısız')
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `malzeme_listesi_${new Date().toISOString().split('T')[0]}.xlsx`
                  a.click()
                  URL.revokeObjectURL(url)
                  toast.success('Excel dosyası indirildi')
                } catch (e: any) {
                  toast.error(e?.message || 'Excel indirilemedi')
                } finally {
                  setExporting(false)
                }
              }}
              disabled={exporting}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Malzeme listesini Excel olarak indir"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">{exporting ? 'İndiriliyor...' : 'Excel İndir'}</span>
            </button>
            )}
            <button
              onClick={() => recalculateStocks(true)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Giriş ve çıkış toplamlarını stok hareketlerinden yeniden hesapla; mevcut stok = toplam giriş − toplam çıkış"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Giriş/Çıkışı Yeniden Hesapla</span>
            </button>
          <Link
            href="/purchase/critical-stock"
            className="px-4 py-2.5 rounded-lg transition-all duration-200 inline-flex items-center space-x-2 font-bold bg-red-900/60 text-red-200 hover:bg-red-800/80 border-2 border-red-800/50"
          >
            <Filter size={20} />
            <span>Kritik Seviye</span>
            {(() => {
              const criticalCount = materials.filter(m => isLowStock(m)).length
              return criticalCount > 0 ? (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-red-600 text-white font-bold tabular-nums">
                  {criticalCount}
                </span>
              ) : null
            })()}
          </Link>
          <button
            onClick={() => {
              setActiveTab('stockIn')
              setShowStockIn(true)
              setShowStockOut(false)
              setShowList(false)
            }}
            style={{ backgroundColor: activeTab === 'stockIn' ? '#16a34a' : '#166534' }}
            className={`px-3 md:px-4 py-2.5 rounded-lg transition-all duration-200 inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation font-bold text-white hover:opacity-90`}
          >
            <ArrowDown size={20} />
            <span>Stok Girişi</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('stockOut')
              setShowStockOut(true)
              setShowStockIn(false)
              setShowList(false)
            }}
            style={{ backgroundColor: activeTab === 'stockOut' ? '#dc2626' : '#991b1b' }}
            className={`px-3 md:px-4 py-2.5 rounded-lg transition-all duration-200 inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation font-bold text-white hover:opacity-90`}
          >
            <ArrowUp size={20} />
            <span>Stok Çıkışı</span>
          </button>
          <button
            onClick={createMaterialsFromOrders}
            disabled={creatingFromOrders || loading}
            className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-green-700 transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            title="Siparişlerden kumaş kodlarını çıkarıp hammadde deposuna malzeme kartları oluştur"
          >
            {creatingFromOrders ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Oluşturuluyor...</span>
              </>
            ) : (
              <>
                <Plus size={20} />
                <span>Siparişlerden Kumaş Oluştur</span>
              </>
            )}
          </button>
          <button
            onClick={async () => {
              if (!confirm('Tüm malzemeleri (hammadde) silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return
              try {
                const res = await fetch('/api/materials?all=1', { method: 'DELETE', credentials: 'include' })
                if (!res.ok) throw new Error((await res.json()).error || 'Silinemedi')
                const data = await res.json()
                await loadMaterials()
                toast.success(data?.message || 'Malzemeler silindi.')
              } catch (e: any) {
                toast.error('Hata: ' + (e instanceof Error ? e.message : 'Malzemeler silinemedi'))
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-3 md:px-4 py-2 rounded-lg transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation"
          >
            <Trash2 size={20} />
            <span>Tüm Malzemeleri Sil</span>
          </button>
          <Link
            href="/inventory/materials/new"
            className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 text-sm md:text-base touch-manipulation"
          >
            <Plus size={20} />
            <span>Yeni Hammadde</span>
          </Link>
        </div>
      </div>

      {/* Stok Girişi Formu */}
      {showStockIn && activeTab === 'stockIn' && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <ArrowDown className="w-5 h-5" />
            <span>Hammadde Stok Girişi</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Hammadde *
              </label>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-700 text-white rounded-lg focus:border-green-500 focus:outline-none"
              >
                <option value="">Hammadde seçin...</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} ({material.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Miktar *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={stockInQuantity}
                onChange={(e) => setStockInQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-700 text-white rounded-lg focus:border-green-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Fatura No
              </label>
              <input
                type="text"
                value={stockInInvoiceNumber}
                onChange={(e) => setStockInInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-700 text-white rounded-lg focus:border-green-500 focus:outline-none"
                placeholder="Fatura numarası (opsiyonel)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Sevk No
              </label>
              <input
                type="text"
                value={stockInShipmentNumber}
                onChange={(e) => setStockInShipmentNumber(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-700 text-white rounded-lg focus:border-green-500 focus:outline-none"
                placeholder="Sevk numarası (opsiyonel)"
              />
              <p className="text-xs text-yellow-400 mt-1">
                * Fatura No veya Sevk No'dan en az biri zorunludur
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowStockIn(false)
                setStockInQuantity(0)
                setStockInInvoiceNumber('')
                setStockInShipmentNumber('')
                setSelectedMaterial('')
              }}
              className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </button>
            <button
              onClick={handleStockIn}
              style={{ backgroundColor: '#16a34a' }}
              className="px-6 py-3 hover:opacity-90 active:opacity-80 text-white rounded-lg transition-all duration-200 font-bold text-base"
            >
              Stok Girişi Yap
            </button>
          </div>
        </div>
      )}

      {/* Stok Çıkışı Formu */}
      {showStockOut && activeTab === 'stockOut' && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <ArrowUp className="w-5 h-5" />
            <span>Hammadde Stok Çıkışı</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Hammadde *
              </label>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Hammadde seçin...</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} ({material.unit}) - Mevcut: {material.stock_amount}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Miktar *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={selectedMaterial ? materials.find(m => m.id === selectedMaterial)?.stock_amount || 0 : 0}
                value={stockOutQuantity}
                onChange={(e) => setStockOutQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-700 text-white rounded-lg focus:border-red-500 focus:outline-none"
                placeholder="0.00"
              />
              {selectedMaterial && (
                <p className="text-xs text-gray-400 mt-1">
                  Mevcut stok: {materials.find(m => m.id === selectedMaterial)?.stock_amount || 0}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowStockOut(false)
                setStockOutQuantity(0)
                setSelectedMaterial('')
              }}
              className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </button>
            <button
              onClick={handleStockOut}
              style={{ backgroundColor: '#dc2626' }}
              className="px-6 py-3 hover:opacity-90 active:opacity-80 text-white rounded-lg transition-all duration-200 font-bold text-base"
            >
              Stok Çıkışı Yap
            </button>
          </div>
        </div>
      )}

      {/* Hızlı İşlem Modal */}
      {quickActionMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setQuickActionMaterial(null)}>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white mb-4">
              {quickActionMaterial.name}
            </h3>
            <div className="mb-4">
              <p className="text-sm text-blue-300 font-medium">Mevcut Stok</p>
              <p className="text-2xl font-bold text-blue-200">
                {formatQuantity(quickActionMaterial.stock_amount)} {quickActionMaterial.unit}
              </p>
            </div>
            
            {!quickActionType ? (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setQuickActionType('in')
                    setSelectedMaterial(quickActionMaterial.id)
                    setActiveTab('stockIn')
                    setShowList(false)
                    setShowStockIn(true)
                    setShowStockOut(false)
                    setQuickActionMaterial(null)
                    // Sayfayı yukarı kaydır (stok girişi formu açılacak)
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }, 100)
                  }}
                  style={{ backgroundColor: '#16a34a' }}
                  className="w-full py-4 hover:opacity-90 active:opacity-80 text-white rounded-lg transition-all duration-200 font-bold text-lg flex items-center justify-center space-x-3"
                >
                  <ArrowDown className="w-6 h-6" />
                  <span>↓ Stok Girişi</span>
                </button>
                <button
                  onClick={() => {
                    setQuickActionType('out')
                    setSelectedMaterial(quickActionMaterial.id)
                    setActiveTab('stockOut')
                    setShowList(false)
                    setShowStockOut(true)
                    setShowStockIn(false)
                    setQuickActionMaterial(null)
                    // Sayfayı yukarı kaydır (stok çıkışı formu açılacak)
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }, 100)
                  }}
                  style={{ backgroundColor: '#dc2626' }}
                  className="w-full py-4 hover:opacity-90 active:opacity-80 text-white rounded-lg transition-all duration-200 font-bold text-lg flex items-center justify-center space-x-3"
                >
                  <ArrowUp className="w-6 h-6" />
                  <span>↑ Stok Çıkışı</span>
                </button>
              </div>
            ) : null}
            
            <button
              onClick={() => {
                setQuickActionMaterial(null)
                setQuickActionType(null)
              }}
              className="mt-4 w-full py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {categoryTabs.map((category) => {
            const isActive = selectedCategory === category || (category === 'Tümü' && selectedCategory === null)
            return (
              <button
                key={category}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const current = selectedCategoryRef.current
                  if (category === 'Tümü') {
                    setSelectedCategory(null)
                    setShowList(true)
                    setActiveTab('list')
                    setShowStockIn(false)
                    setShowStockOut(false)
                    return
                  }
                  const isCurrentlyActive = current === category
                  if (isCurrentlyActive) {
                    setSelectedCategory(null)
                    setShowList(false)
                    setShowStockIn(false)
                    setShowStockOut(false)
                    return
                  }
                  setSelectedCategory(category)
                  setShowList(true)
                  setActiveTab('list')
                  setShowStockIn(false)
                  setShowStockOut(false)
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {category}
              </button>
            )
          })}
        </div>

        {showList && activeTab === 'list' && (
          <>
            <div className="flex justify-end">
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Bu sekmede ara..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-400">Yükleniyor...</p>
              </div>
            ) : (
              <div className="space-y-6" key={selectedCategory ?? 'tumu'}>
                {(selectedCategory === null || selectedCategory === 'Tümü'
                  ? Object.entries(materialsByCategory)
                  : Object.entries(materialsByCategory).filter(([cat]) => cat === selectedCategory)
                ).map(([category, categoryMaterials]) => {
                  const searchLower = categorySearch.trim().toLowerCase()
                  const filteredCategoryMaterials = searchLower
                    ? categoryMaterials.filter((material) => {
                        const nameMatch = material.name.toLowerCase().includes(searchLower)
                        const codeMatch = material.code?.toLowerCase().includes(searchLower) ?? false
                        const unitMatch = material.unit.toLowerCase().includes(searchLower)
                        return nameMatch || codeMatch || unitMatch
                      })
                    : categoryMaterials
                  const sortedMaterials = [...filteredCategoryMaterials].sort((a, b) => {
                    const normalizeName = (value: string) =>
                      value.replace(/^Kumaş\s+/i, '').trim()
                    const left = normalizeName((a.name || '').toString())
                    const right = normalizeName((b.name || '').toString())
                    return left.localeCompare(right, 'tr', { numeric: true })
                  })

                  return (
                    <div key={category} className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white capitalize flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>{category}</span>
                  <span className="text-sm text-gray-400 font-normal">
                    ({filteredCategoryMaterials.length} adet)
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto -mx-3 md:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="h-8">Kod</TableHead>
                        <TableHead className="h-8">Hammadde Adı</TableHead>
                        <TableHead className="h-8">Birim</TableHead>
                        <TableHead className="h-8 bg-green-900/40 text-green-300 font-medium">Toplam Giriş</TableHead>
                        <TableHead className="h-8 bg-red-900/40 text-red-300 font-medium">Toplam Çıkış</TableHead>
                        <TableHead className="h-8 bg-blue-900/40 text-blue-300 font-medium">Mevcut Stok</TableHead>
                        <TableHead className="h-8">Min. Stok</TableHead>
                        <TableHead className="h-8">Durum</TableHead>
                        <TableHead className="h-8">İşlemler</TableHead>
                        <TableHead className="h-8 bg-gray-700/60 text-gray-200">Düzenle/Sil</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMaterials.map((material, index) => {
                        const lowStock = isLowStock(material)
                        const isEditing = editingMaterial === material.id
                        const displayCode = (material.code && String(material.code).trim()) ? material.code : String(index + 1).padStart(4, '0')
                        const displayName = material.name.replace(/^Kumaş\s+/i, '')
                        return (
                          <TableRow 
                            key={material.id} 
                            className={`${
                              lowStock ? 'bg-red-950/80 border-l-4 border-red-700 shadow-lg shadow-red-900/50' : ''
                            } cursor-pointer hover:bg-gray-800/50 transition`}
                            onDoubleClick={() => {
                              setQuickActionMaterial(material)
                              setQuickActionType(null)
                              // Sayfayı yukarı kaydır (modal açılacak)
                              setTimeout(() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }, 100)
                            }}
                          >
                            <TableCell className="font-medium text-white text-xs">
                              {displayCode}
                            </TableCell>
                            <TableCell className="font-medium text-white text-xs">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  className="w-full min-w-[120px] px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                displayName
                              )}
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs">
                              {material.unit}
                            </TableCell>
                            <TableCell className="text-green-300 text-xs tabular-nums">
                              {(material.total_in || 0).toLocaleString('tr-TR', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}
                            </TableCell>
                            <TableCell className="text-red-300 text-xs tabular-nums">
                              {(material.total_out || 0).toLocaleString('tr-TR', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}
                            </TableCell>
                            <TableCell className={`font-semibold text-xs tabular-nums ${
                              lowStock ? 'text-red-300 font-bold' : 'text-blue-300'
                            }`}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step={material.unit === 'metre' ? '0.01' : '1'}
                                  value={editForm.stock_amount}
                                  onChange={(e) => setEditForm({ ...editForm, stock_amount: parseFloat(e.target.value) || 0 })}
                                  className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span>{formatQuantity(material.stock_amount)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={editForm.min_stock_level}
                                  onChange={(e) => setEditForm({ ...editForm, min_stock_level: parseFloat(e.target.value) || 0 })}
                                  className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span>{formatQuantity(material.min_stock_level)}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lowStock ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-950 border-2 border-red-600 text-red-200 shadow-md shadow-red-900/50 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  KRİTİK
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
                                  Normal
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lowStock && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCreatePurchaseRequest(material.id)
                                      // Sayfayı yukarı kaydır
                                      setTimeout(() => {
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                      }, 100)
                                    }}
                                    disabled={creatingPurchase === material.id}
                                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-600 text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                  {creatingPurchase === material.id ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                      Oluşturuluyor...
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingCart className="w-3 h-3 mr-1" />
                                      Satın Alma
                                    </>
                                  )}
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="bg-gray-800/50">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => saveEdit(material.id)}
                                    type="button"
                                    style={{ border: '2px solid #16a34a', backgroundColor: '#16a34a', color: '#fff' }}
                                    className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg shadow text-xs font-medium hover:opacity-90 transition"
                                    title="Kaydet"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    type="button"
                                    style={{ border: '2px solid #dc2626', backgroundColor: '#dc2626', color: '#fff' }}
                                    className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg shadow text-xs font-medium hover:opacity-90 transition"
                                    title="İptal"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => {
                                      loadMovementHistory(material.id)
                                    }}
                                    type="button"
                                    style={{ border: '2px solid #9333ea', backgroundColor: '#9333ea', color: '#fff' }}
                                    className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg shadow text-xs font-medium hover:opacity-90 transition"
                                    title="Hareket Geçmişi"
                                  >
                                    <HistoryIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      startEdit(material)
                                    }}
                                    type="button"
                                    style={{ border: '2px solid #2563eb', backgroundColor: '#2563eb', color: '#fff' }}
                                    className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg shadow text-xs font-medium hover:opacity-90 transition"
                                    title="Düzenle"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      deleteMaterial(material.id, material.name)
                                      setTimeout(() => {
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                      }, 100)
                                    }}
                                    type="button"
                                    style={{ border: '2px solid #dc2626', backgroundColor: '#dc2626', color: '#fff' }}
                                    className="inline-flex items-center gap-1 min-w-[32px] h-8 px-2 rounded-lg shadow text-xs font-medium hover:opacity-90 transition"
                                    title="Malzemeyi sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Sil
                                  </button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
                    </div>
                  )
                })}
                {/* Sayfadaki tüm kodların tek toplam satırı - tıklanınca kod bazında detay modalı açılır */}
                {allDisplayedMaterials.length > 0 && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowAllCodesDetailModal(true)}
                    onKeyDown={(e) => e.key === 'Enter' && setShowAllCodesDetailModal(true)}
                    className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden cursor-pointer hover:border-gray-600 hover:bg-gray-800/80 transition"
                  >
                    <div className="overflow-x-auto">
                      <Table>
                        <TableBody>
                          <TableRow className="border-t-2 border-gray-600 bg-gray-800 font-semibold">
                            <TableCell className="text-gray-300 text-xs" colSpan={3}>
                              <span className="inline-flex items-center gap-1">
                                Toplam (tüm kodlar)
                                <span className="text-gray-500 font-normal text-[10px]">(detay için tıklayın)</span>
                              </span>
                            </TableCell>
                            <TableCell className="text-white text-xs">
                              {formatQuantity(allDisplayedMaterials.reduce((s, m) => s + (m.total_in || 0), 0))}
                            </TableCell>
                            <TableCell className="text-white text-xs">
                              {formatQuantity(allDisplayedMaterials.reduce((s, m) => s + (m.total_out || 0), 0))}
                            </TableCell>
                            <TableCell className="text-white text-xs">
                              {formatQuantity(allDisplayedMaterials.reduce((s, m) => s + (m.stock_amount ?? 0), 0))}
                            </TableCell>
                            <TableCell colSpan={4} className="text-gray-500 text-xs">
                              —
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Tüm kodlar - giriş/çıkış detayı (kod kod) modal */}
      {showAllCodesDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAllCodesDetailModal(false)}>
          <div className="bg-gray-900 rounded-lg border border-gray-800 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Tüm kodlar – Giriş / Çıkış detayları</h2>
              <button type="button" onClick={() => setShowAllCodesDetailModal(false)} className="text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="h-8">Kod</TableHead>
                    <TableHead className="h-8">Hammadde Adı</TableHead>
                    <TableHead className="h-8">Birim</TableHead>
                    <TableHead className="h-8 bg-green-900/40 text-green-300 font-medium">Toplam Giriş</TableHead>
                    <TableHead className="h-8 bg-red-900/40 text-red-300 font-medium">Toplam Çıkış</TableHead>
                    <TableHead className="h-8 bg-blue-900/40 text-blue-300 font-medium">Mevcut Stok</TableHead>
                    <TableHead className="h-8">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDisplayedMaterials.map((material, index) => (
                    <TableRow key={material.id} className="border-gray-800">
                      <TableCell className="text-white text-xs font-medium">
                        {(material.code && String(material.code).trim()) ? material.code : String(index + 1).padStart(4, '0')}
                      </TableCell>
                      <TableCell className="text-white text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          {material.name.replace(/^Kumaş\s+/i, '')}
                          {isLowStock(material) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-900/80 text-red-200 border border-red-600">
                              Kritik
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">{material.unit}</TableCell>
                      <TableCell className="text-green-300 text-xs tabular-nums">
                        {formatQuantity(material.total_in || 0)}
                      </TableCell>
                      <TableCell className="text-red-300 text-xs tabular-nums">
                        {formatQuantity(material.total_out || 0)}
                      </TableCell>
                      <TableCell className="text-blue-300 text-xs font-medium tabular-nums">
                        {formatQuantity(material.stock_amount ?? 0)}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAllCodesDetailModal(false)
                            loadMovementHistory(material.id)
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition"
                        >
                          <HistoryIcon className="w-3 h-3" />
                          Hareket geçmişi
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Hareket Geçmişi Modal */}
      {selectedMaterialForHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <HistoryIcon className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">
                  Stok Hareket Geçmişi
                </h2>
                <span className="text-sm text-gray-400">
                  {materials.find(m => m.id === selectedMaterialForHistory)?.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {movementHistory.length > 0 && canExport && (
                  <button
                    type="button"
                    onClick={exportMovementHistoryPdf}
                    disabled={exportingPdf}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {exportingPdf ? 'PDF hazırlanıyor...' : 'Geçmişi PDF aktar'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedMaterialForHistory(null)
                    setMovementHistory([])
                  }}
                  className="text-gray-400 hover:text-white transition p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-gray-400">Yükleniyor...</p>
                </div>
              ) : movementHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <LogoWithBackground size="md" className="mb-4" />
                  <p className="text-gray-400 mt-4">Henüz hareket kaydı bulunmuyor</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <p className="text-gray-300 mb-2">
                    Detaylı stok hareket geçmişi (çıkışlar – nerede kullanıldı ve tüm hareketler) PDF dosyasında yer alır.
                  </p>
                  <p className="text-gray-400 text-sm mb-6">
                    Üstteki <strong className="text-amber-400">Geçmişi PDF aktar</strong> butonuna tıklayarak raporu indirin.
                  </p>
                  {canExport && (
                  <button
                    type="button"
                    onClick={exportMovementHistoryPdf}
                    disabled={exportingPdf}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                  >
                    <Download className="w-5 h-5" />
                    {exportingPdf ? 'PDF hazırlanıyor...' : 'Geçmişi PDF aktar'}
                  </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

