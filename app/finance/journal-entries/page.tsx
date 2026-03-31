'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { BookOpen, Plus, Eye, Calendar, ChevronLeft, Search, Hash, History, TrendingUp, TrendingDown } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { useApi } from '@/lib/api/client'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { getReferenceLink } from '@/lib/utils/journal-reference'
import { getReferenceTypeLabel } from '@/lib/utils/referenceTypeLabels'
import { formatDate } from '@/lib/utils/dateFormat'
import { format, subMonths } from 'date-fns'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { ExcelExportButton, PdfExportButton } from '@/components/ui/ExportButtons'

export default function JournalEntriesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [startDate, setStartDate] = useState(searchParams.get('start_date') || format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(searchParams.get('end_date') || format(new Date(), 'yyyy-MM-dd'))
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')

  // SWR Hook with Dynamic Key
  const { data: entries = [], isLoading, error } = useApi<any[]>(
    `/api/accounting/journal-entries?start_date=${startDate}&end_date=${endDate}`
  )

  // Sync URL in a professional way (only when values change)
  const syncUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const filteredEntries = useMemo(() => {
    return entries.filter(e => 
      e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.entry_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [entries, searchTerm])

  const totals = useMemo(() => {
    return filteredEntries.reduce((acc, e) => ({
      debit: acc.debit + (Number(e.total_debit) || 0),
      credit: acc.credit + (Number(e.total_credit) || 0)
    }), { debit: 0, credit: 0 })
  }, [filteredEntries])

  return (
    <AppDashboardLayout
      title="Yevmiye Kayıtları"
      subtitle="Çift taraflı kayıt sistemi (Defter-i Kebir)"
      icon={BookOpen}
      actions={
        <div className="flex items-center gap-2">
            <ExcelExportButton 
              data={filteredEntries} 
              filename="Yevmiye_Kayitlari" 
              sheetName="Yevmiye" 
            />
            <PdfExportButton 
              elementId="journal-entries-table" 
              filename="Yevmiye_Raporu" 
            />
            <Link href="/finance/new">
              <Button variant="solid" color="primary" className="shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> YENİ FİŞ
              </Button>
            </Link>
        </div>
      }
    >
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
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
                 onChange={e => { setStartDate(e.target.value); syncUrl('start_date', e.target.value); }}
                 className="w-36 h-9 bg-gray-900 border-gray-800 text-xs font-bold"
               />
               <span className="text-gray-600">to</span>
               <Input 
                 type="date" 
                 value={endDate} 
                 onChange={e => { setEndDate(e.target.value); syncUrl('end_date', e.target.value); }}
                 className="w-36 h-9 bg-gray-900 border-gray-800 text-xs font-bold"
               />
            </div>
        </div>

        <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="Açıklama veya fiş no..." 
              className="pl-10 h-9 bg-gray-900 border-gray-800 text-xs"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); syncUrl('q', e.target.value); }}
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
         <Card variant="glass" className="bg-white/5 border-gray-800">
           <CardBody className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Toplam Fiş</p>
                  <h4 className="text-xl font-black text-white">{isLoading ? <Skeleton className="h-6 w-12" /> : filteredEntries.length}</h4>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg"><Hash className="w-4 h-4 text-blue-400" /></div>
              </div>
           </CardBody>
         </Card>
         <Card variant="glass" className="bg-white/5 border-gray-800">
           <CardBody className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Toplam Borç</p>
                  <h4 className="text-xl font-black text-green-400">
                    {isLoading ? <Skeleton className="h-6 w-24" /> : `${totals.debit.toLocaleString('tr-TR')} ₺`}
                  </h4>
                </div>
                <div className="p-2 bg-green-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-green-400" /></div>
              </div>
           </CardBody>
         </Card>
         <Card variant="glass" className="bg-white/5 border-gray-800">
           <CardBody className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Toplam Alacak</p>
                  <h4 className="text-xl font-black text-orange-400">
                    {isLoading ? <Skeleton className="h-6 w-24" /> : `${totals.credit.toLocaleString('tr-TR')} ₺`}
                  </h4>
                </div>
                <div className="p-2 bg-orange-500/10 rounded-lg"><TrendingDown className="w-4 h-4 text-orange-400" /></div>
              </div>
           </CardBody>
         </Card>
      </div>

      <Card id="journal-entries-table" variant="elevated" padding="none" className="border-gray-800 overflow-hidden bg-gray-900/40">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-gray-800">
              <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-widest w-32">FİŞ NO / TARİH</TableHead>
              <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-widest">AÇIKLAMA</TableHead>
              <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-widest">KAYNAK</TableHead>
              <TableHead className="text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">BORÇ</TableHead>
              <TableHead className="text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">ALACAK</TableHead>
              <TableHead className="text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">İŞLEMLER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={10} cols={6} />
            ) : filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <EmptyState title="Kayıt Bulunamadı" description="Seçilen kriterlere uygun yevmiye kaydı bulunamadı." />
                </TableCell>
              </TableRow>
            ) : filteredEntries.map((row) => {
              const ref = getReferenceLink(row.reference_type, row.reference_id)
              return (
                <TableRow key={row.id} className="border-gray-800 hover:bg-white/5 transition-colors group">
                  <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-black text-primary flex items-center gap-1">
                            <Hash className="w-3 h-3 text-gray-700" /> {row.entry_number}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{formatDate(row.entry_date)}</span>
                      </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white line-clamp-1">{row.description}</span>
                        <span className="text-[10px] font-bold text-gray-600 italic">Satır Sayısı: {row.line_count}</span>
                      </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                        <Badge variant="soft" color="primary" className="text-[9px] uppercase tracking-tighter">
                          {getReferenceTypeLabel(row.reference_type)}
                        </Badge>
                        {ref && (
                          <Link href={ref.href} className="text-[9px] font-black text-primary hover:underline flex items-center gap-1">
                            <History className="w-2 h-2" /> {ref.label}
                          </Link>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-green-400">
                      {row.total_debit.toLocaleString('tr-TR')} ₺
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-orange-400">
                      {row.total_credit.toLocaleString('tr-TR')} ₺
                  </TableCell>
                  <TableCell>
                      <div className="flex justify-center gap-2">
                        <Link href={`/finance/journal-entries/${row.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-primary">
                              <Eye className="w-4 h-4" />
                            </Button>
                        </Link>
                      </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </AppDashboardLayout>
  )
}
