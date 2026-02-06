'use client'

import { useState, useEffect, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Truck, Edit, Save, X, Percent, DollarSign, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { formatDate, formatDateTime } from '@/lib/utils/dateFormat'

interface Account {
  id: string
  code: string
  name: string
  type: string
  tax_number?: string
  phone?: string
  email?: string
  address?: string
  balance: number
  risk_limit?: number | null
  discount_rate?: number | null
}

interface Shipment {
  id: string
  shipment_number: string
  shipment_date: string
  total_quantity: number
  total_amount: number
  discount_rate?: number | null
  discount_amount?: number | null
  tax_rate: number
  tax_amount: number
  final_amount: number
  status: string
  items?: ShipmentItem[]
}

interface ShipmentItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string
}

interface AccountTransaction {
  id: string
  account_id: string
  transaction_type: 'debit' | 'credit'
  amount: number
  reference_type?: string
  reference_id?: string
  description?: string
  created_at: string
  product_id?: string
  product_name?: string
  product_sku?: string
  quantity?: number
  unit_price?: number
  total_price?: number
  shipment_number?: string
  shipment_discount_rate?: number | null
  shipment_discount_amount?: number | null
  shipment_status?: string | null
  running_balance?: number
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [transactions, setTransactions] = useState<AccountTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null)
  const [taxRate, setTaxRate] = useState<string>('')
  const [expandedShipments, setExpandedShipments] = useState<Set<string>>(new Set())
  const [printStartDate, setPrintStartDate] = useState<string>('')
  const [printEndDate, setPrintEndDate] = useState<string>('')
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [startPickerMonth, setStartPickerMonth] = useState(new Date().getMonth())
  const [startPickerYear, setStartPickerYear] = useState(new Date().getFullYear())
  const [endPickerMonth, setEndPickerMonth] = useState(new Date().getMonth())
  const [endPickerYear, setEndPickerYear] = useState(new Date().getFullYear())
  const [clearingData, setClearingData] = useState(false)

  useEffect(() => {
    const id = params?.id as string
    if (id && id !== 'undefined') {
      loadAccount(id)
      loadShipments(id)
      loadTransactions(id)
    }
  }, [params?.id])

  async function loadAccount(id: string) {
    try {
      const data = await fetchApi<Account>(`/api/accounts/${id}`)
      setAccount(data)
    } catch (error) {
      console.error('Error loading account:', error)
      alert('Cari hesap yüklenirken hata oluştu')
      router.push('/accounts')
    } finally {
      setLoading(false)
    }
  }

  async function loadShipments(accountId: string) {
    try {
      const data = await fetchApi<Shipment[]>(`/api/shipments?customer_id=${accountId}`)
      setShipments(data)
    } catch (error) {
      console.error('Error loading shipments:', error)
    }
  }

  async function clearAccountData() {
    if (!account) return
    if (!confirm('Bu carinin tüm cari hareketleri ve sevkiyat girdi verileri silinecek. Cari ayarları (ad, kod, iskonto, risk limiti vb.) değişmeyecek. Devam edilsin mi?')) {
      return
    }
    setClearingData(true)
    try {
      await fetchApi(`/api/accounts/${account.id}/clear-data`, { method: 'POST' })
      await loadAccount(account.id)
      await loadShipments(account.id)
      await loadTransactions(account.id)
      alert('Cari ve sevkiyat girdi verileri silindi. Ayarlar aynen kaldı.')
    } catch (e: any) {
      alert('Hata: ' + (e?.message || 'İşlem başarısız'))
    } finally {
      setClearingData(false)
    }
  }

  async function loadTransactions(accountId: string) {
    try {
      const data = await fetchApi<AccountTransaction[]>(`/api/accounts/${accountId}/transactions`)
      setTransactions(data)
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  function toggleShipment(shipmentId: string) {
    const newExpanded = new Set(expandedShipments)
    if (newExpanded.has(shipmentId)) {
      newExpanded.delete(shipmentId)
    } else {
      newExpanded.add(shipmentId)
    }
    setExpandedShipments(newExpanded)
  }

  function toDateOnly(value?: string) {
    if (!value) return ''
    return value.split('T')[0]
  }

  function parseDateParts(value?: string) {
    if (!value) return null
    const [y, m, d] = value.split('-').map(Number)
    if (!y || !m || !d) return null
    return { y, m, d }
  }

  function formatDisplayDate(value?: string) {
    const parts = parseDateParts(value)
    if (!parts) return ''
    return `${String(parts.d).padStart(2, '0')}.${String(parts.m).padStart(2, '0')}.${parts.y}`
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayIndex(year: number, month: number) {
    const day = new Date(year, month, 1).getDay()
    return (day + 6) % 7
  }

  const monthsTr = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ]
  const weekdaysTr = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

  function inRange(dateValue?: string) {
    const dateOnly = toDateOnly(dateValue)
    if (!dateOnly) return false
    if (printStartDate && dateOnly < printStartDate) return false
    if (printEndDate && dateOnly > printEndDate) return false
    return true
  }

  const filteredTransactions = printStartDate || printEndDate
    ? transactions.filter((transaction) => inRange(transaction.created_at))
    : transactions

  const filteredShipments = printStartDate || printEndDate
    ? shipments.filter((shipment) => inRange(shipment.shipment_date))
    : shipments

  function startEditTax(shipment: Shipment) {
    setEditingShipmentId(shipment.id)
    setTaxRate(shipment.tax_rate?.toString() || '0')
  }

  function cancelEdit() {
    setEditingShipmentId(null)
    setTaxRate('')
  }

  async function saveTaxRate(shipmentId: string) {
    if (!taxRate || parseFloat(taxRate) < 0 || parseFloat(taxRate) > 100) {
      alert('KDV oranı 0-100 arasında olmalıdır')
      return
    }

    try {
      const response = await fetch(`/api/shipments/${shipmentId}/tax`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tax_rate: parseFloat(taxRate),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'KDV güncellenemedi')
      }

      alert('✅ KDV başarıyla güncellendi!')
      setEditingShipmentId(null)
      setTaxRate('')
      
      // Sevkiyatları yeniden yükle
      if (account) {
        loadShipments(account.id)
        loadAccount(account.id) // Bakiye güncellenmiş olabilir
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

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Cari hesap bulunamadı</p>
          <button
            onClick={() => router.push('/accounts')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto print-area">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between no-print">
          <button
            onClick={() => router.push('/accounts')}
            className="text-blue-400 hover:text-blue-300 inline-flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Geri</span>
          </button>
          {account.type === 'customer' && (
            <button
              type="button"
              onClick={clearAccountData}
              disabled={clearingData}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-900/70 transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {clearingData ? 'Siliniyor...' : 'Girdi Verilerini Sil'}
            </button>
          )}
        </div>

        {/* Cari Hesap Bilgileri */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white mb-4">{account.name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Kod:</div>
              <div className="text-white font-mono">{account.code}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Tip:</div>
              <div className="text-white">
                {account.type === 'customer' ? 'Müşteri' : 'Tedarikçi'}
              </div>
            </div>
            {account.tax_number && (
              <div>
                <div className="text-gray-400 mb-1">Vergi No:</div>
                <div className="text-white">{account.tax_number}</div>
              </div>
            )}
            {account.phone && (
              <div>
                <div className="text-gray-400 mb-1">Telefon:</div>
                <div className="text-white">{account.phone}</div>
              </div>
            )}
            {account.email && (
              <div>
                <div className="text-gray-400 mb-1">E-posta:</div>
                <div className="text-white">{account.email}</div>
              </div>
            )}
            {account.address && (
              <div className="md:col-span-2">
                <div className="text-gray-400 mb-1">Adres:</div>
                <div className="text-white">{account.address}</div>
              </div>
            )}
            <div>
              <div className="text-gray-400 mb-1">Bakiye:</div>
              <div className={`text-lg font-bold flex items-center space-x-2 ${
                account.balance > 0 ? 'text-red-400' :
                account.balance < 0 ? 'text-green-400' :
                'text-gray-400'
              }`}>
                <span>
                  {account.balance.toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })} ₺
                </span>
                {account.balance !== 0 && (
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    account.balance > 0
                      ? 'bg-red-900/30 text-red-300'
                      : 'bg-green-900/30 text-green-300'
                  }`} title={account.balance > 0 ? 'Borçlu (müşteri bize borçlu)' : 'Alacaklı (biz müşteriye borçluyuz)'}>
                    {account.balance > 0 ? 'Borçlu' : 'Alacaklı'}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Risk Limiti:</div>
              <div className="text-lg font-bold text-yellow-400">
                {(account.risk_limit || 0).toLocaleString('tr-TR', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} ₺
              </div>
            </div>
            {account.discount_rate !== undefined && account.discount_rate !== null && (
              <div>
                <div className="text-gray-400 mb-1">İskonto Oranı:</div>
                <div className={`text-lg font-bold ${account.discount_rate > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                  %{account.discount_rate.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Döküman Aralığı */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-6 no-print">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4">
            Döküman Aralığı
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Başlangıç</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const selected = parseDateParts(printStartDate)
                    if (selected) {
                      setStartPickerMonth(selected.m - 1)
                      setStartPickerYear(selected.y)
                    }
                    setShowStartPicker((prev) => !prev)
                    setShowEndPicker(false)
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded text-left"
                >
                  {formatDisplayDate(printStartDate) || 'Tarih seçin'}
                </button>
                {showStartPicker && (
                  <div className="absolute z-20 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (startPickerMonth === 0) {
                            setStartPickerMonth(11)
                            setStartPickerYear(startPickerYear - 1)
                          } else {
                            setStartPickerMonth(startPickerMonth - 1)
                          }
                        }}
                        className="px-2 py-1 text-gray-300 hover:text-white"
                      >
                        ‹
                      </button>
                      <div className="text-sm text-white font-semibold">
                        {monthsTr[startPickerMonth]} {startPickerYear}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (startPickerMonth === 11) {
                            setStartPickerMonth(0)
                            setStartPickerYear(startPickerYear + 1)
                          } else {
                            setStartPickerMonth(startPickerMonth + 1)
                          }
                        }}
                        className="px-2 py-1 text-gray-300 hover:text-white"
                      >
                        ›
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-1">
                      {weekdaysTr.map((day) => (
                        <div key={day} className="text-center">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-sm">
                      {Array.from({ length: getFirstDayIndex(startPickerYear, startPickerMonth) }).map((_, idx) => (
                        <div key={`s-empty-${idx}`} />
                      ))}
                      {Array.from({ length: getDaysInMonth(startPickerYear, startPickerMonth) }).map((_, idx) => {
                        const day = idx + 1
                        const value = `${startPickerYear}-${String(startPickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const isSelected = value === printStartDate
                        return (
                          <button
                            key={`s-day-${day}`}
                            type="button"
                            onClick={() => {
                              setPrintStartDate(value)
                              setShowStartPicker(false)
                            }}
                            className={`px-2 py-1 rounded text-center ${
                              isSelected ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-800'
                            }`}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bitiş</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const selected = parseDateParts(printEndDate)
                    if (selected) {
                      setEndPickerMonth(selected.m - 1)
                      setEndPickerYear(selected.y)
                    }
                    setShowEndPicker((prev) => !prev)
                    setShowStartPicker(false)
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded text-left"
                >
                  {formatDisplayDate(printEndDate) || 'Tarih seçin'}
                </button>
                {showEndPicker && (
                  <div className="absolute z-20 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (endPickerMonth === 0) {
                            setEndPickerMonth(11)
                            setEndPickerYear(endPickerYear - 1)
                          } else {
                            setEndPickerMonth(endPickerMonth - 1)
                          }
                        }}
                        className="px-2 py-1 text-gray-300 hover:text-white"
                      >
                        ‹
                      </button>
                      <div className="text-sm text-white font-semibold">
                        {monthsTr[endPickerMonth]} {endPickerYear}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (endPickerMonth === 11) {
                            setEndPickerMonth(0)
                            setEndPickerYear(endPickerYear + 1)
                          } else {
                            setEndPickerMonth(endPickerMonth + 1)
                          }
                        }}
                        className="px-2 py-1 text-gray-300 hover:text-white"
                      >
                        ›
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-1">
                      {weekdaysTr.map((day) => (
                        <div key={day} className="text-center">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-sm">
                      {Array.from({ length: getFirstDayIndex(endPickerYear, endPickerMonth) }).map((_, idx) => (
                        <div key={`e-empty-${idx}`} />
                      ))}
                      {Array.from({ length: getDaysInMonth(endPickerYear, endPickerMonth) }).map((_, idx) => {
                        const day = idx + 1
                        const value = `${endPickerYear}-${String(endPickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const isSelected = value === printEndDate
                        return (
                          <button
                            key={`e-day-${day}`}
                            type="button"
                            onClick={() => {
                              setPrintEndDate(value)
                              setShowEndPicker(false)
                            }}
                            className={`px-2 py-1 rounded text-center ${
                              isSelected ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-800'
                            }`}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (!printStartDate && !printEndDate) return
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Filtrele
              </button>
              <button
                onClick={() => {
                  setPrintStartDate('')
                  setPrintEndDate('')
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
              >
                Temizle
              </button>
            </div>
          </div>
        </div>

        {(printStartDate || printEndDate) && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-gray-300">
                Döküman Aralığı:{' '}
                <span className="text-white font-semibold">
                  {printStartDate || 'Başlangıç Yok'} - {printEndDate || 'Bitiş Yok'}
                </span>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Yazdır
              </button>
            </div>
          </div>
        )}

        {/* Cari Hesap İşlemleri */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Cari Hesap İşlemleri</span>
          </h2>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Bu cari hesaba ait işlem bulunmamaktadır.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-3 text-xs text-gray-400">Tarih</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400">Açıklama</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400">Ürün</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">Adet</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">Birim Fiyat (BOM)</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">İskonto</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">Tutar</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">Tip</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="py-2 px-3 text-xs text-gray-300">
                        {formatDateTime(transaction.created_at)}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-300">
                        <div className="flex items-center space-x-2">
                          <span>{(transaction.description || '-').replace(/❖/g, '₺')}</span>
                          {(transaction.reference_type === 'shipment_return' ||
                            (transaction.description || '').toLowerCase().includes('sevkiyat iptali') ||
                            (transaction.reference_type === 'shipment_item' && transaction.shipment_status === 'cancelled')) && (
                            <span className="px-2 py-0.5 rounded bg-red-900/30 text-red-400 text-[10px] font-semibold">
                              İPTAL
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-300">
                        {transaction.product_name ? (
                          <div>
                            <div>
                              {transaction.product_name} {transaction.product_sku && `(${transaction.product_sku})`}
                              {transaction.shipment_number && (
                                <span className="text-blue-400 ml-1">[{transaction.shipment_number}]</span>
                              )}
                            </div>
                            {/* İskonto detayı (sevkiyat için) */}
                            {transaction.reference_type === 'shipment_item' && ((transaction.shipment_discount_rate && transaction.shipment_discount_rate > 0 && transaction.shipment_discount_amount && transaction.shipment_discount_amount > 0) || (transaction.description && transaction.description.includes('İskonto:'))) ? (
                              <div className="text-yellow-400 text-[10px] mt-1">
                                {transaction.shipment_discount_rate && transaction.shipment_discount_rate > 0 && transaction.shipment_discount_amount && transaction.shipment_discount_amount > 0
                                  ? `İskonto: %${transaction.shipment_discount_rate.toFixed(2)} (${transaction.shipment_discount_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺)`
                                  : (() => {
                                      const discountMatch = transaction.description?.match(/İskonto: %([\d.]+) \(([\d.]+) ₺\)/)
                                      if (discountMatch) {
                                        return `İskonto: %${discountMatch[1]} (${parseFloat(discountMatch[2]).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺)`
                                      }
                                      return null
                                    })()
                                }
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-300 text-right">
                        {transaction.quantity || '-'}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-300 text-right">
                        {transaction.unit_price ? (
                          <span>
                            <span className="text-lime-400 font-semibold">BOM:</span>{' '}
                            {transaction.unit_price.toLocaleString('tr-TR', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })} ₺
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-300 text-right">
                        {(() => {
                          let discountRate = 0
                          let discountAmount = 0
                          let bomTotal = 0
                          
                          // Önce shipment_discount_rate ve shipment_discount_amount kontrol et
                          if (transaction.shipment_discount_rate && transaction.shipment_discount_rate > 0 && transaction.shipment_discount_amount && transaction.shipment_discount_amount > 0) {
                            discountRate = transaction.shipment_discount_rate
                            discountAmount = transaction.shipment_discount_amount
                            bomTotal = transaction.unit_price && transaction.quantity ? transaction.unit_price * transaction.quantity : 0
                          } else if (transaction.description) {
                            // Description'dan parse et
                            const discountMatch = transaction.description.match(/İskonto:\s*%([\d.]+)\s*\(([\d.]+)\s*₺\)/i)
                            if (discountMatch) {
                              discountRate = parseFloat(discountMatch[1])
                              discountAmount = parseFloat(discountMatch[2])
                              bomTotal = transaction.unit_price && transaction.quantity ? transaction.unit_price * transaction.quantity : 0
                            } else if (transaction.unit_price && transaction.total_price && transaction.quantity) {
                              // Eğer unit_price ve total_price farklıysa, iskonto hesapla
                              bomTotal = transaction.unit_price * transaction.quantity
                              const actualTotal = transaction.total_price
                              if (bomTotal > actualTotal && bomTotal > 0) {
                                discountAmount = bomTotal - actualTotal
                                discountRate = (discountAmount / bomTotal) * 100
                              }
                            }
                          }
                          
                          if (discountRate > 0 && discountAmount > 0) {
                            return (
                              <div className="text-yellow-400">
                                <div className="text-[10px]">%{discountRate.toFixed(2)}</div>
                                <div className="text-[10px]">-{discountAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                              </div>
                            )
                          }
                          
                          return <span className="text-gray-500">-</span>
                        })()}
                      </td>
                      <td className={`py-2 px-3 text-xs font-semibold text-right ${
                        transaction.reference_type === 'shipment_item' && transaction.shipment_status === 'cancelled'
                          ? 'text-gray-500'
                          : transaction.transaction_type === 'debit' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {transaction.reference_type === 'shipment_item' && transaction.shipment_status === 'cancelled' ? (
                          <span className="text-gray-500">İptal</span>
                        ) : (
                          <>
                            {transaction.transaction_type === 'debit' ? '+' : '-'}
                            {transaction.amount.toLocaleString('tr-TR', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })} ₺
                          </>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-300 text-right">
                        {transaction.reference_type === 'shipment_item' && transaction.shipment_status === 'cancelled' ? (
                          <span className="px-2 py-1 rounded bg-gray-700 text-gray-400">İptal</span>
                        ) : (
                          <span className={`px-2 py-1 rounded ${
                            transaction.transaction_type === 'debit' 
                              ? 'bg-red-900/30 text-red-400' 
                              : 'bg-green-900/30 text-green-400'
                          }`}>
                            {transaction.transaction_type === 'debit' ? 'Borç' : 'Alacak'}
                          </span>
                        )}
                      </td>
                      <td className={`py-2 px-3 text-xs text-right ${
                        transaction.running_balance !== undefined
                          ? transaction.running_balance > 0
                            ? 'text-red-400'
                            : transaction.running_balance < 0
                              ? 'text-green-400'
                              : 'text-gray-400'
                          : 'text-gray-300'
                      }`}>
                        {transaction.reference_type === 'shipment_item' && transaction.shipment_status === 'cancelled' ? (
                          <span className="text-gray-500">İptal</span>
                        ) : transaction.running_balance !== undefined ? (
                          <>
                            {transaction.running_balance.toLocaleString('tr-TR', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}{' '}
                            ₺
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sevkiyatlar */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Truck className="w-5 h-5" />
            <span>Sevk Fişleri</span>
          </h2>

          {filteredShipments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Bu müşteriye ait sevkiyat bulunmamaktadır.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-3 text-xs text-gray-400">Sevk No</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400">Tarih</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">Adet</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">Ara Toplam</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">İskonto</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">KDV %</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">KDV Tutarı</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">Genel Toplam</th>
                    <th className="text-center py-2 px-3 text-xs text-gray-400">Durum</th>
                    <th className="text-center py-2 px-3 text-xs text-gray-400">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((shipment) => (
                    <Fragment key={shipment.id}>
                      <tr className="border-b border-gray-800 hover:bg-gray-800">
                        <td className="py-2 px-3 text-xs">
                          <button
                            onClick={() => toggleShipment(shipment.id)}
                            className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
                          >
                            {expandedShipments.has(shipment.id) ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                            <a
                              href={`/shipments/${shipment.id}`}
                              className="font-mono"
                            >
                              {shipment.shipment_number}
                            </a>
                          </button>
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-300">
                          {formatDate(shipment.shipment_date)}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-300 text-right">
                          {shipment.total_quantity}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-300 text-right">
                          {/* Ara Toplam = BOM fiyatı (iskonto öncesi) = total_amount */}
                          {/* total_amount zaten BOM fiyatı olarak kaydediliyor */}
                          {(shipment.total_amount || 0).toLocaleString('tr-TR', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })} ₺
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-300 text-right">
                          {shipment.discount_rate && shipment.discount_rate > 0 && shipment.discount_amount && shipment.discount_amount > 0 ? (
                            <div className="text-yellow-400">
                              <div className="font-semibold">%{shipment.discount_rate.toFixed(2)}</div>
                              <div className="text-[10px]">-{shipment.discount_amount.toLocaleString('tr-TR', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })} ₺</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-300 text-right">
                          {editingShipmentId === shipment.id ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={taxRate}
                              onChange={(e) => setTaxRate(e.target.value)}
                              className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                              placeholder="0"
                            />
                          ) : (
                            <span>{shipment.tax_rate || 0}%</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-300 text-right">
                          {shipment.tax_amount?.toLocaleString('tr-TR', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          }) || '0,00'} ₺
                        </td>
                        <td className="py-2 px-3 text-xs font-semibold text-white text-right">
                          {/* Genel Toplam = final_amount (zaten doğru hesaplanmış: Ara Toplam - İskonto + KDV) */}
                          {(shipment.final_amount || 0).toLocaleString('tr-TR', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })} ₺
                        </td>
                        <td className="py-2 px-3 text-xs text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-semibold ${
                            shipment.status === 'cancelled'
                              ? 'bg-red-900/30 text-red-400'
                              : shipment.status === 'delivered' || shipment.status === 'shipped'
                              ? 'bg-green-900/30 text-green-400'
                              : shipment.status === 'in_transit'
                              ? 'bg-blue-900/30 text-blue-400'
                              : 'bg-yellow-900/30 text-yellow-300'
                          }`}>
                            {shipment.status === 'cancelled'
                              ? 'İptal'
                              : shipment.status === 'delivered' || shipment.status === 'shipped'
                              ? 'Sevk Edildi'
                              : shipment.status === 'in_transit'
                              ? 'Yolda'
                              : 'Beklemede'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {editingShipmentId === shipment.id ? (
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => saveTaxRate(shipment.id)}
                                className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                title="Kaydet"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                title="İptal"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditTax(shipment)}
                              className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                              title="KDV Düzenle"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedShipments.has(shipment.id) && shipment.items && shipment.items.length > 0 && (
                        <tr className="bg-gray-800/50">
                          <td colSpan={10} className="py-3 px-3">
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-gray-400 mb-2">Sevkiyat Kalemleri:</div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-700">
                                      <th className="text-left py-1 px-2 text-gray-400">Ürün</th>
                                      <th className="text-right py-1 px-2 text-gray-400">Adet</th>
                                      <th className="text-right py-1 px-2 text-gray-400">Birim Fiyat</th>
                                      <th className="text-right py-1 px-2 text-gray-400">Toplam</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {shipment.items.map((item) => {
                                      // item.total_price artık BOM fiyatı (iskonto öncesi)
                                      const itemBomPrice = item.total_price || 0
                                      // İskonto hesapla (eğer varsa)
                                      const itemDiscountRate = shipment.discount_rate || 0
                                      const itemDiscountAmount = itemBomPrice && itemDiscountRate > 0 
                                        ? (itemBomPrice * itemDiscountRate) / 100 
                                        : 0
                                      
                                      return (
                                        <Fragment key={item.id}>
                                          <tr className="border-b border-gray-700/50">
                                            <td className="py-1 px-2 text-gray-300">
                                              {item.product_name} ({item.product_sku})
                                            </td>
                                            <td className="py-1 px-2 text-gray-300 text-right">
                                              {item.quantity}
                                            </td>
                                            <td className="py-1 px-2 text-gray-300 text-right">
                                              {item.unit_price?.toLocaleString('tr-TR', { 
                                                minimumFractionDigits: 2, 
                                                maximumFractionDigits: 2 
                                              }) || '0,00'} ₺
                                            </td>
                                            <td className="py-1 px-2 text-white font-semibold text-right">
                                              {/* BOM fiyatı (iskonto öncesi) */}
                                              {itemBomPrice.toLocaleString('tr-TR', { 
                                                minimumFractionDigits: 2, 
                                                maximumFractionDigits: 2 
                                              })} ₺
                                            </td>
                                          </tr>
                                          {itemDiscountAmount > 0 && (
                                            <tr className="border-b border-gray-700/30 bg-gray-900/30">
                                              <td colSpan={3} className="py-1 px-2 text-gray-400 text-right text-[10px]">
                                                İskonto (%{itemDiscountRate.toFixed(2)}):
                                              </td>
                                              <td className="py-1 px-2 text-yellow-400 text-right text-[10px] font-semibold">
                                                -{itemDiscountAmount.toLocaleString('tr-TR', { 
                                                  minimumFractionDigits: 2, 
                                                  maximumFractionDigits: 2 
                                                })} ₺
                                              </td>
                                            </tr>
                                          )}
                                        </Fragment>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}

