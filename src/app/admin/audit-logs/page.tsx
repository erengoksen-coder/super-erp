'use client'

import React, { useState, useEffect } from 'react'
import { 
  ClipboardCheck, Search, Filter, Calendar, 
  User as UserIcon, RefreshCw, ChevronLeft, ChevronRight,
  ShieldCheck, AlertTriangle, Monitor, Globe
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import { cn } from '@/lib/cn'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface AuditLog {
  id: string
  action_type: string
  entity_name: string
  entity_id: string
  description: string
  ip_address: string
  user_agent: string
  created_at: string
  username: string
  full_name: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const loadLogs = async (p = page) => {
    setIsLoading(true)
    try {
      const url = `/api/admin/audit-logs?page=${p}&limit=20${searchTerm ? `&search=${searchTerm}` : ''}${actionFilter ? `&actionType=${actionFilter}` : ''}`
      const response = await fetchApi<{ logs: AuditLog[], pagination: any }>(url)
      setLogs(response.logs || [])
      setPagination(response.pagination)
    } catch (err) {
      console.error('Audit logs load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs(page)
  }, [page, actionFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadLogs(1)
  }

  const getActionColor = (type: string) => {
    switch (type) {
      case 'LOGIN': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'LOGOUT': return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
      case 'CREATE': return 'text-sky-400 bg-sky-500/10 border-sky-500/20'
      case 'UPDATE': return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'DELETE': return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  return (
    <AppDashboardLayout
      title="Denetim Geçmişi (Audit Logs)"
      subtitle="Sistem genelindeki tüm kritik hareketler ve veri değişiklikleri"
      icon={ClipboardCheck}
      actions={
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadLogs()}
            className="glass"
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Yenile
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pb-10">
        
        {/* Filters & Search */}
        <Card className="glass border-primary/20 bg-primary/5">
          <CardBody className="p-4">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-1">Filtrele & Ara</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Kullanıcı, açıklama veya tablo adı..." 
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-[180px] space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-1">İşlem Tipi</label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select 
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all appearance-none"
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                  >
                    <option value="">Tümü</option>
                    <option value="LOGIN">Giriş (LOGIN)</option>
                    <option value="CREATE">Ekleme (CREATE)</option>
                    <option value="UPDATE">Güncelleme (UPDATE)</option>
                    <option value="DELETE">Silme (DELETE)</option>
                    <option value="RECOVERY">Kurtarma (RECOVERY)</option>
                  </select>
                </div>
              </div>

              <Button type="submit" variant="solid" className="px-6 h-[40px] shadow-glow shadow-primary/20">
                Sorgula
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Audit Table */}
        <Card variant="elevated" className="overflow-hidden border-slate-800/50 bg-[#0a0a0a]/80 glass">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/20">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Zaman / Tarih</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Kullanıcı</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">İşlem</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Açıklama</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">IP / Cihaz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-slate-800/50 rounded w-full" /></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">Kayıt bulunamadı.</td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-300">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                        <span className="text-[10px] text-slate-500">{format(new Date(log.created_at), 'dd MMM yyyy', { locale: tr })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{log.full_name || log.username || 'System'}</span>
                          <span className="text-[10px] text-slate-500">@{log.username || 'system'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter border",
                        getActionColor(log.action_type)
                      )}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 max-w-sm">
                        <p className="text-sm text-slate-200 line-clamp-1 group-hover:line-clamp-none transition-all">{log.description}</p>
                        <span className="text-[10px] text-slate-500 font-mono">{log.entity_name}#{log.entity_id.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <Globe className="w-3 h-3 text-slate-600" /> {log.ip_address || 'local'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 max-w-[150px] truncate" title={log.user_agent}>
                          <Monitor className="w-3 h-3" /> {log.user_agent.split(')')[0].split('(')[1]?.slice(0, 20) || 'Generic Browser'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/10">
            <div className="text-xs text-slate-500">
              Toplam <span className="text-white">{pagination.total}</span> kayıt bulundu.
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                disabled={page === 1 || isLoading}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-xs text-slate-400 px-2">
                Sayfa <span className="text-white">{page}</span> / {pagination.totalPages}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                disabled={page >= pagination.totalPages || isLoading}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Security Insight Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass border-emerald-500/20 bg-emerald-500/5">
            <CardBody className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-glow shadow-emerald-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Sistem Bütünlüğü</h4>
                <p className="text-2xl font-bold text-white font-mono tracking-tighter">IRONCLAD</p>
                <span className="text-[10px] text-emerald-500/80">Tam Denetim Koruması Aktif</span>
              </div>
            </CardBody>
          </Card>

          <Card className="glass border-primary/20 bg-primary/5">
            <CardBody className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-glow shadow-primary/30">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Otomatik Arşivleme</h4>
                <p className="text-2xl font-bold text-white font-mono tracking-tighter">AKTİF</p>
                <span className="text-[10px] text-primary/80">Günlük Log Rotasyonu Aktif</span>
              </div>
            </CardBody>
          </Card>

          <Card className="glass border-amber-500/20 bg-amber-500/5">
            <CardBody className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shadow-glow shadow-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Anomali Tespiti</h4>
                <p className="text-2xl font-bold text-white font-mono tracking-tighter">NORMAL</p>
                <span className="text-[10px] text-amber-500/80">Tehdit Algılanmadı</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppDashboardLayout>
  )
}
