'use client'

import { 
  Users, Calendar, Clock, 
  TrendingUp, BarChart3, 
  CheckCircle2, AlertCircle,
  BirthdayCake, ArrowUpRight,
  Activity, Users2
} from 'lucide-react'
import { useApi } from '@/lib/api/client'
import { useRouter } from 'next/navigation'

export default function HRDashboard() {
  const router = useRouter()
  const { data, isLoading } = useApi<any>('/api/hr/dashboard')

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-gray-700">DASHBOARD YÜKLENİYOR...</div>

  const stats = data?.stats || {
    total_employees: 0,
    present_today: 0,
    absent_today: 0,
    on_leave: 0
  }

  return (
    <div className="p-4 md:p-10 space-y-12 min-h-screen bg-[#030712]">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">İK Yönetim Paneli</h1>
          <p className="text-gray-500 font-bold text-sm italic">Livasofa Pro ERP İnsan Kaynakları yönetim ve analiz merkezi.</p>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => router.push('/hr/attendance')}
             className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/30 transition-all flex items-center gap-2"
           >
              <Clock className="w-4 h-4" /> BUGÜNKÜ PUANTAJ
           </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'TOPLAM PERSONEL', value: stats.total_employees, icon: Users, color: 'blue', detail: '+2 Bu Ay' },
          { label: 'BUGÜN GELENLER', value: stats.present_today, icon: CheckCircle2, color: 'emerald', detail: '%94 Katılım' },
          { label: 'BUGÜN GELMEYENLER', value: stats.absent_today, icon: AlertCircle, color: 'red', detail: 'Ceza/Kesinti Uygulanır' },
          { label: 'İZİNLİ PERSONEL', value: stats.on_leave, icon: Calendar, color: 'indigo', detail: 'Onaylı İzinler' }
        ].map((s, idx) => (
          <div key={idx} className="bg-gray-900 border border-gray-800 p-8 rounded-[3rem] hover:border-blue-500/20 transition-all group relative overflow-hidden">
             <div className={`absolute top-0 right-0 p-8 opacity-5 font-black text-8xl text-${s.color}-500 group-hover:scale-110 transition-transform`}>
                <s.icon className="w-24 h-24" />
             </div>
             <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none mb-1">{s.label}</p>
             <h3 className="text-4xl font-black text-white leading-none mb-4">{s.value}</h3>
             <div className="flex items-center gap-1.5 pt-2">
                <ArrowUpRight className={`w-3 h-3 text-${s.color}-500`} />
                <span className="text-[10px] font-bold text-gray-500">{s.detail}</span>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Recent Activity/Birthdays */}
        <div className="lg:col-span-1 space-y-10">
          <div className="bg-gray-900 border border-gray-800 p-10 rounded-[4rem] relative overflow-hidden">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                 <BirthdayCake className="w-4 h-4 text-pink-500" /> YAKLAŞAN DOĞUM GÜNLERİ
              </h3>
              <div className="space-y-6">
                 {data?.upcomingBirthdays?.map((b: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between group cursor-pointer" onClick={() => router.push('/hr/employees')}>
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-950 border border-gray-800 rounded-xl flex items-center justify-center font-black text-xs text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                             {b.first_name[0]}{b.last_name[0]}
                          </div>
                          <div>
                             <p className="text-sm font-black text-white uppercase">{b.first_name} {b.last_name}</p>
                             <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter italic">Kutlamaya Katıl</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest">{new Date(b.birth_date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</p>
                       </div>
                    </div>
                 ))}
                 {!data?.upcomingBirthdays?.length && (
                    <p className="py-4 text-center text-[10px] font-black text-gray-700 uppercase italic">Yakında doğum günü bulunmuyor.</p>
                 )}
              </div>
          </div>
        </div>

        {/* Right Column: Performance/Analytics Charts placeholder */}
        <div className="lg:col-span-2 bg-gray-900/40 border border-gray-800 p-12 rounded-[4rem] relative overflow-hidden flex flex-col justify-center items-center text-center space-y-6">
            <div className="absolute inset-0 bg-blue-600/5 blur-[120px] -z-10" />
            <Activity className="w-20 h-20 text-gray-800 animate-pulse" />
            <div className="space-y-2">
               <h3 className="text-4xl font-black text-white uppercase tracking-tighter">İş Gücü Analitiği</h3>
               <p className="text-sm font-medium text-gray-500 italic">Verimlilik, katılım ve departman bazlı büyüme verileri burada simüle edilecektir.</p>
            </div>
            <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-2xl">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="h-32 w-4 bg-gray-800/50 rounded-full relative overflow-hidden mx-auto">
                    <div className="absolute bottom-0 left-0 right-0 bg-blue-600 transition-all duration-1000" style={{ height: `${20 + i * 15}%` }} />
                 </div>
               ))}
            </div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="flex items-center justify-center gap-10 opacity-30 italic font-black text-[9px] uppercase tracking-[0.4em] py-10">
         <span>Livasofa Pro Dashboard v4.1</span>
         <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
         <span>Real-time Sync Active</span>
      </div>
    </div>
  )
}
