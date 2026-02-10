'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, CheckCircle, XCircle, Clock, Factory, Download, Search, Filter, Plus, X, FileDown, Upload, Trash2, Pencil } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { LogoWithBackground } from '@/components/Logo'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { fetchApi, useApi, getAuthHeaders } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDate, formatOrderDateDisplay } from '@/lib/utils/dateFormat'
import { usePolling } from '@/lib/hooks/usePolling'

interface Order {
  id: string
  order_number: string
  dealer_name: string | null // CARİ ADI (Bayi Adı)
  customer_name: string | null // MÜŞTERİ ADI (Satın Alan Müşteri)
  customer_code: string | null
  product_name: string
  product_sku: string | null
  product_id: string | null
  quantity: number
  unit_price: number
  total_amount: number
  order_date: string | null // SİP TRH (Sipariş Tarihi)
  delivery_date: string | null // Teslim Tarihi
  status: 'pending' | 'in_production' | 'completed' | 'cancelled'
  production_order_id: string | null
  production_order_number: string | null
  production_order_due_date: string | null
  production_status: string | null
  notes: string | null
  created_at: string
}

interface Account {
  id: string
  code: string
  name: string
  type: string
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [converting, setConverting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([])
  const [showDealerSuggestions, setShowDealerSuggestions] = useState(false)
  const dealerInputRef = useRef<HTMLInputElement>(null)
  const [orderProducts, setOrderProducts] = useState<Array<{ id: string; name: string; sku: string }>>([])
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)

  // Ürün adına göre BOM’daki ürün kodunu (SKU) bul
  function findSkuByProductName(productName: string): string | null {
    const n = (productName || '').trim().toLowerCase()
    if (!n || orderProducts.length === 0) return null
    const products = orderProducts
    // Tam eşleşme (tam ad veya "PRD-xxx - Ürün Adı" formatında display kısmı)
    let found = products.find((p) => {
      const name = (p.name || '').trim()
      const display = name.includes(' - ') ? name.split(' - ').slice(1).join(' - ').trim().toLowerCase() : name.toLowerCase()
      return name.toLowerCase() === n || display === n
    })
    if (found) return found.sku
    // Ürün adı girilen metni içeriyorsa veya girilen metin ürün adını içeriyorsa
    found = products.find((p) => {
      const name = (p.name || '').trim().toLowerCase()
      const display = name.includes(' - ') ? name.split(' - ').slice(1).join(' - ').trim().toLowerCase() : name
      return display.includes(n) || n.includes(display) || name.includes(n)
    })
    return found ? found.sku : null
  }

  // Sistem tarih+saatini formatla (datetime-local için)
  const getCurrentDateTimeLocal = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }
  
  const [newOrder, setNewOrder] = useState({
    order_number: '', // TAKİP NO
    dealer_name: '', // CARİ ADI (Bayi)
    customer_name: '', // MÜŞTERİ ADI
    customer_code: '', // Müşteri Kodu
    product_name: '', // ÜRÜN ADI
    product_sku: '', // SKU / Ürün Kodu
    quantity: 1, // SİP MİKTAR
    unit_price: 0, // Birim Fiyat
    order_date: getCurrentDateTimeLocal(), // SİP TRH (Sipariş Tarihi + Saati)
    configuration: '', // KONFİGÜRASYON
    fabric_code: '', // KUMAŞ KODU
    case_info: '', // KASA
    leg_info: '', // AYAK
    cushion_info: '', // KİRLENT
    unit: '', // BRİM (Birim)
    notes: '' // AÇIKLAMA
  })

  const ordersKey = useMemo(() => {
    if (filterStatus === 'all') return '/api/orders'
    if (filterStatus === 'shipped') return '/api/orders?status=completed'
    return `/api/orders?status=${encodeURIComponent(filterStatus)}`
  }, [filterStatus])

  const { data: ordersData, isLoading, mutate } = useApi<Order[]>(ordersKey)

  usePolling(() => { void mutate() })

  useEffect(() => {
    loadAccounts()
  }, [])

  // Modal açıldığında cari listesini ve ürün listesini (BOM’daki kodlar için) taze çek
  useEffect(() => {
    if (showCreateModal) {
      loadAccounts(true)
      fetchApi<Array<{ id: string; name: string; sku: string }>>('/api/products?has_bom=1').then((data) => {
        setOrderProducts(Array.isArray(data) ? data : [])
      }).catch(() => setOrderProducts([]))
      setNewOrder(prev => ({
        ...prev,
        order_date: getCurrentDateTimeLocal()
      }))
    }
  }, [showCreateModal])

  useEffect(() => {
    const list = ordersData ?? []
    const sorted = [...list].sort((a, b) => {
      const dateA = a.order_date || a.created_at || ''
      const dateB = b.order_date || b.created_at || ''
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })
    setOrders(sorted)
  }, [ordersData])

  async function loadAccounts(skipCache?: boolean) {
    try {
      const url = skipCache
        ? `/api/accounts?type=customer&_=${Date.now()}`
        : '/api/accounts?type=customer'
      const data = await fetchApi(url)
      const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) => {
        const codeA = a.code || ''
        const codeB = b.code || ''
        return codeA.localeCompare(codeB, 'tr', { numeric: true })
      })
      setAccounts(sorted)
      setFilteredAccounts(sorted)
    } catch (error) {
      console.error('Cari hesaplar yüklenirken hata:', error)
    }
  }

  function filterDealers(searchText: string) {
    if (!searchText.trim()) {
      setFilteredAccounts(accounts)
      return
    }
    const search = searchText.toLowerCase()
    const filtered = accounts.filter(account => 
      account.name.toLowerCase().includes(search)
    )
    setFilteredAccounts(filtered)
  }

  async function handleDealerNameChange(value: string) {
    setNewOrder({ ...newOrder, dealer_name: value })
    filterDealers(value)
    setShowDealerSuggestions(true)
  }

  async function selectDealer(account: Account) {
    setNewOrder({ ...newOrder, dealer_name: account.name })
    setShowDealerSuggestions(false)
  }

  function parseOrderNotes(notes: string | null | undefined) {
    const text = notes || ''
    const fabricMatch = text.match(/Kumaş:\s*([^|]+)/i)
    const caseMatch = text.match(/Kasa:\s*([^|]+)/i)
    const legMatch = text.match(/Ayak:\s*([^|]+)/i)
    const cushionMatch = text.match(/Kirlent:\s*([^|]+)/i) || text.match(/KİRLENT:\s*([^|]+)/)
    const unitMatch = text.match(/Birim:\s*([^|]+)/i)
    let desc = text
      .replace(/Kumaş:\s*[^|]+/gi, '')
      .replace(/Kasa:\s*[^|]+/gi, '')
      .replace(/Ayak:\s*[^|]+/gi, '')
      .replace(/Kirlent:\s*[^|]+/gi, '')
      .replace(/KİRLENT:\s*[^|]+/gi, '')
      .replace(/Birim:\s*[^|]+/gi, '')
      .replace(/\|\s*\|\s*/g, '|')
      .replace(/^\|\s*|\s*\|$/g, '')
      .trim()
    return {
      fabric_code: fabricMatch ? fabricMatch[1].trim() : '',
      case_info: caseMatch ? caseMatch[1].trim() : '',
      leg_info: legMatch ? legMatch[1].trim() : '',
      cushion_info: cushionMatch ? cushionMatch[1].trim() : '',
      unit: unitMatch ? unitMatch[1].trim() : '',
      notes: desc || ''
    }
  }

  function handleEditOrder(order: Order) {
    const parsed = parseOrderNotes(order.notes)
    const orderDate = order.order_date || order.created_at || ''
    let dateLocal = ''
    if (orderDate) {
      try {
        const d = new Date(orderDate)
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          const h = String(d.getHours()).padStart(2, '0')
          const min = String(d.getMinutes()).padStart(2, '0')
          dateLocal = `${y}-${m}-${day}T${h}:${min}`
        }
      } catch {}
    }
    if (!dateLocal) dateLocal = getCurrentDateTimeLocal()
    setNewOrder({
      order_number: order.order_number,
      dealer_name: order.dealer_name || '',
      customer_name: order.customer_name || '',
      customer_code: order.customer_code || '',
      product_name: order.product_name || '',
      product_sku: order.product_sku || '',
      quantity: order.quantity || 1,
      unit_price: order.unit_price ?? 0,
      order_date: dateLocal,
      configuration: (order as any).configuration || '',
      fabric_code: parsed.fabric_code,
      case_info: parsed.case_info,
      leg_info: parsed.leg_info,
      cushion_info: parsed.cushion_info,
      unit: parsed.unit,
      notes: parsed.notes
    })
    setEditingOrder(order)
    setShowCreateModal(true)
  }

  async function handleCreateOrder() {
    if (!newOrder.dealer_name || !newOrder.customer_name) {
      toast.warning('Lütfen bayi adı ve müşteri adını girin')
      return
    }

    // Bayi adı cari hesaplarda var mı kontrol et
    const existingAccount = accounts.find(
      acc => acc.name.toLowerCase() === newOrder.dealer_name.toLowerCase()
    )

    let dealerAccountId = existingAccount?.id

    // Eğer bayi yoksa otomatik oluştur
    if (!existingAccount) {
      try {
        const data = await fetchApi('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newOrder.dealer_name,
            type: 'customer'
          })
        }) as any
        dealerAccountId = data.id
        const newAccount: Account = {
          id: data.id,
          code: data.code,
          name: newOrder.dealer_name,
          type: 'customer'
        }
        setAccounts([...accounts, newAccount])
      } catch (error) {
        console.error('Cari hesap oluşturulurken hata:', error)
      }
    }

    // Müşteri kodu otomatik oluştur (eğer boşsa) - sıralamada boş olan ilk numarayı bul
    let customerCode = newOrder.customer_code.trim()
    if (!customerCode) {
      // Tüm müşteri kodlarını al ve numaraları çıkar
      const customerCodes = orders
        .filter(o => o.customer_code?.startsWith('MUS-'))
        .map((o: any) => parseInt(o.customer_code?.replace(/[^0-9]/g, '') || '') || 0)
        .filter(num => num > 0)
        .sort((a, b) => a - b)
      
      // Boş olan ilk numarayı bul
      let codeNumber = 1
      for (let i = 0; i < customerCodes.length; i++) {
        if (customerCodes[i] !== i + 1) {
          codeNumber = i + 1
          break
        }
        codeNumber = i + 2 // Eğer hiç boşluk yoksa, son numaradan devam et
      }
      
      customerCode = `MUS-${String(codeNumber).padStart(4, '0')}`
    }

    // Sipariş oluştur (AYAK, KASA, KİRLENT boşsa KATALOG; Ürün kodu boşsa BOM’daki ürün adına göre otomatik)
    try {
      const caseInfo = (newOrder.case_info || '').trim() || 'KATALOG'
      const legInfo = (newOrder.leg_info || '').trim() || 'KATALOG'
      const cushionInfo = (newOrder.cushion_info || '').trim() || 'KATALOG'
      let productSku = (newOrder.product_sku || '').trim()
      if (!productSku && (newOrder.product_name || '').trim()) {
        const skuFromName = findSkuByProductName(newOrder.product_name)
        if (skuFromName) productSku = skuFromName
        else productSku = `PRD-${Date.now().toString().slice(-6)}`
      }
      if (!productSku) productSku = `PRD-${Date.now().toString().slice(-6)}`

      if (editingOrder) {
        const response = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            id: editingOrder.id,
            dealer_name: newOrder.dealer_name,
            customer_name: newOrder.customer_name,
            customer_code: customerCode,
            product_name: newOrder.product_name,
            product_sku: productSku,
            quantity: parseInt(String(newOrder.quantity)) || 1,
            unit_price: parseFloat(String(newOrder.unit_price)) || 0,
            order_date: newOrder.order_date,
            configuration: newOrder.configuration,
            fabric_code: newOrder.fabric_code,
            case_info: caseInfo,
            leg_info: legInfo,
            cushion_info: cushionInfo,
            unit: newOrder.unit,
            notes: newOrder.notes
          }),
          credentials: 'include',
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Sipariş güncellenemedi')
        }
        toast.success('Sipariş güncellendi')
        setEditingOrder(null)
        setShowCreateModal(false)
        setNewOrder({
          order_number: '', dealer_name: '', customer_name: '', customer_code: '',
          product_name: '', product_sku: '', quantity: 1, unit_price: 0,
          order_date: getCurrentDateTimeLocal(), configuration: '', fabric_code: '',
          case_info: '', leg_info: '', cushion_info: '', unit: '', notes: ''
        })
        await mutate()
        return
      }

      const orderData = {
        orders: [{
          ...newOrder,
          product_sku: productSku,
          case_info: caseInfo,
          leg_info: legInfo,
          cushion_info: cushionInfo,
          customer_code: customerCode,
          quantity: parseInt(String(newOrder.quantity)) || 1,
          unit_price: parseFloat(String(newOrder.unit_price)) || 0
        }]
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(orderData),
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Sipariş oluşturulamadı')
      }

      const result = await response.json()
      const createdOrders = result?.data?.orders ?? result?.orders ?? []
      const createdIds = Array.isArray(createdOrders) ? createdOrders.map((o: { id: string }) => o.id).filter(Boolean) : []

      if (createdIds.length > 0) {
        try {
          const dueDate = newOrder.order_date
            ? new Date(newOrder.order_date).toISOString().slice(0, 10)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          const convertRes = await fetch('/api/orders/convert-to-production', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ order_ids: createdIds, due_date: dueDate }),
            credentials: 'include',
          })
          if (convertRes.ok) {
            const convertData = await convertRes.json()
            const count = convertData?.converted_orders?.length ?? createdIds.length
            toast.success(`Sipariş oluşturuldu ve ${count} sipariş üretim emrine aktarıldı`)
          } else {
            const errData = await convertRes.json().catch(() => ({}))
            toast.success('Sipariş oluşturuldu')
            toast.warning(errData?.error || 'Üretim emrine aktarılamadı. Siparişler sayfasından "Üretim Emrine Dönüştür" ile aktarabilirsiniz.')
          }
        } catch (_e) {
          toast.success('Sipariş oluşturuldu')
          toast.warning('Üretim emrine otomatik aktarılamadı. Siparişlerden "Üretim Emrine Dönüştür" ile aktarabilirsiniz.')
        }
      } else {
        toast.success('Sipariş başarıyla oluşturuldu')
      }

      setShowCreateModal(false)
      setNewOrder({
        order_number: '',
        dealer_name: '',
        customer_name: '',
        customer_code: '',
        product_name: '',
        product_sku: '',
        quantity: 1,
        unit_price: 0,
        order_date: getCurrentDateTimeLocal(),
        configuration: '',
        fabric_code: '',
        case_info: '',
        leg_info: '',
        cushion_info: '',
        unit: '',
        notes: ''
      })
      await mutate()
    } catch (error: any) {
      toast.error(error.message || 'İşlem başarısız')
    }
  }


  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Excel dosyası kontrolü
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.warning('Lütfen Excel dosyası seçin (.xlsx veya .xls)')
      return
    }

    setUploading(true)
    try {
      // KESİN ÇÖZÜM: Chunk-based upload - Dosyayı küçük parçalara böl
      const CHUNK_SIZE = 8 * 1024 * 1024 // 8MB chunks (10MB limit'in altında)
      const fileSize = file.size
      
      if (fileSize <= CHUNK_SIZE) {
        // Küçük dosyalar için direkt FormData gönder
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/orders/import', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
          credentials: 'include',
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          let error: any = {}
          try {
            error = errorText ? JSON.parse(errorText) : {}
          } catch {
            error = { error: errorText || 'Dosya yüklenemedi' }
          }
          const details =
            error.details && error.details !== error.error
              ? `: ${error.details}`
              : ''
          throw new Error(`${error.error || 'Dosya yüklenemedi'}${details}`)
        }

        const smallFileResult = await response.json()
        
        if (smallFileResult.errors && smallFileResult.errors.length > 0) {
          let message = `✅ ${smallFileResult.message || `${smallFileResult.inserted_count || 0} sipariş yüklendi`}`
          if (smallFileResult.errors.length <= 20) {
            message += `\n\nAtlanan Satırlar (${smallFileResult.errors.length} adet):\n${smallFileResult.errors.slice(0, 20).join('\n')}`
            if (smallFileResult.errors.length > 20) {
              message += `\n\n... ve ${smallFileResult.errors.length - 20} satır daha (tüm detaylar konsola bakın)`
            }
          } else {
            message += `\n\n${smallFileResult.errors.length} satır atlandı (ilk 20 hata gösteriliyor, tüm detaylar konsola bakın)`
            message += `\n\nİlk 20 Hata:\n${smallFileResult.errors.slice(0, 20).join('\n')}`
            console.warn('Excel yükleme hataları (tümü):', smallFileResult.errors)
          }
          toast.error(message)
        } else {
          toast.success(smallFileResult.message || `${smallFileResult.inserted_count || 0} sipariş başarıyla yüklendi`)
        }
        
        window.location.reload()
        return
      }
      
      // Büyük dosyalar için chunk-based upload
      toast.info(`Dosya ${(fileSize / 1024 / 1024).toFixed(2)}MB, parçalara bölünüyor...`)
      
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)
      const totalChunks = Math.ceil(buffer.length / CHUNK_SIZE)
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Her chunk'ı gönder
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, buffer.length)
        const chunk = buffer.slice(start, end)
        const chunkBlob = new Blob([chunk], { type: file.type })
        
        const chunkFormData = new FormData()
        chunkFormData.append('chunk', chunkBlob)
        chunkFormData.append('chunkIndex', chunkIndex.toString())
        chunkFormData.append('totalChunks', totalChunks.toString())
        chunkFormData.append('uploadId', uploadId)
        chunkFormData.append('fileName', file.name)
        chunkFormData.append('fileSize', fileSize.toString())
        chunkFormData.append('isLastChunk', (chunkIndex === totalChunks - 1).toString())
        
        const chunkResponse = await fetch('/api/orders/import/chunk', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: chunkFormData,
          credentials: 'include',
        })
        
        if (!chunkResponse.ok) {
          const errorText = await chunkResponse.text()
          let error: any = {}
          try {
            error = errorText ? JSON.parse(errorText) : {}
          } catch {
            error = { error: errorText || 'Chunk yüklenemedi' }
          }
          throw new Error(`Parça ${chunkIndex + 1}/${totalChunks} yüklenemedi: ${error.error || 'Bilinmeyen hata'}`)
        }
        
        // Progress göstergesi
        const progress = ((chunkIndex + 1) / totalChunks * 100).toFixed(0)
        console.log(`Yükleme ilerlemesi: ${progress}% (${chunkIndex + 1}/${totalChunks})`)
      }
      
      // Tüm chunk'lar yüklendikten sonra birleştirme ve işleme isteği gönder
      const mergeResponse = await fetch('/api/orders/import/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          uploadId: uploadId,
          fileName: file.name,
          totalChunks: totalChunks,
          fileSize: fileSize
        })
      })
      
      if (!mergeResponse.ok) {
        const errorText = await mergeResponse.text()
        let error: any = {}
        try {
          error = errorText ? JSON.parse(errorText) : {}
        } catch {
          error = { error: errorText || 'Dosya birleştirilemedi' }
        }
        throw new Error(`Dosya birleştirilemedi: ${error.error || 'Bilinmeyen hata'}`)
      }
      
      const mergeResult = await mergeResponse.json()
      
      if (mergeResult.errors && mergeResult.errors.length > 0) {
        let message = `✅ ${mergeResult.message || `${mergeResult.inserted_count || 0} sipariş yüklendi`}`
        if (mergeResult.errors.length <= 20) {
          message += `\n\nAtlanan Satırlar (${mergeResult.errors.length} adet):\n${mergeResult.errors.slice(0, 20).join('\n')}`
        } else {
          message += `\n\n${mergeResult.errors.length} satır atlandı (ilk 20 hata gösteriliyor)`
          message += `\n\nİlk 20 Hata:\n${mergeResult.errors.slice(0, 20).join('\n')}`
        }
        toast.error(message)
      } else {
        toast.success(mergeResult.message || 'Dosya başarıyla yüklendi')
      }
      
      window.location.reload()
      return
    } catch (error: any) {
      console.error('Excel yükleme hatası:', error)
      toast.error(error.message || 'Bilinmeyen hata')
    } finally {
      setUploading(false)
    }
  }

  function convertToProduction() {
    if (selectedOrders.size === 0) {
      toast.warning('Lütfen en az bir sipariş seçin')
      return
    }

    // Seçilen sipariş ID'lerini query parameter olarak üretim emirleri sayfasına gönder
    const orderIds = Array.from(selectedOrders)
    const queryParams = new URLSearchParams()
    queryParams.set('from_orders', orderIds.join(','))
    
    // Üretim emirleri sayfasına yönlendir
    router.push(`/production?${queryParams.toString()}`)
  }

  function toggleOrderSelection(orderId: string) {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  async function handleDeleteOrder(order: Order) {
    if (!confirm(`"${order.order_number}" siparişini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return
    }
    try {
      const response = await fetch(`/api/orders?id=${encodeURIComponent(order.id)}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Sipariş silinemedi')
      }
      mutate()
      setSelectedOrders((prev) => {
        const next = new Set(prev)
        next.delete(order.id)
        return next
      })
    } catch (e: any) {
      toast.error(e.message || 'Sipariş silinemedi')
    }
  }

  function toggleAllSelection() {
    const filtered = filteredOrders
    if (selectedOrders.size === filtered.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(filtered.map(o => o.id)))
    }
  }

  // İstatistikleri hesapla
  const pendingCount = orders.filter(o => o.status === 'pending').length
  const inProductionCount = orders.filter(o => o.status === 'in_production').length
  const completedCount = orders.filter(o => o.status === 'completed').length

  const normalize = (value: unknown) => String(value ?? '').toLowerCase()
  const normalizeNotes = (value: unknown) => String(value ?? '')

  const filteredOrders = orders.filter(order => {
    if (searchTerm) {
      const search = normalize(searchTerm)
      return (
        normalize(order.order_number).includes(search) ||
        normalize(order.dealer_name).includes(search) ||
        normalize(order.customer_name).includes(search) ||
        normalize(order.product_name).includes(search) ||
        normalize(order.product_sku).includes(search)
      )
    }
    return true
  })

  const statusColors = {
    pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
    in_production: 'bg-blue-900/30 text-blue-400 border-blue-700',
    completed: 'bg-green-900/30 text-green-400 border-green-700',
    cancelled: 'bg-red-900/30 text-red-400 border-red-700'
  }

  const statusLabels = {
    pending: 'Beklemede',
    in_production: 'Üretimde',
    completed: 'Tamamlandı',
    cancelled: 'İptal Edildi'
  }

  return (
    <AppDashboardLayout
      title="Siparişler"
      subtitle={`Toplam ${filteredOrders.length} sipariş`}
      icon={FileSpreadsheet}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="solid"
            color="primary"
            size="sm"
            onClick={() => {
              setEditingOrder(null)
              setShowCreateModal(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Sipariş
          </Button>
          <Button
            variant="solid"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={async () => {
              if (!confirm('Tüm siparişleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return
              try {
                const res = await fetch('/api/orders?all=1', { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' })
                if (!res.ok) throw new Error((await res.json()).error || 'Silinemedi')
                const data = await res.json()
                mutate()
                toast.success(data?.message || 'Siparişler silindi.')
              } catch (e: any) {
                toast.error(e.message || 'Siparişler silinemedi')
              }
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Tüm Siparişleri Sil
          </Button>
          <Button
            variant="solid"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Yükleniyor...' : 'Excel Yükle'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          {selectedOrders.size > 0 && (
            <Button
              variant="solid"
              color="success"
              size="sm"
              onClick={convertToProduction}
              disabled={converting}
            >
              <Factory className="w-4 h-4 mr-2" />
              {converting ? 'Dönüştürülüyor...' : `Üretim Emrine Dönüştür (${selectedOrders.size})`}
            </Button>
          )}
          {orders.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const exportParams = new URLSearchParams()
                  if (filterStatus && filterStatus !== 'all') exportParams.set('status', filterStatus)
                  if (searchTerm.trim()) exportParams.set('search', searchTerm.trim())
                  const query = exportParams.toString()
                  const response = await fetch(`/api/orders/export${query ? '?' + query : ''}`, {
                    headers: getAuthHeaders(),
                    credentials: 'include',
                  })
                  if (!response.ok) {
                    throw new Error('Excel export başarısız')
                  }
                  const blob = await response.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `Siparisler_${new Date().toISOString().split('T')[0]}.xlsx`
                  document.body.appendChild(a)
                  a.click()
                  window.URL.revokeObjectURL(url)
                  document.body.removeChild(a)
                  toast.success('Excel dosyası başarıyla indirildi')
                } catch (error: any) {
                  toast.error(error.message || 'İşlem başarısız')
                }
              }}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Excel'e Aktar
            </Button>
          )}
        </div>
      }
    >

      {/* İstatistikler */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Beklemede</div>
          <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Üretimde</div>
          <div className="text-2xl font-bold text-blue-400">{inProductionCount}</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Sevk Edilen</div>
          <div className="text-2xl font-bold text-green-400">{completedCount}</div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Sipariş no, bayi, müşteri, ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Tümü</option>
            <option value="pending">Beklemede</option>
            <option value="in_production">Üretimde</option>
            <option value="shipped">Sevk Edilen</option>
          </select>
        </div>
      </div>

      {/* Siparişler Tablosu */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-400 mt-4">Yükleniyor...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <EmptyState
            title={searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz sipariş yok'}
            description={searchTerm ? 'Farklı bir arama deneyin' : 'Yeni sipariş butonuna tıklayarak sipariş ekleyebilirsiniz.'}
            icon={FileSpreadsheet}
            action={!searchTerm ? (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Sipariş
              </Button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div 
              key={order.id} 
              className={`bg-gray-900 rounded-lg border-2 border-gray-600 p-4 hover:bg-gray-800/30 ${
                selectedOrders.has(order.id) ? 'bg-blue-900/20 border-blue-500' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-3 mb-3">
                <span className="text-xs text-gray-400 font-mono">{order.order_number}</span>
                <div className="flex items-center gap-2">
                  {order.status === 'pending' && !order.production_order_id && (
                    <button
                      type="button"
                      onClick={() => handleEditOrder(order)}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-400 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 rounded-lg text-xs font-medium transition-colors"
                      title="Siparişi düzenle"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Düzenle
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(order)}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-colors"
                    title="Siparişi sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Sil
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Sol Sütun */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">Seç</div>
                  <div>
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      disabled={order.status === 'in_production' || order.status === 'completed'}
                      className="rounded border-gray-600"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">TAKİP NO</div>
                  <div className="text-white text-sm font-mono">{order.order_number}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">KASA</div>
                  <div className="text-white text-sm">
                    {(() => {
                      const notesText = normalizeNotes(order.notes).trim()
                      if (!notesText) return '-'
                      const caseMatch = notesText.match(/Kasa:\s*([^|]+)/i)
                      return caseMatch ? caseMatch[1].trim() : '-'
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Durum</div>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs border ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </div>
                </div>

                {/* Orta Sol Sütun */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                  <div className="text-white text-sm">{order.dealer_name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div>
                  <div className="text-white text-sm break-words whitespace-normal">
                    {(() => {
                      const notesText = normalizeNotes(order.notes).trim()
                      if (!notesText) return '-'
                      let desc = notesText
                        .replace(/Kumaş:\s*[^|]+/gi, '')
                        .replace(/Kasa:\s*[^|]+/gi, '')
                        .replace(/Ayak:\s*[^|]+/gi, '')
                        .replace(/Kirlent:\s*[^|]+/gi, '')
                        .replace(/Birim:\s*[^|]+/gi, '')
                        .replace(/\|\s*\|\s*/g, '|')
                        .replace(/^\|\s*|\s*\|$/g, '')
                        .trim()
                      return desc || '-'
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">KUMAŞ KODU</div>
                  <div className="text-white text-sm">
                    {(() => {
                      const notesText = normalizeNotes(order.notes).trim()
                      if (!notesText) return '-'
                      const fabricMatch = notesText.match(/Kumaş:\s*([^|]+)/i)
                      return fabricMatch ? fabricMatch[1].trim() : '-'
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Üretim Emri</div>
                  <div className="text-white text-sm">
                    {order.production_order_number ? (
                      <>
                        <a
                          href={`/production/${order.production_order_id}`}
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          {order.production_order_number}
                        </a>
                        {order.status === 'in_production' && order.production_order_due_date && (
                          <span className="block text-gray-400 text-xs mt-0.5">
                            Emir tarihi: {formatDate(order.production_order_due_date) || '-'}
                          </span>
                        )}
                      </>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>

                {/* Orta Sağ Sütun */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                  <div className="text-white text-sm">{order.product_name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">SİP MİKTAR</div>
                  <div className="text-white text-sm">{order.quantity} ADET</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">KONFİGÜRASYON</div>
                  <div className="text-white text-sm">{(order as any).configuration || '-'}</div>
                </div>

                {/* Sağ Sütun */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">SİP TRH</div>
                  <div className="text-white text-sm">
                    {formatOrderDateDisplay(order.order_date, order.created_at ?? null)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                  <div className="text-white text-sm">{order.customer_name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">AYAK</div>
                  <div className="text-white text-sm">
                    {(() => {
                      const notesText = normalizeNotes(order.notes).trim()
                      if (!notesText) return '-'
                      const legMatch = notesText.match(/Ayak:\s*([^|]+)/i)
                      return legMatch ? legMatch[1].trim() : '-'
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">KİRLENT</div>
                  <div className="text-white text-sm">
                    {(() => {
                      const notesText = normalizeNotes(order.notes).trim()
                      if (!notesText) return '-'
                      const cushionMatch = notesText.match(/Kirlent:\s*([^|]+)/i)
                      return cushionMatch ? cushionMatch[1].trim() : '-'
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Sipariş Oluşturma Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{editingOrder ? 'Sipariş Düzenle' : 'Yeni Sipariş Oluştur'}</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingOrder(null)
                  setNewOrder({
                    order_number: '',
                    dealer_name: '',
                    customer_name: '',
                    customer_code: '',
                    product_name: '',
                    product_sku: '',
                    quantity: 1,
                    unit_price: 0,
                    order_date: getCurrentDateTimeLocal(),
                    configuration: '',
                    fabric_code: '',
                    case_info: '',
                    leg_info: '',
                    cushion_info: '',
                    unit: '',
                    notes: ''
                  })
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreateOrder()
              }}
              className="space-y-4"
            >
              {/* İlk Satır: TAKİP NO ve SİP TRH */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">TAKİP NO (Sipariş No)</label>
                  <input
                    type="text"
                    value={newOrder.order_number}
                    onChange={(e) => setNewOrder({ ...newOrder, order_number: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Otomatik oluşturulacak"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SİP TRH (Sipariş Tarihi + Saati) *</label>
                  <input
                    type="datetime-local"
                    value={newOrder.order_date}
                    onChange={(e) => setNewOrder({ ...newOrder, order_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* İkinci Satır: CARİ ADI ve MÜŞTERİ ADI */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-300 mb-1">CARİ ADI (Bayi Adı) *</label>
                  <input
                    ref={dealerInputRef}
                    type="text"
                    value={newOrder.dealer_name}
                    onChange={(e) => handleDealerNameChange(e.target.value)}
                    onFocus={() => setShowDealerSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDealerSuggestions(false), 200)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                    placeholder="Bayi adı yazın..."
                  />
                  {showDealerSuggestions && filteredAccounts.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredAccounts.map((account) => (
                        <div
                          key={account.id}
                          onClick={() => selectDealer(account)}
                          className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white text-sm"
                        >
                          {account.name} <span className="text-gray-400 text-xs">({account.code})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {showDealerSuggestions && filteredAccounts.length === 0 && newOrder.dealer_name.trim() && (
                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
                      <div className="px-3 py-2 text-gray-400 text-sm">
                        Yeni cari hesap oluşturulacak: "{newOrder.dealer_name}"
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">MÜŞTERİ ADI (Satın Alan Müşteri) *</label>
                  <input
                    type="text"
                    value={newOrder.customer_name}
                    onChange={(e) => {
                      const customerName = e.target.value
                      // Müşteri adı girildiğinde ve müşteri kodu boşsa otomatik oluştur - sıralamada boş olan ilk numarayı bul
                      let newCustomerCode = newOrder.customer_code
                      if (customerName.trim() && !newOrder.customer_code.trim()) {
                        // Tüm müşteri kodlarını al ve numaraları çıkar
      const customerCodes = orders
        .filter((o: any) => o.customer_code?.startsWith('MUS-'))
        .map((o: any) => parseInt(o.customer_code!.replace(/[^0-9]/g, '') || '') || 0)
                          .filter(num => num > 0)
                          .sort((a, b) => a - b)
                        
                        // Boş olan ilk numarayı bul
                        let codeNumber = 1
                        for (let i = 0; i < customerCodes.length; i++) {
                          if (customerCodes[i] !== i + 1) {
                            codeNumber = i + 1
                            break
                          }
                          codeNumber = i + 2 // Eğer hiç boşluk yoksa, son numaradan devam et
                        }
                        
                        newCustomerCode = `MUS-${String(codeNumber).padStart(4, '0')}`
                      }
                      setNewOrder({ ...newOrder, customer_name: customerName, customer_code: newCustomerCode })
                    }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Üçüncü Satır: Müşteri Kodu */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Müşteri Kodu 
                  <span className="text-gray-400 text-xs ml-2">(Otomatik oluşturulacak)</span>
                </label>
                <input
                  type="text"
                  value={newOrder.customer_code}
                  onChange={(e) => setNewOrder({ ...newOrder, customer_code: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Otomatik oluşturulacak"
                />
              </div>

              {/* Dördüncü Satır: ÜRÜN ADI ve SKU */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">ÜRÜN ADI *</label>
                  <input
                    type="text"
                    value={newOrder.product_name}
                    onChange={(e) => setNewOrder({ ...newOrder, product_name: e.target.value })}
                    onBlur={() => {
                      const name = (newOrder.product_name || '').trim()
                      if (!name) return
                      const sku = findSkuByProductName(name)
                      if (sku) setNewOrder((prev) => ({ ...prev, product_sku: sku }))
                    }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SKU / Ürün Kodu <span className="text-gray-400 text-xs">(Ürün adına göre BOM ile aynı)</span></label>
                  <input
                    type="text"
                    value={newOrder.product_sku}
                    onChange={(e) => setNewOrder({ ...newOrder, product_sku: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Ürün adına göre otomatik"
                  />
                </div>
              </div>

              {/* Beşinci Satır: SİP MİKTAR (BRİM / Birim alanı kaldırıldı) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">SİP MİKTAR (Miktar) *</label>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={newOrder.quantity === 0 ? '' : newOrder.quantity}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      setNewOrder((prev) => ({ ...prev, quantity: 0 }))
                      return
                    }
                    const num = parseInt(raw, 10)
                    if (!Number.isNaN(num) && num >= 0) {
                      setNewOrder((prev) => ({ ...prev, quantity: num }))
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Altıncı Satır: KONFİGÜRASYON ve KUMAŞ KODU */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">KONFİGÜRASYON</label>
                  <input
                    type="text"
                    value={newOrder.configuration}
                    onChange={(e) => setNewOrder({ ...newOrder, configuration: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">KUMAŞ KODU</label>
                  <input
                    type="text"
                    value={newOrder.fabric_code}
                    onChange={(e) => setNewOrder({ ...newOrder, fabric_code: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Yedinci Satır: KASA ve AYAK */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">KASA</label>
                  <input
                    type="text"
                    value={newOrder.case_info}
                    onChange={(e) => setNewOrder({ ...newOrder, case_info: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">AYAK</label>
                  <input
                    type="text"
                    value={newOrder.leg_info}
                    onChange={(e) => setNewOrder({ ...newOrder, leg_info: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Sekizinci Satır: KİRLENT */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">KİRLENT</label>
                <input
                  type="text"
                  value={newOrder.cushion_info}
                  onChange={(e) => setNewOrder({ ...newOrder, cushion_info: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Dokuzuncu Satır: AÇIKLAMA */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">AÇIKLAMA (Notlar)</label>
                <textarea
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="Ek notlar ve açıklamalar..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
      setNewOrder({
        order_number: '',
        dealer_name: '',
        customer_name: '',
        customer_code: '',
        product_name: '',
        product_sku: '',
        quantity: 1,
        unit_price: 0,
        order_date: '',
        configuration: '',
        fabric_code: '',
        case_info: '',
        leg_info: '',
        cushion_info: '',
        unit: '',
        notes: ''
      })
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  İptal
                </button>
                  <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingOrder ? 'Güncelle' : 'Sipariş Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* İstatistikler */}
      {orders.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-1">Toplam Sipariş</div>
            <div className="text-2xl font-bold text-white">{orders.length}</div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-1">Beklemede</div>
            <div className="text-2xl font-bold text-yellow-400">
              {orders.filter(o => o.status === 'pending').length}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-1">Üretimde</div>
            <div className="text-2xl font-bold text-blue-400">
              {orders.filter(o => o.status === 'in_production').length}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-1">Tamamlandı</div>
            <div className="text-2xl font-bold text-green-400">
              {orders.filter(o => o.status === 'completed').length}
            </div>
          </div>
        </div>
      )}
    </AppDashboardLayout>
  )
}

