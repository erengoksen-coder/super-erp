'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Wallet, ArrowLeft } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { useApi } from '@/lib/api/client'
import { PageLoader } from '@/components/ui/PageLoader'
import { formatDate } from '@/lib/utils/dateFormat'

type PayrollDetail = {
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
  items: { id: string; type: string; code: string; description: string; amount: number }[]
}

export default function PayrollSlipPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { data: payroll, isLoading } = useApi<PayrollDetail>(id ? `/api/hr/payrolls/${id}` : null)

  if (!id) {
    return (
      <AppDashboardLayout title="Bordro pusulası" icon={Wallet}>
        <p className="text-gray-400">Geçersiz bordro.</p>
      </AppDashboardLayout>
    )
  }

  if (isLoading || !payroll) {
    return (
      <AppDashboardLayout title="Bordro pusulası" icon={Wallet}>
        <PageLoader fullScreen label="Yükleniyor..." />
      </AppDashboardLayout>
    )
  }

  const earnings = payroll.items.filter((i) => i.type === 'earning')
  const deductions = payroll.items.filter((i) => i.type === 'deduction')

  return (
    <AppDashboardLayout
      title="Bordro pusulası"
      subtitle={payroll.employee_name}
      icon={Wallet}
      breadcrumbs={[
        { label: 'İnsan Kaynakları', href: '/hr' },
        { label: 'Bordro', href: '/hr/payroll' },
        { label: payroll.employee_name },
      ]}
    >
      <div className="space-y-6">
        <div>
          <Link href="/hr/payroll" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            Bordro listesine dön
          </Link>
        </div>

        <Card className="bg-gray-900 border border-gray-800 print:border-gray-600">
          <CardHeader
            title={`Bordro pusulası · ${formatDate(payroll.period_start)} - ${formatDate(payroll.period_end)}`}
            subtitle={payroll.employee_name}
          />
          <CardBody className="space-y-4">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-gray-400">Çalışan</dt>
              <dd className="text-white">{payroll.employee_name}</dd>
              <dt className="text-gray-400">Dönem</dt>
              <dd className="text-white">
                {formatDate(payroll.period_start)} - {formatDate(payroll.period_end)}
              </dd>
              <dt className="text-gray-400">Durum</dt>
              <dd className="text-white">{payroll.status === 'draft' ? 'Taslak' : payroll.status}</dd>
            </dl>

            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Kazançlar</h3>
              <ul className="space-y-1 text-sm">
                {earnings.map((i) => (
                  <li key={i.id} className="flex justify-between text-gray-200">
                    <span>{i.description || i.code}</span>
                    <span className="text-green-400">
                      {i.amount.toLocaleString('tr-TR', { style: 'currency', currency: payroll.currency || 'TRY' })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Kesintiler</h3>
              <ul className="space-y-1 text-sm">
                {deductions.map((i) => (
                  <li key={i.id} className="flex justify-between text-gray-200">
                    <span>{i.description || i.code}</span>
                    <span className="text-red-400">
                      {(i.amount < 0 ? i.amount : -i.amount).toLocaleString('tr-TR', { style: 'currency', currency: payroll.currency || 'TRY' })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t-2 border-gray-600 pt-4 flex justify-between text-base font-semibold">
              <span className="text-white">Net ödeme</span>
              <span className="text-green-400">
                {payroll.net_pay.toLocaleString('tr-TR', { style: 'currency', currency: payroll.currency || 'TRY' })}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
