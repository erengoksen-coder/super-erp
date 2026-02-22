'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Activity, ArrowLeft, RefreshCw, FileDown } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { formatDateTime } from '@/lib/utils/dateFormat'
import { useAuthStore } from '@/lib/store/authStore'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/lib/notify'

type AuditEntry = {
  id: string
  table_name: string
  action: string
  record_id: string | null
  user_name: string | null
  after_data: Record<string, unknown> | null
  before_data: Record<string, unknown> | null
  created_at: string
}

export default function AdminActivityPage() {
  const user = useAuthStore((s) => s.user)
  const [list, setList] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const isAdmin = isAdminRole(user?.role)
  const canExport = user?.can_export !== 0

  useEffect(() => {
    if (!isAdmin) return
    load()
  }, [isAdmin])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchApi<AuditEntry[]>('/api/admin/audit-log?limit=100&table=all')
      setList(Array.isArray(data) ? data : [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/audit-log/export?limit=5000&table=all', { credentials: 'include' })
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
      setExporting(false)
    }
  }

  if (!user || !isAdmin) return null

  return (
    <AppDashboardLayout
      title="İşlem geçmişi"
      subtitle="Tüm sistem aktivite kayıtları"
      icon={Activity}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Yönetici Paneli
          </Link>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          {canExport && (
          <button
            type="button"
            onClick={exportExcel}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? 'İndiriliyor...' : 'Excel İndir'}
          </button>
          )}
        </div>

        <Card>
          <CardHeader
            title="Son 100 kayıt"
            subtitle="Tarih, kullanıcı, tablo ve işlem detayı"
          />
          <CardBody>
            {loading ? (
              <TableSkeleton rows={12} cols={5} />
            ) : list.length === 0 ? (
              <EmptyState
                title="Henüz kayıt yok"
                description="Sistemde henüz denetim kaydı oluşmamış."
                icon={Activity}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-2 text-gray-400 font-medium">Tarih</th>
                      <th className="text-left py-2 px-2 text-gray-400 font-medium">Kullanıcı</th>
                      <th className="text-left py-2 px-2 text-gray-400 font-medium">Tablo</th>
                      <th className="text-left py-2 px-2 text-gray-400 font-medium">İşlem</th>
                      <th className="text-left py-2 px-2 text-gray-400 font-medium">Detay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-2 px-2 text-gray-300 whitespace-nowrap">{formatDateTime(entry.created_at)}</td>
                        <td className="py-2 px-2 text-white">{entry.user_name || '—'}</td>
                        <td className="py-2 px-2 text-gray-400">{entry.table_name}</td>
                        <td className="py-2 px-2 text-white">{entry.action} {entry.record_id ? `#${entry.record_id.slice(0, 8)}` : ''}</td>
                        <td className="py-2 px-2 max-w-xs">
                          <pre className="text-xs text-gray-500 truncate max-w-[200px] bg-gray-900 rounded px-1 py-0.5">
                            {entry.after_data ? JSON.stringify(entry.after_data).slice(0, 80) + '…' : '—'}
                          </pre>
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
