'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Wallet, 
  Store, 
  PlusCircle, 
  ChevronRight,
  User,
  LogOut,
  Bell,
  Settings,
  HelpCircle,
  History,
  CreditCard,
  Target
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi } from '@/lib/api/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const navItems = [
  { name: 'Özet Paneli', href: '/bayi/dashboard', icon: LayoutDashboard },
  { name: 'Yeni Sipariş', href: '/bayi/orders/new', icon: PlusCircle },
  { name: 'Siparişlerim', href: '/bayi/orders', icon: Package },
  { name: 'Sevkiyatlar', href: '/bayi/shipments', icon: Truck },
  { name: 'Cari Hesap', href: '/bayi/account', icon: Wallet },
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
    <div className="min-h-screen bg-[#09090b] text-foreground p-4 lg:p-8 space-y-8 animate-reveal">
      {/* Platinum Header */}
      <header className="glass rounded-[2rem] border border-white/5 p-6 md:p-8 flex flex-wrap items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow-lg transform hover:rotate-3 transition-transform duration-500">
            <Store className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
               <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">BAYİ PORTAL</h1>
               <Badge variant="glass" className="text-[10px] font-black tracking-widest bg-white/5 border-white/5 text-primary">PLATINUM v2.5</Badge>
            </div>
            {dealerName && (
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-success shadow-glow-sm animate-pulse" />
                 <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest">{dealerName}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
           <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5"><Bell className="w-5 h-5 opacity-40" /></Button>
           <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5"><Settings className="w-5 h-5 opacity-40" /></Button>
           <div className="h-8 w-[1px] bg-white/5 mx-2" />
           <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary group-hover:scale-105 transition-transform">
                 {(user as any)?.full_name?.charAt(0) || 'B'}
              </div>
              <div className="hidden sm:block mr-2">
                 <p className="text-[11px] font-black uppercase tracking-tight leading-none">{(user as any)?.full_name || 'Misafir'}</p>
                 <p className="text-[9px] font-bold opacity-20 uppercase tracking-widest mt-0.5">Partner</p>
              </div>
           </div>
        </div>
      </header>

      {/* Main Navigation - Integrated into content flow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
         <nav className="lg:col-span-3 glass rounded-[2.5rem] border border-white/5 p-4 space-y-2 sticky top-8">
            <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em] px-4 py-2">Navigasyon</p>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/bayi' && item.href !== '/bayi/orders' && pathname?.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-4 px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all group',
                    isActive
                      ? 'bg-primary text-white shadow-glow'
                      : 'text-foreground/40 hover:bg-white/5 hover:text-foreground/80'
                  )}
                >
                  <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-primary")} />
                  {item.name}
                  {isActive && <ChevronRight className="ml-auto w-4 h-4" />}
                </Link>
              )
            })}
            
            <div className="pt-8 space-y-2">
               <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em] px-4 py-2">Erişim</p>
               <button className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-error/60 hover:bg-error/5 hover:text-error transition-all group">
                  <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                  GÜVENLİ ÇIKIŞ
               </button>
            </div>

            {/* Quick Stats Sidebar Mock */}
            <div className="mt-10 p-6 rounded-[2rem] bg-primary/5 border border-primary/10">
               <div className="flex items-center justify-between mb-4">
                  <Target className="w-5 h-5 text-primary" />
                  <Badge variant="glass" className="text-[8px] font-black">CANLI</Badge>
               </div>
               <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.15em] mb-1">Ciro İlerleme</p>
               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-primary shadow-glow-sm w-[65%]" />
               </div>
               <p className="text-[10px] font-bold opacity-40 uppercase">%65 Hedef Yakın</p>
            </div>
         </nav>

         <main className="lg:col-span-9 min-w-0">
            {children}
         </main>
      </div>
    </div>
  )
}
