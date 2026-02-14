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
} from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { LogoWithBackground } from './Logo'
import { useAuthStore } from '@/lib/store/authStore'
import { useTheme } from '@/lib/theme'
import { logout } from '@/lib/auth'
import { useSidebar } from './SidebarContext'
import { canAccessPath, isAdminRole } from '@/lib/auth/permissions-check'
import { useApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { ROUTES } from '@/lib/constants'

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

const menuItems: MenuItem[] = [
  { name: 'Kontrol Paneli', href: ROUTES.HOME, icon: LayoutDashboard, group: '' },
  {
    name: 'Üretim',
    href: ROUTES.PRODUCTION,
    icon: Factory,
    group: 'Üretim & Stok',
    submenu: [
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
      { name: 'Etiket / Barkod', href: `${ROUTES.INVENTORY}/products/print-barcode-label` },
      { name: 'Barkod Yönetimi', href: ROUTES.BARCODES },
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
      { name: 'Satış Siparişleri', href: '/sales-orders' },
      { name: 'Sevkiyat', href: ROUTES.SHIPMENTS },
      { name: 'Faturalar', href: ROUTES.INVOICES },
      { name: 'Yeni Fatura', href: `${ROUTES.INVOICES}/new` },
    ],
  },
  {
    name: 'Satın Alma',
    href: '/purchase-requests',
    icon: ClipboardList,
    group: 'Satış & Tedarik',
    submenu: [
      { name: 'Talepler', href: '/purchase-requests' },
      { name: 'Siparişler', href: '/purchase-orders' },
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
      { name: 'Ödemeler', href: '/payments' },
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
  {
    name: 'İnsan Kaynakları',
    href: ROUTES.HR,
    icon: Users,
    group: 'Diğer',
    submenu: [
      { name: 'Özet', href: ROUTES.HR },
      { name: 'Giriş/Çıkış (Puantaj)', href: `${ROUTES.HR}/clock` },
      { name: 'Devam / Puantaj', href: `${ROUTES.HR}/attendance` },
      { name: 'İzinler', href: `${ROUTES.HR}/leave` },
      { name: 'Bordro', href: `${ROUTES.HR}/payroll` },
      { name: 'Performans', href: `${ROUTES.HR}/performance` },
      { name: 'İşe Alım', href: `${ROUTES.HR}/recruitment` },
      { name: 'Vardiya', href: `${ROUTES.HR}/shifts` },
    ],
  },
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
      { name: 'İzinler', href: '/hr/leave' },
    ],
  },
  {
    name: 'Raporlar',
    href: ROUTES.REPORTS,
    icon: BarChart3,
    group: 'Diğer',
    submenu: [
      { name: 'Genel', href: ROUTES.REPORTS },
      { name: 'Maliyet', href: `${ROUTES.REPORTS}/costs` },
      { name: 'Fire', href: `${ROUTES.REPORTS}/fire` },
    ],
  },
  {
    name: 'Ayarlar',
    href: ROUTES.SETTINGS,
    icon: Settings,
    group: 'Sistem',
    submenu: [
      { name: 'Genel', href: ROUTES.SETTINGS },
      { name: 'Entegrasyonlar', href: '/settings/integrations' },
      { name: 'Yönetici Paneli', href: '/admin' },
      { name: 'Kullanıcılar', href: ROUTES.USERS },
      { name: 'Mesajlaşma (Admin)', href: '/admin/messaging' },
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
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    menuItems.forEach((item) => {
      if (item.submenu?.length && pathname?.startsWith(item.href)) initial[item.name] = true
    })
    return initial
  })
  const user = useAuthStore((s) => s.user)
  const { mode, toggleMode } = useTheme()
  const { data: notificationsList } = useApi<Array<{ read?: number }>>('/api/notifications')
  const unreadNotificationsCount = (notificationsList ?? []).filter((n) => !n.read).length

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

  const isItemActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

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
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors mb-3 border border-gray-700/50"
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">Ara...</span>
          <span className="ml-auto text-[10px] text-gray-500">Ctrl+K</span>
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
      {visibleMenuGroups.map((group) => (
        <div key={group.label ?? 'main'} className={cn(group.label && 'mt-4')}>
          {group.label && !collapsed && (
            <p className="px-3 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const isActive = isItemActive(item.href)
            const isExpanded = !!expandedMenus[item.name]
            const hasSubmenu = item.submenu && item.submenu.length > 0
            const Icon = item.icon

            const linkClass = cn(
              'w-full flex items-center gap-3 rounded-lg transition-all duration-150',
              collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5 text-left',
              isActive
                ? 'bg-blue-500/15 text-blue-400 border-l-2 border-blue-500'
                : 'text-gray-300 hover:bg-white/5 hover:text-gray-100 border-l-2 border-transparent'
            )

            return (
              <div key={item.name} className="mb-0.5">
                {hasSubmenu ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const nextExpanded = !expandedMenus[item.name]
                        setExpandedMenus(nextExpanded ? { [item.name]: true } : { ...expandedMenus, [item.name]: false })
                      }}
                      className={cn(linkClass, collapsed && 'justify-center')}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0 text-gray-400" />
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
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-700/50 pl-2">
                        {item.submenu!.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                              pathname === sub.href
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                            {sub.name}
                            {sub.href === '/notifications' && unreadNotificationsCount > 0 && (
                              <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-amber-500/90 text-black text-xs font-medium">
                                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link href={item.href} className={linkClass}>
                    <Icon className="w-5 h-5 flex-shrink-0 text-gray-400" />
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
          'fixed top-0 left-0 z-50 h-full flex flex-col bg-slate-900 border-r border-slate-700/80 transform transition-all duration-300 ease-in-out',
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
            'flex items-center gap-2 border-b border-slate-700/80',
            collapsed ? 'justify-center py-3 px-2' : 'p-3'
          )}
        >
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-slate-300" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name || user?.username || 'Kullanıcı'}
              </p>
              <p className="text-[10px] text-gray-500 truncate">{user?.role || 'Admin'}</p>
            </div>
          )}
        </div>

        {navContent}

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
            onClick={(e) => {
              e.preventDefault()
              if (!isLoggingOut) {
                setIsLoggingOut(true)
                logout()
              }
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

      {/* Mobile menu button */}
      <div className="lg:hidden fixed bottom-4 left-4 z-50">
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
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map((item, i) => (
                    <Link
                      key={`${item.href}-${i}`}
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
                      onClick={closeSearch}
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
                  ))
                ) : (
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

    </>
  )
}
