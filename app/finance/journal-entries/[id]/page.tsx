"use client"

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ChevronLeft, Hash, Calendar, FileText, ArrowUpRight, ArrowDownRight, Printer, Share2 } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { useApi } from '@/lib/api/client'
import { getReferenceLink } from '@/lib/utils/journal-reference'
import { formatDate } from '@/lib/utils/dateFormat'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'

export default function JournalEntryDetailPage() {
  const params = useParams<{ id: string }>()
  const entryId = params?.id
  const { data, isLoading } = useApi<any>(entryId ? `/api/accounting/journal-entries/${entryId}` : null)

  const entry = data?.entry
  const lines = useMemo(() => data?.lines ?? [], [data?.lines])
  const referenceLink = useMemo(
    () => (entry ? getReferenceLink(entry.reference_type, entry.reference_id) : null),
    [entry?.reference_type, entry?.reference_id]
  )

  return (
    <AppDashboardLayout
      title={`Yevmiye Detayı: ${entry?.entry_number || '...'}`}
      subtitle="Fiş detayları ve muhasebe kayıtları"
      icon={BookOpen}
      actions={
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => window.print()}>
             <Printer className="w-4 h-4 mr-2" /> Yazdır
           </Button>
           <Button variant="outline" size="sm">
             <Share2 className="w-4 h-4 mr-2" /> Paylaş
           </Button>
        </div>
      }
    >
      <div className="mb-8">
        <Link href="/finance/journal-entries">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ChevronLeft className="w-4 h-4 mr-1" /> Kayıtlara Dön
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <PageLoader label="Yevmiye detayları yükleniyor..." />
      ) : !entry ? (
        <EmptyState title="Kayıt Bulunamadı" description="İstenen yevmiye kaydı sistemde mevcut değil veya silinmiş." />
      ) : (
        <div className="space-y-8">
          {/* Header Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card variant="glass" className="bg-white/5 border-gray-800">
               <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                        <Hash className="w-5 h-5" />
                     </div>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">FİŞ NUMARASI</p>
                  </div>
                  <h4 className="text-2xl font-black text-white">{entry.entry_number}</h4>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-gray-400">
                     <Calendar className="w-3 h-3" /> {formatDate(entry.entry_date)}
                  </div>
               </CardBody>
             </Card>

             <Card variant="glass" className="bg-white/5 border-gray-800">
               <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                        <ArrowUpRight className="w-5 h-5" />
                     </div>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">TOPLAM BORÇ</p>
                  </div>
                  <h4 className="text-2xl font-black text-green-400">{entry.total_debit.toLocaleString('tr-TR')} ₺</h4>
               </CardBody>
             </Card>

             <Card variant="glass" className="bg-white/5 border-gray-800">
               <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                        <ArrowDownRight className="w-5 h-5" />
                     </div>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">TOPLAM ALACAK</p>
                  </div>
                  <h4 className="text-2xl font-black text-amber-400">{entry.total_credit.toLocaleString('tr-TR')} ₺</h4>
               </CardBody>
             </Card>
          </div>

          {/* Description & Reference */}
          <Card variant="elevated" className="border-gray-800 bg-gray-900/40">
            <CardBody className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3 h-3" /> FİŞ AÇIKLAMASI
                  </p>
                  <p className="text-sm text-white font-medium italic">{entry.description || 'Açıklama belirtilmemiş.'}</p>
               </div>
               {referenceLink && (
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">İLGİLİ KAYNAK KAYIT</p>
                    <Link href={referenceLink.href}>
                       <Button variant="ghost" className="text-blue-500 hover:text-blue-400 p-0 h-auto font-black text-sm uppercase tracking-tighter">
                          {referenceLink.label} <ArrowUpRight className="w-4 h-4 ml-1" />
                       </Button>
                    </Link>
                 </div>
               )}
            </CardBody>
          </Card>

          {/* Lines Table */}
          <Card variant="elevated" padding="none" className="border-gray-800 overflow-hidden bg-gray-900/40">
            <div className="p-4 bg-white/5 border-b border-gray-800">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">MUHASEBE SATIRLARI</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-widest">HESAP KODU / ADI</TableHead>
                  <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-widest">AÇIKLAMA</TableHead>
                  <TableHead className="text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">BORÇ</TableHead>
                  <TableHead className="text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">ALACAK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line: any) => (
                  <TableRow key={line.id} className="border-gray-800 hover:bg-white/5 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-black text-blue-400">{line.account_code}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{line.account_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-400 italic">
                      {line.description || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-green-400">
                      {line.debit > 0 ? `${line.debit.toLocaleString('tr-TR')} ₺` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-amber-400">
                      {line.credit > 0 ? `${line.credit.toLocaleString('tr-TR')} ₺` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </AppDashboardLayout>
  )
}
