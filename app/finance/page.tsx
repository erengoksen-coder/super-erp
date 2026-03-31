'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  BookOpenCheck,
  ListChecks,
  Plus,
  DollarSign,
  Wallet,
  CreditCard,
  BarChart3,
  TrendingUp,
  FileText,
  Flame,
  Calculator,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  ArrowRight,
  Banknote,
  ReceiptText,
  ShieldCheck
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'

function FinanceHubCard({
  href,
  icon: Icon,
  title,
  description,
  colorClass = 'text-primary',
  bgClass = 'bg-primary/10',
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  colorClass?: string
  bgClass?: string
}) {
  return (
    <Link href={href} className="block group h-full">
      <Card variant="glass" className="h-full border-border/10 hover:border-primary/40 transition-all duration-500 cursor-pointer overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
        <CardBody className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-4">
            <div className={cn("p-4 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg group-hover:shadow-primary/20", bgClass, colorClass)}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-foreground tracking-tight group-hover:text-primary transition-colors">{title}</h2>
              <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-[0.2em]">{description}</p>
            </div>
          </div>
          <div className="mt-auto flex justify-end">
             <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4" />
             </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  )
}

export default function FinancePage() {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadSummary = async () => {
    try {
      const data = await fetchApi('/api/financial/summary')
      setSummary(data)
    } catch (err) {
      toast.error('Finansal özet yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSummary() }, [])

  const cashBank = (summary?.cash || 0) + (summary?.bank || 0)
  const income = summary?.income || 0
  const expense = summary?.expense || 0
  const netFlow = income - expense

  return (
    <AppDashboardLayout
      title="Finans Yönetimi"
      subtitle="Profesyonel muhasebe ve finansal analiz merkezi"
      icon={DollarSign}
      className="animate-reveal"
      actions={
        <div className="flex gap-2">
          <Link href="/finance/new">
            <Button variant="solid" color="primary" size="sm" className="shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" />
              YENİ FİŞ
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-12">
        {/* Finansal KPI Grid - Modernized */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card variant="glass" className="group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
             <CardBody className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">Kasa & Banka</p>
                   <Banknote className="w-5 h-5 text-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-3xl font-black text-foreground leading-tight">
                   {loading ? <span className="animate-pulse opacity-20">0,00</span> : cashBank.toLocaleString('tr-TR')} <span className="text-sm font-normal text-foreground/40">₺</span>
                </h3>
                <div className="mt-4 flex items-center gap-2">
                   <Badge variant="soft" color="success" className="text-[10px] font-black tracking-tighter">
                      <ArrowUpRight className="w-3 h-3 mr-1" /> %4.2 GÜNCEL
                   </Badge>
                </div>
             </CardBody>
          </Card>

          <Card variant="glass" className="group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-glow" />
             <CardBody className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">Aylık Gelir</p>
                   <TrendingUp className="w-5 h-5 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-3xl font-black text-foreground leading-tight">
                   {loading ? <span className="animate-pulse opacity-20">0,00</span> : income.toLocaleString('tr-TR')} <span className="text-sm font-normal text-foreground/40">₺</span>
                </h3>
                <div className="mt-4 flex items-center gap-2">
                   <Badge variant="soft" color="primary" className="text-[10px] font-black tracking-tighter">
                      HEDEFE YAKIN
                   </Badge>
                </div>
             </CardBody>
          </Card>

          <Card variant="glass" className="group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
             <CardBody className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">Aylık Gider</p>
                   <ArrowDownRight className="w-5 h-5 text-red-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-3xl font-black text-foreground leading-tight">
                   {loading ? <span className="animate-pulse opacity-20">0,00</span> : expense.toLocaleString('tr-TR')} <span className="text-sm font-normal text-foreground/40">₺</span>
                </h3>
                <div className="mt-4 flex items-center gap-2">
                   <Badge variant="soft" color="error" className="text-[10px] font-black tracking-tighter uppercase">
                      <ArrowDownRight className="w-3 h-3 mr-1" /> %2.1 TASARRUF
                   </Badge>
                </div>
             </CardBody>
          </Card>

          <Card variant="glass" className="group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
             <CardBody className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">Net Nakit Akışı</p>
                   <Activity className="w-5 h-5 text-purple-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-3xl font-black text-foreground leading-tight">
                   {loading ? <span className="animate-pulse opacity-20">0,00</span> : netFlow.toLocaleString('tr-TR')} <span className="text-sm font-normal text-foreground/40">₺</span>
                </h3>
                <div className="mt-4 flex items-center gap-2">
                   <Badge variant="soft" color="secondary" className="text-[10px] font-black tracking-tighter uppercase font-mono">
                      {netFlow >= 0 ? 'POZİTİF' : 'NEGATİF'} STABİL
                   </Badge>
                </div>
             </CardBody>
          </Card>
        </div>

        {/* Sections Wrapper */}
        <div className="space-y-16 pb-12">
          {/* Kayıtlar Section */}
          <section className="animate-reveal" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-4 mb-8">
               <div className="w-1.5 h-6 bg-primary rounded-full shadow-glow" />
               <h2 className="text-sm font-black text-foreground/80 uppercase tracking-[0.3em]">Muhasebe Kayıtları</h2>
               <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FinanceHubCard
                href="/finance/journal-entries"
                icon={ListChecks}
                title="Yevmiye Kayıtları"
                description="Günlük muhasebe fişleri"
                colorClass="text-emerald-400"
                bgClass="bg-emerald-500/10"
              />
              <FinanceHubCard
                href="/finance/chart-of-accounts"
                icon={BookOpen}
                title="Hesap Planı"
                description="TDHP hiyerarşisi ve bakiyeler"
                colorClass="text-primary"
                bgClass="bg-primary/10"
              />
              <FinanceHubCard
                href="/finance/general-ledger"
                icon={BookOpenCheck}
                title="Büyük Defter"
                description="Defter-i kebir hareketleri"
                colorClass="text-yellow-400"
                bgClass="bg-yellow-500/10"
              />
            </div>
          </section>

          {/* Raporlar Section */}
          <section className="animate-reveal" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-4 mb-8">
               <div className="w-1.5 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_purple]" />
               <h2 className="text-sm font-black text-foreground/80 uppercase tracking-[0.3em]">Finansal Raporlar</h2>
               <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FinanceHubCard
                href="/finance/trial-balance"
                icon={BarChart3}
                title="Mizan"
                description="Dönem borç/alacak tablosu"
                colorClass="text-cyan-400"
                bgClass="bg-cyan-500/10"
              />
              <FinanceHubCard
                href="/finance/income-statement"
                icon={TrendingUp}
                title="Gelir Tablosu"
                description="Kâr / zarar özeti (P&L)"
                colorClass="text-emerald-400"
                bgClass="bg-emerald-500/10"
              />
              <FinanceHubCard
                href="/finance/balance-sheet"
                icon={PieChart}
                title="Bilanço"
                description="Varlık, borç ve özkaynak dengesi"
                colorClass="text-amber-400"
                bgClass="bg-amber-500/10"
              />
              <FinanceHubCard
                href="/finance/metrics"
                icon={Activity}
                title="Analitik Metrikler"
                description="Likidite ve verimlilik rasyoları"
                colorClass="text-violet-400"
                bgClass="bg-violet-500/10"
              />
            </div>
          </section>

          {/* Cari & Maliyet Section */}
          <section className="animate-reveal" style={{ animationDelay: '400ms' }}>
             <div className="flex items-center gap-4 mb-8">
               <div className="w-1.5 h-6 bg-red-500 rounded-full shadow-[0_0_10px_red]" />
               <h2 className="text-sm font-black text-foreground/80 uppercase tracking-[0.3em]">Cari ve Maliyet</h2>
               <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FinanceHubCard
                href="/accounts"
                icon={Wallet}
                title="Cari Hesaplar"
                description="Müşteri ve tedarikçi yönetimi"
                colorClass="text-indigo-400"
                bgClass="bg-indigo-500/10"
              />
              <FinanceHubCard
                href="/finance/cost-analysis"
                icon={Calculator}
                title="Maliyet Analizi"
                description="Üretim ve birim maliyet takibi"
                colorClass="text-rose-400"
                bgClass="bg-rose-500/10"
              />
              <FinanceHubCard
                href="/finance/fire-analysis"
                icon={Flame}
                title="Fire Takibi"
                description="Hammadde ve üretim fireleri"
                colorClass="text-orange-400"
                bgClass="bg-orange-500/10"
              />
            </div>
          </section>
        </div>
      </div>

      {/* Footer Branding - Modernized */}
      <div className="flex flex-col items-center justify-center gap-4 opacity-20 py-12 animate-reveal" style={{ animationDelay: '500ms' }}>
         <div className="flex items-center gap-10 italic font-black text-[9px] uppercase tracking-[0.6em]">
            <span>Livasofa Pro Finance v4.1</span>
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-glow" />
            <span>Accounting Core Sync Active</span>
         </div>
         <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Secured Financial Gateway</span>
         </div>
      </div>
    </AppDashboardLayout>
  )
}
