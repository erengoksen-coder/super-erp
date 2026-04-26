'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Factory, Menu, X, LogOut, ShoppingCart,
  ClipboardList, BarChart3, Wallet, BookOpen, Users, Handshake,
  Landmark, Settings, User, Sun, Moon, Search, Bell, ChevronRight,
  PanelLeftClose, PanelLeft, MessageCircle, Palette, Plus, Activity
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/lib/store/authStore'
import { logout } from '@/lib/auth'
import { secureFetchApi } from '@/lib/api/agi-core'
import { canAccessPath, isAdminRole } from '@/lib/auth/permissions-check'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { agiAudio } from '@/lib/utils/audio'
import { CommandPalette } from '@/components/dashboard/CommandPalette'
import { NotificationDrawer } from '@/components/dashboard/NotificationDrawer'

interface MenuItem {
  name: string
  href: string
  icon: any
  group: string
  permission?: string
}

const menuItems: MenuItem[] = [
  { name: 'Kontrol Paneli', href: ROUTES.HOME, icon: LayoutDashboard, group: '' },
  { name: 'Üretim Takibi', href: ROUTES.PRODUCTION, icon: Factory, group: 'OPERASYON' },
  { name: 'Stok Yönetimi', href: ROUTES.INVENTORY, icon: Package, group: 'OPERASYON' },
  { name: 'Sipariş Yönetimi', href: ROUTES.ORDERS, icon: ShoppingCart, group: 'SATIŞ' },
  { name: 'Cari Hesaplar', href: ROUTES.ACCOUNTS, icon: Users, group: 'FİNANS' },
  { name: 'Muhasebe', href: '/accounting', icon: Landmark, group: 'FİNANS' },
  { name: 'Raporlar', href: ROUTES.REPORTS, icon: BarChart3, group: 'ANALİZ' },
  { name: 'Sistem Ayarları', href: ROUTES.SETTINGS, icon: Settings, group: 'SİSTEM' },
]

export function AgiHUD_Logo({ className = '', height = '32' }) {
  return (
    <svg width="auto" height={height} viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M10 30L20 10L30 30M15 25H25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="40" y="28" fill="currentColor" style={{ font: 'bold 24px Outfit, sans-serif', letterSpacing: '-1px' }}>AGI-HUD</text>
    </svg>
  )
}

export function AgiHUD_LogoWithBackground() {
  return (
    <div className="fixed top-6 left-6 z-[60] pointer-events-none">
      <div className="p-3 glass rounded-2xl border border-white/10 shadow-2xl animate-reveal">
        <AgiHUD_Logo height="24" className="text-primary" />
      </div>
    </div>
  )
}

export function AgiHUD_LogoWithPulse({ className = "" }) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
      <AgiHUD_Logo height="32" className="relative z-10 text-primary" />
    </div>
  )
}

export function AgiHUD_Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [settings, setSettings] = useState<any>(null)
  
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    // Initial fetch of system settings and notifications
    secureFetchApi('/api/system/settings').then(setSettings).catch(() => {})
    
    const fetchNotifications = () => {
      secureFetchApi('/api/notifications').then((list: any) => {
        if (Array.isArray(list)) {
          setNotifications(list)
          setUnreadCount(list.filter((n: any) => !n.read).length)
        }
      }).catch(() => {})
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (id: string) => {
    await secureFetchApi(`/api/notifications/${id}/read`, { method: 'POST' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const buildMenuGroups = (items: MenuItem[]) => {
    const groups: Record<string, MenuItem[]> = {}
    items.forEach(item => {
      const groupName = item.group || ''
      if (!groups[groupName]) groups[groupName] = []
      groups[groupName].push(item)
    })
    return groups
  }

  return (
    <>
      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <NotificationDrawer 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
        notifications={notifications}
        onRead={markAsRead}
      />

      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full flex flex-col bg-[var(--background)] border-r border-[var(--border)] transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-[var(--border)]">
          <Link href="/" className="flex items-center gap-2 overflow-hidden truncate">
            <AgiHUD_Logo height="24" className="shrink-0 text-primary" />
            {!collapsed && (
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">{settings?.company_name || 'LIVASOFA'}</span>
                <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-black">Platinum Core</span>
              </div>
            )}
          </Link>
        </div>

        {/* User */}
        <div className={cn("p-3 border-b border-[var(--border)] flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-[11px] font-bold text-white truncate tracking-tight">{user?.full_name || user?.username}</p>
              <span className="block text-[9px] text-primary/80 uppercase tracking-widest font-black line-clamp-1">{user?.role || 'Kullanıcı'}</span>
            </div>
          )}
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 py-4">
             <button 
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
             >
               <div className="flex items-center gap-2">
                 <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary" />
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hızlı Ara</span>
               </div>
               <span className="text-[9px] font-black text-slate-600">⌘K</span>
             </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6 scrollbar-none">
          {Object.entries(buildMenuGroups(menuItems)).map(([group, items]) => (
            <div key={group || 'Main'} className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-1 text-[9px] font-black text-gray-600 uppercase tracking-widest">
                  {group || 'Genel'}
                </div>
              )}
              {items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={agiAudio.playClick}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-200")} />
                    {!collapsed && <span className="font-bold text-[13px] tracking-tight truncate">{item.name}</span>}
                    {isActive && <div className="absolute left-0 w-1 h-5 bg-primary rounded-full" />}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] space-y-2">
           {!collapsed && (
              <div className="flex items-center justify-between gap-1 p-1 bg-white/5 rounded-lg">
                <button className="flex-1 p-1 rounded bg-slate-800 text-white shadow"><Sun className="w-3 h-3 mx-auto" /></button>
                <button className="flex-1 p-1 rounded text-slate-500 hover:text-white"><Moon className="w-3 h-3 mx-auto" /></button>
              </div>
           )}
           <div className="flex items-center justify-between">
              <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white">
                {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
              <div className="relative">
                <button onClick={() => setIsNotificationsOpen(true)} className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border border-slate-950" />
                  )}
                </button>
              </div>
              {!collapsed && (
                <button onClick={logout} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              )}
           </div>
        </div>
      </aside>
    </>
  )
}

export default AgiHUD_Sidebar
