'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { safeFetch } from '@/lib/api/fetch'

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
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const ref = useRef<HTMLDivElement>(null)

    const load = useCallback(async () => {
        const [notifData, countData] = await Promise.all([
            safeFetch<Notification[]>('/api/notifications?limit=10'),
            safeFetch<{ count: number }>('/api/notifications/unread-count'),
        ])
        setNotifications(Array.isArray(notifData) ? notifData : [])
        setUnreadCount(countData?.count || 0)
    }, [])

    useEffect(() => { load() }, [load])
    useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t) }, [load]) // 30s refresh

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
        setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: 1 } : n))
        setUnreadCount(c => Math.max(0, c - 1))
    }

    const markAllRead = async () => {
        await safeFetch('/api/notifications', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mark_all_read: true })
        })
        setNotifications(ns => ns.map(n => ({ ...n, is_read: 1 })))
        setUnreadCount(0)
    }

    const timeAgo = (d: string) => {
        const diff = (Date.now() - new Date(d).getTime()) / 1000
        if (diff < 60) return 'Az önce'
        if (diff < 3600) return `${Math.floor(diff / 60)} dk`
        if (diff < 86400) return `${Math.floor(diff / 3600)} saat`
        return `${Math.floor(diff / 86400)} gün`
    }

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
                    <div className="max-h-80 overflow-y-auto">
                        {Array.isArray(notifications) && notifications.length === 0 ? (
                            <div className="py-8 text-center text-gray-500 text-sm">Bildirim yok</div>
                        ) : Array.isArray(notifications) ? notifications.map((n, i) => {
                            if (!n || typeof n !== 'object') return null;
                            const typeKey = (n.type && typeof n.type === 'string' && n.type in TYPE_CONFIG) ? n.type as keyof typeof TYPE_CONFIG : 'info';
                            const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.info;
                            const Icon = config.icon || Info;
                            return (
                                <div
                                    key={n.id || `notif-${i}`}
                                    className={`px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors cursor-pointer ${!n.is_read ? 'bg-gray-800/20' : ''}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!n.is_read && n.id) markRead(n.id)
                                        if (n.link) { window.location.href = n.link; setOpen(false) }
                                    }}
                                >
                                    <div className="flex gap-3">
                                        <div className={`${config.bg} p-1.5 rounded-lg h-fit`}>
                                            <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-medium ${!n.is_read ? 'text-white' : 'text-gray-300'}`}>{n.title || 'Bildirim'}</span>
                                                {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />}
                                            </div>
                                            {n.message && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>}
                                            <span className="text-[10px] text-gray-600 mt-1 block">{n.created_at ? timeAgo(n.created_at) : 'Bilinmeyen zaman'}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        }) : null}
                    </div>

                    {/* Footer */}
                    <Link href="/notifications" onClick={() => setOpen(false)} className="block text-center py-2.5 text-xs text-blue-400 hover:text-blue-300 border-t border-gray-800 hover:bg-gray-800/30 transition">
                        Tümünü Gör →
                    </Link>
                </div>
            )}
        </div>
    )
}
