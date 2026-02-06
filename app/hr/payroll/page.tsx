'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Wallet, ArrowLeft, Calculator, Eye } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'

type Payroll = {
  id: string
  employee_id: string
  employee_name: string
  period_start: string
  period_end: string
  base_gross: number
  gross_earnings: number
  total_deductions: number
  net_pay: number
  currency: string
  status: string
}

export default function HrPayrollPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [list, setList] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)

  function load() {
    setLoading(true)
    fetchApi<Payroll[]>(
      `/api/hr/payrolls?year=${year}&month=${String(month).padStart(2, '0')}`
    )
      .then(setList)
      .catch((err) => toast.error(err?.message || 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [year, month])

  async function runPayroll() {
    setCalculating(true)
    try {
      const res = await fetchApi<{ count: number; period_start: string }>('/api/hr/payrolls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      })
      toast.success(`${res?.count ?? 0} çalışan için bordro oluşturuldu (${res?.period_start})`)
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Bordro hesaplanamadı')
    } finally {
      setCalculating(false)
    }
  }

  return (
    <AppDashboardLayout
      title="Bordro"
      subtitle="Aylık bordro listesi ve bordro pusulası"
      icon={Wallet}
      breadcrumbs={[{ label: 'İnsan Kaynakları', href: '/hr' }, { label: 'Bordro' }]}
    >
      <div className="space-y-6">
        <div>
          <Link href="/hr" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            İnsan Kaynaklarına dön
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm text-gray-400">Dönem:</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleString('tr-TR', { month: 'long' })}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={runPayroll}
            disabled={calculating || loading}
          >
            <Calculator className="w-4 h-4 mr-1" />
            {calculating ? 'Hesaplanıyor...' : 'Bordro hesapla'}
          </Button>
        </div>

        {loading ? (
          <PageLoader fullScreen label="Yükleniyor..." />
        ) : (
          <Card className="bg-gray-900 border border-gray-800">
            <CardHeader
              title="Bordro listesi"
              subtitle={`${year} - ${new Date(2000, month - 1, 1).toLocaleString('tr-TR', { month: 'long' })}`}
            />
            <CardBody>
              {list.length === 0 ? (
                <p className="text-gray-400 text-sm py-4">
                  Bu dönem için bordro yok. &quot;Bordro hesapla&quot; ile aktif çalışanların (hesap planında brüt maaşı tanımlı) bordrosunu oluşturabilirsiniz.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-800">
                        <th className="py-2">Çalışan</th>
                        <th className="py-2 text-right">Brüt</th>
                        <th className="py-2 text-right">Kesintiler</th>
                        <th className="py-2 text-right">Net</th>
                        <th className="py-2">Durum</th>
                        <th className="py-2 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((p) => (
                        <tr key={p.id} className="border-b border-gray-800 text-gray-200">
                          <td className="py-2">{p.employee_name}</td>
                          <td className="py-2 text-right">
                            {p.gross_earnings.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                          </td>
                          <td className="py-2 text-right text-red-400">
                            -{p.total_deductions.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                          </td>
                          <td className="py-2 text-right font-medium text-green-400">
                            {p.net_pay.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                          </td>
                          <td className="py-2">{p.status === 'draft' ? 'Taslak' : p.status}</td>
                          <td className="py-2 text-right">
                            <Link
                              href={`/hr/payroll/${p.id}`}
                              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Pusula
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </AppDashboardLayout>
  )
}
