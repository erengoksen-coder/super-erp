'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  Factory, 
  Users,
  Menu,
  X,
  Barcode,
  QrCode,
  Smartphone,
  Calendar,
  ShoppingCart,
  Truck,
  Shield
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { LogoWithBackground } from './Logo'
import { isAuthenticated, getUserRole, logout } from '@/lib/auth'

const menuItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Stok Yönetimi',
    href: '/inventory',
    icon: Package,
  },
  {
    name: 'Hammadde Depo',
    href: '/inventory/materials',
    icon: Package,
  },
  {
    name: 'Mamül Depo',
    href: '/inventory/products',
    icon: Factory,
  },
  {
    name: 'Üretim Emirleri',
    href: '/production',
    icon: Factory,
  },
  {
    name: 'Üretim Takvimi',
    href: '/production/calendar',
    icon: Calendar,
  },
  {
    name: 'Cari Hesaplar',
    href: '/accounts',
    icon: Users,
  },
  {
    name: 'Barkod Yönetimi',
    href: '/barcodes',
    icon: Barcode,
  },
  {
    name: 'Kritik Stok',
    href: '/purchase/critical-stock',
    icon: ShoppingCart,
  },
      {
        name: 'Depo Hızlı İşlem',
        href: '/mobile/material-stock',
        icon: Package,
      },
      {
        name: 'Usta Terminali',
        href: '/mobile/workstation',
        icon: Factory,
      },
      {
        name: 'Sevkiyat',
        href: '/shipments',
        icon: Truck,
      },
      {
        name: 'Ürün Reçetesi (BOM)',
        href: '/bom',
        icon: Package,
      },
      {
        name: 'Kullanıcı Yönetimi',
        href: '/users',
        icon: Shield,
      },
    ]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserRole(getUserRole())
      setUserName(localStorage.getItem('user_name'))
    }
  }, [])

  // Public sayfalarda sidebar gösterme
  if (pathname?.startsWith('/auth/')) {
    return null
  }

  // Auth kontrolü
  if (typeof window !== 'undefined' && !isAuthenticated() && !pathname?.startsWith('/auth/')) {
    return null
  }

  // Kullanıcı yönetimi sadece admin için
  const filteredMenuItems = menuItems.filter(item => {
    if (item.href === '/users' && userRole !== 'admin') {
      return false
    }
    return true
  })

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition touch-manipulation"
        aria-label="Menüyü aç/kapat"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800
          transform transition-transform duration-300 ease-in-out z-40
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          flex flex-col
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="p-4 lg:p-6 border-b border-gray-800 flex-shrink-0">
            <Link href="/" onClick={() => setIsMobileOpen(false)}>
              <LogoWithBackground size="sm" />
            </Link>
          </div>

          {/* Menu Items - Scroll edilebilir */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 lg:p-4 space-y-1 lg:space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center space-x-2 lg:space-x-3 px-2 lg:px-4 py-2 lg:py-3 rounded-lg transition-all touch-manipulation
                    text-xs lg:text-sm md:text-base
                    ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white active:bg-gray-700'
                    }
                  `}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="font-medium truncate">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-2 lg:p-4 border-t border-gray-800 flex-shrink-0">
            {userName && (
              <div className="mb-2 text-xs text-gray-400 text-center">
                {userName}
              </div>
            )}
            <button
              onClick={() => {
                logout()
                router.push('/auth/login')
              }}
              className="w-full text-xs text-gray-500 hover:text-gray-300 text-center transition"
            >
              Çıkış Yap
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              LIVASOFA ERP v1.0
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
        />
      )}
    </>
  )
}

