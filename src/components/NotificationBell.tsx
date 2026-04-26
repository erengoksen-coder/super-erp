'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle, Clock } from 'lucide-react'
// import Link removed as unused
import { useRouter } from 'next/navigation'
import { safeFetch } from '@/lib/api/fetch'
import { useApi } from '@/lib/api/client'
import { cn } from '@/lib/cn'

type Notification = {
    id: string; title: string; message: string | null
    type: 'info' | 'warning' | 'success' | 'error'
    is_read: number; link: string | null; created_at: string
}

const TYPE_CONFIG = {
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-900/20' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
    success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/20' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/20' },
}

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const ref = useRef<HTMLDivElement>(null)

    // SWR ile verileri çek (Otomatik revalidation ve deduping)
    const { data: notifications = [], mutate: mutateList, isLoading } = useApi<Notification[]>('/api/notifications?limit=10', {
        refreshInterval: 30000 // 30s bir tazele
    })
    const { data: unreadData, mutate: mutateCount } = useApi<{ count: number }>('/api/notifications/unread-count', {
        refreshInterval: 30000
    })

    const unreadCount = unreadData?.count || 0

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])


    const markRead = async (id: string) => {
        await safeFetch('/api/notifications', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        })
        // SWR Cache'ini güncelle
        mutateList()
        mutateCount()
    }

    const markAllRead = async () => {
        await safeFetch('/api/notifications', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mark_all_read: true })
        })
        // SWR Cache'ini güncelle
        mutateList()
        mutateCount()
    }

    const [now, setNow] = useState(() => 0)
    useEffect(() => {
        setNow(Date.now())
        const t = setInterval(() => setNow(Date.now()), 60000)
        return () => clearInterval(t)
    }, [])
    const timeAgoLabels = useMemo(() => {
        if (!now) return new Map<string, string>()
        return new Map(notifications.map(n => {
            const diff = (now - new Date(n.created_at).getTime()) / 1000
            const label = diff < 60 ? 'Az önce' : diff < 3600 ? `${Math.floor(diff / 60)} dk` : diff < 86400 ? `${Math.floor(diff / 3600)} saat` : `${Math.floor(diff / 86400)} gün`
            return [n.id, label] as const
        }))
    }, [notifications, now])

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/50 shadow-md shadow-amber-500/10 transition-all"
                title="Bildirimler"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center min-w-[18px] px-1 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">Bildirimler</span>
                            {unreadCount > 0 && <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                        </div>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                <CheckCheck className="w-3 h-3" />Tümünü Oku
                            </button>
                        )}
                    </div>

                    {/* Notification list */}
                    <div className="max-h-96 overflow-y-auto bg-slate-900/80 min-h-[120px] scrollbar-thin scrollbar-thumb-white/10">
                        {isLoading && notifications.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center gap-4">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin" />
                                    <Bell className="absolute inset-0 m-auto w-4 h-4 text-blue-500/40" />
                                </div>
                                <span className="text-xs text-slate-400 font-black uppercase tracking-widest animate-pulse">Güncelleniyor...</span>
                            </div>
                        ) : (!notifications || notifications.length === 0) ? (
                            <div className="py-16 flex flex-col items-center justify-center gap-4 text-slate-500">
                                <div className="p-4 rounded-3xl bg-slate-800/30 border border-slate-700/30 shadow-inner">
                                    <Bell className="w-8 h-8 opacity-10" />
                                </div>
                                <div className="flex flex-col items-center px-6 text-center">
                                    <p className="text-sm font-black text-slate-300 uppercase tracking-tight">Yeni Bildirim Yok</p>
                                    <p className="text-[11px] text-slate-500 mt-2 font-medium leading-relaxed">Sistem şu an güncel. Yeni bir gelişme olduğunda sizi buradan bilgilendireceğiz.</p>
                                </div>
                            </div>
                        ) : notifications.map((n: Notification, i: number) => {
                            if (!n) return null;
                            const typeKey = (n.type && typeof n.type === 'string' && n.type in TYPE_CONFIG) ? n.type as keyof typeof TYPE_CONFIG : 'info';
                            const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.info;
                            const Icon = config.icon || Info;
                            const isUnread = n.is_read === 0 || !n.is_read;

                            return (
                                <div
                                    key={n.id || `notif-${i}`}
                                    className={cn(
                                        "group px-5 py-4 border-b border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer relative overflow-hidden",
                                        isUnread ? "bg-blue-600/10" : "opacity-80"
                                    )}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        
                                        // Okundu işaretleme işlemini arka planda yap (yönlendirmeyi engellememesi için)
                                        if (isUnread && n.id) {
                                            markRead(n.id).catch(console.error);
                                        }
                                        
                                        if (n.link) {
                                            router.push(n.link);
                                            setOpen(false);
                                        }
                                    }}
                                >
                                    {isUnread && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 shadow-[2px_0_15px_rgba(59,130,246,0.8)]" />
                                    )}
                                    <div className="flex gap-4">
                                        <div className={cn(
                                            "p-2.5 rounded-xl h-fit border shadow-sm transition-transform group-hover:scale-110",
                                            config.bg,
                                            "border-white/10"
                                        )}>
                                            <Icon className={cn("w-4 h-4", config.color)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={cn(
                                                    "text-[14px] font-black tracking-tight leading-none",
                                                    isUnread ? "text-white" : "text-slate-400"
                                                )}>
                                                    {n.title || 'Sistem Mesajı'}
                                                </span>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Clock className="w-3 h-3 text-slate-600" />
                                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                                                        {timeAgoLabels.get(n.id) || 'Az önce'}
                                                    </span>
                                                </div>
                                            </div>
                                            {(n.message || n.title) && (
                                                <p className={cn(
                                                    "text-[12px] mt-2 line-clamp-2 leading-relaxed font-semibold transition-colors",
                                                    isUnread ? "text-slate-200" : "text-slate-500"
                                                )}>
                                                    {n.message || n.title}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Footer */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                            router.push('/notifications');
                        }}
                        className="block text-center py-2.5 text-xs text-blue-400 hover:text-blue-300 border-t border-gray-800 hover:bg-gray-800/30 transition"
                    >
                        Tümünü Gör →
                    </button>
                </div>
            )}
        </div>
    )
}
