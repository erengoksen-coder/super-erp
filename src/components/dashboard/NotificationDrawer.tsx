'use client'

import { useEffect, useState } from 'react'
import { X, Bell, Package, AlertTriangle, Factory, Clock, CheckCircle2, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { fetchApi } from '@/lib/api/client'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  created_at: string
  read: boolean
}

interface NotificationDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  async function loadNotifications() {
    try {
      setLoading(true)
      const data = await fetchApi<Notification[]>('/api/notifications')
      setNotifications(data || [])
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetchApi(`/api/notifications/${id}/read`, { method: 'POST' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (error) {
      console.error('Bildirim işaretlenemedi:', error)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'error': return <X className="w-5 h-5 text-rose-500" />
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      default: return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--background)] border-l border-[var(--border)] shadow-2xl z-[101] flex flex-col glass"
          >
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">Bildirim Merkezi</h2>
                  <p className="text-xs text-gray-500">Sistem uyarıları ve aktiviteler</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-slate-800/10 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((n) => (
                  <motion.div 
                    layout
                    key={n.id} 
                    className={cn(
                      "p-4 rounded-xl border transition-all animate-reveal",
                      n.read 
                        ? "bg-slate-800/5 border-[var(--border)]" 
                        : "bg-primary/5 border-primary/20 shadow-sm"
                    )}
                  >
                    <div className="flex gap-4">
                      <div className="shrink-0 mt-1">
                        {getTypeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-sm text-[var(--foreground)] truncate">{n.title}</h3>
                          <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                            {new Date(n.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{n.message}</p>
                        {!n.read && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => markAsRead(n.id)}
                            className="h-7 text-[10px] px-2 hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            Okundu İşaretle
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-40">
                  <Bell className="w-16 h-16 mb-4 stroke-1" />
                  <p className="text-sm font-medium">Hiç bildirim yok</p>
                  <p className="text-xs">Harika! Her şey yolunda görünüyor.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-slate-800/5">
              <Button variant="outline" className="w-full text-xs h-10 glass" onClick={onClose}>
                Tümünü Temizle
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
