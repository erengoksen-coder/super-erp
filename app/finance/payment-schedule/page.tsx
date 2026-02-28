'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, ArrowLeft } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils/dateFormat'

type ScheduleRow = {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  final_amount: number
  amount_due: number
  payment_terms_days: number | null
  customer_name: string
  customer_code: string
}

export default function PaymentSchedulePage() {
  const [rows, setRows] = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const data = await fetchApi<ScheduleRow[]>(`/api/invoices/payment-schedule?${params}`)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e); setRows([]) } finally { setLoading(false) }
  }, [from, to])

  useEffect(() => {
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)
    if (!from) setFrom(today.toISOString().split('T')[0])
    if (!to) setTo(nextMonth.toISOString().split('T')[0])
  }, [])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
  const daysUntil = (d: string) => {
    const due = new Date(d)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <AppDashboardLayout title="Ödeme takvimi" subtitle="Faturaya vade, ödeme planı" icon={Calendar}>
      <div className="mb-4">
        <Link href="/invoices" className="text-gray-400 hover:text-white inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Faturalara dön
        </Link>
      </div>
      <Card className="mb-4">
        <CardBody className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Vade başlangıç</label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Vade bitiş</label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={`Vadeli faturalar (${rows.length})`} />
        <CardBody>
          {loading ? <div className="py-8 text-center text-gray-400">Yükleniyor...</div> :
            rows.length === 0 ? <div className="py-8 text-center text-gray-500">Bu aralıkta vadesi olan fatura yok.</div> :
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-gray-400">
                      <th className="py-3 px-3">Fatura No</th>
                      <th className="py-3 px-3">Müşteri</th>
                      <th className="py-3 px-3">Fatura Tarihi</th>
                      <th className="py-3 px-3">Vade Tarihi</th>
                      <th className="py-3 px-3 text-right">Toplam</th>
                      <th className="py-3 px-3 text-right">Kalan</th>
                      <th className="py-3 px-3">Kalan Gün</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const days = daysUntil(r.due_date)
                      return (
                        <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                          <td className="py-3 px-3 font-mono text-white">
                            <Link href={`/invoices/${r.id}`} className="text-blue-400 hover:underline">{r.invoice_number}</Link>
                          </td>
                          <td className="py-3 px-3 text-gray-300">{r.customer_code} - {r.customer_name}</td>
                          <td className="py-3 px-3 text-gray-300">{formatDate(r.invoice_date)}</td>
                          <td className="py-3 px-3 text-gray-300">{formatDate(r.due_date)}</td>
                          <td className="py-3 px-3 text-right text-gray-300">{fmt(r.final_amount)}</td>
                          <td className="py-3 px-3 text-right font-medium text-white">{fmt(r.amount_due)}</td>
                          <td className="py-3 px-3">
                            {days < 0 ? <span className="text-red-400">{days} gün gecikmiş</span> : days === 0 ? <span className="text-amber-400">Bugün</span> : <span className="text-gray-300">{days} gün</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>}
        </CardBody>
      </Card>
    </AppDashboardLayout>
  )
}
