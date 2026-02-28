'use client'

import { useState } from 'react'
import { Code, Copy, Check, ChevronDown, ChevronRight, Globe } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Endpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    path: string
    desc: string
    auth: boolean
}

const API_GROUPS: Array<{ name: string; endpoints: Endpoint[] }> = [
    {
        name: 'Siparişler',
        endpoints: [
            { method: 'GET', path: '/api/orders', desc: 'Sipariş listesi (filtre, sayfalama)', auth: true },
            { method: 'POST', path: '/api/orders', desc: 'Yeni sipariş oluştur', auth: true },
            { method: 'GET', path: '/api/orders/:id', desc: 'Sipariş detayı', auth: true },
            { method: 'PUT', path: '/api/orders/:id', desc: 'Sipariş güncelle', auth: true },
            { method: 'DELETE', path: '/api/orders/:id', desc: 'Sipariş sil (soft)', auth: true },
        ],
    },
    {
        name: 'Faturalar',
        endpoints: [
            { method: 'GET', path: '/api/invoices', desc: 'Fatura listesi', auth: true },
            { method: 'POST', path: '/api/invoices', desc: 'Fatura oluştur', auth: true },
            { method: 'GET', path: '/api/invoices/:id', desc: 'Fatura detayı', auth: true },
        ],
    },
    {
        name: 'Stok & Malzeme',
        endpoints: [
            { method: 'GET', path: '/api/materials', desc: 'Malzeme listesi', auth: true },
            { method: 'POST', path: '/api/materials', desc: 'Malzeme ekle', auth: true },
            { method: 'GET', path: '/api/stock-movements', desc: 'Stok hareketleri', auth: true },
        ],
    },
    {
        name: 'Muhasebe',
        endpoints: [
            { method: 'GET', path: '/api/accounting/journal-entries', desc: 'Yevmiye kayıtları', auth: true },
            { method: 'POST', path: '/api/accounting/journal-entries', desc: 'Yevmiye oluştur', auth: true },
            { method: 'GET', path: '/api/accounting/chart-of-accounts', desc: 'Hesap planı', auth: true },
            { method: 'GET', path: '/api/accounting/general-ledger', desc: 'Defteri kebir', auth: true },
        ],
    },
    {
        name: 'E-Fatura',
        endpoints: [
            { method: 'GET', path: '/api/e-invoice/config', desc: 'Entegratör yapılandırması', auth: true },
            { method: 'POST', path: '/api/e-invoice/send', desc: 'E-fatura gönder', auth: true },
            { method: 'GET', path: '/api/e-invoice/logs', desc: 'Gönderim logları', auth: true },
        ],
    },
    {
        name: 'Webhooks',
        endpoints: [
            { method: 'GET', path: '/api/webhooks', desc: 'Webhook listesi', auth: true },
            { method: 'POST', path: '/api/webhooks', desc: 'Webhook oluştur', auth: true },
            { method: 'DELETE', path: '/api/webhooks/:id', desc: 'Webhook sil', auth: true },
        ],
    },
    {
        name: 'Kimlik Doğrulama',
        endpoints: [
            { method: 'POST', path: '/api/auth/login', desc: 'Giriş (JWT token)', auth: false },
            { method: 'POST', path: '/api/auth/register', desc: 'Yeni kullanıcı kaydı', auth: false },
            { method: 'POST', path: '/api/auth/refresh', desc: 'Token yenile', auth: true },
        ],
    },
]

const METHOD_COLORS: Record<string, string> = {
    GET: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    POST: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    PUT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
    PATCH: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
}

export default function ApiDocsPage() {
    const [expanded, setExpanded] = useState<string[]>(API_GROUPS.map(g => g.name))
    const [copied, setCopied] = useState('')

    function toggleGroup(name: string) {
        setExpanded(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
    }

    function copyPath(path: string) {
        navigator.clipboard.writeText(path)
        setCopied(path)
        setTimeout(() => setCopied(''), 2000)
    }

    const totalEndpoints = API_GROUPS.reduce((s, g) => s + g.endpoints.length, 0)

    return (
        <AppDashboardLayout title="API Dokümantasyonu" subtitle="RESTful API endpoint referansı" icon={Code}>
            {/* Genel Bilgi */}
            <Card className="mb-6">
                <CardBody className="p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <code className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-sm text-gray-700 dark:text-slate-300">
                                {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
                            </code>
                        </div>
                        <Badge variant="solid" size="sm">{totalEndpoints} Endpoint</Badge>
                        <Badge variant="outline" size="sm">JWT Auth</Badge>
                        <Badge variant="outline" size="sm">JSON Response</Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-3">
                        Tüm istekler <code className="px-1 py-0.5 bg-gray-100 dark:bg-slate-800 rounded">Authorization: Bearer &lt;token&gt;</code> header'ı gerektirir (auth: ✓ olanlar).
                    </p>
                </CardBody>
            </Card>

            {/* Endpoint Grupları */}
            <div className="space-y-3">
                {API_GROUPS.map(group => {
                    const isExpanded = expanded.includes(group.name)
                    return (
                        <Card key={group.name}>
                            <CardBody className="p-0">
                                <button
                                    onClick={() => toggleGroup(group.name)}
                                    className="flex items-center justify-between w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                        <span className="font-medium text-gray-900 dark:text-white">{group.name}</span>
                                        <Badge variant="outline" size="sm">{group.endpoints.length}</Badge>
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="border-t border-gray-100 dark:border-slate-800">
                                        {group.endpoints.map((ep, i) => (
                                            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 dark:border-slate-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition">
                                                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${METHOD_COLORS[ep.method]}`}>
                                                    {ep.method}
                                                </span>
                                                <code className="text-sm text-gray-700 dark:text-slate-300 font-mono flex-1">{ep.path}</code>
                                                <span className="text-xs text-gray-500 dark:text-slate-400 hidden md:block">{ep.desc}</span>
                                                {ep.auth && <Badge variant="outline" size="sm">🔒</Badge>}
                                                <button onClick={() => copyPath(ep.path)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                                                    {copied === ep.path ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )
                })}
            </div>
        </AppDashboardLayout>
    )
}
