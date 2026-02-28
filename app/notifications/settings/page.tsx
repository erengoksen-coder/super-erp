'use client'

import { useState, useEffect } from 'react'
import { Bell, Shield, Package, Truck, ShoppingCart, RefreshCw, ClipboardList } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'

interface Preferences {
    critical_stock: boolean
    shipment_approved: boolean
    new_order: boolean
    order_status_change: boolean
    purchase_request: boolean
}

const PREF_LABELS: Array<{ key: keyof Preferences; label: string; desc: string; icon: typeof Bell }> = [
    { key: 'critical_stock', label: 'Kritik Stok Uyarısı', desc: 'Stok seviyesi minimumun altına düştüğünde bildirim al', icon: Package },
    { key: 'shipment_approved', label: 'Sevkiyat Onayı', desc: 'Sevkiyat onaylandığında veya risk limiti aşıldığında bildirim al', icon: Truck },
    { key: 'new_order', label: 'Yeni Sipariş', desc: 'Yeni sipariş oluşturulduğunda bildirim al', icon: ShoppingCart },
    { key: 'order_status_change', label: 'Sipariş Durumu Değişikliği', desc: 'Sipariş durumu güncellendiğinde bildirim al', icon: RefreshCw },
    { key: 'purchase_request', label: 'Satın Alma Talebi', desc: 'Yeni satın alma talebi oluşturulduğunda bildirim al', icon: ClipboardList },
]

export default function NotificationSettingsPage() {
    const [prefs, setPrefs] = useState<Preferences>({
        critical_stock: true,
        shipment_approved: true,
        new_order: true,
        order_status_change: true,
        purchase_request: true,
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchApi<Preferences>('/api/notifications/preferences')
            .then(data => {
                if (data) setPrefs(data)
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    async function handleSave() {
        setSaving(true)
        try {
            await fetch('/api/notifications/preferences', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prefs),
            })
            toast.success('Bildirim tercihleri kaydedildi')
        } catch {
            toast.error('Kaydetme başarısız')
        }
        setSaving(false)
    }

    function togglePref(key: keyof Preferences) {
        setPrefs(p => ({ ...p, [key]: !p[key] }))
    }

    return (
        <AppDashboardLayout title="Bildirim Ayarları" subtitle="Hangi durumlarda bildirim almak istediğinizi seçin" icon={Bell}>
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 animate-pulse bg-gray-200 dark:bg-slate-700 rounded-lg" />)}
                </div>
            ) : (
                <>
                    <div className="space-y-3 mb-6">
                        {PREF_LABELS.map(pref => {
                            const Icon = pref.icon
                            const enabled = prefs[pref.key]
                            return (
                                <Card key={pref.key} hover>
                                    <CardBody className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${enabled ? 'bg-indigo-500/10' : 'bg-gray-500/10'}`}>
                                                <Icon className={`w-5 h-5 ${enabled ? 'text-indigo-500' : 'text-gray-400'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-white">{pref.label}</p>
                                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{pref.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => togglePref(pref.key)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    </CardBody>
                                </Card>
                            )
                        })}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" size="sm" onClick={() => {
                            setPrefs({ critical_stock: true, shipment_approved: true, new_order: true, order_status_change: true, purchase_request: true })
                        }}>Tümünü Aç</Button>
                        <Button variant="outline" size="sm" onClick={() => {
                            setPrefs({ critical_stock: false, shipment_approved: false, new_order: false, order_status_change: false, purchase_request: false })
                        }}>Tümünü Kapat</Button>
                        <Button variant="solid" color="primary" size="sm" onClick={handleSave} disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'Tercihleri Kaydet'}
                        </Button>
                    </div>
                </>
            )}
        </AppDashboardLayout>
    )
}
