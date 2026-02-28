'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Shield,
  Users,
  MessageCircle,
  Database,
  Activity,
  ChevronRight,
  AlertTriangle,
  Trash2,
  FileDown,
} from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDateTime } from '@/lib/utils/dateFormat'
import { useAuthStore } from '@/lib/store/authStore'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { NewFeatureHighlight } from '@/components/NewFeatureHighlight'

type AuditEntry = {
  id: string
  table_name: string
  action: string
  record_id: string | null
  user_name: string | null
  after_data: Record<string, unknown> | null
  created_at: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [auditList, setAuditList] = useState<AuditEntry[]>([])
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearingData, setClearingData] = useState(false)
  const [markingBackup, setMarkingBackup] = useState(false)
  const [runningBackup, setRunningBackup] = useState(false)
  const [exportingAudit, setExportingAudit] = useState(false)

  const isAdmin = isAdminRole(user?.role)
  const canExport = user?.can_export !== 0

  useEffect(() => {
    if (!user) return
    if (!isAdmin) {
      const t = setTimeout(() => router.replace('/'), 0)
      return () => clearTimeout(t)
    }
    loadData()
  }, [user, isAdmin, router])

  async function loadData() {
    setLoading(true)
    try {
      const [audit, pending, backup] = await Promise.all([
        fetchApi<AuditEntry[]>('/api/admin/audit-log?limit=20'),
        fetchApi<{ count: number }>('/api/users/pending-count').catch(() => ({ count: 0 })),
        fetchApi<{ lastBackupAt: string | null }>('/api/admin/backup-status').catch(() => ({ lastBackupAt: null })),
      ])
      setAuditList(Array.isArray(audit) ? audit : [])
      setPendingCount(typeof pending?.count === 'number' ? pending.count : 0)
      setLastBackupAt(backup?.lastBackupAt ?? null)
    } catch {
      setAuditList([])
      setPendingCount(0)
      setLastBackupAt(null)
    } finally {
      setLoading(false)
    }
  }

  async function clearAllDataExceptBom() {
    if (!confirm('BOM ve ayarlar hariç TÜM veriler silinecek (ödeme kayıtları, faturalar, cari hareketler, siparişler, üretim emirleri, stok hareketleri, sevkiyatlar vb.). Ayarlar ve BOM korunacak. Bu işlem geri alınamaz. Emin misiniz?')) return
    if (!confirm('Son kez onaylıyor musunuz? Tüm işlem verileri silinecek.')) return
    setClearingData(true)
    try {
      const res = await fetchApi<{ message?: string; total_deleted?: number; error?: string }>('/api/admin/clear-all-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const msg = (res as any)?.message ?? (res as any)?.error ?? 'İşlem tamamlandı.'
      toast.success(msg)
      loadData()
    } catch (e: any) {
      toast.error('Hata: ' + (e?.message ?? 'Veriler silinemedi'))
    } finally {
      setClearingData(false)
    }
  }

  async function exportAuditLog() {
    setExportingAudit(true)
    try {
      const res = await fetch('/api/admin/audit-log/export?limit=5000', { credentials: 'include' })
      if (!res.ok) throw new Error('Dışa aktarma başarısız')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Denetim_Kaydi_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Denetim kaydı indirildi')
    } catch {
      toast.error('Denetim kaydı dışa aktarılamadı')
    } finally {
      setExportingAudit(false)
    }
  }

  if (!user) return null
  if (!isAdmin) return null

  return (
    <AppDashboardLayout
      title="Yönetici Paneli"
      subtitle="Sistem yönetimi ve denetim"
      icon={Shield}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/users">
            <Card className="hover:shadow-md transition cursor-pointer h-full">
              <CardBody className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                  <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">Kullanıcılar</p>
                  <p className="text-base font-medium text-slate-500 dark:text-white">
                    {pendingCount !== null ? (
                      <span>{pendingCount} onay bekleyen</span>
                    ) : (
                      'Yönetim'
                    )}
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-500 dark:text-white shrink-0" />
              </CardBody>
            </Card>
          </Link>

          <Link href="/admin/messaging">
            <Card className="hover:shadow-md transition cursor-pointer h-full">
              <CardBody className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <MessageCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">Mesajlaşma</p>
                  <p className="text-base font-medium text-slate-500 dark:text-white">Konuşmaları görüntüle</p>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-500 dark:text-white shrink-0" />
              </CardBody>
            </Card>
          </Link>

          <Card className="opacity-90">
            <CardBody className="flex flex-row items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <Database className="h-6 w-6 text-amber-600 dark:text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-slate-900 dark:text-white">Veritabanı</p>
                <p className="text-base font-medium text-slate-500 dark:text-white">Tehlikeli işlemler Ayarlar altında</p>
              </div>
            </CardBody>
          </Card>

          <Card className={!lastBackupAt ? 'border-amber-200 dark:border-amber-700' : ''}>
            <CardBody className="flex flex-row items-center gap-4 flex-wrap">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                <Database className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-slate-900 dark:text-white">Yedekleme</p>
                <p className="text-base font-medium text-slate-500 dark:text-white">
                  {lastBackupAt
                    ? `Son yedek: ${formatDateTime(lastBackupAt)}`
                    : 'Son yedek kaydı yok — düzenli yedek almayı unutmayın.'}
                </p>
              </div>
              <button
                type="button"
                disabled={runningBackup || markingBackup}
                onClick={async () => {
                  setRunningBackup(true)
                  try {
                    const res = await fetchApi<{ lastBackupAt?: string; message?: string }>('/api/admin/backup-now', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({}),
                    })
                    setLastBackupAt(res?.lastBackupAt ?? null)
                    toast.success(res?.message ?? 'Yedek oluşturuldu')
                  } catch (e: any) {
                    toast.error(e?.message ?? 'Yedekleme başarısız')
                  } finally {
                    setRunningBackup(false)
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-50"
              >
                {runningBackup ? 'Yedekleniyor...' : 'Şimdi yedekle'}
              </button>
              <button
                type="button"
                disabled={markingBackup || runningBackup}
                onClick={async () => {
                  setMarkingBackup(true)
                  try {
                    const res = await fetchApi<{ lastBackupAt?: string }>('/api/admin/backup-status', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({}),
                    })
                    setLastBackupAt(res?.lastBackupAt ?? null)
                    toast.success('Son yedekleme tarihi güncellendi')
                  } catch (e: any) {
                    toast.error(e?.message ?? 'Güncellenemedi')
                  } finally {
                    setMarkingBackup(false)
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm disabled:opacity-50"
              >
                {markingBackup ? '...' : 'Yedek alındı olarak işaretle'}
              </button>
            </CardBody>
          </Card>

          <Link href="/admin/activity">
            <Card className="border-amber-200 dark:border-amber-700 dark:bg-slate-800/50 hover:shadow-md transition cursor-pointer h-full">
              <CardBody className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <Activity className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">İşlem geçmişi</p>
                  <p className="text-base font-medium text-slate-500 dark:text-white">Tüm aktivite kayıtları</p>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-500 dark:text-white shrink-0" />
              </CardBody>
            </Card>
          </Link>
        </div>

        <NewFeatureHighlight featureId="bakim_modu">
          <Card className="border-amber-700/50 dark:border-amber-800 bg-amber-950/10">
            <CardBody className="flex flex-row items-center gap-3 flex-wrap">
              <span className="text-amber-400 font-medium">Bakım modu:</span>
              <span className="text-sm text-slate-400 dark:text-slate-500">
                MAINTENANCE_MODE=true ile tüm kullanıcılar bakım sayfasına yönlendirilir.
              </span>
              <Link href="/bakim" className="text-sm text-amber-400 hover:text-amber-300 underline">
                Önizle
              </Link>
            </CardBody>
          </Card>
        </NewFeatureHighlight>

        <Card className="border-red-800 dark:border-red-900 bg-red-950/20">
          <CardHeader
            title="Veri temizleme"
            subtitle="BOM ve ayarlar korunur; ödeme, fatura, sipariş, üretim, stok, sevkiyat vb. tüm veriler silinir"
          />
          <CardBody>
            <button
              type="button"
              disabled={clearingData}
              onClick={clearAllDataExceptBom}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-red-700 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Trash2 className="w-4 h-4" />
              {clearingData ? 'Siliniyor...' : 'BOM ve ayarlar hariç tüm verileri sil'}
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Son admin işlemleri"
            subtitle="Denetim kaydı (son 20)"
            actions={
              <div className="flex items-center gap-2">
                {canExport && (
                <button
                  type="button"
                  onClick={exportAuditLog}
                  disabled={exportingAudit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-600 hover:bg-slate-500 text-white disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" />
                  {exportingAudit ? 'İndiriliyor...' : 'Excel İndir'}
                </button>
                )}
                <button
                  type="button"
                  onClick={loadData}
                  className="text-base font-medium text-indigo-500 dark:text-white hover:text-indigo-400 dark:hover:text-indigo-200 hover:underline"
                >
                  Yenile
                </button>
              </div>
            }
          />
          <CardBody>
            {loading ? (
              <p className="text-base font-medium text-slate-400 dark:text-white py-4">Yükleniyor...</p>
            ) : auditList.length === 0 ? (
              <EmptyState
                title="Henüz admin işlemi kaydı yok"
                description="Sistemde henüz denetim kaydı oluşmamış."
                icon={Activity}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-600">
                      <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700 dark:text-slate-100">Tarih</th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700 dark:text-slate-100">Kullanıcı</th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700 dark:text-slate-100">İşlem</th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700 dark:text-slate-100 min-w-[200px]">Detay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditList.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-3 px-2 text-sm font-medium text-slate-700 dark:text-slate-100 whitespace-nowrap">
                          {formatDateTime(entry.created_at)}
                        </td>
                        <td className="py-3 px-2 text-sm font-medium text-slate-800 dark:text-slate-100">{entry.user_name || entry.id || '—'}</td>
                        <td className="py-3 px-2 text-sm">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{entry.record_id || entry.action}</span>
                        </td>
                        <td className="py-3 px-2 text-sm font-medium text-slate-700 dark:text-slate-200 min-w-0 max-w-md">
                          <span className="font-mono text-xs sm:text-sm break-all whitespace-pre-wrap align-top block max-h-40 overflow-y-auto bg-slate-100 dark:bg-slate-800/70 rounded px-2 py-1.5">
                            {entry.after_data
                              ? JSON.stringify(entry.after_data, null, 2)
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
