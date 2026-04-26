'use client'

import { useState } from 'react'
import { 
  Users, Building2, UserCircle, 
  ChevronRight, MapPin, Search,
  Network, Briefcase, Zap, Star
} from 'lucide-react'
import { useApi } from '@/lib/api/client'
import Link from 'next/link'

type OrgNode = {
  id: string
  first_name: string
  last_name: string
  title: string | null
  department: string | null
  manager_id: string | null
  avatar_url?: string
}

export default function OrganizationChart() {
  const { data: employees, isLoading } = useApi<OrgNode[]>('/api/hr/employees')
  const [search, setSearch] = useState('')

  const departments = Array.from(new Set(employees?.map(e => e.department).filter(Boolean)))

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-gray-700">ORGANİZASYON ŞEMASI YÜKLENİYOR...</div>

  return (
    <div className="p-4 md:p-10 space-y-10 min-h-screen bg-[#030712] overflow-hidden">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">Organizasyon Şeması</h1>
          <p className="text-gray-500 font-bold text-sm italic">Şirket hiyerarşisi ve departman bazlı yapısal görünüm.</p>
        </div>
        <div className="relative group max-w-sm w-full">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-blue-500" />
           <input 
             type="text" 
             placeholder="İsim veya departman ara..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full bg-gray-900 border border-gray-800 text-white pl-14 pr-6 py-4 rounded-3xl outline-none focus:border-blue-600 transition-all text-sm font-bold"
           />
        </div>
      </div>

      {/* Main Container - Compact Fit-to-screen */}
      <div className="bg-gray-950/50 border border-gray-800 rounded-[4rem] p-12 overflow-hidden relative">
         <div className="absolute inset-0 bg-blue-600/5 blur-[150px] -z-10" />
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
            {departments.map((dept, idx) => (
              <div key={idx} className="space-y-6">
                 <div className="flex items-center gap-3 px-6 py-3 bg-gray-900 border border-gray-800 rounded-2xl w-fit">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">{dept}</h3>
                 </div>
                 
                 <div className="space-y-4">
                    {employees?.filter(e => e.department === dept).map(emp => (
                      <Link 
                        key={emp.id}
                        href={`/hr/employees/${emp.id}`}
                        className="group block bg-gray-900/40 border border-gray-800 p-6 rounded-[2rem] hover:border-blue-500/30 hover:bg-gray-900 transition-all duration-500 backdrop-blur-sm"
                      >
                         <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-gray-950 border border-gray-800 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                               <UserCircle className="w-8 h-8 opacity-70" />
                            </div>
                            <div className="space-y-1 overflow-hidden">
                               <p className="text-sm font-black text-white uppercase truncate">{emp.first_name} {emp.last_name}</p>
                               <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest truncate">{emp.title || 'Ünvan Yok'}</p>
                            </div>
                         </div>
                         <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <Zap className="w-3 h-3 text-orange-500" />
                               <span className="text-[9px] font-bold text-gray-600 uppercase">KIDEMLİ</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-white transition-colors" />
                         </div>
                      </Link>
                    ))}
                 </div>
              </div>
            ))}
         </div>
      </div>

      <div className="flex items-center justify-center gap-10 opacity-30 italic font-black text-[9px] uppercase tracking-[0.4em] py-10">
         <span>Livasofa Structural Chart v4.0</span>
         <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
         <span>Real-time Sync Active</span>
      </div>
    </div>
  )
}
