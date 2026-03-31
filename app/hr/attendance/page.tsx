'use client'

import { useState, useEffect } from 'react'
import { 
  Users, CheckCircle2, XCircle, Clock, 
  Search, Filter, Save, Calendar, 
  ChevronLeft, ChevronRight, UserPlus,
  AlertCircle, Building2, UserCircle,
  Activity, LogOut, Info, RefreshCcw
} from 'lucide-react'
import { useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import Link from 'next/link'

type AttendanceRecord = {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  department: string | null
  date: string
  status: string
  check_in: string | null
  check_out: string | null
  notes: string | null
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const { data: attendanceData, isLoading, mutate } = useApi<AttendanceRecord[]>(`/api/hr/attendance?date=${selectedDate}`)
  const [search, setSearch] = useState('')
  const [localRecords, setLocalRecords] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (attendanceData) {
      setLocalRecords(attendanceData.map(r => ({
        ...r,
        check_in: r.check_in || '08:00',
        check_out: r.check_out || '18:00'
      })))
    }
  }, [attendanceData])

  const stats = {
    total: localRecords.length,
    present: localRecords.filter(r => r.status === 'present').length,
    absent: localRecords.filter(r => r.status === 'absent').length,
    leave: localRecords.filter(r => r.status === 'leave').length
  }

  const handleUpdateStatus = (employeeId: string, status: string) => {
    setLocalRecords(prev => prev.map(r => 
      r.employee_id === employeeId ? { ...r, status } : r
    ))
  }

  const handleUpdateTime = (employeeId: string, field: 'check_in' | 'check_out', value: string) => {
    setLocalRecords(prev => prev.map(r => 
      r.employee_id === employeeId ? { ...r, [field]: value } : r
    ))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const resp = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          records: localRecords
        })
      })
      if (resp.ok) {
        toast.success('Puantaj kayıtları başarıyla güncellendi')
        mutate()
      } else {
        toast.error('Kayıt sırasında bir hata oluştu')
      }
    } catch (error) {
      toast.error('Bağlantı hatası')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredRecords = localRecords.filter(r => 
    `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    r.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen bg-[#030712] text-white">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent uppercase tracking-tight">Günlük Puantaj Yönetimi</h1>
          <p className="text-gray-500 font-medium text-sm">Personel devamlılık ve çalışma saati takibi.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-gray-900/50 p-2 rounded-2xl border border-gray-800">
          <button 
            onClick={() => setSelectedDate(new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1)).toISOString().split('T')[0])}
            className="p-2.5 hover:bg-gray-800 rounded-xl transition-all text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-900 border border-gray-800 rounded-xl">
            <Calendar className="w-4 h-4 text-blue-500" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-white outline-none focus:ring-0 appearance-none"
            />
          </div>

          <button 
            onClick={() => setSelectedDate(new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() + 1)).toISOString().split('T')[0])}
            className="p-2.5 hover:bg-gray-800 rounded-xl transition-all text-gray-400 hover:text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'TOPLAM PERSONEL', value: stats.total, icon: Users, color: 'blue' },
          { label: 'GELDİ (OK)', value: stats.present, icon: CheckCircle2, color: 'green' },
          { label: 'DEVAMSIZ', value: stats.absent, icon: XCircle, color: 'red' },
          { label: 'İZİNLİ / RAPORLU', value: stats.leave, icon: Clock, color: 'orange' }
        ].map((s, idx) => (
          <div key={idx} className="bg-gray-900/40 border border-gray-800 p-6 rounded-[2rem] hover:border-gray-700 transition-all flex items-center justify-between group overflow-hidden relative">
            <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500 text-${s.color}-500`}>
              <s.icon className="w-24 h-24" />
            </div>
            <div className="space-y-1 relative z-10">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{s.label}</p>
              <h3 className="text-3xl font-black text-white leading-none">{s.value}</h3>
            </div>
            <div className={`p-4 bg-${s.color}-500/10 text-${s.color}-500 rounded-2xl relative z-10`}>
              <s.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Controls Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-900/20 border border-gray-800 p-6 rounded-[2.5rem]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input 
            type="text"
            placeholder="İsim veya departman ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 text-white pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm font-medium"
          />
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLocalRecords(prev => prev.map(r => ({ ...r, status: 'present', check_in: '08:00', check_out: '18:00' })))}
            className="px-6 py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-800 transition-all active:scale-95"
          >
            Hepsini Geldi İşaretle
          </button>
          <button 
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
          >
            {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'KAYDEDİLİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
          </button>
        </div>
      </div>

      {/* Roster Area */}
      <div className="bg-gray-950/50 border border-gray-800 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-800">
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Personel Bilgisi</th>
                <th className="px-8 py-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Durum (Anlık)</th>
                <th className="px-8 py-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Giriş Saati</th>
                <th className="px-8 py-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Çıkış Saati</th>
                <th className="px-8 py-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Notlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="group hover:bg-gray-900/30 transition-all duration-300">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center text-blue-500 font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                        {record.first_name[0]}{record.last_name[0]}
                      </div>
                      <div className="space-y-1">
                        <Link href={`/hr/employees/${record.employee_id}`} className="text-sm font-black text-white hover:text-blue-400 transition-colors uppercase">
                          {record.first_name} {record.last_name}
                        </Link>
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter italic">{record.department || 'Bölüm Belirtilmemiş'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2">
                       {[
                         { id: 'present', label: 'GELDİ', color: 'green', icon: CheckCircle2 },
                         { id: 'absent', label: 'DEVAMSIZ', color: 'red', icon: XCircle },
                         { id: 'leave', label: 'İZİNLİ', color: 'blue', icon: Clock },
                         { id: 'medical', label: 'RAPORLU', color: 'indigo', icon: Info }
                       ].map(btn => (
                         <button
                           key={btn.id}
                           onClick={() => handleUpdateStatus(record.employee_id, btn.id)}
                           className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${
                             record.status === btn.id 
                             ? `bg-${btn.color}-500 text-white shadow-lg shadow-${btn.color}-500/30 border border-${btn.color}-400`
                             : 'bg-gray-900/50 text-gray-600 hover:text-gray-400 border border-gray-800/50'
                           }`}
                         >
                           <btn.icon className="w-3.5 h-3.5" />
                           {btn.label}
                         </button>
                       ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center">
                      <div className="group/time relative">
                        <input 
                          type="time" 
                          value={record.check_in || '08:00'} 
                          onChange={(e) => handleUpdateTime(record.employee_id, 'check_in', e.target.value)}
                          className="bg-gray-900/80 border border-gray-800 text-white px-5 py-3 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        />
                        <Clock className="w-3 h-3 text-gray-600 absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/time:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center">
                      <div className="group/time relative">
                        <input 
                          type="time" 
                          value={record.check_out || '18:00'} 
                          onChange={(e) => handleUpdateTime(record.employee_id, 'check_out', e.target.value)}
                          className="bg-gray-900/80 border border-gray-800 text-white px-5 py-3 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        />
                        <LogOut className="w-3 h-3 text-gray-600 absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/time:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <input 
                      type="text" 
                      placeholder="..."
                      className="w-full min-w-[120px] bg-transparent border-b border-gray-800 text-[11px] font-medium text-gray-400 focus:border-blue-500 outline-none pb-1 group-hover:text-white transition-colors"
                    />
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <Users className="w-16 h-16 text-gray-600" />
                      <p className="text-sm font-black text-gray-500 uppercase tracking-widest italic">Arama kriterlerine uygun personel bulunamadı.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Bottom Footer Section */}
      <div className="flex items-center justify-center gap-8 py-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Livasofa Pro ERP HR Module</span>
          </div>
          <div className="w-1 h-1 bg-gray-800 rounded-full" />
          <div className="flex items-center gap-2 text-blue-500">
              <Activity className="w-5 h-5 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Online</span>
          </div>
      </div>
    </div>
  )
}
