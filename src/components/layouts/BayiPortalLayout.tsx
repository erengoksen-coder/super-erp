'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Truck, Wallet, Store, PlusCircle, LogOut } from 'lucide-react'
import { logout } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/lib/store/authStore'
import { safeFetch } from '@/lib/api/client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { NotificationBell } from '@/components/NotificationBell'
import { Clock } from '@/components/ui/Clock'
import { isAdminRole } from '@/lib/auth/permissions-check'

const navItems = [
    { name: 'Özet', href: '/bayi/dashboard', icon: LayoutDashboard },
    { name: 'Katalog & Sipariş', href: '/bayi/orders/new', icon: PlusCircle },
    { name: 'Siparişlerim', href: '/bayi/orders', icon: Package },
    { name: 'Sevkiyatlarım', href: '/bayi/shipments', icon: Truck },
    { name: 'Cari Hesabım', href: '/bayi/account', icon: Wallet },
    { name: 'Destek (SSH)', href: '/bayi/tickets', icon: Store },
]

export function BayiPortalLayout({ children }: { children: React.ReactNode }) {
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
            <header className="relative rounded-[2rem] border border-white/5 bg-gray-900/40 backdrop-blur-xl px-8 py-6 shadow-2xl z-20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

                <div className="relative flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-500/30 border border-white/10 group">
                            <Store className="w-8 h-8 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Livasofa</span>
                                <span className="text-slate-700 font-bold">•</span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">B2B PORTAL</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tighter text-white drop-shadow-2xl leading-none">
                                Bayi <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Paneli</span>
                            </h1>
                        </div>
                    </div>

                    <div className="hidden xl:flex items-center gap-6 px-8 py-3 rounded-[2rem] bg-black/40 border border-white/5 shadow-2xl backdrop-blur-md ring-1 ring-white/5">
                        <div className="flex flex-col items-center text-center">
                            <span className="text-[16px] font-bold text-blue-100/90 tracking-[0.1em] leading-none mb-1">
                                {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                            <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-[0.25em] drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                                {new Date().toLocaleDateString('tr-TR', { weekday: 'long' })}
                            </span>
                        </div>
                        <div className="w-px h-10 bg-white/5" />
                        <Clock />
                    </div>

                    <div className="flex items-center gap-4">
                        {dealerName && (
                            <div className="hidden lg:flex flex-col items-end mr-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">AKTİF CARİ HESAP</span>
                                <div className="flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                    <span className="text-sm font-black text-blue-100 tracking-tight">{dealerName}</span>
                                </div>
                            </div>
                        )}
                        <div className="px-5 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest backdrop-blur-md">
                            V3.0 PREMIUM
                        </div>
                        <div className="w-px h-8 bg-white/5 mx-2" />
                        <NotificationBell />
                        {isAdminRole(user?.role) && (
                            <Link href="/">
                                <button className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 transition-all active:scale-95 group shadow-lg shadow-blue-950/20">
                                    <LayoutDashboard className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">ADMİN PANELİ</span>
                                </button>
                            </Link>
                        )}
                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={isLoggingOut}
                            className="flex items-center gap-2 pl-3 pr-5 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 transition-all active:scale-95 group shadow-lg shadow-rose-950/20"
                        >
                            <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            <span className="text-[11px] font-black uppercase tracking-widest">{isLoggingOut ? '...' : 'ÇIKIŞ'}</span>
                        </button>
                    </div>
                </div>
            </header>

            <nav className="rounded-[1.5rem] border border-white/5 bg-gray-900/20 p-2 flex flex-wrap gap-2 backdrop-blur-xl shadow-2xl relative z-10 w-fit mx-auto lg:mx-0">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/bayi' && item.href !== '/bayi/orders' && pathname?.startsWith(item.href))
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-500 group border border-transparent',
                                isActive
                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 scale-105 border-white/10 z-10'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5 hover:border-white/5'
                            )}
                        >
                            <Icon size={18} className={cn("transition-all duration-500 group-hover:scale-110", isActive ? "text-white" : "text-slate-600 group-hover:text-blue-400")} />
                            <span className="hidden sm:inline">{item.name}</span>
                        </Link>
                    )
                })}
            </nav>

            <section className="min-w-0">
                {children}
            </section>

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
