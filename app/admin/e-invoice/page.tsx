'use client'

import { useState, useEffect } from 'react'
import { FileText, Send, CheckCircle, XCircle, Clock, RefreshCw, Settings, Plus, Search, Shield } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'

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

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
    sent: { label: 'Gönderildi', icon: Send, color: 'text-blue-500' },
    accepted: { label: 'Kabul', icon: CheckCircle, color: 'text-emerald-500' },
    rejected: { label: 'Red', icon: XCircle, color: 'text-red-500' },
    pending: { label: 'Bekliyor', icon: Clock, color: 'text-amber-500' },
    queued: { label: 'Kuyrukta', icon: Clock, color: 'text-amber-400' },
    error: { label: 'Hata', icon: XCircle, color: 'text-red-400' },
}

export default function EInvoiceDashboard() {
    const [logs, setLogs] = useState<EInvoiceLog[]>([])
    const [integrations, setIntegrations] = useState<Integration[]>([])
    const [loading, setLoading] = useState(true)
    const [showConfig, setShowConfig] = useState(false)
    const [showTaxCheck, setShowTaxCheck] = useState(false)
    const [taxQuery, setTaxQuery] = useState('')
    const [taxResult, setTaxResult] = useState<string | null>(null)

    // Nilvera form
    const [apiKey, setApiKey] = useState('')
    const [env, setEnv] = useState<'test' | 'production'>('test')
    const [taxNumber, setTaxNumber] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [city, setCity] = useState('')
    const [district, setDistrict] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        const [logsData, configData] = await Promise.all([
            fetchApi<EInvoiceLog[]>('/api/e-invoice/logs'),
            fetchApi<Integration[]>('/api/e-invoice/config'),
        ])
        setLogs(Array.isArray(logsData) ? logsData : [])
        setIntegrations(Array.isArray(configData) ? configData : [])

        // Nilvera ayarlarını doldur
        const active = (Array.isArray(configData) ? configData : []).find((c: Integration) => c.is_active && c.provider === 'nilvera')
        if (active) {
            try {
                const cfg = JSON.parse(active.config_json)
                setApiKey(cfg.apiKey || cfg.api_key || '')
                setEnv(cfg.environment || 'test')
                setTaxNumber(cfg.taxNumber || cfg.tax_number || '')
                setCompanyName(cfg.companyName || cfg.company_name || '')
                setCity(cfg.city || '')
                setDistrict(cfg.district || '')
            } catch { }
        }
        setLoading(false)
    }

    async function saveNilveraConfig() {
        if (!apiKey.trim()) { toast.error('API Anahtarı gerekli'); return }
        setSaving(true)
        try {
            await fetch('/api/e-invoice/config', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'nilvera',
                    config: { apiKey, environment: env, taxNumber, companyName, city, district },
                    is_active: true,
                }),
            })
            toast.success('Nilvera yapılandırması kaydedildi')
            setShowConfig(false)
            load()
        } catch { toast.error('Kaydetme başarısız') }
        setSaving(false)
    }

    async function checkTaxPayer() {
        if (!taxQuery.trim()) return
        setTaxResult('Sorgulanıyor...')
        try {
            const active = integrations.find(i => i.is_active && i.provider === 'nilvera')
            if (!active) { setTaxResult('Aktif Nilvera entegrasyonu bulunamadı'); return }
            const cfg = JSON.parse(active.config_json)
            const baseUrl = cfg.environment === 'production' ? 'https://api.nilvera.com' : 'https://apitest.nilvera.com'
            // Not: Bu istemci taraflı olduğu için proxy gerektirirse backend API eklenebilir
            setTaxResult(`GİB sorgusu: ${taxQuery} (Gerçek sorgu için sunucu API gerektirir)`)
        } catch { setTaxResult('Sorgu başarısız') }
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
            {/* Durum Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card><CardBody className="p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Toplam</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </CardBody></Card>
                <Card><CardBody className="p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Başarılı</p>
                    <p className="text-2xl font-bold text-emerald-500">{stats.sent}</p>
                </CardBody></Card>
                <Card><CardBody className="p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Hata</p>
                    <p className="text-2xl font-bold text-red-500">{stats.error}</p>
                </CardBody></Card>
                <Card><CardBody className="p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Bekliyor</p>
                    <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
                </CardBody></Card>
            </div>

            {/* Nilvera Entegratör */}
            <Card className="mb-6">
                <CardBody className="p-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSI0IiB5PSIxOCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIj5OPC90ZXh0Pjwvc3ZnPg==" alt="N" className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                                Nilvera {activeNilvera ? '' : '(Yapılandırılmadı)'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {activeNilvera ? (
                                    <>
                                        {env === 'production' ? '🟢 Canlı Ortam' : '🟡 Test Ortamı'}
                                        {taxNumber && <> • VKN: {taxNumber}</>}
                                        {companyName && <> • {companyName}</>}
                                    </>
                                ) : 'E-Fatura / E-Arşiv entegratörü'}
                            </p>
                        </div>
                        <Badge variant={activeNilvera ? 'solid' : 'outline'} size="sm">
                            {activeNilvera ? 'Aktif' : 'Pasif'}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}>
                            <Settings className="w-4 h-4 mr-1" />{showConfig ? 'Kapat' : 'Ayarlar'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowTaxCheck(!showTaxCheck)}>
                            <Search className="w-4 h-4 mr-1" />Mükellef Sorgula
                        </Button>
                    </div>

                    {/* Mükellef Sorgulama */}
                    {showTaxCheck && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">GİB Mükellef Sorgulama</h4>
                            <div className="flex gap-2">
                                <input type="text" value={taxQuery} onChange={e => setTaxQuery(e.target.value)}
                                    placeholder="Vergi numarası girin"
                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm" />
                                <Button variant="solid" size="sm" onClick={checkTaxPayer}><Search className="w-4 h-4 mr-1" />Sorgula</Button>
                            </div>
                            {taxResult && <p className="text-xs text-gray-500 mt-2">{taxResult}</p>}
                        </div>
                    )}

                    {/* Nilvera Ayar Formu */}
                    {showConfig && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                                <Shield className="w-4 h-4 inline mr-1" />Nilvera API Yapılandırması
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">API Anahtarı *</label>
                                    <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                                        placeholder="Bearer token"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Ortam *</label>
                                    <select value={env} onChange={e => setEnv(e.target.value as 'test' | 'production')}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
                                        <option value="test">Test (apitest.nilvera.com)</option>
                                        <option value="production">Canlı (api.nilvera.com)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Vergi Numarası (VKN)</label>
                                    <input type="text" value={taxNumber} onChange={e => setTaxNumber(e.target.value)}
                                        placeholder="1234567890"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Firma Adı</label>
                                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                                        placeholder="LIVASOFA"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">İl</label>
                                    <input type="text" value={city} onChange={e => setCity(e.target.value)}
                                        placeholder="İstanbul"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">İlçe</label>
                                    <input type="text" value={district} onChange={e => setDistrict(e.target.value)}
                                        placeholder="Kadıköy"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-xs text-gray-400">
                                    API anahtarınızı <a href="https://portal.nilvera.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">portal.nilvera.com</a> üzerinden alabilirsiniz.
                                </p>
                                <Button variant="solid" size="sm" onClick={saveNilveraConfig} disabled={saving}>
                                    {saving ? 'Kaydediliyor...' : 'Kaydet & Aktifleştir'}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* İşlem Geçmişi */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                    İşlem Geçmişi
                </h3>
                <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1" />Yenile</Button>
            </div>

            {loading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse bg-gray-200 dark:bg-slate-700 rounded-lg" />)}</div>
            ) : logs.length === 0 ? (
                <Card><CardBody className="p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Henüz e-fatura kaydı yok</p>
                    <p className="text-xs text-gray-400 mt-1">Fatura sayfasından e-fatura gönderdiğinizde burada görüntülenecektir</p>
                </CardBody></Card>
            ) : (
                <div className="space-y-2">
                    {logs.slice(0, 50).map((log: any) => {
                        const st = STATUS_MAP[log.status] || STATUS_MAP.pending
                        const Icon = st.icon
                        return (
                            <Card key={log.id} hover>
                                <CardBody className="p-3">
                                    <div className="flex items-center gap-3">
                                        <Icon className={`w-5 h-5 ${st.color}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">Fatura #{(log.invoice_id || '').slice(0, 8)}</span>
                                                <Badge variant="outline" size="sm">{st.label}</Badge>
                                                <Badge variant="soft" size="sm">{log.provider || 'nilvera'}</Badge>
                                                {log.action && <Badge variant="soft" size="sm">{log.action}</Badge>}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                <span>{new Date(log.created_at).toLocaleString('tr-TR')}</span>
                                            </div>
                                        </div>
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
