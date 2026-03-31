'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  Plus, 
  FileText, 
  Factory, 
  BarChart3, 
  X,
  Command,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity,
  Wallet,
  Sparkles
} from 'lucide-react'
import { toast } from '@/lib/notify'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useUIStore } from '@/lib/store/uiStore'
import { useAuthStore } from '@/lib/store/authStore'
import { isAdminRole, canAccessPath } from '@/lib/auth/permissions-check'
import { ROUTES } from '@/lib/constants'

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: any
  shortcut?: string[]
  action: () => void
  category: 'Navigator' | 'Eylemler' | 'Raporlar'
}

export function CommandPalette() {
  const router = useRouter()
  const { commandPaletteOpen: isOpen, setCommandPaletteOpen: setIsOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const user = useAuthStore((s) => s.user)
  const isAdmin = isAdminRole(user?.role)
  const isBayi = (user?.role || '').toLowerCase().trim() === 'bayi'
  const permissions = user?.permissions ?? []

  const items: CommandItem[] = useMemo(() => {
    const allItems: CommandItem[] = [
      {
        id: 'home',
        title: 'Ana Sayfa',
        subtitle: 'Dashboard ve genel durum',
        icon: Home,
        category: 'Navigator',
        action: () => router.push(isBayi ? '/bayi/dashboard' : ROUTES.DASHBOARD),
      },
      {
        id: 'orders',
        title: 'Siparişler',
        subtitle: 'Satış ve sipariş yönetimi',
        icon: ShoppingCart,
        category: 'Navigator',
        action: () => router.push(isBayi ? '/bayi/orders' : ROUTES.ORDERS),
      },
      {
        id: 'inventory',
        title: 'Stok Yönetimi',
        subtitle: 'Ürün ve malzeme listesi',
        icon: Package,
        category: 'Navigator',
        action: () => router.push(ROUTES.INVENTORY),
      },
      {
        id: 'production',
        title: 'Üretim Takibi',
        subtitle: 'Canlı istasyonlar ve iş emirleri',
        icon: Factory,
        category: 'Navigator',
        action: () => router.push(ROUTES.PRODUCTION),
      },
      {
        id: 'create-order',
        title: 'Yeni Sipariş Oluştur',
        subtitle: 'Hızlıca yeni bir satış emri girin',
        icon: Plus,
        category: 'Eylemler',
        action: () => router.push(isBayi ? '/orders/new' : `${ROUTES.ORDERS}/new`),
      },
      {
        id: 'reports',
        title: 'Analitik Raporlar',
        subtitle: 'Finansal ve operasyonel veriler',
        icon: BarChart3,
        category: 'Raporlar',
        action: () => router.push(ROUTES.REPORTS),
      },
      {
        id: 'settings',
        title: 'Sistem Ayarları',
        subtitle: 'Kullanıcı ve API yapılandırması',
        icon: Settings,
        category: 'Navigator',
        action: () => router.push(ROUTES.SETTINGS),
      },
      {
        id: 'users',
        title: 'Ekip Yönetimi',
        subtitle: 'Kullanıcılar ve yetkiler',
        icon: Users,
        category: 'Navigator',
        action: () => router.push(ROUTES.USERS),
      },
      {
        id: 'account',
        title: 'Cari Hesabım',
        subtitle: 'Bakiye ve ekstre görüntüle',
        icon: Wallet,
        category: 'Navigator',
        action: () => router.push('/bayi/account'),
      },
      {
        id: 'webhooks',
        title: 'Webhook Entegrasyonu',
        subtitle: 'Canlı veri akışı ayarları',
        icon: Zap,
        category: 'Eylemler',
        action: () => router.push('/api-catalog'),
      },
      {
        id: 'new-account',
        title: 'Yeni Cari Hesap Ekle',
        subtitle: 'Müşteri veya tedarikçi kartı aç',
        icon: Plus,
        category: 'Eylemler',
        action: () => router.push('/accounts/new'),
      },
      {
        id: 'production-status',
        title: 'Üretim Bandı Durumu',
        subtitle: 'İstasyonlardaki yoğunluğu gör',
        icon: Activity,
        category: 'Navigator',
        action: () => router.push('/production'),
      },
      {
        id: 'ai-chat',
        title: 'AI Danışman Furki',
        subtitle: 'Soru sormak için Furki\'yi aç',
        icon: Sparkles,
        category: 'Eylemler',
        action: () => {
          // Trigger global AI state if available, or just navigate
          toast.info('Furki AI aktif ediliyor...');
        },
      },
    ]

    // RBAC Filtering Logic
    if (isAdmin) return allItems
    
    if (isBayi) {
      const allowedIds = ['home', 'orders', 'create-order', 'account']
      return allItems.filter(item => allowedIds.includes(item.id))
    }

    // Regular users: filter by path permissions
    return allItems.filter(item => {
        // Special case for static actions that might not have direct paths
        if (item.id === 'home') return true
        
        const pathToCheck = item.id === 'create-order' ? ROUTES.ORDERS : (item.id === 'webhooks' ? '/api' : ''); 
        // Simple heuristic: if path is in ROUTES, use it, otherwise use a default or mapped one
        const matchedRoute = Object.values(ROUTES).find(r => item.action.toString().includes(r))
        
        return matchedRoute ? canAccessPath(permissions, matchedRoute, 'view') : false
    })
  }, [router, isAdmin, isBayi, permissions])

  const filteredItems = useMemo(() => {
    if (!query) return items
    const q = query.toLowerCase()
    
    // Agi-Commander: Smart mapping
    // If query contains "yeni", prioritize "Eylemler"
    const priorityCategory = q.includes('yeni') || q.includes('ekle') || q.includes('aç') ? 'Eylemler' : null

    return [...items].sort((a, b) => {
      if (priorityCategory) {
        if (a.category === priorityCategory && b.category !== priorityCategory) return -1
        if (a.category !== priorityCategory && b.category === priorityCategory) return 1
      }
      return 0
    }).filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.subtitle?.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    )
  }, [query, items])

  const categories = useMemo(() => {
    const cats: string[] = []
    filteredItems.forEach(item => {
      if (!cats.includes(item.category)) cats.push(item.category)
    })
    return cats
  }, [filteredItems])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setIsOpen(!isOpen)
    }
    if (e.key === 'Escape') setIsOpen(false)
    
    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(prev => (prev + 1) % filteredItems.length)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length)
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredItems[activeIndex]) {
          filteredItems[activeIndex].action()
          setIsOpen(false)
        }
      }
    }
  }, [isOpen, filteredItems, activeIndex, setIsOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0)
      setQuery('')
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-[#0a0a0c] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden glass"
          >
            {/* Search Header */}
            <div className="flex items-center px-6 border-b border-white/5 bg-white/[0.02]">
              <Search className="w-5 h-5 text-primary drop-shadow-glow" />
              <input
                autoFocus
                placeholder="Ne arıyorsunuz? (Sayfa, eylem, kısayol...)"
                className="flex-1 h-16 bg-transparent border-none focus:ring-0 text-white placeholder-white/20 text-sm font-medium"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsOpen(false)}>
                <span className="text-[10px] uppercase font-black tracking-widest text-white/20 group-hover:text-error transition-colors">KAPAT</span>
                <div className="p-1 px-2 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-white/40">ESC</div>
              </div>
            </div>

            {/* Results Section */}
            <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="py-20 text-center space-y-4 opacity-40">
                    <div className="flex justify-center"><X className="w-12 h-12 text-error" /></div>
                    <p className="text-xs font-black uppercase tracking-widest italic">Arama sonucu bulunamadı.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {categories.map(cat => (
                    <div key={cat} className="space-y-2">
                      <div className="flex items-center gap-3 px-3">
                         <div className="h-px bg-white/5 flex-1" />
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 italic">{cat}</span>
                         <div className="h-px bg-white/5 flex-1" />
                      </div>
                      <div className="grid gap-1">
                        {filteredItems.filter(i => i.category === cat).map((item, idx) => {
                          const globalIdx = filteredItems.indexOf(item)
                          const isActive = activeIndex === globalIdx
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                item.action()
                                setIsOpen(false)
                              }}
                              onMouseEnter={() => setActiveIndex(globalIdx)}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer group relative",
                                isActive ? "bg-primary/20 border-primary/20 shadow-glow shadow-primary/10" : "bg-transparent border-transparent hover:bg-white/[0.03]"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "p-3 rounded-xl transition-all",
                                  isActive ? "bg-primary text-white scale-110 shadow-glow" : "bg-white/5 text-white/40 group-hover:bg-white/10"
                                )}>
                                  <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className={cn("text-sm font-black uppercase tracking-tight italic transition-colors", isActive ? "text-white" : "text-white/60")}>{item.title}</h4>
                                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter italic">{item.subtitle}</p>
                                </div>
                              </div>
                              <ArrowRight className={cn("w-4 h-4 transition-all", isActive ? "opacity-100 translate-x-0 text-primary" : "opacity-0 -translate-x-2")} />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 px-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between gap-6">
               <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2">
                       <div className="p-1 px-1.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-white/40">↑↓</div>
                       <span className="text-[9px] font-black uppercase tracking-widest text-white/20">NAVİGASYON</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <div className="p-1 px-1.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-white/40">ENTER</div>
                       <span className="text-[9px] font-black uppercase tracking-widest text-white/20">SEÇ</span>
                   </div>
               </div>
               
               <div className="flex items-center gap-2 text-primary/40 text-[9px] font-black uppercase tracking-widest italic">
                   <Activity className="w-3 h-3" /> PREMİUM NAViGASYON AKTİF
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
