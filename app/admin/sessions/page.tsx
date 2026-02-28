'use client'

import { useState, useEffect } from 'react'
import { Monitor, Smartphone, Globe, LogOut, Shield } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'

interface Session {
    id: string
    user_id: string
    user_name: string | null
    username: string | null
    user_agent: string | null
    ip_address: string | null
    last_used_at: string | null
    created_at: string
    expires_at: string
    status: 'active' | 'expired' | 'revoked'
}

interface Stats { total: number; active: number; expired: number }

function parseUA(ua: string | null) {
    if (!ua) return { device: 'Bilinmiyor', browser: '' }
    const isMobile = /mobile|android|iphone/i.test(ua)
    const browser = /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : /Edge/.test(ua) ? 'Edge' : 'Diğer'
    return { device: isMobile ? 'Mobil' : 'Masaüstü', browser }
}

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([])
    const [stats, setStats] = useState<Stats>({ total: 0, active: 0, expired: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        const data = await fetchApi<{ sessions: Session[]; stats: Stats }>('/api/admin/sessions')
        setSessions(data?.sessions || [])
        setStats(data?.stats || { total: 0, active: 0, expired: 0 })
        setLoading(false)
    }

    async function revokeSession(id: string) {
        if (!confirm('Bu oturumu sonlandırmak istediğinize emin misiniz?')) return
        try {
            await fetch('/api/admin/sessions', {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: id }),
            })
            toast.success('Oturum sonlandırıldı')
            load()
        } catch {
            toast.error('İşlem başarısız')
        }
    }

    const statusMap = {
        active: { label: 'Aktif', variant: 'solid' as const },
        expired: { label: 'Süresi Dolmuş', variant: 'outline' as const },
        revoked: { label: 'Sonlandırılmış', variant: 'soft' as const },
    }

    return (
        <AppDashboardLayout title="Oturum Yönetimi" subtitle="Aktif ve geçmiş oturumları yönetin" icon={Monitor}>
            {/* İstatistikler */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <Card><CardBody className="p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Toplam</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </CardBody></Card>
                <Card><CardBody className="p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Aktif</p>
                    <p className="text-2xl font-bold text-emerald-500">{stats.active}</p>
                </CardBody></Card>
                <Card><CardBody className="p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Süresi Dolmuş</p>
                    <p className="text-2xl font-bold text-gray-400">{stats.expired}</p>
                </CardBody></Card>
            </div>

            {/* Oturum Listesi */}
            {loading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse bg-gray-200 dark:bg-slate-700 rounded-lg" />)}</div>
            ) : sessions.length === 0 ? (
                <Card><CardBody className="p-12 text-center"><p className="text-gray-500">Oturum bulunamadı</p></CardBody></Card>
            ) : (
                <div className="space-y-2">
                    {sessions.map(s => {
                        const { device, browser } = parseUA(s.user_agent)
                        const DeviceIcon = device === 'Mobil' ? Smartphone : Monitor
                        return (
                            <Card key={s.id} hover>
                                <CardBody className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${s.status === 'active' ? 'bg-emerald-500/10' : 'bg-gray-500/10'}`}>
                                            <DeviceIcon className={`w-5 h-5 ${s.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900 dark:text-white">{s.user_name || s.username}</p>
                                                <Badge variant={statusMap[s.status]?.variant} size="sm">
                                                    {statusMap[s.status]?.label}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400">
                                                <span>{device} • {browser}</span>
                                                {s.ip_address && <span><Globe className="w-3 h-3 inline mr-1" />{s.ip_address}</span>}
                                                <span>Son: {s.last_used_at ? new Date(s.last_used_at).toLocaleString('tr-TR') : '-'}</span>
                                            </div>
                                        </div>
                                        {s.status === 'active' && (
                                            <Button variant="outline" size="sm" onClick={() => revokeSession(s.id)}>
                                                <LogOut className="w-4 h-4 mr-1" />Sonlandır
                                            </Button>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>
                        )
                    })}
                </div>
            )}
        </AppDashboardLayout>
    )
}
