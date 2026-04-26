'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, Command, FileText, Package, Factory, 
  Users, ShoppingCart, Settings, Plus, Star, 
  History, Sparkles, X, ChevronRight, Zap,
  LayoutDashboard, BarChart3, Bot, LogOut
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { ROUTES } from '@/lib/constants'

interface CommandItem {
  id: string
  name: string
  href: string
  icon: any
  category: 'Pages' | 'Actions' | 'AI'
  description?: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

const COMMANDS: CommandItem[] = [
  // Pages
  { id: '1', name: 'Kontrol Paneli', href: ROUTES.HOME, icon: LayoutDashboard, category: 'Pages' },
  { id: '2', name: 'Üretim Emirleri', href: ROUTES.PRODUCTION, icon: Factory, category: 'Pages' },
  { id: '3', name: 'Stok Yönetimi', href: ROUTES.INVENTORY, icon: Package, category: 'Pages' },
  { id: '4', name: 'Siparişler', href: ROUTES.ORDERS, icon: ShoppingCart, category: 'Pages' },
  { id: '5', name: 'Cari Hesaplar', href: ROUTES.ACCOUNTS, icon: Users, category: 'Pages' },
  { id: '6', name: 'Raporlar', href: ROUTES.REPORTS, icon: BarChart3, category: 'Pages' },
  
  // Actions
  { id: 'a1', name: 'Yeni Sipariş Oluştur', href: `${ROUTES.ORDERS}/new`, icon: Plus, category: 'Actions', description: 'Hızlı sipariş portalını aç' },
  { id: 'a2', name: 'Yeni Üretim Başlat', href: `${ROUTES.PRODUCTION}/new`, icon: Factory, category: 'Actions', description: 'Üretim emri girişi yap' },
  { id: 'a3', name: 'Hammadde Girişi', href: `${ROUTES.INVENTORY}/materials`, icon: Package, category: 'Actions', description: 'Depo stok kaydı oluştur' },
  { id: 'a4', name: 'Sistemi Kilitle / Çıkış', href: '#logout', icon: X, category: 'Actions', description: 'Oturumu güvenli şekilde kapat' },
  
  // AI Commands
  { id: 'ai1', name: 'AI Stok Analizi', href: '/inventory', icon: Sparkles, category: 'AI', description: 'Yapay zeka ile stok tahmini yap' },
  { id: 'ai2', name: 'Verimlilik Raporu Sor', href: ROUTES.HOME, icon: Zap, category: 'AI', description: 'Üretim darboğazlarını sor' },
  { id: 'ai3', name: 'Akıllı Asistanı Aç', href: '#ai', icon: Bot, category: 'AI', description: 'Copilot ile konuşmaya başla' },
]


export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dynamicResults, setDynamicResults] = useState<CommandItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Dynamic Search Effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length >= 2) {
        setIsLoading(true)
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`)
          const data = await res.json()
          if (data.data) {
            // Map icons based on category if needed, for simplicity we trust the API result
            setDynamicResults(data.data)
          }
        } catch (e) {
          console.error('Search error:', e)
        } finally {
          setIsLoading(false)
        }
      } else {
        setDynamicResults([])
      }
    }, 300) // Debounce

    return () => clearTimeout(timer)
  }, [search])

  const filteredCommands = useMemo(() => {
    // Static commands filtering
    const term = search.toLowerCase()
    const staticMatches = COMMANDS.filter(cmd => 
      cmd.name.toLowerCase().includes(term) || 
      cmd.category.toLowerCase().includes(term) ||
      cmd.description?.toLowerCase().includes(term)
    )

    // Combine with dynamic results
    return [...dynamicResults, ...staticMatches]
  }, [search, dynamicResults])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = filteredCommands[selectedIndex]
      if (cmd) {
        if (cmd.href === '#logout') {
          import('@/lib/auth').then(mod => mod.logout())
        } else if (cmd.href === '#ai') {
          // Trigger AI via global event or store if needed, for now just close
          onClose()
        } else {
          router.push(cmd.href)
        }
        onClose()
      }
    }
  }, [isOpen, filteredCommands, selectedIndex, router, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[15vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="relative w-full max-w-2xl mx-4 bg-[#030712] border border-white/5 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-3xl"
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-glow-sm">
                <Command className="w-5 h-5 text-primary" />
              </div>
              <input
                autoFocus
                placeholder="Zenith'te her şeyi ara: Ürün, Cari, Sipariş veya İşlem..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-black text-white placeholder:text-white/10 outline-none uppercase tracking-tighter"
              />
              {isLoading && (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">ESC</span>
              </div>
            </div>


            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
              {['AI', 'Actions', 'Pages'].map((cat) => {
                const categoryDocs = filteredCommands.filter(c => c.category === cat)
                if (categoryDocs.length === 0) return null

                return (
                  <div key={cat} className="space-y-1">
                    <h4 className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{cat}</h4>
                    {categoryDocs.map((cmd) => {
                      const isSelected = filteredCommands[selectedIndex]?.id === cmd.id
                      const Icon = typeof cmd.icon === 'string' ? 
                        (cmd.icon === 'Package' ? Package : 
                         cmd.icon === 'Users' ? Users : 
                         cmd.icon === 'Factory' ? Factory : Search) : cmd.icon

                      return (
                        <div
                          key={cmd.id}
                          className={cn(
                            "flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
                            isSelected ? "bg-primary text-white shadow-lg scale-[1.02]" : "hover:bg-primary/10 text-gray-400"
                          )}
                          onClick={() => {
                            router.push(cmd.href)
                            onClose()
                          }}
                        >
                          <div className={cn(
                            "p-2 rounded-lg",
                            isSelected ? "bg-white/20" : "bg-primary/5"
                          )}>
                            <Icon className={cn("w-5 h-5", isSelected ? "text-white" : "text-primary")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-bold truncate", isSelected ? "text-white" : "text-[var(--foreground)]")}>
                              {cmd.name}
                            </p>
                            {cmd.description && (
                              <p className={cn("text-[10px] truncate", isSelected ? "text-white/70" : "text-gray-500")}>
                                {cmd.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight className={cn("w-4 h-4 opacity-50", isSelected ? "text-white" : "text-gray-500")} />
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {filteredCommands.length === 0 && (
                <div className="py-12 text-center space-y-3 opacity-40">
                  <Search className="w-12 h-12 mx-auto stroke-1" />
                  <p className="text-sm font-medium">Bulunamadı...</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
              <div className="flex items-center gap-6 text-[9px] text-white/20 font-black uppercase tracking-[0.2em]">
                <span className="flex items-center gap-2 group cursor-default">
                  <div className="w-4 h-4 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[8px] group-hover:border-primary/50 group-hover:text-primary transition-all">↵</div> 
                  Seç
                </span>
                <span className="flex items-center gap-2 group cursor-default">
                  <div className="w-4 h-4 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[8px] group-hover:border-primary/50 group-hover:text-primary transition-all">↑↓</div> 
                  Gezin
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                <p className="text-[9px] text-white/10 uppercase tracking-[0.3em] font-black italic">Zenith Business OS v4.5</p>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
