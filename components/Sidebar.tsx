'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Factory,
  Menu,
  X,
  LogOut,
  ShoppingCart,
  ClipboardList,
  BarChart3,
  Wallet,
  BookOpen,
  Users,
  Handshake,
  Landmark,
  Settings,
  User,
  Sun,
  Moon,
  Search,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Store,
  Calendar,
  FileText,
  FileSignature,
  Star,
  Warehouse,
  ClipboardCheck,
  Bell,
} from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { LogoWithBackground } from './Logo'
import { useAuthStore } from '@/lib/store/authStore'
import { useTheme } from '@/lib/theme'
import { logout } from '@/lib/auth'
import { useSidebar } from './SidebarContext'
import { canAccessPath, isAdminRole } from '@/lib/auth/permissions-check'
import useSWR from 'swr'
import { useApi, fetchApi, safeFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ROUTES } from '@/lib/constants'
import { NewFeatureHighlight } from '@/components/NewFeatureHighlight'

type SubItem = { name: string; href: string }
type MenuItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  group?: string
  submenu?: SubItem[]
}
/** Command palette'de gösterilen düzleştirilmiş menü öğesi */
type CommandPaletteItem = { name: string; href: string; icon?: React.ComponentType<{ className?: string }>; parent: string | null }

type GlobalSearchItem = { id: string; label: string; sub?: string; href: string }
type GlobalSearchData = { orders: GlobalSearchItem[]; accounts: GlobalSearchItem[]; invoices: GlobalSearchItem[] }

const RECENT_KEY = 'sidebar-recent-paths'
const FAVORITE_KEY = 'sidebar-favorite-paths'
const MAX_RECENT = 5
const MAX_FAVORITES = 8
const PATH_LABELS: Record<string, string> = {
  dashboard: 'Kontrol Paneli',
  reports: 'Raporlar',
  finance: 'Finans',
  admin: 'Yönetim',
  accounts: 'Cari Hesaplar',
  orders: 'Siparişler',
  invoices: 'Faturalar',
  shipments: 'Sevkiyatlar',
  inventory: 'Depo',
  production: 'Üretim',
  users: 'Kullanıcılar',
  settings: 'Ayarlar',
  notifications: 'Bildirimler',
  payments: 'Ödemeler',
  purchase: 'Satın Alma',
  'purchase-orders': 'Satın Alma Siparişleri',
  'purchase-requests': 'Satın Alma Talepleri',
  'sales-orders': 'Satış Siparişleri',
  crm: 'CRM',
  barcodes: 'Barkodlar',
  'checks-notes': 'Çek / Senet',
  'api-catalog': 'API Kataloğu',
  mobile: 'Mobil',
  bayi: 'Bayi',
  warehouses: 'Depolar',
  'quality-control': 'Kalite Kontrol',
}
function getLabelForPath(path: string): string {
  for (const item of menuItems) {
    if (item.href === path || (item.href !== '/' && path.startsWith(item.href))) {
      const sub = item.submenu?.find((s) => s.href === path || (s.href !== '/' && path.startsWith(s.href)))
      return sub?.name ?? item.name
    }
    const sub = item.submenu?.find((s) => s.href === path || (s.href !== '/' && path.startsWith(s.href)))
    if (sub) return sub.name
  }
  if (path === '/dashboard' || path === '/') return 'Kontrol Paneli'
  const segment = path.split('/').filter(Boolean)[0] ?? ''
  return PATH_LABELS[segment] ?? segment
}

const menuItems: MenuItem[] = [
  { name: 'Kontrol Paneli', href: ROUTES.HOME, icon: LayoutDashboard, group: '' },
  {
    name: 'Üretim',
    href: ROUTES.PRODUCTION,
    icon: Factory,
    group: 'Üretim & Stok',
    submenu: [
      { name: 'Üretim Paneli (Yeni)', href: '/production/dashboard' },
      { name: 'Üretim Emirleri', href: ROUTES.PRODUCTION },
      { name: 'Yeni Üretim', href: `${ROUTES.PRODUCTION}/new` },
      { name: 'Ürün Reçetesi', href: ROUTES.BOM },
      { name: 'İş Emirleri', href: `${ROUTES.PRODUCTION}/work-orders` },
      { name: 'Operasyonlar', href: `${ROUTES.PRODUCTION}/operations` },
      { name: 'İş Merkezleri', href: `${ROUTES.PRODUCTION}/work-centers` },
      { name: 'Üretim Operasyonları', href: `${ROUTES.PRODUCTION}/order-operations` },
      { name: 'MRP', href: `${ROUTES.PRODUCTION}/mrp` },
      { name: 'Üretim Takvimi', href: `${ROUTES.PRODUCTION}/calendar` },
      { name: 'Usta Terminali', href: '/mobile/workstation' },
      { name: 'Kalite Kontrol', href: '/quality-control' },
      { name: 'AI Görsel Kontrol', href: '/quality-control/vision' },
    ],
  },
  {
    name: 'Stok',
    href: ROUTES.INVENTORY,
    icon: Package,
    group: 'Üretim & Stok',
    submenu: [
      { name: 'Depo Genel', href: ROUTES.INVENTORY },
      { name: 'Hammadde', href: `${ROUTES.INVENTORY}/materials` },
      { name: 'Fiyat Geçmişi', href: `${ROUTES.INVENTORY}/materials/price-history` },
      { name: 'Rezervasyon', href: `${ROUTES.INVENTORY}/materials/reservations` },
      { name: 'Mamül', href: `${ROUTES.INVENTORY}/products` },
      { name: 'B2B Katalog Yönetimi', href: '/products/b2b' },
      { name: 'Etiket / Barkod', href: `${ROUTES.INVENTORY}/products/print-barcode-label` },
      { name: 'Barkod Yönetimi', href: ROUTES.BARCODES },
      { name: 'Depolar', href: '/warehouses' },
      { name: 'Depolar Arası Transfer', href: '/stock-transfers' },
      { name: 'WMS Akıllı Rota', href: '/inventory/wms' },
      { name: 'Depo Hızlı İşlem', href: '/mobile/material-stock' },
    ],
  },
  {
    name: 'Satış',
    href: ROUTES.ORDERS,
    icon: ShoppingCart,
    group: 'Satış & Tedarik',
    submenu: [
      { name: 'Siparişler', href: ROUTES.ORDERS },
      { name: 'Sipariş Onayları', href: '/admin/approvals' },
      { name: 'Teklifler', href: '/quotations' },
      { name: 'Satış Siparişleri', href: '/sales-orders' },
      { name: 'Sevkiyat', href: ROUTES.SHIPMENTS },
      { name: 'İrsaliyeler', href: '/waybills' },
      { name: 'Faturalar', href: ROUTES.INVOICES },
      { name: 'Yeni Fatura', href: `${ROUTES.INVOICES}/new` },
      { name: 'Fiyat Listeleri', href: '/price-lists' },
      { name: 'Müşteri Grupları', href: '/customer-groups' },
    ],
  },
  {
    name: 'Satın Alma',
    href: '/purchase-requests',
    icon: ClipboardList,
    group: 'Satış & Tedarik',
    submenu: [
      { name: 'Talepler', href: '/purchase-requests' },
      { name: 'Satın Alma Siparişleri', href: '/purchase-orders' },
      { name: 'Kritik Stok', href: '/purchase/critical-stock' },
    ],
  },
  { name: 'Tedarik', href: '/procurement', icon: ClipboardList, group: 'Satış & Tedarik' },
  {
    name: 'Finans',
    href: ROUTES.FINANCE,
    icon: Wallet,
    group: 'Finans',
    submenu: [
      { name: 'Cari Hesaplar', href: ROUTES.ACCOUNTS },
      { name: 'Müşteri', href: `${ROUTES.ACCOUNTS}?type=customer` },
      { name: 'Ödemeler', href: '/payments' },
      { name: 'Çek ve Senet', href: '/checks-notes' },
      { name: 'Ödeme takvimi', href: '/finance/payment-schedule' },
      { name: 'İadeler', href: '/returns' },
      { name: 'Yevmiye Fişleri', href: `${ROUTES.FINANCE}/journal-entries` },
      { name: 'Yeni Fiş', href: `${ROUTES.FINANCE}/new` },
      { name: 'Hesap Planı', href: `${ROUTES.FINANCE}/chart-of-accounts` },
      { name: 'Büyük Defter', href: `${ROUTES.FINANCE}/general-ledger` },
      { name: 'Mizan', href: `${ROUTES.FINANCE}/trial-balance` },
      { name: 'Gelir Tablosu', href: `${ROUTES.FINANCE}/income-statement` },
      { name: 'Bilanço', href: `${ROUTES.FINANCE}/balance-sheet` },
      { name: 'Nakit Akışı', href: `${ROUTES.FINANCE}/cash-flow` },
      { name: 'Finansal Metrikler', href: `${ROUTES.FINANCE}/metrics` },
      { name: 'Fire / Maliyet', href: `${ROUTES.FINANCE}/fire-analysis` },
      { name: 'Bütçe', href: `${ROUTES.FINANCE}/budgets` },
      { name: 'Kurlar', href: `${ROUTES.FINANCE}/currency-rates` },
    ],
  },
  { name: 'Muhasebe', href: '/accounting', icon: BookOpen, group: 'Finans' },
  { name: 'CRM', href: '/crm', icon: Handshake, group: 'Diğer' },
  { name: 'Doküman Yönetimi', href: ROUTES.DOCUMENTS, icon: FileText, group: 'Diğer' },
  { name: 'Sözleşmeler', href: ROUTES.CONTRACTS, icon: FileSignature, group: 'Diğer' },
  { name: 'Sabit Kıymet', href: '/fixed-assets', icon: Landmark, group: 'Diğer' },
  {
    name: 'Takvim',
    href: '/production/calendar',
    icon: Calendar,
    group: 'Diğer',
    submenu: [
      { name: 'Üretim Takvimi', href: '/production/calendar' },
    ],
  },
  {
    name: 'Raporlar',
    href: ROUTES.REPORTS,
    icon: BarChart3,
    group: 'Diğer',
    submenu: [
      { name: 'Genel', href: ROUTES.REPORTS },
      { name: 'BA/BS Formu', href: '/reports/ba-bs' },
      { name: 'KDV / Vergi Özeti', href: `${ROUTES.REPORTS}/tax-summary` },
      { name: 'Maliyet', href: `${ROUTES.REPORTS}/costs` },
      { name: 'Fire', href: `${ROUTES.REPORTS}/fire` },
      { name: 'Dönem Karşılaştırma', href: '/reports/period-comparison' },
      { name: 'Müşteri Karlılık', href: '/reports/customer-profitability' },
    ],
  },
  {
    name: 'Ayarlar',
    href: ROUTES.SETTINGS,
    icon: Settings,
    group: 'Sistem',
    submenu: [
      { name: 'Genel', href: ROUTES.SETTINGS },
      { name: 'Şifre değiştir', href: '/settings/change-password' },
      { name: 'Entegrasyonlar', href: '/settings/integrations' },
      { name: 'Yönetici Paneli', href: '/admin' },
      { name: 'Kullanıcılar', href: ROUTES.USERS },
      { name: 'Yetki Yönetimi', href: '/admin/permissions' },
      { name: 'E-Fatura (Nilvera)', href: '/admin/e-invoice' },
      { name: 'Muhasebe Entegrasyonu', href: '/admin/accounting' },
      { name: 'API Dokümantasyonu', href: '/admin/api-docs' },
      { name: 'Denetim Günlüğü', href: '/admin/audit-logs' },
      { name: 'Oturum Yönetimi', href: '/admin/sessions' },
      { name: 'WhatsApp / Telegram', href: '/settings/messaging' },
      { name: 'Birim Çevrimleri', href: '/units/conversions' },
      { name: 'Bildirimler', href: '/notifications' },
      { name: 'Webhook\'lar', href: '/admin/webhooks' },
      { name: 'API Katalogu', href: '/api-catalog' },
    ],
  },
]

const GROUP_ORDER = ['', 'Üretim & Stok', 'Satış & Tedarik', 'Finans', 'Diğer', 'Sistem']

const bayiMenuGroups: { label?: string; items: MenuItem[] }[] = [
  { label: undefined, items: [{ name: 'Bayi Portal', href: '/bayi', icon: Store }] },
]

function buildMenuGroups() {
  const map = new Map<string, MenuItem[]>()
  menuItems.forEach((item) => {
    const key = item.group ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  })
  return GROUP_ORDER.filter((g) => map.has(g)).map((label) => ({
    label: label || undefined,
    items: map.get(label)!,
  }))
}

const menuGroups = buildMenuGroups()

function filterMenuByPermissions(
  groups: { label?: string; items: MenuItem[] }[],
  permissions: { page_path: string; can_view: number }[],
  isAdmin: boolean
): { label?: string; items: MenuItem[] }[] {
  if (isAdmin) return groups
  return groups
    .map((g) => ({
      ...g,
      items: g.items
        .map((item) => {
          if (item.submenu?.length) {
            const allowedSub = item.submenu.filter((sub) =>
              canAccessPath(permissions, sub.href, 'view')
            )
            const canViewParent = canAccessPath(permissions, item.href, 'view')
            if (allowedSub.length > 0 || canViewParent) {
              return { ...item, submenu: allowedSub.length > 0 ? allowedSub : undefined }
            }
            return null
          }
          return canAccessPath(permissions, item.href, 'view') ? item : null
        })
        .filter((x): x is MenuItem => x !== null),
    }))
    .filter((g) => g.items.length > 0)
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    menuItems.forEach((item) => {
      if (item.submenu?.length && pathname?.startsWith(item.href)) initial[item.name] = true
    })
    return initial
  })
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [globalSearchData, setGlobalSearchData] = useState<GlobalSearchData | null>(null)
  const [recentPaths, setRecentPaths] = useState<Array<{ path: string; label: string }>>([])
  const [favoritePaths, setFavoritePaths] = useState<Array<{ path: string; label: string }>>([])
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    try {
      const rawRecent = window.localStorage.getItem(RECENT_KEY)
      const parsedRecent = rawRecent ? JSON.parse(rawRecent) : []
      const list = Array.isArray(parsedRecent) ? parsedRecent.slice(0, MAX_RECENT) : []
      setRecentPaths(list.map((p: { path: string; label?: string }) => ({
        path: p.path,
        label: getLabelForPath(p.path),
      })))
      const rawFav = window.localStorage.getItem(FAVORITE_KEY)
      const parsedFav = rawFav ? JSON.parse(rawFav) : []
      setFavoritePaths(Array.isArray(parsedFav) ? parsedFav.slice(0, MAX_FAVORITES) : [])
    } catch {
      // ignore
    }
    setStorageReady(true)
  }, [])

  const toggleFavorite = useCallback((path: string, label: string) => {
    setFavoritePaths((prev) => {
      const exists = prev.some((p) => p.path === path)
      const next = exists ? prev.filter((p) => p.path !== path) : [{ path, label }, ...prev].slice(0, MAX_FAVORITES)
      try {
        window.localStorage.setItem(FAVORITE_KEY, JSON.stringify(next))
      } catch { }
      return next
    })
  }, [])
  const isFavorite = (path: string) => favoritePaths.some((p) => p.path === path)
  const user = useAuthStore((s) => s.user)
  const { mode, toggleMode } = useTheme()
  const isAuthPage = pathname == null || pathname.startsWith('/auth')
  const shouldFetchNotifications = !isAuthPage && !!user
  const { data: unreadData } = useSWR<{ count: number } | null>(
    shouldFetchNotifications ? '/api/notifications/unread-count' : null,
    safeFetch,
    { revalidateOnFocus: true, dedupingInterval: 5_000, refreshInterval: 15_000, errorRetryCount: 2 }
  )
  const unreadNotificationsCount = unreadData?.count ?? 0

  const isAdmin = isAdminRole(user?.role)
  const isBayiUser = (user?.role || '').toString().trim().toLowerCase() === 'bayi'
  const permissions = user?.permissions ?? []
  const visibleMenuGroups = useMemo(
    () => (isBayiUser ? bayiMenuGroups : filterMenuByPermissions(menuGroups, permissions, isAdmin)),
    [isAdmin, isBayiUser, permissions]
  )

  useEffect(() => {
    const parent = menuItems.find(
      (item) => item.submenu?.some((sub) => pathname?.startsWith(sub.href))
    )
    if (!parent) return
    setExpandedMenus((prev) => (prev[parent.name] ? prev : { [parent.name]: true }))
  }, [pathname])

  useEffect(() => {
    if (!pathname || pathname === ROUTES.LOGIN || pathname === ROUTES.REGISTER || pathname === '/') return
    const label = getLabelForPath(pathname)
    setRecentPaths((prev) => {
      const next = [{ path: pathname, label }, ...prev.filter((p) => p.path !== pathname)].slice(0, MAX_RECENT)
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch { }
      return next
    })
  }, [pathname])

  const isItemActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  useEffect(() => {
    if (debouncedSearchTerm.trim().length < 2) {
      setGlobalSearchData(null)
      return
    }
    let cancelled = false
    fetchApi<GlobalSearchData>(`/api/search?q=${encodeURIComponent(debouncedSearchTerm)}`)
      .then((data) => {
        if (!cancelled) setGlobalSearchData(data)
      })
      .catch(() => {
        if (!cancelled) setGlobalSearchData(null)
      })
    return () => { cancelled = true }
  }, [debouncedSearchTerm])

  const filteredSearchResults = useMemo((): CommandPaletteItem[] => {
    if (!searchTerm.trim()) return []
    const term = searchTerm.toLowerCase()
    const source = isAdmin
      ? menuItems
      : visibleMenuGroups.flatMap((g) => g.items)
    return source
      .flatMap((item) => [
        { ...item, parent: null as string | null },
        ...(item.submenu || []).map((sub) => ({
          name: sub.name,
          href: sub.href,
          icon: item.icon,
          parent: item.name,
        })),
      ])
      .filter((x) => x.name.toLowerCase().includes(term))
      .slice(0, 8)
  }, [searchTerm, isAdmin, visibleMenuGroups])

  const hasGlobalResults = globalSearchData &&
    (globalSearchData.orders.length > 0 || globalSearchData.accounts.length > 0 || globalSearchData.invoices.length > 0)

  const openSearch = useCallback(() => {
    setIsSearchOpen(true)
    setTimeout(() => document.querySelector<HTMLInputElement>('[data-search-input]')?.focus(), 50)
  }, [])

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false)
    setSearchTerm('')
  }, [])

  useKeyboardShortcut('k', openSearch, { ctrlKey: true })
  useKeyboardShortcut('k', openSearch, { metaKey: true })
  useKeyboardShortcut('Escape', closeSearch, { enabled: isSearchOpen })

  if (pathname === ROUTES.LOGIN || pathname === ROUTES.REGISTER) return null

  const navContent = (
    <nav
      className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden py-3 min-h-0',
        collapsed ? 'px-2' : 'px-3'
      )}
    >
      {!collapsed && (
        <button
          type="button"
          onClick={openSearch}
          data-command-palette-trigger
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800/80 transition-all duration-300 mb-4 border border-slate-700/50 shadow-inner group/search"
        >
          <Search className="w-4 h-4 flex-shrink-0 group-hover/search:text-indigo-400 transition-colors" />
          <span className="text-sm">Ara...</span>
          <span className="ml-auto text-[10px] font-medium text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded">Ctrl+K</span>
        </button>
      )}
      {collapsed && (
        <button
          type="button"
          onClick={openSearch}
          data-command-palette-trigger
          className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors mb-2"
          title="Ara (Ctrl+K)"
          aria-label="Ara"
        >
          <Search className="w-5 h-5" />
        </button>
      )}
      {storageReady && !collapsed && favoritePaths.length > 0 && (
        <div className="mb-3">
          <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">Favoriler</p>
          <ul className="space-y-0.5">
            {favoritePaths.map(({ path, label }) => (
              <li key={path} className="group flex items-center gap-0.5">
                <Link
                  href={path}
                  className={cn(
                    'flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors min-w-0',
                    pathname === path ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  )}
                >
                  <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                  <span className="truncate">{label}</span>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    toggleFavorite(path, label)
                  }}
                  className="p-1.5 rounded text-gray-500 hover:text-amber-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition"
                  title="Favorilerden çıkar"
                  aria-label="Favorilerden çıkar"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {visibleMenuGroups.map((group) => (
        <div key={group.label ?? 'main'} className={cn(group.label && 'mt-4')}>
          {group.label && !collapsed && (
            <div className="px-3 mt-6 mb-2 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400/90">{group.label}</span>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-700/50 to-transparent"></div>
            </div>
          )}
          {group.items.map((item) => {
            const isActive = isItemActive(item.href)
            const isExpanded = !!expandedMenus[item.name]
            const hasSubmenu = item.submenu && item.submenu.length > 0
            const Icon = item.icon

            const linkClass = cn(
              'w-full flex items-center gap-3 rounded-xl transition-all duration-300 min-h-[42px] group/nav relative overflow-hidden',
              collapsed ? 'justify-center w-11 h-11 mx-auto px-0 py-2.5' : 'px-3 py-2.5 text-left mb-1',
              isActive
                ? 'bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-transparent text-blue-300 font-semibold border-l-[3px] border-blue-500 shadow-[inset_1px_0_0_0_rgba(59,130,246,0.2)]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white font-medium border-l-[3px] border-transparent'
            )

            return (
              <div key={item.name} className="mb-0.5">
                {hasSubmenu ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedMenus((prev) => {
                          const isCurrentlyExpanded = !!prev[item.name]
                          // If it's already expanded, close it. Otherwise, open ONLY this one.
                          return isCurrentlyExpanded ? {} : { [item.name]: true }
                        })
                      }}
                      className={cn(linkClass, collapsed && 'justify-center')}
                    >
                      <Icon className={cn("w-5 h-5 flex-shrink-0 transition-all duration-300", isActive ? "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "text-slate-400 group-hover/nav:text-slate-200 group-hover/nav:scale-110")} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium">{item.name}</span>
                          <ChevronRight
                            className={cn(
                              'w-4 h-4 flex-shrink-0 transition-transform',
                              isExpanded && 'rotate-90'
                            )}
                          />
                        </>
                      )}
                    </button>
                    {hasSubmenu && isExpanded && !collapsed && (
                      <div className="ml-5 mt-1 mb-2 space-y-1 border-l border-slate-700/60 pl-3">
                        {item.submenu!.map((sub) => (
                          <div key={sub.href} className="group/sub flex items-center gap-0.5">
                            <Link
                              href={sub.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                'flex-1 flex items-center gap-3 px-3 py-2 text-[14px] rounded-lg transition-all duration-200 min-h-[38px] min-w-0 group/link border border-transparent',
                                pathname === sub.href
                                  ? 'bg-blue-500/15 text-blue-300 font-semibold translate-x-1 shadow-sm border-blue-500/20'
                                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white hover:translate-x-1 hover:border-slate-700/50'
                              )}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300", pathname === sub.href ? "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)] scale-125" : "bg-slate-500 group-hover/link:bg-slate-300")} />
                              <span className="truncate">{sub.name}</span>
                              {sub.href === '/notifications' && unreadNotificationsCount > 0 && (
                                <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-amber-500/90 text-black text-xs font-medium shrink-0">
                                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                                </span>
                              )}
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                toggleFavorite(sub.href, sub.name)
                              }}
                              className={cn(
                                'p-1.5 rounded transition opacity-0 group-hover/sub:opacity-100 shrink-0',
                                isFavorite(sub.href) ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400 hover:bg-white/5'
                              )}
                              title={isFavorite(sub.href) ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                              aria-label={isFavorite(sub.href) ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                            >
                              <Star className={cn('h-3.5 w-3.5', isFavorite(sub.href) && 'fill-amber-400 text-amber-400')} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={linkClass}
                    onClick={() => {
                      setExpandedMenus({}) // Açık olan tüm alt menüleri kapat
                      setIsOpen(false)
                    }}
                  >
                    <Icon className={cn("w-5 h-5 flex-shrink-0 transition-all duration-300", isActive ? "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "text-slate-400 group-hover/nav:text-slate-200 group-hover/nav:scale-110")} />
                    {!collapsed && (
                      <span className="flex-1 text-sm font-medium">{item.name}</span>
                    )}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </nav>
  )

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full flex flex-col bg-slate-900 border-r border-slate-800/80 transform transition-all duration-300 ease-in-out',
          'lg:static lg:z-auto',
          collapsed ? 'w-[72px] lg:w-[72px]' : 'w-64 lg:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        suppressHydrationWarning
      >
        {/* Logo + collapse */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-slate-700/80 gap-2">
          <Link
            href={ROUTES.HOME}
            onClick={() => setIsOpen(false)}
            className={cn(
              'flex items-center gap-2 overflow-hidden min-w-0',
              collapsed ? 'justify-center w-full' : 'flex-1'
            )}
          >
            <div className="shrink-0 flex items-center justify-center h-12 w-auto max-w-[180px]">
              <LogoWithBackground size="xs" className="!h-12 !w-auto !max-h-12 object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white truncate">LIVASOFA</span>
                <span className="block text-[10px] text-gray-500 truncate">ERP</span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="lg:hidden shrink-0 text-gray-400 hover:text-white"
              aria-label="Menüyü kapat"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* User */}
        <div
          className={cn(
            'flex items-center gap-3 border-b border-slate-800/80',
            collapsed ? 'justify-center py-4 px-2' : 'p-4'
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 flex items-center justify-center shrink-0 shadow-inner">
            <User className="w-5 h-5 text-slate-300" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-100 truncate tracking-wide">
                  {user?.full_name || user?.username || 'Kullanıcı'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate">{user?.role || 'Admin'}</p>
              </div>

              {!pathname?.startsWith('/bayi') && (
                <Link href="/notifications" className="relative p-2 text-slate-400 hover:text-white transition-colors group/bell" title="Bildirimler">
                  <Bell className="w-5 h-5 transition-transform group-hover/bell:scale-110" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </Link>
              )}
            </div>
          )}
          {collapsed && !pathname?.startsWith('/bayi') && unreadNotificationsCount > 0 && (
            <Link href="/notifications" className="absolute top-2 right-2">
              <span className="flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            </Link>
          )}
        </div>

        {navContent}

        {/* PWA: Ana ekrana ekle (tek seferlik vurgu) */}
        {!collapsed && (
          <NewFeatureHighlight featureId="pwa_hint">
            <p className="px-3 py-2 text-xs text-slate-400">
              📱 Uygulamayı ana ekrana ekleyebilirsiniz (tarayıcı menüsü → Ana ekrana ekle).
            </p>
          </NewFeatureHighlight>
        )}

        {/* Footer */}
        <div
          className={cn(
            'shrink-0 p-2 border-t border-slate-700/80',
            collapsed ? 'flex justify-center gap-1' : 'flex items-center gap-2'
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="shrink-0 text-gray-400 hover:text-white hidden lg:flex"
            title={collapsed ? 'Menüyü aç' : 'Menüyü daralt'}
            aria-label={collapsed ? 'Menüyü aç' : 'Menüyü daralt'}
          >
            {collapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </Button>
          {!collapsed && (
            <div className="flex-1"></div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMode}
            className="shrink-0 text-gray-400 hover:text-white"
            title={mode === 'dark' ? 'Açık tema' : 'Koyu tema'}
            aria-label={mode === 'dark' ? 'Açık tema' : 'Koyu tema'}
          >
            {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            className="shrink-0 text-gray-400 hover:text-red-400"
            title="Çıkış"
            aria-label="Çıkış"
            disabled={isLoggingOut}
            onClick={async (e) => {
              e.preventDefault()
              if (isLoggingOut) return
              setShowLogoutConfirm(true)
            }}
          >
            {collapsed ? (
              <LogOut className="w-4 h-4" />
            ) : (
              <span className="text-xs">{isLoggingOut ? '...' : 'Çıkış'}</span>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile menu button - safe area ile cep için */}
      <div className="lg:hidden fixed z-50 bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))]">
        <Button
          variant="solid"
          className="rounded-full shadow-lg bg-slate-700 hover:bg-slate-600 text-white"
          size="lg"
          onClick={() => setIsOpen(true)}
          aria-label="Menüyü aç"
        >
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* Command palette */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" role="dialog" aria-label="Sayfa ara">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={closeSearch}
          />
          <div className="relative w-full max-w-xl mx-4">
            <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-600 overflow-hidden">
              <div className="p-3 border-b border-slate-600 flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <Input
                  data-search-input
                  placeholder="Sayfa veya menü ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {hasGlobalResults && (
                  <div className="border-b border-slate-700">
                    <p className="px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-gray-500 bg-slate-900/50">
                      Sipariş / Cari / Fatura
                    </p>
                    {globalSearchData!.orders.length > 0 && (
                      <>
                        {globalSearchData!.orders.map((o) => (
                          <Link
                            key={`order-${o.id}`}
                            href={o.href}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/50 transition-colors"
                            onClick={closeSearch}
                          >
                            <ShoppingCart className="w-4 h-4 text-amber-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-white block truncate">{o.label}</span>
                              {o.sub && <span className="text-xs text-gray-500 block truncate">{o.sub}</span>}
                            </div>
                          </Link>
                        ))}
                      </>
                    )}
                    {globalSearchData!.accounts.length > 0 && (
                      <>
                        {globalSearchData!.accounts.map((a) => (
                          <Link
                            key={`acc-${a.id}`}
                            href={a.href}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/50 transition-colors"
                            onClick={closeSearch}
                          >
                            <Users className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="text-sm font-medium text-white truncate">{a.label}</span>
                          </Link>
                        ))}
                      </>
                    )}
                    {globalSearchData!.invoices.length > 0 && (
                      <>
                        {globalSearchData!.invoices.map((i) => (
                          <Link
                            key={`inv-${i.id}`}
                            href={i.href}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/50 transition-colors"
                            onClick={closeSearch}
                          >
                            <FileText className="w-4 h-4 text-green-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-white block truncate">{i.label}</span>
                              {i.sub && <span className="text-xs text-gray-500 block truncate">{i.sub}</span>}
                            </div>
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                )}
                {filteredSearchResults.length > 0 ? (
                  <div className={hasGlobalResults ? 'border-t border-slate-700' : ''}>
                    {hasGlobalResults && (
                      <p className="px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-gray-500 bg-slate-900/50">
                        Menü
                      </p>
                    )}
                    {filteredSearchResults.map((item, i) => (
                      <Link
                        key={`${item.href}-${i}`}
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
                        onClick={() => {
                          closeSearch()
                          if (item.href === ROUTES.HOME) setExpandedMenus({})
                        }}
                      >
                        {item.icon && (
                          <item.icon className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white block truncate">
                            {item.name}
                          </span>
                          {item.parent && (
                            <span className="text-xs text-gray-500">{item.parent}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">↵</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  !hasGlobalResults &&
                  searchTerm && (
                    <p className="px-4 py-6 text-sm text-gray-500 text-center">
                      Sonuç bulunamadı
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Dialogs */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          setShowLogoutConfirm(false)
          try {
            setIsLoggingOut(true)
            await logout()
          } catch (err) {
            console.error('Logout failed:', err)
            setIsLoggingOut(false)
          }
        }}
        title="Oturumu Kapat"
        message="Hesabınızdan güvenli bir şekilde çıkış yapmak istediğinize emin misiniz?"
        confirmText="Çıkış Yap"
        cancelText="İptal"
        variant="danger"
        loading={isLoggingOut}
      />
    </>
  )
}
