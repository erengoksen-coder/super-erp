'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Send, CheckCircle, XCircle, Clock, RefreshCw, Settings, Plus, Search, Shield, Building2, MapPin } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'

interface EInvoiceLog {
    id: string
    invoice_id: string
    status: string
    direction: string
    uuid: string | null
    error_message: string | null
    provider: string
    action: string
    response_payload: string | null
    created_at: string
}

interface Integration {
    id: string
    provider: string
    config_json: string
    is_active: number
    created_at: string
}

const STATUS_MAP: Record<string, { label: string; icon: any; color: string }> = {
    sent: { label: 'Gönderildi', icon: Send, color: 'text-blue-500 bg-blue-500/10' },
    accepted: { label: 'Kabul', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-500/10' },
    rejected: { label: 'Red', icon: XCircle, color: 'text-red-500 bg-red-500/10' },
    pending: { label: 'Bekliyor', icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
    queued: { label: 'Kuyrukta', icon: Clock, color: 'text-amber-400 bg-amber-400/10' },
    error: { label: 'Hata', icon: XCircle, color: 'text-red-400 bg-red-400/10' },
}

export default function EInvoiceDashboard() {
    const [logs, setLogs] = useState<EInvoiceLog[]>([])
    const [integrations, setIntegrations] = useState<Integration[]>([])
    const [loading, setLoading] = useState(true)
    const [showConfig, setShowConfig] = useState(false)
    const [apiKey, setApiKey] = useState('')
    const [env, setEnv] = useState<'test' | 'production'>('test')
    const [taxNumber, setTaxNumber] = useState('')
    const [saving, setSaving] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [logsData, configData] = await Promise.all([
                fetchApi<EInvoiceLog[]>('/api/e-invoice/logs'),
                fetchApi<Integration[]>('/api/e-invoice/config'),
            ])
            setLogs(Array.isArray(logsData) ? logsData : [])
            setIntegrations(Array.isArray(configData) ? configData : [])

            const active = (Array.isArray(configData) ? configData : []).find(c => c.is_active && c.provider === 'nilvera')
            if (active) {
                const cfg = JSON.parse(active.config_json)
                setApiKey(cfg.apiKey || '')
                setEnv(cfg.environment || 'test')
                setTaxNumber(cfg.taxNumber || '')
            }
        } catch (e) {
            toast.error('Veriler yüklenemedi')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const saveNilveraConfig = async () => {
        if (!apiKey.trim()) { toast.error('API Anahtarı gerekli'); return }
        setSaving(true)
        try {
            await fetchApi('/api/e-invoice/config', {
                method: 'POST',
                body: JSON.stringify({
                    provider: 'nilvera',
                    config: { apiKey, environment: env, taxNumber },
                    is_active: true,
                }),
            })
            toast.success('Yapılandırma kaydedildi')
            setShowConfig(false)
            load()
        } catch { 
            toast.error('Kaydetme başarısız') 
        } finally {
            setSaving(false)
        }
    }

    const activeNilvera = integrations.find(i => i.is_active && i.provider === 'nilvera')
    const stats = {
        total: logs.length,
        sent: logs.filter(l => l.status === 'sent' || l.status === 'accepted').length,
        error: logs.filter(l => l.status === 'error' || l.status === 'rejected').length,
        pending: logs.filter(l => l.status === 'pending' || l.status === 'queued').length,
    }

    return (
        <AppDashboardLayout title="E-Fatura Yönetimi" subtitle="Nilvera e-fatura ve e-arşiv entegrasyon paneli" icon={FileText}>
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* İstatistikler */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card variant="glass">
                        <CardBody className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Toplam İşlem</p>
                                <p className="text-2xl font-black">{stats.total}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-primary/10 text-primary"><FileText className="w-5 h-5" /></div>
                        </CardBody>
                    </Card>
                    <Card variant="glass">
                        <CardBody className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Başarılı</p>
                                <p className="text-2xl font-black text-emerald-500">{stats.sent}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500"><CheckCircle className="w-5 h-5" /></div>
                        </CardBody>
                    </Card>
                    <Card variant="glass">
                        <CardBody className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Hata Alınan</p>
                                <p className="text-2xl font-black text-red-500">{stats.error}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-red-500/10 text-red-500"><XCircle className="w-5 h-5" /></div>
                        </CardBody>
                    </Card>
                    <Card variant="glass">
                        <CardBody className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Bekleyen</p>
                                <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500"><Clock className="w-5 h-5" /></div>
                        </CardBody>
                    </Card>
                </div>

                {/* Yapılandırma ve Loglar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card variant="glass" className="lg:col-span-1">
                        <CardBody className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-widest text-foreground/40">Entegrasyon Durumu</h3>
                                <Badge color="primary" className="text-[9px] font-black">
                                    {activeNilvera ? 'AKTİF' : 'PASİF'}
                                </Badge>
                            </div>

                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black uppercase">Nilvera e-Fatura</p>
                                    <p className="text-[10px] font-bold opacity-40">Resmi Entegratör Bağlantısı</p>
                                    {activeNilvera && (
                                        <div className="mt-2 text-[10px] font-black space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", env === 'production' ? 'bg-emerald-500' : 'bg-amber-500')} />
                                                <span className="uppercase">{env === 'production' ? 'CANLI ORTAM' : 'TEST ORTAMI'}</span>
                                            </div>
                                            <p className="opacity-60">VKN: {taxNumber || 'Belirtilmedi'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button 
                                variant="outline" 
                                className="w-full h-12 rounded-xl font-black text-[10px] tracking-widest uppercase"
                                onClick={() => setShowConfig(!showConfig)}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                BAĞLANTI AYARLARI
                            </Button>

                            {showConfig && (
                                <div className="space-y-4 pt-4 border-t border-white/5 animate-in slide-in-from-top duration-300">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">API Key</label>
                                        <input 
                                            type="password"
                                            value={apiKey}
                                            onChange={e => setApiKey(e.target.value)}
                                            className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-xs focus:border-primary/50 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Ortam</label>
                                        <select 
                                            value={env}
                                            onChange={e => setEnv(e.target.value as any)}
                                            className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-xs focus:border-primary/50 outline-none transition-all"
                                        >
                                            <option value="test">TEST</option>
                                            <option value="production">PRODUCTION</option>
                                        </select>
                                    </div>
                                    <Button 
                                        color="primary" 
                                        className="w-full h-10 font-black tracking-widest text-[10px] uppercase shadow-glow"
                                        onClick={saveNilveraConfig}
                                        disabled={saving}
                                    >
                                        {saving ? 'KAYDEDİLİYOR...' : 'AYARLARI KAYDET'}
                                    </Button>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    <Card variant="glass" className="lg:col-span-2 overflow-hidden">
                        <CardBody className="p-0">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-widest text-foreground/40">Son İşlem Kayıtları</h3>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={load} className="w-8 h-8 p-0 rounded-full">
                                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                                    </Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-white/5 text-[9px] font-black text-foreground/30 uppercase tracking-widest border-b border-white/5">
                                            <th className="p-4 text-left">Fatura ID / UUID</th>
                                            <th className="p-4 text-left">Detay</th>
                                            <th className="p-4 text-left">İşlem</th>
                                            <th className="p-4 text-left">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loading ? (
                                            <tr><td colSpan={4} className="p-10 text-center text-xs opacity-40 font-black uppercase tracking-widest">Yükleniyor...</td></tr>
                                        ) : logs.length === 0 ? (
                                            <tr><td colSpan={4} className="p-10 text-center text-xs opacity-20 font-black uppercase tracking-widest">Kayıt Bulunamadı</td></tr>
                                        ) : (
                                            logs.map(log => (
                                                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors text-xs font-bold uppercase">
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-primary font-black tracking-tighter">#{log.invoice_id}</span>
                                                            <p className="text-[9px] opacity-40 font-mono truncate w-32">{log.uuid || '-'}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-3.5 h-3.5 opacity-30" />
                                                            <span className="text-[10px]">{log.direction === 'in' ? 'GELEN' : 'GİDEN'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-[10px] font-black opacity-60">{log.action}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black", STATUS_MAP[log.status]?.color)}>
                                                            <span className="w-1 h-1 rounded-full bg-current" />
                                                            {STATUS_MAP[log.status]?.label}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </AppDashboardLayout>
    )
}