"use client"

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ArrowLeft } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { useApi } from '@/lib/api/client'

type JournalEntry = {
  id: string
  entry_number: string
  entry_date: string
  description: string
  reference_type: string
  reference_id?: string | null
  total_debit: number
  total_credit: number
}

type JournalEntryLine = {
  id: string
  account_code: string
  account_name: string
  account_type: string
  debit: number
  credit: number
  description?: string | null
}

type JournalEntryResponse = {
  entry: JournalEntry
  lines: JournalEntryLine[]
}

export default function JournalEntryDetailPage() {
  const params = useParams<{ id: string }>()
  const entryId = params?.id
  const { data, isLoading } = useApi<JournalEntryResponse>(entryId ? `/api/accounting/journal-entries/${entryId}` : null)

  const entry = data?.entry
  const lines = useMemo(() => data?.lines ?? [], [data?.lines])

  return (
    <div>
      <div className="mb-6">
        <Link href="/finance/journal-entries" className="text-blue-400 hover:text-blue-300 inline-flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Yevmiye kayıtlarına dön</span>
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <BookOpen className="w-8 h-8" />
            <span>Yevmiye Detayı</span>
          </h1>
          <p className="text-gray-400">Fiş satırları ve hesap hareketleri</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
      ) : !entry ? (
        <div className="text-center py-12 text-gray-400">Yevmiye kaydı bulunamadı</div>
      ) : (
        <>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-400">Yevmiye No</div>
              <div className="text-white font-semibold">{entry.entry_number}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Tarih</div>
              <div className="text-white">{new Date(entry.entry_date).toLocaleDateString('tr-TR')}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Toplam Borç</div>
              <div className="text-red-400 font-semibold">
                {entry.total_debit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Toplam Alacak</div>
              <div className="text-green-400 font-semibold">
                {entry.total_credit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </div>
            </div>
            <div className="md:col-span-4">
              <div className="text-xs text-gray-400">Açıklama</div>
              <div className="text-white">{entry.description || '-'}</div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="h-8">Hesap</TableHead>
                  <TableHead className="h-8">Açıklama</TableHead>
                  <TableHead className="h-8 text-right">Borç</TableHead>
                  <TableHead className="h-8 text-right">Alacak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 text-xs py-8">
                      Satır bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="text-white text-xs">
                        {line.account_code} - {line.account_name}
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">
                        {line.description || '-'}
                      </TableCell>
                      <TableCell className="text-right text-white text-xs">
                        {Number(line.debit || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </TableCell>
                      <TableCell className="text-right text-white text-xs">
                        {Number(line.credit || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
