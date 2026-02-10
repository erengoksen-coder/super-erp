'use client'

import { useState, useEffect, useMemo } from 'react'
import { Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'

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
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Wallet className="w-5 h-5" />
        Cari Hesabım
      </h2>

      {error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <p className="text-slate-500 text-sm">Cari Kodu</p>
          <p className="font-mono font-medium text-white mt-0.5">{account.code}</p>
        </div>
        <div>
          <p className="text-slate-500 text-sm">Ünvan</p>
          <p className="font-medium text-white mt-0.5 break-words">{account.name}</p>
        </div>
        <div>
          <p className="text-slate-500 text-sm">Bakiye</p>
          <p className={`text-xl font-bold mt-0.5 ${account.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(account.balance)}
          </p>
        </div>
        {account.risk_limit != null && account.risk_limit > 0 && (
          <div>
            <p className="text-slate-500 text-sm">Risk Limiti</p>
            <p className="font-medium text-white mt-0.5">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(account.risk_limit)}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60">
          <h3 className="font-medium text-white">İşlemler</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-500 text-sm">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {filteredTransactions.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">Henüz işlem yok veya seçilen tarih aralığında kayıt yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs">
                  <th className="p-3 font-medium">Tarih</th>
                  <th className="p-3 font-medium">Tür</th>
                  <th className="p-3 font-medium">Açıklama</th>
                  <th className="p-3 font-medium text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => {
                  const isCredit = t.transaction_type === 'credit' || t.amount > 0
                  return (
                    <tr key={t.id} className="border-b border-slate-700/60 hover:bg-slate-700/20">
                      <td className="p-3 text-slate-400 text-sm whitespace-nowrap">{formatDate(t.created_at)}</td>
                      <td className="p-3 text-slate-300 text-sm">{t.transaction_type || '–'}</td>
                      <td className="p-3 text-slate-300 text-sm max-w-[200px] truncate" title={t.description || undefined}>{t.description || '–'}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-medium ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
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
