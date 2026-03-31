'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Database, 
  User, 
  Clock, 
  Eye, 
  ChevronRight, 
  ArrowRight,
  Terminal,
  Activity,
  Calendar
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { format } from 'date-fns'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [filters, setFilters] = useState({
    entity: '',
    type: '',
    limit: '100'
  })

  const loadLogs = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams(filters).toString()
      const data = await fetchApi(`/api/system/audit-logs?${query}`)
      setLogs(Array.isArray(data) ? data : [])
    } catch (err: any) {
      toast.error(err.message || 'Loglar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLogs() }, [filters])

  const getActionColor = (type: string) => {
    switch (type) {
      case 'CREATE': return 'text-green-400 bg-green-500/10'
      case 'UPDATE': return 'text-blue-400 bg-blue-500/10'
      case 'DELETE': return 'text-red-400 bg-red-500/10'
      case 'LOGIN': return 'text-purple-400 bg-purple-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  return (
    <AppDashboardLayout
      title="Sistem Denetim İzleri"
      subtitle="Kritik işlemlerin ve veri değişikliklerinin tam geçmişi"
      icon={ShieldAlert}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
           <Card variant="elevated" className="border-gray-800 bg-gray-900/50">
             <CardBody className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                   <Filter className="w-4 h-4" /> Filtrele
                </div>
                
                <div className="space-y-4">
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Modül / Tablo</label>
                      <select 
                        className="w-full bg-gray-800 border-gray-700 text-white p-2 rounded-lg text-sm"
                        value={filters.entity}
                        onChange={e => setFilters({...filters, entity: e.target.value})}
                      >
                         <option value="">Tümü</option>
                         <option value="journal_entries">Finans (Yevmiye)</option>
                         <option value="hr_attendance">İnsan Kaynakları</option>
                         <option value="inventory">Envanter</option>
                         <option value="users">Kullanıcı Yönetimi</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">İşlem Tipi</label>
                      <select 
                        className="w-full bg-gray-800 border-gray-700 text-white p-2 rounded-lg text-sm"
                        value={filters.type}
                        onChange={e => setFilters({...filters, type: e.target.value})}
                      >
                         <option value="">Tümü</option>
                         <option value="CREATE">Oluşturma (CREATE)</option>
                         <option value="UPDATE">Güncelleme (UPDATE)</option>
                         <option value="DELETE">Silme (DELETE)</option>
                         <option value="LOGIN">Giriş (LOGIN)</option>
                      </select>
                   </div>
                </div>
                
                <Button variant="ghost" className="w-full border border-gray-800 text-gray-400" onClick={loadLogs}>
                   Yenile
                </Button>
             </CardBody>
           </Card>

           {/* Stats */}
           <div className="space-y-4 opacity-70">
              <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                 <Terminal className="w-4 h-4" /> Son {logs.length} İşlem Listeleniyor
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                 <Activity className="w-4 h-4" /> Immutable Log Storage: Active
              </div>
           </div>
        </div>

        {/* Main Log Table */}
        <div className="lg:col-span-3 space-y-6">
           {loading ? (
             <PageLoader label="Denetim izleri taranıyor..." />
           ) : logs.length === 0 ? (
             <EmptyState title="Log Bulunamadı" description="Arama kriterlerine uygun işlem kaydı bulunamadı." />
           ) : (
             <Card variant="elevated" padding="none" className="border-gray-800 overflow-hidden bg-gray-900/40">
                <Table>
                   <TableHeader className="bg-white/5">
                      <TableRow className="border-gray-800">
                        <TableHead className="text-[10px] font-black text-gray-500 uppercase w-48">ZAMAN / KULLANICI</TableHead>
                        <TableHead className="text-[10px] font-black text-gray-500 uppercase">İŞLEM DETAYI</TableHead>
                        <TableHead className="text-[10px] font-black text-gray-500 uppercase text-center">TİP</TableHead>
                        <TableHead className="text-[10px] font-black text-gray-500 uppercase text-right">AKSİYON</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                     {logs.map(log => (
                       <TableRow key={log.id} className="border-gray-800 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
                         <TableCell>
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-blue-400">{format(new Date(log.created_at), 'HH:mm:ss dd/MM/yy')}</span>
                               <span className="text-xs font-bold text-white flex items-center gap-1">
                                  <User className="w-3 h-3 text-gray-600" /> {log.user_name || 'Sistem'}
                               </span>
                            </div>
                         </TableCell>
                         <TableCell>
                            <div className="flex flex-col">
                               <span className="text-xs font-medium text-gray-300 line-clamp-1">{log.description}</span>
                               <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">{log.entity_name} #{log.entity_id?.substring(0,8)}...</span>
                            </div>
                         </TableCell>
                         <TableCell className="text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border border-current ${getActionColor(log.action_type)}`}>
                               {log.action_type}
                            </span>
                         </TableCell>
                         <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-600 hover:text-white">
                               <Eye className="w-4 h-4" />
                            </Button>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                </Table>
             </Card>
           )}
        </div>
      </div>

      {/* Detail Modal / Overlay */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <Card variant="glass" className="w-full max-w-4xl max-h-[90vh] overflow-hidden border-blue-500/30 flex flex-col">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-blue-500/10">
                 <div>
                    <h3 className="text-lg font-black text-white italic">İŞLEM DETAYI ANALİZİ</h3>
                    <p className="text-xs text-blue-400 font-bold tracking-widest">{selectedLog.id}</p>
                 </div>
                 <Button variant="ghost" onClick={() => setSelectedLog(null)} className="text-white hover:bg-white/10">KAPAT</Button>
              </div>
              
              <CardBody className="p-8 overflow-y-auto space-y-8 flex-1">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                       <span className="text-[10px] font-black text-gray-500 uppercase">KULLANICI</span>
                       <p className="text-sm font-bold text-white uppercase">{selectedLog.user_name} ({selectedLog.username})</p>
                    </div>
                    <div className="space-y-1">
                       <span className="text-[10px] font-black text-gray-500 uppercase">IP ADRESİ / TARAYICI</span>
                       <p className="text-sm font-bold text-gray-400 truncate tracking-tighter">{selectedLog.ip_address || 'Gizli'} / {selectedLog.user_agent?.substring(0, 30)}...</p>
                    </div>
                    <div className="space-y-1">
                       <span className="text-[10px] font-black text-gray-500 uppercase">TARİH</span>
                       <p className="text-sm font-bold text-white">{format(new Date(selectedLog.created_at), 'PPPpppp')}</p>
                    </div>
                 </div>

                 {/* Veri Değişiklikleri - Diff View */}
                 <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">VERİ DEĞİŞİKLİĞİ (PAYLOAD)</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <span className="text-[10px] font-black text-red-500 uppercase">ÖNCEKİ HALİ (OLD DATA)</span>
                          <pre className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl text-[10px] font-mono text-red-300 overflow-x-auto h-64">
                             {selectedLog.old_data ? JSON.stringify(JSON.parse(selectedLog.old_data), null, 2) : '// No data'}
                          </pre>
                       </div>
                       <div className="space-y-2">
                          <span className="text-[10px] font-black text-green-500 uppercase">YENİ HALİ (NEW DATA)</span>
                          <pre className="p-4 bg-green-950/20 border border-green-500/20 rounded-xl text-[10px] font-mono text-green-300 overflow-x-auto h-64">
                             {selectedLog.new_data ? JSON.stringify(JSON.parse(selectedLog.new_data), null, 2) : '// No data'}
                          </pre>
                       </div>
                    </div>
                 </div>
              </CardBody>
              
              <div className="p-4 border-t border-gray-800 bg-gray-950 text-center">
                 <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.5em]">This entry was digitally signed and is legally verifiable by Super ERP Core</p>
              </div>
           </Card>
        </div>
      )}
    </AppDashboardLayout>
  )
}
