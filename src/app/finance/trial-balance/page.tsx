'use client'

import { useState, useMemo } from 'react'
import { BarChart3, Calendar, ChevronLeft, Download, Printer, Search, TrendingUp, TrendingDown, Scale } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApi } from '@/lib/api/client'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ExcelExportButton, PdfExportButton } from '@/components/ui/ExportButtons'
import { AuditService } from '@/lib/services/audit'
import { toast } from '@/lib/notify'

interface TrialBalanceResponse {
  accounts: any[]
  totalDebits: number
  totalCredits: number
  endDate: string
}

export default function TrialBalancePage() {
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [searchTerm, setSearchTerm] = useState('')

  // SWR Hook
  const { data, isLoading } = useApi<TrialBalanceResponse>(
    `/api/financial/trial-balance?endDate=${endDate}`
  )

  const filteredAccounts = useMemo(() => {
    if (!data?.accounts) return []
    return data.accounts.filter((a: any) => 
      a.accountCode.includes(searchTerm) || a.accountName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [data, searchTerm])

  const totalDebits = data?.totalDebits || 0
  const totalCredits = data?.totalCredits || 0
  const diff = Math.abs(totalDebits - totalCredits)

  const logExport = async (format: 'EXCEL' | 'PDF') => {
    try {
      await fetch('/api/audit/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: 'Mizan Raporu',
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
      title="Mizan Raporu"
      subtitle="Dönemlik borç ve alacak bakiyeleri özeti"
      icon={BarChart3}
      actions={
        <div className="flex gap-2">
          <PdfExportButton 
            elementId="trial-balance-table" 
            filename="mizan_raporu" 
            variant="outline"
            onExport={() => logExport('PDF')}
          />
          <ExcelExportButton 
            data={data?.accounts?.map(a => ({
              'Hesap Kodu': a.accountCode,
              'Hesap Adı': a.accountName,
              'Kategori': a.category,
              'Borç': a.debitBalance,
              'Alacak': a.creditBalance,
              'Bakiye': a.debitBalance - a.creditBalance
            }))} 
            filename="mizan_raporu"
            variant="solid"
            onExport={() => logExport('EXCEL')}
          />
        </div>
      }
    >
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
            <Link href="/finance">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                 <ChevronLeft className="w-4 h-4 mr-1" /> Geri
              </Button>
            </Link>
            <div className="h-4 w-px bg-gray-800" />
            <div className="flex items-center gap-3">
               <Calendar className="w-4 h-4 text-primary" />
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bitiş:</span>
               <Input 
                 type="date" 
                 value={endDate} 
                 onChange={e => setEndDate(e.target.value)}
                 className="w-36 h-9 bg-gray-900 border-gray-800 text-xs font-bold"
               />
            </div>
        </div>

        <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
           <Input 
             placeholder="Hesap kodu veya adı..." 
             className="pl-10 h-9 bg-gray-900 border-gray-800 text-xs"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
         <Card variant="glass" className="bg-white/5 border-gray-800">
           <CardBody className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl"><TrendingUp className="w-5 h-5 text-green-400" /></div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase">Toplam Borç</p>
                <h4 className="text-xl font-black text-white">
                  {isLoading ? <Skeleton className="h-6 w-24 mt-1" /> : `${totalDebits.toLocaleString('tr-TR')} ₺`}
                </h4>
              </div>
           </CardBody>
         </Card>
         <Card variant="glass" className="bg-white/5 border-gray-800">
           <CardBody className="p-4 flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-xl"><TrendingDown className="w-5 h-5 text-orange-400" /></div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase">Toplam Alacak</p>
                <h4 className="text-xl font-black text-white">
                  {isLoading ? <Skeleton className="h-6 w-24 mt-1" /> : `${totalCredits.toLocaleString('tr-TR')} ₺`}
                </h4>
              </div>
           </CardBody>
         </Card>
         <Card variant="glass" className="bg-white/5 border-gray-800">
           <CardBody className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl"><Scale className="w-5 h-5 text-blue-400" /></div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase">Fark / Denge</p>
                <h4 className="text-xl font-black text-white">
                  {isLoading ? <Skeleton className="h-6 w-20 mt-1" /> : diff === 0 ? 'DENGELİ' : `${diff.toLocaleString('tr-TR')} ₺`}
                </h4>
              </div>
           </CardBody>
         </Card>
      </div>

      <Card id="trial-balance-table" variant="elevated" padding="none" className="overflow-hidden border-gray-800 bg-gray-900/40">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-gray-800">
              <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-widest w-32">Hesap Kodu</TableHead>
              <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hesap Adı</TableHead>
              <TableHead className="text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Borç Toplamı</TableHead>
              <TableHead className="text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Alacak Toplamı</TableHead>
              <TableHead className="text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Bakiye</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={10} cols={5} />
            ) : filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64">
                   <EmptyState title="Veri Bulunamadı" description="Seçilen kriterlere uygun veri tespit edilemedi." />
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredAccounts.map((row: any) => {
                  const balance = row.debitBalance - row.creditBalance
                  return (
                    <TableRow key={row.accountCode} className="border-gray-800 hover:bg-white/5 transition-colors group">
                      <TableCell className="font-mono text-xs font-bold text-primary">{row.accountCode}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{row.accountName}</span>
                          <span className="text-[9px] text-gray-600 uppercase font-black tracking-tighter">{row.category}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-gray-300">
                        {row.debitBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-gray-300">
                        {row.creditBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant="solid" 
                          color={balance >= 0 ? 'success' : 'error'} 
                          className="text-[10px] font-black min-w-[100px] justify-end"
                        >
                          {Math.abs(balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ {balance >= 0 ? '(B)' : '(A)'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="bg-primary/5 border-t-2 border-gray-800 font-black">
                  <TableCell colSpan={2} className="text-xs text-white uppercase tracking-widest">Genel Toplam</TableCell>
                  <TableCell className="text-right text-sm text-green-400">
                    {totalDebits.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </TableCell>
                  <TableCell className="text-right text-sm text-orange-400">
                    {totalCredits.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </TableCell>
                  <TableCell className="text-right text-sm text-primary">
                    {diff.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </Card>
    </AppDashboardLayout>
  )
}
