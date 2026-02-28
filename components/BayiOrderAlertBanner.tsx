import { useState, useEffect, useCallback } from 'react'
import { safeFetch } from '@/lib/api/fetch'
import { useAuthStore } from '@/lib/store/authStore'
import { Package, Bell, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

type Notif = { id: string; title: string; message: string; type?: string; read?: number }

const POLL_MS = 15_000
const MAX_VISIBLE = 3

function shouldShowBanner(role: string | undefined, position: string | undefined): boolean {
  const r = (role ?? '').toString().trim().toLowerCase()
  const p = (position ?? '').toString().trim().toLowerCase()
  if (r === 'bayi') return false
  if (r === 'admin' || r === 'yönetici' || r === 'yonetici') return true
  if (p === 'planlama') return true
  return false
}

export default function BayiOrderAlertBanner() {
  const user = useAuthStore((s) => s.user)
  const pathname = usePathname()
  const [alerts, setAlerts] = useState<Notif[]>([])
  const [isDismissingAll, setIsDismissingAll] = useState(false)

  const fetchUnread = useCallback(async () => {
    if (!user?.id) return
    try {
      const res: any = await safeFetch('/api/notifications?unread_only=true&limit=50')
      // Yeni API formatı: { success: true, data: [...] } veya direkt [...]
      const list = Array.isArray(res) ? res : (res?.data || [])
      if (!Array.isArray(list)) return

      const unread = list.filter((n: any) =>
        (n.type === 'bayi_order' || n.title?.includes('Bayi Siparişi')) &&
        (n.read === 0 || !n.read)
      )
      setAlerts(unread)
    } catch {
      // ignore
    }
  }, [user?.id])

  useEffect(() => {
    if (!user || !shouldShowBanner(user.role ?? undefined, user.position ?? undefined)) return
    fetchUnread()
    const t = setInterval(fetchUnread, POLL_MS)
    return () => clearInterval(t)
  }, [user?.id, user?.role, user?.position, fetchUnread])

  const handleTamam = async (id: string) => {
    try {
      await safeFetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    } catch { }
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const handleTamamAll = async () => {
    setIsDismissingAll(true)
    try {
      // API'de mark_all_read desteği var
      await safeFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true })
      })
      setAlerts([])
    } catch (e) {
      // Hata olsa bile listeden temizle (UI akışı için)
      setAlerts([])
    } finally {
      setIsDismissingAll(false)
    }
  }

  // Ana ekranda (Dashboard) veya login/register'da gösterme
  const isExcludedPath = pathname === '/' || pathname === '/dashboard' || pathname?.startsWith('/auth')

  if (!user || isExcludedPath || !shouldShowBanner(user.role ?? undefined, user.position ?? undefined) || alerts.length === 0) return null

  const visibleAlerts = alerts.slice(0, MAX_VISIBLE)
  const remainingCount = alerts.length - MAX_VISIBLE

  return (
    <div className="space-y-2 mb-6 animate-in slide-in-from-top duration-500">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Bell className="w-3 h-3" />
          Bekleyen Önemli İşlemler ({alerts.length})
        </h3>
        {alerts.length > 1 && (
          <button
            onClick={handleTamamAll}
            disabled={isDismissingAll}
            className="text-[10px] font-bold text-slate-500 hover:text-white flex items-center gap-1 transition-colors uppercase tracking-tight"
          >
            {isDismissingAll ? 'Kapatılıyor...' : 'Tümünü Kapat'}
            <CheckCircle2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {visibleAlerts.map((n) => {
          const isPR = (n.type === 'purchase_request' || (n.title || '').includes('Satın Alma Talebi'))

          return (
            <div
              key={n.id}
              className={cn(
                "group relative flex items-center gap-4 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md transition-all",
                isPR
                  ? "border-red-500/30 bg-gradient-to-r from-red-500/10 to-transparent text-red-100 hover:border-red-500/50 hover:from-red-500/20 shadow-red-500/5"
                  : "border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent text-amber-100 hover:border-amber-500/40 hover:from-amber-500/20 shadow-amber-500/5"
              )}
            >
              <div className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full group-hover:scale-110 transition-transform",
                isPR ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
              )}>
                {isPR ? <AlertTriangle className="w-5 h-5" /> : <Package className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "font-bold text-[14px]",
                    isPR ? "text-red-50" : "text-amber-50"
                  )}>{n.title}</p>
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full animate-pulse",
                    isPR ? "bg-red-500" : "bg-amber-500"
                  )} />
                </div>
                <p className={cn(
                  "text-sm mt-0.5 truncate",
                  isPR ? "text-red-200/80" : "text-amber-200/80"
                )}>{n.message}</p>
              </div>

              <button
                type="button"
                onClick={() => handleTamam(n.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all border",
                  isPR
                    ? "bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white border-red-500/30"
                    : "bg-amber-600/20 hover:bg-amber-600 text-amber-200 hover:text-white border-amber-500/30"
                )}
              >
                Tamam
              </button>
            </div>
          )
        })}
      </div>

      {remainingCount > 0 && (
        <div className="text-center py-1">
          <p className="text-[11px] text-slate-500/60 font-medium">
            ...ve {remainingCount} önemli işlem daha onay bekliyor.
          </p>
        </div>
      )}
    </div>
  )
}
