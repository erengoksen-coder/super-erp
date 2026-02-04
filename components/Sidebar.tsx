'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  Factory, 
  Menu,
  X,
  Barcode,
  Calendar,
  ShoppingCart,
  Truck,
  Shield,
  FileSpreadsheet,
  ClipboardList,
  BarChart3,
  Bell,
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
  Plus
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { LogoWithBackground } from './Logo'
import { useAuthStore } from '@/lib/store/authStore'
import { useTheme } from '@/lib/theme'
import { logout } from '@/lib/auth'
import { canAccessPath } from '@/lib/auth/permissions-check'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

const menuItems = [
  {
    name: 'Kontrol Paneli',
    href: '/',
    icon: LayoutDashboard,
    description: 'Genel bakış'
  },
  {
    name: 'Üretim',
    href: '/production',
    icon: Factory,
    description: 'Üretim yönetimi',
    submenu: [
      { name: 'Üretim Emirleri', href: '/production' },
      { name: 'Yeni Üretim', href: '/production/new' },
      { name: 'Ürün Reçetesi', href: '/bom' },
      { name: 'İş Emirleri', href: '/production/work-orders' },
      { name: 'Operasyonlar', href: '/production/operations' },
      { name: 'İş Merkezleri', href: '/production/work-centers' },
      { name: 'Üretim Operasyonları', href: '/production/order-operations' },
      { name: 'MRP', href: '/production/mrp' },
      { name: 'Üretim Takvimi', href: '/production/calendar' },
      { name: 'Usta Terminali', href: '/mobile/workstation' }
    ]
  },
  {
    name: 'Stok',
    href: '/inventory',
    icon: Package,
    description: 'Depo yönetimi',
    submenu: [
      { name: 'Depo Genel', href: '/inventory' },
      { name: 'Hammadde', href: '/inventory/materials' },
      { name: 'Hammadde Fiyat Geçmişi', href: '/inventory/materials/price-history' },
      { name: 'Hammadde Rezervasyon', href: '/inventory/materials/reservations' },
      { name: 'Mamül', href: '/inventory/products' },
      { name: 'Etiket Yazdır', href: '/inventory/products/print-label' },
      { name: 'Barkod Etiketi', href: '/inventory/products/print-barcode-label' },
      { name: 'Barkod Yönetimi', href: '/barcodes' },
      { name: 'Depo Hızlı İşlem', href: '/mobile/material-stock' }
    ]
  },
  {
    name: 'Satış',
    href: '/orders',
    icon: ShoppingCart,
    description: 'Sipariş yönetimi',
    submenu: [
      { name: 'Siparişler', href: '/orders' },
      { name: 'Satış Siparişleri', href: '/sales-orders' },
      { name: 'Sevkiyat', href: '/shipments' },
      { name: 'Faturalar', href: '/invoices' },
      { name: 'Yeni Fatura', href: '/invoices/new' }
    ]
  },
  {
    name: 'Satın Alma',
    href: '/purchase-requests',
    icon: ClipboardList,
    description: 'Tedarik zinciri',
    submenu: [
      { name: 'Talepler', href: '/purchase-requests' },
      { name: 'Siparişler', href: '/purchase-orders' },
      { name: 'Kritik Stok', href: '/purchase/critical-stock' }
    ]
  },
  {
    name: 'Tedarik',
    href: '/procurement',
    icon: ClipboardList,
    description: 'Satın alma yönetimi',
  },
  {
    name: 'Finans',
    href: '/finance',
    icon: Wallet,
    description: 'Finans yönetimi',
    submenu: [
      { name: 'Cari Hesaplar', href: '/accounts' },
      { name: 'Ödemeler', href: '/payments' },
      { name: 'Yevmiye Fişleri', href: '/finance/journal-entries' },
      { name: 'Yeni Fiş', href: '/finance/new' },
      { name: 'Hesap Planı', href: '/finance/chart-of-accounts' },
      { name: 'Büyük Defter', href: '/finance/general-ledger' },
      { name: 'Fire Analizi', href: '/finance/fire-analysis' },
      { name: 'Maliyet Analizi', href: '/finance/cost-analysis' }
    ]
  },
  {
    name: 'Muhasebe',
    href: '/accounting',
    icon: BookOpen,
    description: 'Mali tablolar',
  },
  {
    name: 'İnsan Kaynakları',
    href: '/hr',
    icon: Users,
    description: 'Personel yönetimi',
  },
  {
    name: 'CRM',
    href: '/crm',
    icon: Handshake,
    description: 'Müşteri ilişkileri',
  },
  {
    name: 'Sabit Kıymet',
    href: '/fixed-assets',
    icon: Landmark,
    description: 'Varlık yönetimi',
  },
  {
    name: 'Raporlar',
    href: '/reports',
    icon: BarChart3,
    description: 'Analiz ve raporlar',
    submenu: [
      { name: 'Genel Raporlar', href: '/reports' },
      { name: 'Üretim Maliyet Raporu', href: '/reports/costs' },
      { name: 'Fire Analizi', href: '/reports/fire' }
    ]
  },
  {
    name: 'Ayarlar',
    href: '/settings',
    icon: Settings,
    description: 'Sistem ayarları',
    submenu: [
      { name: 'Genel Ayarlar', href: '/settings' },
      { name: 'Kullanıcı Yönetimi', href: '/users' },
      { name: 'Birim Çevrimleri', href: '/units/conversions' },
      { name: 'Bildirimler', href: '/notifications' },
      { name: 'API Katalogu', href: '/api-catalog' }
    ]
  }
]

// TÜM menü isimlerini component DIŞINDA hesapla - SSR/hydration hatası önlemek için
// ARTIK KULLANILMIYOR - menüler her zaman açık
// const ALL_MENU_NAMES = menuItems.map((item) => item.name)

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = usePathname()
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    menuItems.forEach((item) => {
      if (item.submenu && item.submenu.length > 0 && pathname?.startsWith(item.href)) {
        initial[item.name] = true
      }
    })
    return initial
  })
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { mode, toggleMode } = useTheme()

  // Filter menu items based on user permissions
  const filteredMenuItems = menuItems // Simplified for now - show all items

  const toggleExpanded = (name: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [name]: !prev[name],
    }))
  }

  useEffect(() => {
    const activeParent = menuItems.find(
      (item) => item.submenu && item.submenu.some((sub) => pathname?.startsWith(sub.href))
    )
    if (!activeParent) return
    setExpandedMenus((prev) => {
      if (prev[activeParent.name]) return prev
      return { ...prev, [activeParent.name]: true }
    })
  }, [pathname])

  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const filteredSearchResults = searchTerm
    ? filteredMenuItems.flatMap(item => [
        item,
        ...(item.submenu || []).map(sub => ({ ...sub, parent: item.name }))
      ]).filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5) as any
    : []

  // Login/Register sayfalarında sidebar'ı gösterme
  if (pathname === '/auth/login' || pathname === '/auth/register') {
    return null
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          suppressHydrationWarning
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          'fixed top-0 left-0 z-50 w-64 h-full bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        suppressHydrationWarning
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link href="/" className="flex items-center space-x-3">
            <LogoWithBackground size="sm" />
            <div className="leading-tight">
              <span className="text-xl font-bold text-gray-900">LIVASOFA</span>
              <div className="text-xs text-gray-500">Menü v2</div>
            </div>
          </Link>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="lg:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || user?.username || 'Kullanıcı'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role || 'Admin'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto h-[calc(100vh-180px)]">
          {filteredMenuItems.map((item) => {
            const isActive = isItemActive(item.href)
            const isExpanded = !!expandedMenus[item.name]
            const hasSubmenu = item.submenu && item.submenu.length > 0

            return (
              <div key={item.name}>
                {hasSubmenu ? (
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 text-sm rounded-lg transition-colors duration-150',
                      isActive 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <span className="flex items-center space-x-3 flex-1">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1 text-left">
                        <span>{item.name}</span>
                        {item.description && (
                          <span className="block text-xs text-gray-500">{item.description}</span>
                        )}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'transform transition-transform duration-200',
                        isExpanded ? 'rotate-90' : ''
                      )}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 text-sm rounded-lg transition-colors duration-150',
                      isActive 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <span className="flex items-center space-x-3 flex-1">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1 text-left">
                        <span>{item.name}</span>
                        {item.description && (
                          <span className="block text-xs text-gray-500">{item.description}</span>
                        )}
                      </span>
                    </span>
                  </Link>
                )}

                {hasSubmenu && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          'flex items-center px-4 py-2 text-sm rounded-lg transition-colors duration-150',
                          pathname === subItem.href
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        <div className="w-2 h-2 bg-current rounded-full mr-3 opacity-50" />
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={toggleMode}
            >
              {mode === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={isLoggingOut}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!isLoggingOut) {
                  setIsLoggingOut(true)
                  logout()
                }
              }}
            >
              {isLoggingOut ? 'Çıkış Yapılıyor...' : 'Çıkış'}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed bottom-4 left-4 z-50" suppressHydrationWarning>
        <Button
          variant="solid"
          color="primary"
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => setIsOpen(true)}
          suppressHydrationWarning
        >
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* Command Palette (Ctrl+K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div 
            className="fixed inset-0 bg-black/50"
            onClick={() => {
              setIsSearchOpen(false)
              setSearchTerm('')
            }}
          />
          <div className="relative w-full max-w-2xl mx-4">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <Input
                  placeholder="Komut veya menü ara..."
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                  fullWidth
                />
              </div>
              
              {searchTerm && (
                <div className="max-h-96 overflow-y-auto">
                  {filteredSearchResults.map((item: any, index: number) => (
                    <Link
                      key={index}
                      href={item.href}
                      className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      onClick={() => {
                        setIsSearchOpen(false)
                        setSearchTerm('')
                      }}
                    >
                      {item.icon && (
                        <item.icon className="w-4 h-4 mr-3 text-gray-400" />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        {item.parent && (
                          <div className="text-xs text-gray-500">
                            {item.parent}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        ↵
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Keyboard Shortcut */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();document.querySelector('[data-command-palette-trigger]')?.click();}});`
        }}
      />
    </>
  )
}