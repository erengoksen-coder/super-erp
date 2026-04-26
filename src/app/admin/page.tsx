'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Shield,
  Users as UsersIcon,
  MessageCircle,
  Database,
  Activity,
  ChevronRight,
  AlertTriangle,
  Lock,
  Terminal,
  History,
  ShieldCheck,
  RefreshCw,
  MoreHorizontal,
  UserCheck,
  Zap,
  Cpu
} from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { formatDateTime } from '@/lib/utils/dateFormat'
import { useAuthStore } from '@/lib/store/authStore'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

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

  if (!user || !isAdmin) return null

  return (
    <AppDashboardLayout
      title="Yönetici Merkezi"
      subtitle="Sistem denetimi, güvenlik ve kullanıcı yönetimi"
      icon={ShieldCheck}
    >
      <div className="space-y-6 animate-reveal">
         {/* Admin KPI Row */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/users" className="block">
               <Card variant="glass" className="hover:scale-[1.02] transition-all group border-primary/20 bg-primary/5">
                  <CardBody className="p-6 flex items-center justify-between">
                     <div className="flex flex-col">
                        <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Kullanıcı Yönetimi</p>
                        <h3 className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">Kullanıcılar</h3>
                        {pendingCount !== null && pendingCount > 0 && (
                           <Badge color="error" variant="soft" className="mt-2 text-[8px] weight-black animate-pulse">{pendingCount} ONAY BEKLEYEN</Badge>
                        )}
                     </div>
                     <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                        <UsersIcon className="w-6 h-6 shadow-glow" />
                     </div>
                  </CardBody>
               </Card>
            </Link>

            <Link href="/admin/messaging" className="block">
               <Card variant="glass" className="hover:scale-[1.02] transition-all group border-secondary/20 bg-secondary/5">
                  <CardBody className="p-6 flex items-center justify-between">
                     <div className="flex flex-col">
                        <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">İletişim Kanalı</p>
                        <h3 className="text-2xl font-black text-foreground group-hover:text-secondary transition-colors">Mesajlaşma</h3>
                        <span className="text-[10px] font-bold opacity-30 mt-2">SİSTEM MESAJLARI</span>
                     </div>
                     <div className="p-4 rounded-2xl bg-secondary/10 text-secondary group-hover:scale-110 transition-transform">
                        <MessageCircle className="w-6 h-6 shadow-glow" />
                     </div>
                  </CardBody>
               </Card>
            </Link>

            <Card variant="glass" className="hover:scale-[1.02] transition-all group">
               <CardBody className="p-6 flex items-center justify-between">
                  <div className="flex flex-col">
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Sistem Kaynağı</p>
                     <h3 className="text-2xl font-black text-foreground">Veritabanı</h3>
                     <Badge variant="glass" className="mt-2 text-[8px]">SAĞLIKLI</Badge>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 text-foreground/40 group-hover:scale-110 transition-transform">
                     <Database className="w-6 h-6" />
                  </div>
               </CardBody>
            </Card>

            <Card variant="glass" className="hover:scale-[1.02] transition-all group border-warning/20">
               <CardBody className="p-6 flex items-center justify-between">
                  <div className="flex flex-col">
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Erişim Kontrolü</p>
                     <h3 className="text-2xl font-black text-foreground">Güvenlik</h3>
                     <span className="text-[10px] font-bold text-warning mt-2 uppercase tracking-tighter flex items-center gap-1">
                        <Lock className="w-3 h-3" /> FULL LOGGING
                     </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-warning/10 text-warning group-hover:scale-110 transition-transform">
                     <Shield className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
         </div>

         {/* Audit Log Section */}
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
               <Card variant="glass" className="overflow-hidden border-white/5">
                  <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-primary" />
                        <h3 className="font-black uppercase tracking-widest text-sm text-foreground/80">Sistem Denetim Günlüğü (Audit)</h3>
                     </div>
                     <Button variant="ghost" size="sm" onClick={loadData}>
                        <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        Yenile
                     </Button>
                  </CardHeader>
                  <CardBody className="p-0">
                     <div className="overflow-x-auto">
                        <table className="w-full">
                           <thead>
                              <tr className="bg-white/5 border-b border-white/5 text-[9px] font-black text-foreground/40 uppercase tracking-widest">
                                 <th className="p-4 text-left">Tarih / Saat</th>
                                 <th className="p-4 text-left">Kullanıcı</th>
                                 <th className="p-4 text-left">İşlem / Tablo</th>
                                 <th className="p-4 text-left">Detay (JSON)</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                              {loading ? (
                                 <tr><td colSpan={4} className="py-20 text-center opacity-40 font-black uppercase tracking-widest text-xs">Olaylar Yükleniyor...</td></tr>
                              ) : auditList.length === 0 ? (
                                 <tr><td colSpan={4} className="py-20 text-center opacity-20 font-black uppercase tracking-widest text-xs">Denetim kaydı bulunamadı</td></tr>
                              ) : (
                                 auditList.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors group">
                                       <td className="p-4 whitespace-nowrap">
                                          <div className="flex flex-col">
                                             <span className="text-xs font-bold text-foreground/60">{formatDateTime(entry.created_at)}</span>
                                             <span className="text-[10px] font-mono opacity-20 tracking-tighter">ID: {entry.id.substring(0,8)}</span>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <div className="flex items-center gap-2">
                                             <div className="p-1.5 bg-white/5 rounded-lg">
                                                <UserCheck className="w-3 h-3 text-primary opacity-60" />
                                             </div>
                                             <span className="text-xs font-black uppercase text-foreground/80 tracking-tight">{entry.user_name || 'SİSTEM'}</span>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <div className="flex flex-col">
                                             <span className="text-xs font-black text-primary uppercase tracking-widest">{entry.action}</span>
                                             <span className="text-[10px] font-bold opacity-30 uppercase">{entry.table_name}</span>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <div className="max-w-xs overflow-hidden">
                                             <code className="text-[10px] font-mono bg-white/5 p-2 rounded-xl block truncate opacity-60 group-hover:opacity-100 group-hover:bg-white/10 transition-all cursor-pointer">
                                                {JSON.stringify(entry.after_data)}
                                             </code>
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

            {/* Admin Sidebar Info */}
            <div className="space-y-6">
               <Card variant="glass" className="bg-primary/5 border-primary/20">
                  <CardBody className="p-6">
                     <div className="flex items-center gap-3 text-primary mb-4">
                        <Activity className="w-5 h-5" />
                        <h4 className="text-xs font-black uppercase tracking-widest">Sistem Sağlığı</h4>
                     </div>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                           <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Uptime</span>
                           <span className="text-xs font-bold text-success">99.9%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                           <span className="text-[10px] font-black uppercase tracking-widest opacity-40">CPU Yükü</span>
                           <span className="text-xs font-bold">12%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                           <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Bellek</span>
                           <span className="text-xs font-bold">448 MB</span>
                        </div>
                     </div>
                  </CardBody>
               </Card>

               <div className="p-6 rounded-3xl bg-secondary/5 border border-secondary/10 relative overflow-hidden group">
                  <Cpu className="absolute -right-4 -bottom-4 w-32 h-32 text-secondary/5 group-hover:scale-110 transition-transform duration-700" />
                  <div className="relative z-10">
                     <h4 className="text-xs font-black uppercase tracking-widest text-secondary mb-3">Geliştirici Araçları</h4>
                     <p className="text-[10px] font-medium opacity-40 leading-relaxed italic mb-4">Sistem çekirdeği ve veritabanı optimizasyonu için ayarlar sekmesini kullanın.</p>
                     <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest hover:bg-white/5 h-auto py-3">
                        Terminali Aç
                        <ChevronRight className="w-3 h-3 ml-2" />
                     </Button>
                  </div>
               </div>

               <div className="px-2">
                  <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                     <History className="w-3 h-3" /> KRİTİK OLAYLAR
                  </p>
                  <div className="space-y-4 border-l-2 border-white/5 ml-1.5 pl-4">
                     {auditList.slice(0, 3).map((e, i) => (
                        <div key={i} className="relative">
                           <div className="absolute top-1.5 -left-[21px] w-2.5 h-2.5 rounded-full bg-primary shadow-glow-sm shadow-primary/40" />
                           <p className="text-[11px] font-bold text-foreground/60 leading-tight truncate uppercase">{e.action} - {e.table_name}</p>
                           <p className="text-[9px] text-foreground/20 font-medium mt-1 uppercase tracking-tighter">{formatDateTime(e.created_at)}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
    </AppDashboardLayout>
  )
}
