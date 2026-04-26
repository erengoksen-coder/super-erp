'use client'

import { useState } from 'react'
import { PieChart, Calendar, ChevronLeft, Download, Printer, ShieldCheck, TrendingDown, Layers, Landmark, Wallet } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ExcelExportButton, PdfExportButton } from '@/components/ui/ExportButtons'

export default function BalanceSheetPage() {
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // SWR Hook
  const { data, isLoading } = useApi<any>(
    `/api/financial/balance-sheet?endDate=${endDate}`
  )

  const { assets, liabilities, equity } = data || {}

  const totalAssets = (assets?.totalAssets || 0)
  const totalLiabilitiesEquity = (liabilities?.totalLiabilities || 0) + (equity?.totalEquity || 0)

  const logExport = async (format: 'EXCEL' | 'PDF') => {
    try {
      await fetch('/api/audit/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: 'Bilanço Raporu',
          format,
          filter: { endDate }
        })
      })
    } catch (error) {
      console.error('Audit log failed:', error)
    }
  }

  return (
    <AppDashboardLayout
      title="Bilanço Raporu"
      subtitle="Varlıklar (Aktif), Borçlar ve Özkaynaklar (Pasif) dengesi"
      icon={PieChart}
      actions={
        <div className="flex gap-2">
          <PdfExportButton 
            elementId="balance-sheet-report" 
            filename="bilanco_raporu" 
            variant="outline"
            onExport={() => logExport('PDF')}
          />
          <ExcelExportButton 
            data={[
              { 'Grup': 'AKTİF (VARLIKLAR)', 'Alt Grup': 'Dönen Varlıklar', 'Değer': assets?.currentAssets },
              { 'Grup': 'AKTİF (VARLIKLAR)', 'Alt Grup': 'Duran Varlıklar', 'Değer': assets?.fixedAssets },
              { 'Grup': 'PASİF (KAYNAKLAR)', 'Alt Grup': 'Kısa Vadeli Yabancı Kaynaklar', 'Değer': liabilities?.totalLiabilities },
              { 'Grup': 'PASİF (KAYNAKLAR)', 'Alt Grup': 'Özkaynaklar', 'Değer': equity?.totalEquity }
            ]} 
            filename="bilanco_raporu"
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
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bilanço Tarihi:</span>
               <Input 
                 type="date" 
                 value={endDate} 
                 onChange={e => setEndDate(e.target.value)}
                 className="w-40 h-9 bg-gray-900 border-gray-800 text-xs font-bold"
               />
            </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="h-[600px] rounded-3xl" />
          <Skeleton className="h-[600px] rounded-3xl" />
        </div>
      ) : !data ? (
        <EmptyState title="Veri Bulunamadı" description="Seçilen tarih itibariyle herhangi bir bakiye tespit edilemedi." />
      ) : (
        <div id="balance-sheet-report" className="grid grid-cols-1 lg:grid-cols-2 gap-12 p-4 bg-[#0f172a]">
          {/* ASSETS SECTION (AKTİF) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500 shadow-lg shadow-green-500/5">
                   <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">AKTİF (VARLIKLAR)</h2>
              </div>
              <Badge variant="soft" color="success">Varlıklar</Badge>
            </div>

            <Card variant="elevated" padding="none" className="border-gray-800 bg-gray-900/40 relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 right-0 p-8 opacity-5"><Landmark className="w-48 h-48 text-white" /></div>
              <CardBody className="p-8 space-y-10 relative z-10">
                <div>
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> DÖNEN VARLIKLAR
                  </h4>
                  <div className="space-y-4">
                     <BalanceItem label="Kasa ve Bankalar (10)" value={assets?.currentAssets} />
                     <BalanceItem label="Ticari Alacaklar (12)" value={0} />
                     <BalanceItem label="Stoklar (15)" value={0} />
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> DURAN VARLIKLAR
                  </h4>
                  <div className="space-y-4">
                     <BalanceItem label="Maddi Duran Varlıklar (25)" value={assets?.fixedAssets} />
                  </div>
                </div>

                <div className="pt-10 mt-10 border-t-2 border-green-500/30 flex justify-between items-center text-green-400">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">TOPLAM AKTİF</span>
                     <span className="text-sm font-bold text-gray-300">İşletme Varlıkları</span>
                   </div>
                   <span className="text-3xl font-black tracking-tighter shadow-green-500/10 drop-shadow-lg">{totalAssets.toLocaleString('tr-TR')} ₺</span>
                </div>
              </CardBody>
            </Card>
          </section>

          {/* LIABILITIES & EQUITY SECTION (PASİF) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 shadow-lg shadow-orange-500/5">
                   <TrendingDown className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">PASİF (KAYNAKLAR)</h2>
              </div>
              <Badge variant="soft" color="warning">Borçlar & Özkaynak</Badge>
            </div>

            <Card variant="elevated" padding="none" className="border-gray-800 bg-gray-900/40 relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 right-0 p-8 opacity-5"><Layers className="w-48 h-48 text-white" /></div>
              <CardBody className="p-8 space-y-10 relative z-10">
                <div>
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> YABANCI KAYNAKLAR (BORÇLAR)
                  </h4>
                  <div className="space-y-4">
                     <BalanceItem label="Kısa Vadeli Yabancı Kaynaklar (3)" value={liabilities?.totalLiabilities} />
                     <BalanceItem label="Uzun Vadeli Yabancı Kaynaklar (4)" value={0} />
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> ÖZKAYNAKLAR
                  </h4>
                  <div className="space-y-4">
                     <BalanceItem label="Ödenmiş Sermaye (50)" value={equity?.totalEquity} />
                     <BalanceItem label="Dönem Net Kârı / Zararı (59)" value={0} />
                  </div>
                </div>

                <div className="pt-10 mt-10 border-t-2 border-orange-500/30 flex justify-between items-center text-orange-400">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">TOPLAM PASİF</span>
                     <span className="text-sm font-bold text-gray-300">Borçlar ve Sermaye</span>
                   </div>
                   <span className="text-3xl font-black tracking-tighter shadow-orange-500/10 drop-shadow-lg">{totalLiabilitiesEquity.toLocaleString('tr-TR')} ₺</span>
                </div>
              </CardBody>
            </Card>
          </section>
        </div>
      )}

      {/* BALANCE CHECKER */}
      {!isLoading && data && (
        <div className="mt-12 p-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent">
          <div className="bg-gray-900 p-4 flex justify-center items-center gap-8">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${totalAssets === totalLiabilitiesEquity ? 'bg-green-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                {totalAssets === totalLiabilitiesEquity ? 'BİLANÇO DENGELİ' : 'BİLANÇO DENGESİZ'}
              </span>
            </div>
            {totalAssets !== totalLiabilitiesEquity && (
              <span className="text-rose-500 text-xs font-black">Fark: {Math.abs(totalAssets - totalLiabilitiesEquity).toLocaleString('tr-TR')} ₺</span>
            )}
          </div>
        </div>
      )}
    </AppDashboardLayout>
  )
}

function BalanceItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center group py-1 border-b border-white/[0.02] last:border-0">
       <div className="flex items-center gap-2">
         <div className="w-1 h-1 bg-gray-700 rounded-full group-hover:bg-primary transition-colors" />
         <span className="text-xs font-black text-gray-500 group-hover:text-gray-300 transition-colors uppercase tracking-tight">{label}</span>
       </div>
       <div className="flex items-center gap-2">
         <span className="text-sm font-mono text-white">{(value || 0).toLocaleString('tr-TR')} ₺</span>
         <div className="p-1 rounded-md bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
           <Wallet className="w-3 h-3 text-gray-500" />
         </div>
       </div>
    </div>
  )
}
