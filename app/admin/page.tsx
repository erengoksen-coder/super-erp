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
} from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { formatDateTime } from '@/lib/utils/dateFormat'
import { useAuthStore } from '@/lib/store/authStore'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

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
  const [loading, setLoading] = useState(true)

  const isAdmin = isAdminRole(user?.role)

  useEffect(() => {
    if (!user) return
    if (!isAdmin) {
      router.replace('/')
      return
    }
    loadData()
  }, [user, isAdmin, router])

  async function loadData() {
    setLoading(true)
    try {
      const [audit, pending] = await Promise.all([
        fetchApi<AuditEntry[]>('/api/admin/audit-log?limit=20'),
        fetchApi<{ count: number }>('/api/users/pending-count').catch(() => ({ count: 0 })),
      ])
      setAuditList(Array.isArray(audit) ? audit : [])
      setPendingCount(typeof pending?.count === 'number' ? pending.count : 0)
    } catch {
      setAuditList([])
      setPendingCount(0)
    } finally {
      setLoading(false)
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

          <Card className="border-amber-200 dark:border-amber-700 dark:bg-slate-800/50">
            <CardBody className="flex flex-row items-center gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 dark:text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-slate-900 dark:text-white">Güvenlik</p>
                <p className="text-base font-medium text-slate-500 dark:text-white">Tüm admin işlemleri kayıt altında</p>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Son admin işlemleri"
            subtitle="Denetim kaydı (son 20)"
            actions={
              <button
                type="button"
                onClick={loadData}
                className="text-base font-medium text-indigo-500 dark:text-white hover:text-indigo-400 dark:hover:text-indigo-200 hover:underline"
              >
                Yenile
              </button>
            }
          />
          <CardBody>
            {loading ? (
              <p className="text-base font-medium text-slate-400 dark:text-white py-4">Yükleniyor...</p>
            ) : auditList.length === 0 ? (
              <p className="text-base font-medium text-slate-400 dark:text-white py-4">Henüz admin işlemi kaydı yok.</p>
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
