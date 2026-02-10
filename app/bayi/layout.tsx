'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Truck, Wallet, Store, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/lib/store/authStore'
import { useEffect, useState } from 'react'
import { fetchApi } from '@/lib/api/client'

const navItems = [
  { name: 'Özet', href: '/bayi/dashboard', icon: LayoutDashboard },
  { name: 'Sipariş Gir', href: '/bayi/orders/new', icon: PlusCircle },
  { name: 'Siparişlerim', href: '/bayi/orders', icon: Package },
  { name: 'Sevkiyatlarım', href: '/bayi/shipments', icon: Truck },
  { name: 'Cari Hesabım', href: '/bayi/account', icon: Wallet },
]

export default function BayiPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const [dealerName, setDealerName] = useState<string>('')

  useEffect(() => {
    const name = (user as any)?.dealer_name ?? ''
    if (name) {
      setDealerName(String(name).trim())
      return
    }
    fetchApi('/api/bayi/me')
      .then((res: any) => {
        const u = res?.user ?? res?.data?.user
        setDealerName((u?.dealer_name ?? '').trim())
      })
      .catch(() => setDealerName(''))
  }, [user])

  return (
    <div className="space-y-5">
      {/* Portal başlık ve cari */}
      <header className="rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/30 flex items-center justify-center">
            <Store className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Bayi Portal</h1>
            {dealerName && (
              <p className="text-slate-400 text-sm">Cari: <span className="text-slate-200 font-medium">{dealerName}</span></p>
            )}
          </div>
        </div>
      </header>

      {/* Ana navigasyon */}
      <nav className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-2 flex flex-wrap gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/bayi' && item.href !== '/bayi/orders' && pathname?.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-w-[44px] min-h-[44px] justify-center sm:justify-start',
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sayfa içeriği */}
      <section className="min-w-0">
        {children}
      </section>
    </div>
  )
}
