'use client'

import { useState } from 'react'
import { 
  Wallet, FileText, Download, 
  Search, Filter, Calendar,
  TrendingUp, TrendingDown, Users,
  CheckCircle2, AlertCircle, RefreshCcw,
  Printer
} from 'lucide-react'
import { useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [payrollData, setPayrollData] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleGeneratePayroll = async () => {
    setIsGenerating(true)
    try {
      const resp = await fetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth.toString().padStart(2, '0'), year: selectedYear.toString() })
      })
      if (resp.ok) {
        const data = await resp.json()
        setPayrollData(data)
        toast.success(`Bordro başarıyla hesaplandı.`)
      } else {
        toast.error('Bordro oluşturulurken hata oluştu')
      }
    } catch (err) {
      toast.error('Bağlantı hatası')
    } finally {
      setIsGenerating(false)
      setIsConfirmOpen(false)
    }
  }

  const stats = {
    totalPayout: payrollData.reduce((sum, item) => sum + item.final_salary, 0),
    avgSalary: payrollData.length > 0 ? (payrollData.reduce((sum, item) => sum + item.final_salary, 0) / payrollData.length) : 0,
    totalDeductions: payrollData.reduce((sum, item) => sum + item.deductions, 0),
    totalOvertime: payrollData.reduce((sum, item) => sum + item.overtime_hours, 0)
  }

  return (
    <div className="p-4 md:p-10 space-y-10 min-h-screen bg-[#030712]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">Finans & Bordro Yönetimi</h1>
          <p className="text-gray-500 font-bold text-sm italic">Maaş, hakediş ve kesinti kalemlerinin dönem bazlı takibi.</p>
        </div>

        <div className="flex items-center gap-4 bg-gray-900/50 p-2 rounded-2xl border border-gray-800">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-gray-950 text-white px-4 py-2 rounded-xl outline-none focus:ring-1 focus:ring-blue-600 border border-gray-800 text-xs font-black uppercase"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('tr-TR', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-950 text-white px-4 py-2 rounded-xl outline-none focus:ring-1 focus:ring-blue-600 border border-gray-800 text-xs font-black uppercase"
          >
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button 
            onClick={() => setIsConfirmOpen(true)}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            {isGenerating ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
            Bordro Oluştur
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'TOPLAM ÖDEME', value: stats.totalPayout.toLocaleString('tr-TR') + ' ₺', icon: Wallet, color: 'blue' },
          { label: 'TOPLAM KESİNTİ', value: stats.totalDeductions.toLocaleString('tr-TR') + ' ₺', icon: TrendingDown, color: 'red' },
          { label: 'TOPLAM MESAİ', value: stats.totalOvertime.toFixed(1) + ' Saat', icon: TrendingUp, color: 'emerald' },
          { label: 'ORTALAMA MAAŞ', value: Math.round(stats.avgSalary).toLocaleString('tr-TR') + ' ₺', icon: Users, color: 'indigo' }
        ].map((s, idx) => (
          <div key={idx} className="bg-gray-900/40 border border-gray-800 p-8 rounded-[2.5rem] flex flex-col items-center text-center space-y-2 group hover:border-blue-500/20 transition-all">
             <div className={`p-4 bg-${s.color}-500/10 text-${s.color}-500 rounded-2xl mb-2 group-hover:scale-110 transition-transform`}>
                <s.icon className="w-6 h-6" />
             </div>
             <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{s.label}</p>
             <h3 className="text-2xl font-black text-white">{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Table Area */}
      <div className="bg-gray-950/50 border border-gray-800 rounded-[3rem] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900/50 border-b border-gray-800">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase">Personel İsim</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase text-center">Baz Maaş</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase text-center">Çalışılan Gün</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase text-center">Toplam Mesai</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase text-center text-red-500">Kesintiler</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase text-right text-emerald-500">Hakediş (Net)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {payrollData.map((p, idx) => (
              <tr key={idx} className="group hover:bg-gray-900/30 transition-all">
                <td className="px-8 py-6">
                  <span className="text-sm font-black text-white hover:text-blue-400 transition-colors uppercase">{p.name}</span>
                </td>
                <td className="px-8 py-6 text-center text-xs font-bold text-gray-400">{p.base_salary?.toLocaleString('tr-TR')} ₺</td>
                <td className="px-8 py-6 text-center text-xs font-black text-white">{p.total_days} Gün</td>
                <td className="px-8 py-6 text-center text-xs font-black text-emerald-500">+{p.overtime_hours.toFixed(1)} sa</td>
                <td className="px-8 py-6 text-center text-xs font-black text-red-500">-{p.deductions.toLocaleString('tr-TR')} ₺</td>
                <td className="px-8 py-6 text-right">
                  <span className="text-lg font-black text-white bg-blue-600/10 px-4 py-2 rounded-xl border border-blue-600/20">{p.final_salary.toLocaleString('tr-TR')} ₺</span>
                </td>
              </tr>
            ))}
            {payrollData.length === 0 && (
              <tr>
                <td colSpan={6} className="py-32 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-40">
                    <FileText className="w-16 h-16 text-gray-700" />
                    <p className="text-sm font-black text-gray-600 uppercase tracking-widest italic">Belirtilen dönem için henüz bordro oluşturulmadı.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleGeneratePayroll}
        title="Bordro Hesaplama Onayı"
        message={`${selectedMonth}/${selectedYear} dönemi için personellerin puantaj kayıtları, mesai saatleri ve devamsızlık cezaları üzerinden maaş hakedişleri hesaplanacaktır. Devam edilsin mi?`}
        variant="info"
      />
    </div>
  )
}
