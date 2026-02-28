'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, CheckCircle, XCircle, Clock, Factory, Download, Search, Filter, Plus, X, FileDown, Upload, Trash2, Pencil, RefreshCw, ChevronDown, ChevronUp, Calendar, AlertCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu'
import { Copy, PlusCircle, FileText, ShoppingCart, User } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { fetchApi, useApi, getAuthHeaders } from '@/lib/api/client'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from '@/lib/notify'
import { formatDate, formatOrderDateDisplay } from '@/lib/utils/dateFormat'
import { DataTable, EditableCell } from '@/components/ui/DataTable'
import { ColumnDef } from '@tanstack/react-table'
import { usePolling } from '@/lib/hooks/usePolling'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { orderSchemas } from '@/lib/validation/schemas'
import { useAuthStore } from '@/lib/store/authStore'

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
  status: 'pending' | 'approval_pending' | 'in_production' | 'completed' | 'cancelled'
  production_order_id: string | null
  production_order_number: string | null
  production_order_due_date: string | null
  production_status: string | null
  configuration?: string | null
  notes: string | null
  created_at: string
  cancel_reason?: string | null
}

const CANCELLED_BY_DEALER = 'bayi_tarafindan_iptal'

interface Account {
  id: string
  code: string
  name: string
  type: string
}

const APP_TITLE = 'LIVASOFA ERP'

// Inline Edit Component for Cards
const InlineEdit = ({
  value,
  onSave,
  label,
  type = "text",
  className = ""
}: {
  value: string | number,
  onSave: (val: any) => void,
  label: string,
  type?: "text" | "number",
  className?: string
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => {
    setVal(value);
  }, [value]);

  const handleSave = () => {
    if (val !== value) {
      onSave(val);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1 w-full animate-in fade-in zoom-in-95 duration-200 min-w-[120px]">
        <label className="text-[11px] text-blue-400 uppercase font-black tracking-tight">{label}</label>
        <input
          autoFocus
          type={type}
          className="bg-gray-800 border-b-2 border-blue-500 text-white text-base py-1.5 px-2 outline-none w-full rounded-t shadow-lg font-bold"
          value={val}
          onChange={e => setVal(type === "number" ? Number(e.target.value) : e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setVal(value); setIsEditing(false); }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`group cursor-pointer hover:bg-white/5 p-1.5 rounded-lg transition-all -ml-1.5 flex flex-col gap-0.5 border border-transparent hover:border-gray-700 ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <span className="text-[11px] text-slate-400 uppercase font-black tracking-tight group-hover:text-blue-400 transition-colors uppercase">
        {label}
      </span>
      <span className="text-white text-[15px] font-black truncate leading-tight mt-0.5">
        {type === "number" ? value : (value || '-')}
      </span>
    </div>
  );
};

export default function OrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const canExport = user?.can_export !== 0
  useEffect(() => { document.title = `Siparişler - ${APP_TITLE}`; return () => { document.title = APP_TITLE } }, [])
  const [orders, setOrders] = useState<Order[]>([])
  const [converting, setConverting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  useEffect(() => {
    const o = searchParams.get('overdue')
    const w = searchParams.get('delivery_week')
    const n = searchParams.get('new')
    if (o === '1') setFilterStatus('overdue')
    else if (w === '1') setFilterStatus('delivery_week')
    if (n === '1') setShowCreateModal(true)
  }, []) // Sadece ilk yüklemede URL'den filtre uygula (örn. /orders?overdue=1)
  const [sortKey, setSortKey] = useState<'order_date' | 'order_number' | 'total_amount' | 'dealer_name'>('order_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createOrderFormRef = useRef<HTMLFormElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([])
  const [showDealerSuggestions, setShowDealerSuggestions] = useState(false)
  const dealerInputRef = useRef<HTMLInputElement>(null)
  const [orderProducts, setOrderProducts] = useState<Array<{ id: string; name: string; sku: string }>>([])
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const orderCardRef = useRef<HTMLDivElement>(null)
  const highlightId = searchParams.get('highlight')
  const [orderSummary, setOrderSummary] = useState<{
    pending: number
    in_production: number
    completed: number
    deliveriesThisWeek: number
    overdue: number
  } | null>(null)

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

  const [applyDiscountToShipments, setApplyDiscountToShipments] = useState(false)

  const handleInlineEdit = async (originalRow: Order, columnId: string, newValue: any): Promise<boolean> => {
    try {
      const response = await fetch(`/api/orders/${originalRow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          ...originalRow,
          [columnId]: newValue
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error || 'Güncelleme başarısız')
      }

      toast.success('Hücre güncellendi')

      mutate((prev) => {
        if (!prev) return prev
        return prev.map((o) => (o.id === originalRow.id ? { ...o, [columnId]: newValue } : o))
      }, false)

      return true;
    } catch (err: any) {
      toast.error(err.message || 'Hücre kaydedilemedi')
      return false
    }
  }

  // Helper for parsing complex notes field for the columns
  const parseNotes = (notes: string | null) => {
    const defaultNotes = {
      fabric: '-',
      caseInfo: '-',
      legInfo: '-',
      cushionInfo: '-',
      details: '-'
    }
    if (!notes) return defaultNotes

    // Normalize newlines
    const n = notes.replace(/\r/g, '\n').replace(/\n+/g, ' ')

    const fabricMatch = n.match(/Kumaş:\s*([^|]+)/i)
    const caseMatch = n.match(/Kasa:\s*([^|]+)/i)
    const legMatch = n.match(/Ayak:\s*([^|]+)/i)
    const cushionMatch = n.match(/Kirlent:\s*([^|]+)/i)

    const details = n
      .replace(/Kumaş:\s*[^|]+/gi, '')
      .replace(/Kasa:\s*[^|]+/gi, '')
      .replace(/Ayak:\s*[^|]+/gi, '')
      .replace(/Kirlent:\s*[^|]+/gi, '')
      .replace(/Birim:\s*[^|]+/gi, '')
      .replace(/\|\s*\|\s*/g, '|')
      .replace(/^\|\s*|\s*\|$/g, '')
      .trim()

    return {
      fabric: fabricMatch ? fabricMatch[1].trim() : '-',
      caseInfo: caseMatch ? caseMatch[1].trim() : '-',
      legInfo: legMatch ? legMatch[1].trim() : '-',
      cushionInfo: cushionMatch ? cushionMatch[1].trim() : '-',
      details: details || '-'
    }
  }

  const columns = useMemo<ColumnDef<Order>[]>(() => [
    {
      id: 'select',
      header: 'Seç',
      cell: ({ row }) => {
        const order = row.original
        return (
          <input
            type="checkbox"
            checked={selectedOrders.has(order.id)}
            onChange={(e) => {
              e.stopPropagation()
              toggleOrderSelection(order.id)
            }}
            disabled={order.status === 'in_production' || order.status === 'completed'}
            className="rounded border-gray-600 bg-gray-800"
          />
        )
      }
    },
    {
      accessorKey: 'order_number',
      header: 'TAKİP NO',
      cell: info => <div className="text-xs font-mono font-bold whitespace-nowrap">{info.getValue() as string}</div>,
    },
    {
      accessorKey: 'dealer_name',
      header: 'CARİ ADI',
      cell: EditableCell,
    },
    {
      accessorKey: 'product_name',
      header: 'ÜRÜN ADI',
      cell: EditableCell,
    },
    {
      id: 'configuration',
      accessorFn: row => (row as any).configuration,
      header: 'KONFİGÜRASYON',
      cell: EditableCell,
    },
    {
      accessorKey: 'quantity',
      header: 'MİKTAR',
      cell: EditableCell,
    },
    {
      id: 'fabric_code',
      header: 'KUMAŞ',
      accessorFn: row => parseNotes(row.notes).fabric,
      cell: ({ row }) => <div className="text-xs truncate max-w-[100px]">{parseNotes(row.original.notes).fabric}</div>
    },
    {
      id: 'case_info',
      header: 'KASA',
      accessorFn: row => parseNotes(row.notes).caseInfo,
      cell: ({ row }) => <div className="text-xs truncate max-w-[100px]">{parseNotes(row.original.notes).caseInfo}</div>
    },
    {
      id: 'leg_info',
      header: 'AYAK',
      accessorFn: row => parseNotes(row.notes).legInfo,
      cell: ({ row }) => <div className="text-xs truncate max-w-[100px]">{parseNotes(row.original.notes).legInfo}</div>
    },
    {
      id: 'details',
      header: 'AÇIKLAMA',
      accessorFn: row => parseNotes(row.notes).details,
      cell: ({ row }) => <div className="text-xs truncate max-w-[150px]">{parseNotes(row.original.notes).details}</div>
    },
    {
      accessorKey: 'status',
      header: 'Durum',
      cell: ({ row }) => {
        const status = row.original.status
        const statusColors: Record<string, string> = {
          pending: 'bg-yellow-900/30 text-yellow-500 border-yellow-700/50',
          in_production: 'bg-blue-900/30 text-blue-400 border-blue-700/50',
          completed: 'bg-green-900/30 text-green-400 border-green-700/50',
          cancelled: 'bg-red-900/30 text-red-400 border-red-700/50'
        }
        const statusLabels: Record<string, string> = {
          pending: 'Beklemede',
          approval_pending: 'Onay Bekliyor',
          in_production: 'Üretimde',
          completed: 'Sevk Edildi',
          cancelled: 'İptal'
        }
        return <span className={`px-2 py-1 rounded text-xs border whitespace-nowrap ${statusColors[status] || ''}`}>{statusLabels[status] || status}</span>
      }
    },
    {
      accessorKey: 'order_date',
      header: 'SİP TRH',
      cell: ({ row }) => <div className="text-xs whitespace-nowrap">{formatOrderDateDisplay(row.original.order_date, row.original.created_at ?? null)}</div>
    },
    {
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => {
        const order = row.original
        return (
          <div className="flex items-center space-x-2 whitespace-nowrap">
            {order.status === 'pending' && !order.production_order_id && (
              <button
                onClick={(e) => { e.stopPropagation(); handleEditOrder(order); }}
                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition"
                title="Düzenle"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order); }}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition"
              title="Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      }
    }
  ], [selectedOrders])

  const ordersKey = useMemo(() => {
    if (filterStatus === 'all') return '/api/orders'
    if (filterStatus === 'shipped') return '/api/orders?status=completed'
    if (filterStatus === 'delivery_week') return '/api/orders?delivery_week=1'
    if (filterStatus === 'overdue') return '/api/orders?overdue=1'
    return `/api/orders?status=${encodeURIComponent(filterStatus)}`
  }, [filterStatus])

  const { data: ordersData, isLoading, mutate } = useApi<Order[]>(ordersKey)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  usePolling(() => { void mutate() })

  useEffect(() => {
    let cancelled = false
    fetchApi<{ pending: number; in_production: number; completed: number; deliveriesThisWeek: number; overdue: number }>('/api/orders/summary')
      .then((data) => { if (!cancelled) setOrderSummary(data) })
      .catch(() => { if (!cancelled) setOrderSummary(null) })
    return () => { cancelled = true }
  }, [ordersData])

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
    const openModal = () => setShowCreateModal(true)
    window.addEventListener('open-create-order-modal', openModal)
    return () => window.removeEventListener('open-create-order-modal', openModal)
  }, [])

  // Bildirimden "Yeni bayi siparişi"ne tıklanınca /orders?highlight=id ile gelir; veriyi tazele, ilgili siparişi seç ve kaydır
  useEffect(() => {
    if (!highlightId) return
    setFilterStatus('all') // Filtre yüzünden sipariş listeden çıkmasın
    setSearchTerm('')
    void mutate() // Yeni eklenen sipariş listede olsun diye taze veri çek
  }, [highlightId, mutate])

  useEffect(() => {
    const h = searchParams.get('highlight')
    if (!h) return
    const list = ordersData ?? []
    if (list.some((o) => o.id === h)) {
      setSelectedOrderId(h)
      setSearchTerm('')
    }
  }, [searchParams, ordersData])

  useEffect(() => {
    if (!highlightId || selectedOrderId !== highlightId) return
    const t = setTimeout(() => {
      orderCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 600)
    return () => clearTimeout(t)
  }, [highlightId, selectedOrderId])

  useEffect(() => {
    const list = ordersData ?? []
    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'order_date') {
        const dateA = a.order_date || a.created_at || ''
        const dateB = b.order_date || b.created_at || ''
        if (!dateA && !dateB) cmp = 0
        else if (!dateA) cmp = 1
        else if (!dateB) cmp = -1
        else cmp = new Date(dateA).getTime() - new Date(dateB).getTime()
      } else if (sortKey === 'order_number') {
        cmp = (a.order_number || '').localeCompare(b.order_number || '', 'tr', { numeric: true })
      } else if (sortKey === 'total_amount') {
        cmp = (a.total_amount ?? 0) - (b.total_amount ?? 0)
      } else {
        cmp = (a.dealer_name || '').localeCompare(b.dealer_name || '', 'tr')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    setOrders(sorted)
  }, [ordersData, sortKey, sortDir])

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
      } catch { }
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
    if (editingOrder) {
      setFormErrors({})
    } else {
      const payload = {
        dealer_name: (newOrder.dealer_name || '').trim(),
        customer_name: (newOrder.customer_name || '').trim(),
        product_name: (newOrder.product_name || '').trim(),
        configuration: (newOrder.configuration || '').trim(),
        fabric_code: (newOrder.fabric_code || '').trim(),
        quantity: parseInt(String(newOrder.quantity), 10) || 0,
        unit_price: parseFloat(String(newOrder.unit_price)) || 0,
        order_date: (newOrder.order_date || '').trim(),
      }
      const result = orderSchemas.manualCreate.safeParse(payload)
      if (!result.success) {
        const errors: Record<string, string> = {}
        result.error.issues.forEach((issue) => {
          const path = issue.path[0] as string
          if (path && !errors[path]) errors[path] = issue.message
        })
        setFormErrors(errors)
        const first = result.error.issues[0]
        if (first?.message) toast.warning(first.message)
        return
      }
      setFormErrors({})
    }

    setSubmittingOrder(true)
    try {
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
          setFormErrors({})
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
        const data = result?.data ?? result
        const createdOrders = data?.orders ?? result?.orders ?? []
        toast.success(createdOrders.length > 0 ? `${createdOrders.length} sipariş oluşturuldu. Üretime almak için "Üretime Al" veya Üretim sayfasını kullanın.` : 'Sipariş oluşturuldu.')

        setShowCreateModal(false)
        setFormErrors({})
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
    } finally {
      setSubmittingOrder(false)
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
        const created = smallFileResult.inserted_count ?? 0
        const skipped = smallFileResult.skipped_count ?? (smallFileResult.errors?.length ?? 0)
        const errList = smallFileResult.errors ?? []

        if (created > 0) {
          toast.success(
            skipped > 0
              ? `${created} sipariş eklendi. ${skipped} satır atlandı.`
              : `${created} sipariş eklendi.`
          )
        } else if (skipped > 0) {
          toast.warning(`Hiç sipariş eklenemedi. ${skipped} satır atlandı.`)
        } else {
          toast.success(smallFileResult.message || 'İşlem tamamlandı.')
        }
        if (errList.length > 0) {
          console.warn('Toplu sipariş atlanan satırlar:', errList)
          const firstFew = errList.slice(0, 5).join('; ')
          toast.info(`Atlanan satırlar (ilk 5): ${firstFew}${errList.length > 5 ? '…' : ''}`)
        }

        mutate()
        if (fileInputRef.current) fileInputRef.current.value = ''
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
      const created = mergeResult.inserted_count ?? 0
      const skipped = mergeResult.skipped_count ?? (mergeResult.errors?.length ?? 0)
      const errList = mergeResult.errors ?? []

      if (created > 0) {
        toast.success(
          skipped > 0
            ? `${created} sipariş eklendi. ${skipped} satır atlandı.`
            : `${created} sipariş eklendi.`
        )
      } else if (skipped > 0) {
        toast.warning(`Hiç sipariş eklenemedi. ${skipped} satır atlandı.`)
      } else {
        toast.success(mergeResult.message || 'İşlem tamamlandı.')
      }
      if (errList.length > 0) {
        console.warn('Toplu sipariş atlanan satırlar:', errList)
        const firstFew = errList.slice(0, 5).join('; ')
        toast.info(`Atlanan satırlar (ilk 5): ${firstFew}${errList.length > 5 ? '…' : ''}`)
      }

      mutate()
      if (fileInputRef.current) fileInputRef.current.value = ''
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

  // Özet sayıları (API'den; yoksa mevcut listeden)
  const pendingCount = orderSummary?.pending ?? orders.filter(o => o.status === 'pending').length
  const approvalPendingCount = (orderSummary as any)?.approval_pending ?? orders.filter(o => o.status === 'approval_pending').length
  const inProductionCount = orderSummary?.in_production ?? orders.filter(o => o.status === 'in_production').length
  const completedCount = orderSummary?.completed ?? orders.filter(o => o.status === 'completed').length
  const deliveriesThisWeek = orderSummary?.deliveriesThisWeek ?? 0
  const overdueCount = orderSummary?.overdue ?? 0

  const normalize = (value: unknown) => String(value ?? '').toLowerCase()
  const normalizeNotes = (value: unknown) => String(value ?? '')

  const filteredOrders = orders.filter(order => {
    if (debouncedSearchTerm) {
      const search = normalize(debouncedSearchTerm)
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

  const displayOrders = useMemo(() => {
    const list = [...filteredOrders]
    list.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      const comp = aVal < bVal ? -1 : 1
      return sortDir === 'asc' ? comp : -comp
    })
    return list
  }, [filteredOrders, sortKey, sortDir])

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
    approval_pending: 'bg-purple-900/30 text-purple-400 border-purple-700',
    in_production: 'bg-blue-900/30 text-blue-400 border-blue-700',
    completed: 'bg-green-900/30 text-green-400 border-green-700',
    cancelled: 'bg-red-900/30 text-red-400 border-red-700'
  }

  const statusLabels = {
    pending: 'Beklemede',
    approval_pending: 'Onay Bekliyor',
    in_production: 'Üretimde',
    completed: 'Tamamlandı',
    cancelled: 'İptal Edildi'
  }

  useKeyboardShortcut('Escape', () => {
    if (showCreateModal) { setShowCreateModal(false); setEditingOrder(null) }
    else setSelectedOrderId(null)
  })
  useKeyboardShortcut('n', () => {
    if (!showCreateModal) { setEditingOrder(null); setFormErrors({}); setShowCreateModal(true) }
  }, { ctrlOrMeta: true })
  useKeyboardShortcut('s', () => {
    if (showCreateModal && createOrderFormRef.current) createOrderFormRef.current.requestSubmit()
  }, { ctrlOrMeta: true, enabled: showCreateModal })
  useKeyboardShortcut('Enter', () => {
    if (!selectedOrderId) return
    const order = filteredOrders.find(o => o.id === selectedOrderId)
    if (order?.production_order_id) router.push(`/production/${order.production_order_id}`)
    else if (order?.status === 'pending') handleEditOrder(order)
  }, { enabled: !!selectedOrderId })

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
              setFormErrors({})
              setShowCreateModal(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Sipariş
          </Button>
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading} title="Listeyi yenile">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
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
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const res = await fetch('/api/orders/import/template', { credentials: 'include', headers: getAuthHeaders() })
                if (!res.ok) throw new Error('Şablon indirilemedi')
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `Siparis_Sablonu_${new Date().toISOString().split('T')[0]}.xlsx`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('Örnek şablon indirildi')
              } catch (e: any) {
                toast.error(e?.message || 'Şablon indirilemedi')
              }
            }}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Örnek şablon
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
          {orders.length > 0 && canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const exportParams = new URLSearchParams()
                  if (filterStatus && filterStatus !== 'all') {
                    if (filterStatus === 'delivery_week') exportParams.set('delivery_week', '1')
                    else if (filterStatus === 'overdue') exportParams.set('overdue', '1')
                    else exportParams.set('status', filterStatus)
                  }
                  if (searchTerm.trim()) exportParams.set('search', searchTerm.trim())
                  const query = exportParams.toString()
                  const response = await fetch(`/api/orders/export${query ? '?' + query : ''}`, {
                    headers: getAuthHeaders(),
                    credentials: 'include',
                  })
                  if (!response.ok) {
                    throw new Error('Excel dışa aktarma başarısız')
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
      <Breadcrumb items={[{ label: 'Panel', href: '/dashboard' }, { label: 'Siparişler' }]} className="mb-4" />

      {/* Özet kartları */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => setFilterStatus('approval_pending')}
          className={`rounded-lg border p-4 text-left transition-colors ${filterStatus === 'approval_pending' ? 'border-purple-500 bg-purple-900/20' : 'border-gray-800 bg-gray-900 hover:border-purple-600/50'}`}
        >
          <div className="text-sm text-gray-400 mb-1">Onay Bekliyor</div>
          <div className="text-2xl font-bold text-purple-400">{approvalPendingCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('pending')}
          className={`rounded-lg border p-4 text-left transition-colors ${filterStatus === 'pending' ? 'border-yellow-500 bg-yellow-900/20' : 'border-gray-800 bg-gray-900 hover:border-yellow-600/50'}`}
        >
          <div className="text-sm text-gray-400 mb-1">Beklemede</div>
          <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('in_production')}
          className={`rounded-lg border p-4 text-left transition-colors ${filterStatus === 'in_production' ? 'border-blue-500 bg-blue-900/20' : 'border-gray-800 bg-gray-900 hover:border-blue-600/50'}`}
        >
          <div className="text-sm text-gray-400 mb-1">Üretimde</div>
          <div className="text-2xl font-bold text-blue-400">{inProductionCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('delivery_week')}
          className={`rounded-lg border p-4 text-left transition-colors ${filterStatus === 'delivery_week' ? 'border-sky-500 bg-sky-900/20' : 'border-gray-800 bg-gray-900 hover:border-sky-600/50'}`}
          title="Bu hafta teslim tarihli sipariş sayısı"
        >
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Bu Hafta
          </div>
          <div className="text-2xl font-bold text-sky-400">{deliveriesThisWeek}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('overdue')}
          className={`rounded-lg border p-4 text-left transition-colors ${filterStatus === 'overdue' ? 'border-red-500 bg-red-900/20' : 'border-gray-800 bg-gray-900 hover:border-red-600/50'}`}
          title="Teslim tarihi geçmiş, henüz tamamlanmamış"
        >
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Gecikmiş
          </div>
          <div className="text-2xl font-bold text-red-400">{overdueCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('shipped')}
          className={`rounded-lg border p-4 text-left transition-colors ${filterStatus === 'shipped' ? 'border-green-500 bg-green-900/20' : 'border-gray-800 bg-gray-900 hover:border-green-600/50'}`}
        >
          <div className="text-sm text-gray-400 mb-1">Sevk Edilen</div>
          <div className="text-2xl font-bold text-green-400">{completedCount}</div>
        </button>
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
            <option value="approval_pending">Onay Bekliyor</option>
            <option value="pending">Beklemede</option>
            <option value="in_production">Üretimde</option>
            <option value="delivery_week">Bu Hafta Teslim</option>
            <option value="overdue">Gecikmiş</option>
            <option value="shipped">Sevk Edilen</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Sırala:</span>
          {(['order_date', 'order_number', 'total_amount', 'dealer_name'] as const).map((key) => {
            const label = key === 'order_date' ? 'Tarih' : key === 'order_number' ? 'Sipariş No' : key === 'total_amount' ? 'Tutar' : 'Cari'
            const active = sortKey === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                  else { setSortKey(key); setSortDir(key === 'order_date' || key === 'total_amount' ? 'desc' : 'asc') }
                }}
                className={`inline-flex items-center gap-0.5 px-2 py-1 rounded ${active ? 'bg-gray-700 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
              >
                {label}
                {active && (sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Siparişler Kart Görünümü */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-gray-900/50 border border-gray-800 rounded-2xl" />
          ))}
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <EmptyState
            title={debouncedSearchTerm ? 'Arama sonucu bulunamadı' : 'Henüz sipariş yok'}
            description={debouncedSearchTerm ? 'Farklı bir arama deneyin' : 'İlk siparişinizi oluşturarak başlayın.'}
            icon={FileSpreadsheet}
            action={!debouncedSearchTerm ? (
              <Button onClick={() => setShowCreateModal(true)} variant="solid" color="primary">
                <Plus className="w-4 h-4 mr-2" />
                İlk siparişi oluştur
              </Button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayOrders.map(order => {
            const notes = parseNotes(order.notes)
            const isSelected = selectedOrders.has(order.id)

            return (
              <div
                key={order.id}
                ref={order.id === highlightId ? orderCardRef : null}
                className={`relative bg-gray-900/40 backdrop-blur-xl border-2 ${isSelected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-gray-800/50'} rounded-3xl p-6 hover:border-gray-500 transition-all duration-500 group overflow-hidden flex flex-col`}
              >
                {/* Visual Flair */}
                <div className={`absolute -top-12 -right-12 w-24 h-24 blur-[60px] rounded-full transition-all duration-700 opacity-20 ${order.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} />

                {/* Header Aliign */}
                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => toggleOrderSelection(order.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/50' : 'border-gray-600 hover:border-blue-400'}`}
                    >
                      {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black font-mono text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-md tracking-tight uppercase border border-blue-400/20">{order.order_number}</span>
                        <div className={`text-[11px] px-2.5 py-1 rounded-md border font-black uppercase tracking-tight shadow-sm ${statusColors[order.status] || ''}`}>
                          {order.status === 'cancelled' && order.cancel_reason === CANCELLED_BY_DEALER
                            ? 'Bayi tarafından iptal edilmiştir'
                            : (statusLabels[order.status] || order.status)}
                        </div>
                        {order.status === 'cancelled' && (
                          <p className="text-[10px] text-slate-500 mt-1">
                            {order.cancel_reason === CANCELLED_BY_DEALER ? 'Bayi portalından iptal edildi.' : 'İptal edildi.'}
                          </p>
                        )}
                        {order.status === 'approval_pending' && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-900/40 text-red-400 border border-red-500/50 rounded-md text-[10px] font-black animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                            <AlertCircle className="w-3 h-3" />
                            <span>ONAY GEREKİYOR</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button onClick={() => handleEditOrder(order)} className="p-2 hover:bg-gray-800 rounded-xl text-gray-500 hover:text-white transition-all transform hover:scale-110">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteOrder(order)} className="p-2 hover:bg-red-900/30 rounded-xl text-gray-500 hover:text-red-400 transition-all transform hover:scale-110">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 flex-1 relative z-10">
                  <InlineEdit
                    label="CARİ HESAP / BAYİ"
                    value={order.dealer_name || ''}
                    onSave={(v) => handleInlineEdit(order, 'dealer_name', v)}
                    className="!p-0 !bg-transparent border-none"
                  />

                  <InlineEdit
                    label="MÜŞTERİ ADI (Satın Alan)"
                    value={order.customer_name || ''}
                    onSave={(v) => handleInlineEdit(order, 'customer_name', v)}
                    className="!p-0 !bg-transparent border-none mt-2"
                  />

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-800/50">
                    <InlineEdit
                      label="ÜRÜN ADI"
                      value={order.product_name}
                      onSave={(v) => handleInlineEdit(order, 'product_name', v)}
                    />
                    <InlineEdit
                      label="MİKTAR"
                      value={order.quantity}
                      type="number"
                      onSave={(v) => handleInlineEdit(order, 'quantity', v)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-800/50">
                    <InlineEdit
                      label="KONFİGÜRASYON"
                      value={order.configuration || ''}
                      onSave={(v) => handleInlineEdit(order, 'configuration', v)}
                    />
                    <div className="flex flex-col gap-0.5 p-1.5 -ml-1.5 transition-all">
                      <span className="text-[11px] text-slate-400 uppercase font-black tracking-tight">SİPARİŞ TARİHİ</span>
                      <span className="text-white text-[15px] font-black leading-tight mt-0.5">{formatOrderDateDisplay(order.order_date)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 border-t border-gray-800/50">
                    <InlineEdit label="KUMAŞ" value={notes.fabric} onSave={(v) => handleInlineEdit(order, 'fabric_code', v)} />
                    <InlineEdit label="KASA" value={notes.caseInfo} onSave={(v) => handleInlineEdit(order, 'case_info', v)} />
                    <InlineEdit label="AYAK" value={notes.legInfo} onSave={(v) => handleInlineEdit(order, 'leg_info', v)} />
                    <InlineEdit label="KİRLENT" value={notes.cushionInfo} onSave={(v) => handleInlineEdit(order, 'cushion_info', v)} />
                  </div>

                  <div className="pt-2 border-t border-gray-800/50">
                    <InlineEdit
                      label="NOTLAR / DETAYLAR"
                      value={notes.details}
                      onSave={(v) => handleInlineEdit(order, 'notes', v)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Footer Section */}
                {order.production_order_number ? (
                  <div className="mt-6 pt-4 border-t border-gray-800/50 flex items-center justify-between text-[11px] relative z-10">
                    <div className="flex items-center gap-2 text-gray-400 font-medium">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span>Üretim Emri: <span className="text-blue-400 font-bold">{order.production_order_number}</span></span>
                    </div>
                    <button
                      onClick={() => router.push(`/production/${order.production_order_id}`)}
                      className="bg-gray-800/50 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-xl transition-all font-bold hover:text-white"
                    >
                      DETAY →
                    </button>
                  </div>
                ) : (
                  order.status === 'pending' && (
                    <div className="mt-6 pt-4 border-t border-gray-800/50 relative z-10">
                      <button
                        onClick={() => { setSelectedOrders(new Set([order.id])); convertToProduction(); }}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
                      >
                        Üretim Emri Oluştur
                      </button>
                    </div>
                  )
                )}
              </div>
            )
          })}
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
              ref={createOrderFormRef}
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
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 ${formErrors.order_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-gray-700 focus:border-blue-500'}`}
                    aria-invalid={!!formErrors.order_date}
                    aria-describedby={formErrors.order_date ? 'order_date-error' : undefined}
                    required
                  />
                  {formErrors.order_date && <p id="order_date-error" className="text-red-400 text-xs mt-1">{formErrors.order_date}</p>}
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
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 ${formErrors.dealer_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-gray-700 focus:border-blue-500'}`}
                    aria-invalid={!!formErrors.dealer_name}
                    aria-describedby={formErrors.dealer_name ? 'dealer_name-error' : undefined}
                    required
                    placeholder="Bayi adı yazın..."
                  />
                  {formErrors.dealer_name && <p id="dealer_name-error" className="text-red-400 text-xs mt-1">{formErrors.dealer_name}</p>}
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
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 ${formErrors.customer_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-gray-700 focus:border-blue-500'}`}
                    aria-invalid={!!formErrors.customer_name}
                    aria-describedby={formErrors.customer_name ? 'customer_name-error' : undefined}
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
                    required
                  />
                  {formErrors.customer_name && <p id="customer_name-error" className="text-red-400 text-xs mt-1">{formErrors.customer_name}</p>}
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
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 ${formErrors.product_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-gray-700 focus:border-blue-500'}`}
                    aria-invalid={!!formErrors.product_name}
                    aria-describedby={formErrors.product_name ? 'product_name-error' : undefined}
                    required
                  />
                  {formErrors.product_name && <p id="product_name-error" className="text-red-400 text-xs mt-1">{formErrors.product_name}</p>}
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
                  className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 ${formErrors.quantity ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-gray-700 focus:border-blue-500'}`}
                  aria-invalid={!!formErrors.quantity}
                  aria-describedby={formErrors.quantity ? 'quantity-error' : undefined}
                  required
                />
                {formErrors.quantity && <p id="quantity-error" className="text-red-400 text-xs mt-1">{formErrors.quantity}</p>}
              </div>

              {/* Altıncı Satır: KONFİGÜRASYON ve KUMAŞ KODU */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="order-configuration" className="block text-sm font-medium text-gray-300 mb-1">KONFİGÜRASYON *</label>
                  <input
                    id="order-configuration"
                    type="text"
                    value={newOrder.configuration}
                    onChange={(e) => setNewOrder({ ...newOrder, configuration: e.target.value })}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 ${formErrors.configuration ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-gray-700 focus:border-blue-500'}`}
                    aria-invalid={!!formErrors.configuration}
                    aria-describedby={formErrors.configuration ? 'configuration-error' : undefined}
                  />
                  {formErrors.configuration && <p id="configuration-error" className="text-red-400 text-xs mt-1">{formErrors.configuration}</p>}
                </div>
                <div>
                  <label htmlFor="order-fabric-code" className="block text-sm font-medium text-gray-300 mb-1">KUMAŞ KODU *</label>
                  <input
                    id="order-fabric-code"
                    type="text"
                    value={newOrder.fabric_code}
                    onChange={(e) => setNewOrder({ ...newOrder, fabric_code: e.target.value })}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 ${formErrors.fabric_code ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-gray-700 focus:border-blue-500'}`}
                    aria-invalid={!!formErrors.fabric_code}
                    aria-describedby={formErrors.fabric_code ? 'fabric_code-error' : undefined}
                  />
                  {formErrors.fabric_code && <p id="fabric_code-error" className="text-red-400 text-xs mt-1">{formErrors.fabric_code}</p>}
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
                  disabled={submittingOrder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submittingOrder ? 'Kaydediliyor…' : editingOrder ? 'Güncelle' : 'Sipariş Oluştur'}
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

