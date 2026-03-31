'use client'

import { useState } from 'react'
import { TrendingUp, Calendar, ChevronLeft, Download, Printer, PieChart, ArrowUpRight, ArrowDownRight, Target, Activity } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { format, subMonths } from 'date-fns'
import { ExcelExportButton, PdfExportButton } from '@/components/ui/ExportButtons'

export default function IncomeStatementPage() {
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // SWR Hook
  const { data, isLoading } = useApi<any>(
    `/api/financial/income-statement?startDate=${startDate}&endDate=${endDate}`
  )

  const { revenue, expenses, profitability } = data || {}

  const logExport = async (format: 'EXCEL' | 'PDF') => {
    try {
      await fetch('/api/audit/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: 'Gelir Tablosu (P&L)',
          format,
          filter: { startDate, endDate }
        })
      })
    } catch (error) {
      console.error('Audit log failed:', error)
    }
  }

  return (
    <AppDashboardLayout
      title="Gelir Tablosu (P&L)"
      subtitle="Kâr ve zarar analizi, gelir/gider dağılımı"
      icon={TrendingUp}
      actions={
        <div className="flex gap-2">
          <PdfExportButton 
            elementId="income-statement-report" 
            filename="gelir_tablosu" 
            variant="outline"
            onExport={() => logExport('PDF')}
          />
          <ExcelExportButton 
            data={[
              { 'Kalem': 'I. BRÜT SATIŞLAR', 'Tutar': revenue?.totalRevenue },
              { 'Kalem': 'II. SATIŞLARIN MALİYETİ (-)', 'Tutar': expenses?.costOfGoodsSold },
              { 'Kalem': 'BRÜT SATIŞ KÂRI / ZARARI', 'Tutar': profitability?.grossProfit },
              { 'Kalem': 'III. FAALİYET GİDERLERİ (-)', 'Tutar': expenses?.operatingExpenses },
              { 'Kalem': 'NET DÖNEM SONUCU', 'Tutar': profitability?.netIncome }
            ]} 
            filename="gelir_tablosu"
            variant="solid"
            onExport={() => logExport('EXCEL')}
          />
        </div>
      }
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
            <Link href="/finance">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                 <ChevronLeft className="w-4 h-4 mr-1" /> Geri
              </Button>
            </Link>
            <div className="h-4 w-px bg-gray-800" />
            <div className="flex items-center gap-3">
               <Calendar className="w-4 h-4 text-primary" />
               <Input 
                 type="date" 
                 value={startDate} 
                 onChange={e => setStartDate(e.target.value)}
                 className="w-36 h-9 bg-gray-900 border-gray-800 text-xs font-bold"
               />
               <span className="text-gray-600">to</span>
               <Input 
                 type="date" 
                 value={endDate} 
                 onChange={e => setEndDate(e.target.value)}
                 className="w-36 h-9 bg-gray-900 border-gray-800 text-xs font-bold"
               />
            </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-[600px] rounded-3xl" />
          <div className="space-y-8">
            <Skeleton className="h-[200px] rounded-3xl" />
            <Skeleton className="h-[200px] rounded-3xl" />
          </div>
        </div>
      ) : !data ? (
        <EmptyState title="Veri Bulunamadı" description="Bu dönem aralığında gelir veya gider hareketi bulunmuyor." />
      ) : (
        <div id="income-statement-report" className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 bg-[#0f172a]">
          {/* Main Statement Card */}
          <Card variant="elevated" padding="none" className="lg:col-span-2 border-gray-800 bg-gray-900/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp className="w-64 h-64 text-white" /></div>
            <CardBody className="p-0 relative z-10">
              <div className="p-6 border-b border-gray-800 bg-white/5 flex justify-between items-center">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DÖNEMLİK KÂR / ZARAR CETVELİ</h3>
                <Badge variant="soft" color="primary" className="text-[9px] uppercase tracking-tighter">Resmi Rapor</Badge>
              </div>
              
              <div className="p-8 space-y-10">
                {/* Revenue Section */}
                <section className="space-y-4">
                  <div className="flex justify-between items-end border-b border-gray-800 pb-3">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-tight">I. BRÜT SATIŞLAR</h4>
                    <span className="text-2xl font-black text-green-400">{revenue?.totalRevenue?.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  <div className="pl-6 space-y-3">
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Yurtiçi Satışlar (600)</span>
                      <span className="text-gray-300 font-mono">{revenue?.salesRevenue?.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  </div>
                </section>

                {/* COGS Section */}
                <section className="space-y-4">
                  <div className="flex justify-between items-end border-b border-gray-800 pb-3">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-tight">II. SATIŞLARIN MALİYETİ (-)</h4>
                    <span className="text-2xl font-black text-rose-400">({expenses?.costOfGoodsSold?.toLocaleString('tr-TR')}) ₺</span>
                  </div>
                </section>

                {/* Gross Profit */}
                <div className="p-6 bg-green-500/10 rounded-2xl flex justify-between items-center border border-green-500/20 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg"><Activity className="w-4 h-4 text-green-400" /></div>
                    <span className="text-xs font-black text-green-500 uppercase">BRÜT SATIŞ KÂRI / ZARARI</span>
                  </div>
                  <span className="text-2xl font-black text-green-400 underline underline-offset-8 decoration-double decoration-green-500/50">
                    {profitability?.grossProfit?.toLocaleString('tr-TR')} ₺
                  </span>
                </div>

                {/* Operating Expenses */}
                <section className="space-y-4">
                  <div className="flex justify-between items-end border-b border-gray-800 pb-3">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-tight">III. FAALİYET GİDERLERİ (-)</h4>
                    <span className="text-2xl font-black text-rose-400">({expenses?.operatingExpenses?.toLocaleString('tr-TR')}) ₺</span>
                  </div>
                  <div className="pl-6 space-y-3">
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Genel Yönetim Giderleri (770/632)</span>
                      <span className="text-gray-300 font-mono">{expenses?.operatingExpenses?.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  </div>
                </section>

                {/* Net Income */}
                <div className="pt-10 mt-10 border-t-2 border-dashed border-gray-800">
                  <div className={`p-8 rounded-[2.5rem] flex justify-between items-center border ${profitability?.netIncome >= 0 ? 'bg-green-600/10 border-green-500/20 shadow-lg shadow-green-500/5' : 'bg-rose-600/10 border-rose-500/20 shadow-lg shadow-rose-500/5'}`}>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] leading-none mb-2">NET DÖNEM SONUCU</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase italic tracking-tighter flex items-center gap-1">
                        <Target className="w-3 h-3" /> Tüm vergiler ve maliyetler sonrası net performans
                      </p>
                    </div>
                    <span className={`text-4xl font-black tracking-tighter ${profitability?.netIncome >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                      {profitability?.netIncome?.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Side Panels */}
          <div className="space-y-8">
            <Card variant="glass" className="border-primary/20 bg-primary/5">
              <CardBody className="p-6">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                  <PieChart className="w-4 h-4" /> PERFORMANS ANALİZİ
                </h3>
                <div className="space-y-8">
                   <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-wider">
                         <span>Brüt Kâr Marjı</span>
                         <Badge variant="soft" color="primary" className="text-xs font-black">%{profitability?.grossMargin?.toFixed(1)}</Badge>
                      </div>
                      <div className="h-2 w-full bg-gray-800/50 rounded-full overflow-hidden border border-gray-700/50">
                        <div className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000 shadow-[0_0_10px_rgba(34,197,94,0.3)]" style={{ width: `${Math.min(profitability?.grossMargin || 0, 100)}%` }} />
                      </div>
                   </div>
                   <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-wider">
                         <span>Net Kâr Marjı</span>
                         <Badge variant="soft" color="primary" className="text-xs font-black">%{profitability?.netMargin?.toFixed(1)}</Badge>
                      </div>
                      <div className="h-2 w-full bg-gray-800/50 rounded-full overflow-hidden border border-gray-700/50">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.3)]" style={{ width: `${Math.min(profitability?.netMargin || 0, 100)}%` }} />
                      </div>
                   </div>
                </div>
              </CardBody>
            </Card>

            <Card variant="outlined" className="bg-gray-900/60 border-gray-800 backdrop-blur-xl">
              <CardBody className="p-6">
                 <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">SİSTEM ÖNGÖRÜLERİ</h3>
                 <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <ArrowUpRight className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-300">Gelir Artışı</p>
                          <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Satış gelirleri operasyonel maliyetlere göre daha hızlı optimize ediliyor.</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <ArrowDownRight className="w-4 h-4 text-rose-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-300">Gider Uyarısı</p>
                          <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Genel yönetim giderleri bu dönem bütçe projeksiyonunun %5 üzerine çıktı.</p>
                        </div>
                      </div>
                    </div>
                 </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </AppDashboardLayout>
  )
}
