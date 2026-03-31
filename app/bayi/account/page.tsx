'use client'

import { useState, useEffect, useMemo } from 'react'
import { Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { EmptyState } from '@/components/ui/EmptyState'

type Account = {
  id: string
  code: string
  name: string
  type: string
  balance: number
  risk_limit: number | null
  tax_number: string | null
  phone: string | null
  email: string | null
  address: string | null
}

type Transaction = {
  id: string
  transaction_type: string
  amount: number
  reference_type: string | null
  description: string | null
  created_at: string
}

const statusLabels: Record<string, string> = {
  pending: 'Beklemede',
  in_transit: 'Yolda / Kargo',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
}

const typeLabels: Record<string, string> = {
  credit: 'Alacak',
  debit: 'Borç',
  payment: 'Ödeme',
  invoice: 'Fatura',
  return: 'İade',
}

function formatDate(s: string) {
  try {
    const d = new Date(s)
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('tr-TR')
  } catch {
    return s
  }
}

function parseDate(s: string): number {
  const d = new Date(s)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

export default function BayiAccountPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    setError(null)
    setLoading(true)
    fetchApi('/api/bayi/account')
      .then((res: any) => {
        const data = (res as any)?.data ?? res
        setAccount(data?.account ?? null)
        setTransactions(Array.isArray(data?.transactions) ? data.transactions : [])
      })
      .catch(() => {
        setAccount(null)
        setTransactions([])
        setError('Cari hesap bilgisi yüklenirken hata oluştu.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredTransactions = useMemo(() => {
    let list = [...transactions]
    if (dateFrom) {
      const t = parseDate(dateFrom + 'T00:00:00')
      list = list.filter((tx) => parseDate(tx.created_at) >= t)
    }
    if (dateTo) {
      const t = parseDate(dateTo + 'T23:59:59')
      list = list.filter((tx) => parseDate(tx.created_at) <= t)
    }
    return list
  }, [transactions, dateFrom, dateTo])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        <p className="text-slate-400 text-sm">Yükleniyor...</p>
      </div>
    )
  }

  if (error && !account) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-4 text-red-200 text-sm">
        {error}
      </div>
    )
  }

  if (!account) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-8 text-center text-slate-400">
        Cari hesabınız bulunamadı. Yönetici ile iletişime geçin.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2 drop-shadow-sm">
        <Wallet className="w-6 h-6 text-blue-400" />
        Cari Hesabım
      </h2>

      {error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <p className="text-blue-200/60 text-sm font-black uppercase tracking-widest">Cari Kodu</p>
          <p className="font-mono font-black text-blue-100 mt-1">{account.code}</p>
        </div>
        <div>
          <p className="text-blue-200/60 text-sm font-black uppercase tracking-widest">Ünvan</p>
          <p className="font-extrabold text-sky-100 mt-1 break-words">{account.name}</p>
        </div>
        <div>
          <p className="text-blue-200/60 text-sm font-black uppercase tracking-widest">Bakiye</p>
          <p className={`text-2xl font-black mt-1 drop-shadow-md ${account.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(account.balance)}
          </p>
        </div>
        {account.risk_limit != null && account.risk_limit > 0 && (
          <div>
            <p className="text-blue-200/60 text-sm font-black uppercase tracking-widest">Risk Limiti</p>
            <p className="font-black text-blue-100 mt-1">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(account.risk_limit)}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60">
          <h3 className="font-black text-blue-100">Cari İşlemler Geçmişi</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border-slate-700 text-blue-100 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
            <span className="text-slate-500 text-sm">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border-slate-700 text-blue-100 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
        </div>
        {filteredTransactions.length === 0 ? (
          <EmptyState
            title="Henüz işlem yok"
            description="Seçilen tarih aralığında kayıt bulunamadı."
            icon={Wallet}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 text-blue-200/60 text-[10px] font-black uppercase tracking-widest">
                  <th className="p-3">Tarih</th>
                  <th className="p-3">İşlem Türü</th>
                  <th className="p-3">Açıklama</th>
                  <th className="p-3 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => {
                  const isCredit = t.transaction_type === 'credit' || t.amount > 0
                  return (
                    <tr key={t.id} className="border-b border-slate-700/60 hover:bg-slate-700/20">
                      <td className="p-3 text-slate-400 text-xs font-medium whitespace-nowrap">{formatDate(t.created_at)}</td>
                      <td className="p-3 text-blue-100 text-sm font-bold uppercase tracking-tight">
                        {typeLabels[t.transaction_type] || t.transaction_type || '–'}
                      </td>
                      <td className="p-3 text-sky-100/70 text-sm max-w-[200px] truncate font-medium" title={t.description || undefined}>{t.description || '–'}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-black ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isCredit ? <ArrowDownCircle className="w-4 h-4 flex-shrink-0" /> : <ArrowUpCircle className="w-4 h-4 flex-shrink-0" />}
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(t.amount)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
