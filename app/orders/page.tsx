'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, CheckCircle, XCircle, Clock, Factory, Download, Search, Filter, Plus, X, FileDown, Upload } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'
import { fetchApi, useApi } from '@/lib/api/client'

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
  const [newOrder, setNewOrder] = useState({
    order_number: '', // TAKİP NO
    dealer_name: '', // CARİ ADI (Bayi)
    customer_name: '', // MÜŞTERİ ADI
    customer_code: '', // Müşteri Kodu
    product_name: '', // ÜRÜN ADI
    product_sku: '', // SKU / Ürün Kodu
    quantity: 1, // SİP MİKTAR
    unit_price: 0, // Birim Fiyat
    order_date: '', // SİP TRH (Sipariş Tarihi)
    configuration: '', // KONFİGÜRASYON
    fabric_code: '', // KUMAŞ KODU
    case_info: '', // KASA
    leg_info: '', // AYAK
    unit: '', // BRİM (Birim)
    notes: '' // AÇIKLAMA
  })

  const ordersKey = useMemo(() => {
    if (filterStatus === 'all') return '/api/orders'
    if (filterStatus === 'shipped') return '/api/orders?status=completed'
    return `/api/orders?status=${encodeURIComponent(filterStatus)}`
  }, [filterStatus])

  const { data: ordersData, isLoading, mutate } = useApi<Order[]>(ordersKey)

  useEffect(() => {
    loadAccounts()
  }, [])

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

  async function loadAccounts() {
    try {
      const data = await fetchApi('/api/accounts?type=customer')
      const sorted = [...data].sort((a, b) => {
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

  async function handleCreateOrder() {
    if (!newOrder.dealer_name || !newOrder.customer_name) {
      alert('Lütfen bayi adı ve müşteri adını girin')
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
        })
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
        .filter(o => o.customer_code && o.customer_code.startsWith('MUS-'))
        .map(o => parseInt(o.customer_code.replace(/[^0-9]/g, '')) || 0)
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

    // Sipariş oluştur
    try {
      const orderData = {
        orders: [{
          ...newOrder,
          customer_code: customerCode,
          quantity: parseInt(String(newOrder.quantity)) || 1,
          unit_price: parseFloat(String(newOrder.unit_price)) || 0
        }]
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Sipariş oluşturulamadı')
      }

      alert('✅ Sipariş başarıyla oluşturuldu!')
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
        unit: '',
        notes: ''
      })
      await mutate()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }


  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Excel dosyası kontrolü
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Lütfen Excel dosyası seçin (.xlsx veya .xls)')
      return
    }

    setUploading(true)
    try {
      // Dosyayı base64'e çevir
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string).split(',')[1]
          
          const response = await fetch('/api/orders/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: base64 })
          })

          if (!response.ok) {
            const errorText = await response.text()
            let error: any = {}
            try {
              error = errorText ? JSON.parse(errorText) : {}
            } catch {
              error = { error: errorText || 'Dosya yüklenemedi' }
            }
            throw new Error(error.error || error.details || 'Dosya yüklenemedi')
          }

          const result = await response.json()
          
          if (result.errors && result.errors.length > 0) {
            let message = `✅ ${result.message || `${result.inserted_count || 0} sipariş yüklendi`}`
            if (result.errors.length <= 10) {
              message += `\n\nHatalar:\n${result.errors.join('\n')}`
            } else {
              message += `\n\n${result.errors.length} satır atlandı (detaylar konsola bakın)`
              console.warn('Excel yükleme hataları:', result.errors)
            }
            alert(message)
          } else {
            alert(`✅ ${result.message || `${result.inserted_count || 0} sipariş başarıyla yüklendi`}`)
          }
          
          await mutate()
          
          // File input'u temizle
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        } catch (error: any) {
          console.error('Excel yükleme hatası:', error)
          alert(`❌ Hata: ${error.message || 'Bilinmeyen hata'}`)
        } finally {
          setUploading(false)
        }
      }
      reader.onerror = () => {
        alert('❌ Dosya okuma hatası')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      alert('Hata: ' + error.message)
      setUploading(false)
    }
  }

  function convertToProduction() {
    if (selectedOrders.size === 0) {
      alert('Lütfen en az bir sipariş seçin')
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

  const filteredOrders = orders.filter(order => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        order.order_number?.toLowerCase().includes(search) ||
        order.dealer_name?.toLowerCase().includes(search) ||
        order.customer_name?.toLowerCase().includes(search) ||
        order.product_name?.toLowerCase().includes(search) ||
        order.product_sku?.toLowerCase().includes(search)
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
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 md:w-8 md:h-8" />
            <span>Siparişler</span>
          </h1>
          <LogoWithBackground size="sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Sipariş</span>
          </button>
          <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition cursor-pointer inline-flex items-center space-x-2 disabled:opacity-50">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Yükleniyor...' : 'Excel Yükle'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          {selectedOrders.size > 0 && (
            <button
              onClick={convertToProduction}
              disabled={converting}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition inline-flex items-center space-x-2 disabled:opacity-50"
            >
              <Factory className="w-4 h-4" />
              <span>{converting ? 'Dönüştürülüyor...' : `Üretim Emrine Dönüştür (${selectedOrders.size})`}</span>
            </button>
          )}
          {orders.length > 0 && (
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/orders/export')
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
                  alert('✅ Excel dosyası başarıyla indirildi')
                } catch (error: any) {
                  alert('Hata: ' + error.message)
                }
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition inline-flex items-center space-x-2"
            >
              <FileDown className="w-4 h-4" />
              <span>Excel'e Aktar</span>
            </button>
          )}
        </div>
      </div>

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
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
          <FileSpreadsheet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Sipariş Bulunmuyor</h3>
          <div className="flex flex-col items-center justify-center py-8">
            <LogoWithBackground size="md" className="mb-4" />
            <p className="text-sm text-gray-400 mt-4">
              {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz sipariş eklenmemiş. Yeni sipariş butonuna tıklayarak sipariş ekleyebilirsiniz.'}
            </p>
          </div>
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
                  <div className="text-xs text-gray-400 mb-1">KONFİGÜRASYON</div>
                  <div className="text-white text-sm">{order.configuration || '-'}</div>
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
                  <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                  <div className="text-white text-sm">{order.customer_name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                  <div className="text-white text-sm">{order.product_name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">KUMAŞ KODU</div>
                  <div className="text-white text-sm">
                    {(() => {
                      if (!order.notes) return '-'
                      const fabricMatch = order.notes.match(/Kumaş:\s*([^|]+)/i)
                      return fabricMatch ? fabricMatch[1].trim() : '-'
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Üretim Emri</div>
                  <div className="text-white text-sm">
                    {order.production_order_number ? (
                      <a
                        href={`/production/${order.production_order_id}`}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        {order.production_order_number}
                      </a>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>

                {/* Orta Sağ Sütun */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div>
                  <div className="text-white text-sm break-words whitespace-normal">
                    {(() => {
                      if (!order.notes) return '-'
                      let desc = order.notes
                        .replace(/Kumaş:\s*[^|]+/gi, '')
                        .replace(/Kasa:\s*[^|]+/gi, '')
                        .replace(/Ayak:\s*[^|]+/gi, '')
                        .replace(/Birim:\s*[^|]+/gi, '')
                        .replace(/\|\s*\|\s*/g, '|')
                        .replace(/^\|\s*|\s*\|$/g, '')
                        .trim()
                      return desc || '-'
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">SİP MİKTAR</div>
                  <div className="text-white text-sm">{order.quantity} ADET</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">KASA</div>
                  <div className="text-white text-sm">
                    {(() => {
                      if (!order.notes) return '-'
                      const caseMatch = order.notes.match(/Kasa:\s*([^|]+)/i)
                      return caseMatch ? caseMatch[1].trim() : '-'
                    })()}
                  </div>
                </div>

                {/* Sağ Sütun */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">SİP TRH</div>
                  <div className="text-white text-sm">
                    {order.order_date 
                      ? (() => {
                          try {
                            const dateStr = String(order.order_date).trim()
                            let date: Date
                            
                            if (dateStr.includes('-')) {
                              if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                                date = new Date(dateStr)
                              } else {
                                const parts = dateStr.split('-')
                                if (parts.length === 3 && parts[0].length <= 2) {
                                  date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
                                } else {
                                  date = new Date(dateStr)
                                }
                              }
                            } else if (dateStr.includes('.') || dateStr.includes('/')) {
                              const parts = dateStr.split(/[./]/)
                              if (parts.length === 3) {
                                date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
                              } else {
                                date = new Date(dateStr)
                              }
                            } else {
                              date = new Date(dateStr)
                            }
                            
                            if (isNaN(date.getTime())) {
                              return dateStr
                            }
                            
                            const day = date.getDate().toString().padStart(2, '0')
                            const month = (date.getMonth() + 1).toString().padStart(2, '0')
                            const year = date.getFullYear()
                            return `${day}.${month}.${year}`
                          } catch (e) {
                            return String(order.order_date)
                          }
                        })()
                      : '-'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                  <div className="text-white text-sm">{order.dealer_name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">AYAK</div>
                  <div className="text-white text-sm">
                    {(() => {
                      if (!order.notes) return '-'
                      const legMatch = order.notes.match(/Ayak:\s*([^|]+)/i)
                      return legMatch ? legMatch[1].trim() : '-'
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
              <h2 className="text-xl font-bold text-white">Yeni Sipariş Oluştur</h2>
              <button
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">SİP TRH (Sipariş Tarihi) *</label>
                  <input
                    type="date"
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
                          .filter(o => o.customer_code && o.customer_code.startsWith('MUS-'))
                          .map(o => parseInt(o.customer_code.replace(/[^0-9]/g, '')) || 0)
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SKU / Ürün Kodu</label>
                  <input
                    type="text"
                    value={newOrder.product_sku}
                    onChange={(e) => setNewOrder({ ...newOrder, product_sku: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Beşinci Satır: SİP MİKTAR, Birim Fiyat, BRİM */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SİP MİKTAR (Miktar) *</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Birim Fiyat</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newOrder.unit_price}
                    onChange={(e) => setNewOrder({ ...newOrder, unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">BRİM (Birim)</label>
                  <input
                    type="text"
                    value={newOrder.unit}
                    onChange={(e) => setNewOrder({ ...newOrder, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Adet, m², kg, vb."
                  />
                </div>
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

              {/* Sekizinci Satır: AÇIKLAMA */}
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
                  Sipariş Oluştur
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
    </div>
  )
}

