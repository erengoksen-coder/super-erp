'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, Command, FileText, Package, Factory, 
  Users, ShoppingCart, Settings, Plus, Star, 
  History, Sparkles, X, ChevronRight, Zap
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
  { id: 'a1', name: 'Yeni Üretim Emri', href: `${ROUTES.PRODUCTION}/new`, icon: Plus, category: 'Actions', description: 'Hızlı üretim başlat' },
  { id: 'a2', name: 'Yeni Stok Girişi', href: `${ROUTES.INVENTORY}`, icon: Package, category: 'Actions', description: 'Gelen hammadde kaydet' },
  { id: 'a3', name: 'Yeni Fatura', href: `${ROUTES.INVOICES}/new`, icon: FileText, category: 'Actions', description: 'Hızlı fatura kes' },
  
  // AI Commands
  { id: 'ai1', name: 'AI Stok Analizi', href: '/inventory', icon: Sparkles, category: 'AI', description: 'Yapay zeka ile stok tahmini yap' },
  { id: 'ai2', name: 'Verimlilik Raporu Sor', href: ROUTES.HOME, icon: Zap, category: 'AI', description: 'Üretim darboğazlarını sor' },
]

import { LayoutDashboard, BarChart3 } from 'lucide-react'

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredCommands = useMemo(() => {
    if (!search.trim()) return COMMANDS
    const term = search.toLowerCase()
    return COMMANDS.filter(cmd => 
      cmd.name.toLowerCase().includes(term) || 
      cmd.category.toLowerCase().includes(term) ||
      cmd.description?.toLowerCase().includes(term)
    )
  }, [search])

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
      if (filteredCommands[selectedIndex]) {
        router.push(filteredCommands[selectedIndex].href)
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
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl mx-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden glass"
          >
            <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Command className="w-5 h-5 text-primary" />
              </div>
              <input
                autoFocus
                placeholder="Her şeyi ara: Sayfalar, işlemler, analizler..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg text-[var(--foreground)] placeholder:text-gray-600 outline-none"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/10 border border-[var(--border)]">
                <span className="text-[10px] font-bold text-gray-500">ESC</span>
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
                      const Icon = cmd.icon

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

            <div className="p-4 border-t border-[var(--border)] bg-slate-800/5 flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] text-gray-500 font-medium">
                <span className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> Seç</span>
                <span className="flex items-center gap-1.5"><Command className="w-3 h-3" /> Git</span>
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Super ERP v4.5 Platinum</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
