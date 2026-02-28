'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Truck, Wallet, Store, PlusCircle, LogOut } from 'lucide-react'
import { logout } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/lib/store/authStore'
import { useEffect, useState } from 'react'
import { safeFetch } from '@/lib/api/client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { NotificationBell } from '@/components/NotificationBell'

const navItems = [
  { name: 'Özet', href: '/bayi/dashboard', icon: LayoutDashboard },
  { name: 'Katalog & Sipariş', href: '/bayi/orders/new', icon: PlusCircle },
  { name: 'Siparişlerim', href: '/bayi/orders', icon: Package },
  { name: 'Sevkiyatlarım', href: '/bayi/shipments', icon: Truck },
  { name: 'Cari Hesabım', href: '/bayi/account', icon: Wallet },
  { name: 'Destek (SSH)', href: '/bayi/tickets', icon: Store },
]

export default function BayiPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const [dealerName, setDealerName] = useState<string>('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const [showConfirm, setShowConfirm] = useState(false)

  const handleLogout = async () => {
    setShowConfirm(false)
    setIsLoggingOut(true)
    try {
      await logout()
    } catch {
      setIsLoggingOut(false)
    }
  }

  useEffect(() => {
    const name = (user as any)?.dealer_name ?? ''
    if (name) {
      setDealerName(String(name).trim())
      return
    }
    safeFetch<{ user?: { dealer_name?: string }; data?: { user?: { dealer_name?: string } } }>('/api/bayi/me')
      .then((res) => {
        if (!res) return
        const u = res.user ?? (res as any).data?.user
        setDealerName((u?.dealer_name ?? '').trim())
      })
  }, [user])

  return (
    <div className="space-y-5">
      {/* Portal başlık ve cari */}
      <header className="relative rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 shadow-xl shadow-blue-900/10 z-20">
        {/* Dekoratif arka plan ışığı */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full"></div>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20">
              <Store className="w-6 h-6 text-sky-100" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(56,189,248,0.3)]">
                Bayi Portal
              </h1>
              {dealerName && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"></div>
                  <p className="text-blue-200/70 text-sm font-extrabold tracking-tight">
                    Cari: <span className="text-blue-300 font-black decoration-blue-500/30 underline-offset-4 hover:text-cyan-300 transition-colors cursor-default">{dealerName}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300 backdrop-blur-md">
              V2.5 Premium
            </div>
            <NotificationBell />
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-400 transition-all active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? '...' : 'Çıkış'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Ana navigasyon */}
      <nav className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-1.5 flex flex-wrap gap-1.5 backdrop-blur-xl shadow-inner">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/bayi' && item.href !== '/bayi/orders' && pathname?.startsWith(item.href))
          const Icon = item.icon

          // Item-specific colors
          const colorMap: Record<string, string> = {
            'Özet': 'hover:text-blue-400',
            'Katalog & Sipariş': 'hover:text-emerald-400',
            'Siparişlerim': 'hover:text-amber-400',
            'Sevkiyatlarım': 'hover:text-cyan-400',
            'Cari Hesabım': 'hover:text-rose-400',
            'Destek (SSH)': 'hover:text-indigo-400',
          }
          const hoverColor = colorMap[item.name] || 'hover:text-blue-400'

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-extrabold transition-all duration-300 min-w-[44px] justify-center sm:justify-start group border border-transparent',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-blue-50 shadow-lg shadow-blue-600/30 scale-[1.05] border-white/10 z-10'
                  : cn('text-slate-400/80 hover:bg-slate-800/80 hover:border-slate-700/50', hoverColor)
              )}
            >
              <Icon className={cn("w-5 h-5 transition-all duration-300 group-hover:scale-125 group-active:scale-95", isActive ? "text-sky-200" : "text-slate-500/70")} />
              <span className="hidden sm:inline tracking-tight">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sayfa içeriği */}
      <section className="min-w-0">
        {children}
      </section>
      {/* Modal / Dialogs */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleLogout}
        title="Oturumu Kapat"
        message="Hesabınızdan güvenli bir şekilde çıkış yapmak istediğinize emin misiniz? Kaydedilmemiş değişiklikleriniz varsa kaybolabilir."
        confirmText="Çıkış Yap"
        cancelText="Vazgeç"
        variant="danger"
        loading={isLoggingOut}
      />
    </div>
  )
}
