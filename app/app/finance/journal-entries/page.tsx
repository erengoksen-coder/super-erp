'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, Plus, Eye, Calendar } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface JournalEntry {
  id: string
  entry_number: string
  entry_date: string
  description: string
  reference_type: string
  reference_id: string | null
  total_debit: number
  total_credit: number
  line_count: number
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    loadEntries()
  }, [dateRange])

  async function loadEntries() {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/accounting/journal-entries?start_date=${dateRange.start}&end_date=${dateRange.end}`
      )
      if (!response.ok) throw new Error('Yevmiye kayıtları yüklenemedi')
      const data = await response.json()
      setEntries(data)
    } catch (error) {
      console.error('Error loading entries:', error)
      alert('Yevmiye kayıtları yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function getReferenceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      sale: 'Satış',
      purchase: 'Satın Alma',
      production: 'Üretim',
      stock: 'Stok',
      manual: 'Manuel',
    }
    return labels[type] || type
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <BookOpen className="w-8 h-8" />
            <span>Yevmiye Kayıtları</span>
          </h1>
          <p className="text-gray-400">Çift taraflı muhasebe kayıtları (Defter-i Kebir)</p>
        </div>
      </div>

      {/* Tarih Filtresi */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <label className="text-sm text-gray-400">Başlangıç:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Bitiş:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="h-8">Yevmiye No</TableHead>
                <TableHead className="h-8">Tarih</TableHead>
                <TableHead className="h-8">Açıklama</TableHead>
                <TableHead className="h-8">İşlem Tipi</TableHead>
                <TableHead className="h-8 text-right">Borç</TableHead>
                <TableHead className="h-8 text-right">Alacak</TableHead>
                <TableHead className="h-8 text-center">Satır</TableHead>
                <TableHead className="h-8">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400 text-xs py-8">
                    Seçilen tarih aralığında yevmiye kaydı bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium text-white text-xs">
                      {entry.entry_number}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {new Date(entry.entry_date).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-white text-xs">
                      {entry.description}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {getReferenceTypeLabel(entry.reference_type)}
                    </TableCell>
                    <TableCell className="text-right text-white text-xs">
                      {entry.total_debit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </TableCell>
                    <TableCell className="text-right text-white text-xs">
                      {entry.total_credit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </TableCell>
                    <TableCell className="text-center text-gray-400 text-xs">
                      {entry.line_count}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Link
                        href={`/finance/journal-entries/${entry.id}`}
                        className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Detay</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Özet */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Toplam Kayıt</div>
          <div className="text-2xl font-bold text-white">{entries.length}</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Toplam Borç</div>
          <div className="text-2xl font-bold text-red-400">
            {entries.reduce((sum, e) => sum + e.total_debit, 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Toplam Alacak</div>
          <div className="text-2xl font-bold text-green-400">
            {entries.reduce((sum, e) => sum + e.total_credit, 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </div>
        </div>
      </div>
    </div>
  )
}

