'use client'

import { useState, useEffect } from 'react'
import { Shield, Check, X, Save, Zap, Users } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'

interface User { id: string; username: string; full_name: string; role: string; email: string }
interface Perm { user_id: string; page_path: string; can_view: number; can_create: number; can_edit: number; can_delete: number }

const PAGE_LABELS: Record<string, string> = {
    '/orders': 'Siparişler',
    '/invoices': 'Faturalar',
    '/shipments': 'Sevkiyatlar',
    '/accounts': 'Cariler',
    '/inventory': 'Stok',
    '/production': 'Üretim',
    '/reports': 'Raporlar',
    '/quality-control': 'Kalite Kontrol',
    '/warehouses': 'Depolar',
    '/admin': 'Yönetim',
}

type PermSet = { view: boolean; create: boolean; edit: boolean; del: boolean }
const ALL = { view: true, create: true, edit: true, del: true }
const VIEW_ONLY = { view: true, create: false, edit: false, del: false }
const VIEW_EDIT = { view: true, create: true, edit: true, del: false }
const NONE = { view: false, create: false, edit: false, del: false }

// ─── ROL ŞABLONLARI ───
interface RoleTemplate {
    key: string
    label: string
    desc: string
    color: string
    perms: Record<string, PermSet>
}

const ROLE_TEMPLATES: RoleTemplate[] = [
    {
        key: 'uretim_muduru', label: 'Üretim Müdürü', color: 'bg-blue-500',
        desc: 'Üretim, stok, depo, kalite kontrol',
        perms: {
            '/orders': VIEW_ONLY, '/invoices': NONE, '/shipments': VIEW_ONLY, '/accounts': NONE,
            '/inventory': ALL, '/production': ALL, '/reports': VIEW_ONLY,
            '/quality-control': ALL, '/warehouses': ALL, '/admin': NONE,
        },
    },
    {
        key: 'planlama', label: 'Planlama', color: 'bg-indigo-500',
        desc: 'Siparişler, üretim, stok görüntüleme',
        perms: {
            '/orders': VIEW_EDIT, '/invoices': NONE, '/shipments': VIEW_ONLY, '/accounts': NONE,
            '/inventory': VIEW_ONLY, '/production': VIEW_EDIT, '/reports': VIEW_ONLY,
            '/quality-control': VIEW_ONLY, '/warehouses': VIEW_ONLY, '/admin': NONE,
        },
    },
    {
        key: 'satis', label: 'Satış Temsilcisi', color: 'bg-emerald-500',
        desc: 'Siparişler, faturalar, cariler, sevkiyat',
        perms: {
            '/orders': ALL, '/invoices': VIEW_EDIT, '/shipments': VIEW_EDIT, '/accounts': VIEW_EDIT,
            '/inventory': VIEW_ONLY, '/production': NONE, '/reports': VIEW_ONLY,
            '/quality-control': NONE, '/warehouses': NONE, '/admin': NONE,
        },
    },
    {
        key: 'muhasebe', label: 'Muhasebeci', color: 'bg-amber-500',
        desc: 'Faturalar, cariler, raporlar, yönetim',
        perms: {
            '/orders': VIEW_ONLY, '/invoices': ALL, '/shipments': VIEW_ONLY, '/accounts': ALL,
            '/inventory': VIEW_ONLY, '/production': NONE, '/reports': ALL,
            '/quality-control': NONE, '/warehouses': NONE, '/admin': VIEW_ONLY,
        },
    },
    {
        key: 'depocu', label: 'Depocu', color: 'bg-teal-500',
        desc: 'Stok, depolar, sevkiyat',
        perms: {
            '/orders': VIEW_ONLY, '/invoices': NONE, '/shipments': VIEW_EDIT, '/accounts': NONE,
            '/inventory': VIEW_EDIT, '/production': NONE, '/reports': NONE,
            '/quality-control': NONE, '/warehouses': ALL, '/admin': NONE,
        },
    },
    {
        key: 'kalite_kontrol', label: 'Kalite Kontrol', color: 'bg-purple-500',
        desc: 'Kalite kontrol, üretim görüntüleme',
        perms: {
            '/orders': NONE, '/invoices': NONE, '/shipments': NONE, '/accounts': NONE,
            '/inventory': VIEW_ONLY, '/production': VIEW_ONLY, '/reports': VIEW_ONLY,
            '/quality-control': ALL, '/warehouses': VIEW_ONLY, '/admin': NONE,
        },
    },
    {
        key: 'bayi', label: 'Bayi', color: 'bg-orange-500',
        desc: 'Sadece sipariş oluşturma ve görüntüleme',
        perms: {
            '/orders': VIEW_EDIT, '/invoices': VIEW_ONLY, '/shipments': VIEW_ONLY, '/accounts': NONE,
            '/inventory': NONE, '/production': NONE, '/reports': NONE,
            '/quality-control': NONE, '/warehouses': NONE, '/admin': NONE,
        },
    },
]

export default function PermissionsPage() {
    const [users, setUsers] = useState<User[]>([])
    const [pages, setPages] = useState<string[]>([])
    const [permissions, setPermissions] = useState<Perm[]>([])
    const [selectedUser, setSelectedUser] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [localPerms, setLocalPerms] = useState<Record<string, PermSet>>({})

    useEffect(() => {
        fetchApi<{ users: User[]; pages: string[]; permissions: Perm[] }>('/api/admin/permissions')
            .then(data => {
                setUsers(data?.users || [])
                setPages(data?.pages || [])
                setPermissions(data?.permissions || [])
                if (data?.users?.[0]) setSelectedUser(data.users[0].id)
            })
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (!selectedUser || !pages.length) return
        const map: Record<string, PermSet> = {}
        pages.forEach(p => {
            const perm = permissions.find(pr => pr.user_id === selectedUser && pr.page_path === p)
            map[p] = { view: !!perm?.can_view, create: !!perm?.can_create, edit: !!perm?.can_edit, del: !!perm?.can_delete }
        })
        setLocalPerms(map)
    }, [selectedUser, permissions, pages])

    function togglePerm(page: string, field: 'view' | 'create' | 'edit' | 'del') {
        setLocalPerms(prev => ({
            ...prev,
            [page]: { ...prev[page], [field]: !prev[page]?.[field] }
        }))
    }

    function applyTemplate(template: RoleTemplate) {
        const map: Record<string, PermSet> = {}
        pages.forEach(p => {
            map[p] = template.perms[p] || NONE
        })
        setLocalPerms(map)
        toast.success(`"${template.label}" şablonu uygulandı – Kaydet'e basarak onaylayın`)
    }

    async function saveAll() {
        setSaving(true)
        try {
            for (const [pagePath, perm] of Object.entries(localPerms)) {
                await fetch('/api/admin/permissions', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: selectedUser,
                        pagePath,
                        canView: perm.view,
                        canCreate: perm.create,
                        canEdit: perm.edit,
                        canDelete: perm.del,
                    }),
                })
            }
            toast.success('Yetkiler kaydedildi')
            // Refresh
            const data = await fetchApi<{ users: User[]; pages: string[]; permissions: Perm[] }>('/api/admin/permissions')
            setPermissions(data?.permissions || [])
        } catch {
            toast.error('Kaydetme başarısız')
        }
        setSaving(false)
    }

    const selectedUserData = users.find(u => u.id === selectedUser)

    return (
        <AppDashboardLayout title="Yetki Yönetimi" subtitle="Rol şablonları ve kullanıcı bazlı erişim izinleri" icon={Shield}>
            {/* Kullanıcı Seçimi */}
            <Card className="mb-4">
                <CardBody className="p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Kullanıcı:</label>
                        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
                            className="flex-1 max-w-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</option>
                            ))}
                        </select>
                        {selectedUserData && (
                            <Badge variant="solid" size="sm">{selectedUserData.role}</Badge>
                        )}
                        <div className="flex-1" />
                        <Button variant="solid" color="primary" size="sm" onClick={saveAll} disabled={saving}>
                            <Save className="w-4 h-4 mr-1" />{saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {/* Rol Şablonları */}
            <Card className="mb-4">
                <CardBody className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Hızlı Şablon Uygula</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
                        {ROLE_TEMPLATES.map(tmpl => (
                            <button
                                key={tmpl.key}
                                onClick={() => applyTemplate(tmpl)}
                                className="group p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition text-left"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2.5 h-2.5 rounded-full ${tmpl.color}`} />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{tmpl.label}</span>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500 leading-tight">{tmpl.desc}</p>
                            </button>
                        ))}
                    </div>
                </CardBody>
            </Card>

            {/* İzin Matrisi */}
            {loading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse bg-gray-200 dark:bg-slate-700 rounded-lg" />)}</div>
            ) : (
                <Card>
                    <CardBody className="p-0 overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-slate-700">
                                    <th className="text-left text-sm font-medium text-gray-600 dark:text-slate-400 px-4 py-3">Sayfa</th>
                                    <th className="text-center text-sm font-medium text-gray-600 dark:text-slate-400 px-3 py-3">Görüntüle</th>
                                    <th className="text-center text-sm font-medium text-gray-600 dark:text-slate-400 px-3 py-3">Oluştur</th>
                                    <th className="text-center text-sm font-medium text-gray-600 dark:text-slate-400 px-3 py-3">Düzenle</th>
                                    <th className="text-center text-sm font-medium text-gray-600 dark:text-slate-400 px-3 py-3">Sil</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pages.map(p => {
                                    const perm = localPerms[p] || { view: false, create: false, edit: false, del: false }
                                    return (
                                        <tr key={p} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                {PAGE_LABELS[p] || p}
                                            </td>
                                            {(['view', 'create', 'edit', 'del'] as const).map(field => (
                                                <td key={field} className="text-center px-3 py-3">
                                                    <button
                                                        onClick={() => togglePerm(p, field)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${perm[field]
                                                                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                                                : 'bg-gray-100 dark:bg-slate-700 text-gray-300 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-600'
                                                            }`}
                                                    >
                                                        {perm[field] ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                            ))}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>
            )}

            <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">
                Şablon seçtiğinizde matris otomatik güncellenir. Değişiklikler ancak <strong>Kaydet</strong> butonuna bastığınızda uygulanır. İstediğiniz hücreyi elle de değiştirebilirsiniz.
            </p>
        </AppDashboardLayout>
    )
}
