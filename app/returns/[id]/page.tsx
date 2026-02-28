'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { RotateCcw, ArrowLeft, CheckCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'

type ReturnDetail = {
  id: string
  return_number: string
  customer_name: string
  customer_code: string
  return_date: string
  status: string
  total_amount: number
  notes: string | null
  items: Array<{ product_id: string; product_name: string | null; quantity: number; unit_price: number; total_price: number }>
}

export default function ReturnDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [data, setData] = useState<ReturnDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetchApi<ReturnDetail>(`/api/returns/${id}`)
      setData(res as ReturnDetail)
    } catch (e) { setData(null) } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleConfirm = async () => {
    if (!confirm('Bu iadeyi onaylayacaksınız: stok girişi yapılacak ve cari hesaba mahsup edilecek.')) return
    setConfirming(true)
    try {
      await fetchApi(`/api/returns/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      toast.success('İade onaylandı.')
      load()
    } catch (e: any) { toast.error(e?.message || 'Onaylanamadı') } finally { setConfirming(false) }
  }

  const fmt = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

  if (loading || !data) {
    return (
      <AppDashboardLayout title="İade" icon={RotateCcw}>
        <div className="py-8 text-center text-gray-400">{loading ? 'Yükleniyor...' : 'İade bulunamadı.'}</div>
      </AppDashboardLayout>
    )
  }

  return (
    <AppDashboardLayout title={`İade ${data.return_number}`} subtitle="İade detayı" icon={RotateCcw}>
      <div className="mb-4">
        <Link href="/returns" className="text-gray-400 hover:text-white inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Listeye dön
        </Link>
      </div>
      <Card className="mb-4">
        <CardBody className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><span className="text-gray-400 text-sm">İade no</span><div className="font-mono font-bold text-white">{data.return_number}</div></div>
            <div><span className="text-gray-400 text-sm">Tarih</span><div className="text-white">{formatDate(data.return_date)}</div></div>
            <div><span className="text-gray-400 text-sm">Müşteri</span><div className="text-white">{data.customer_code} - {data.customer_name}</div></div>
            <div><span className="text-gray-400 text-sm">Durum</span><div><span className={`px-2 py-1 rounded text-xs border ${data.status === 'confirmed' ? 'bg-green-900/30 text-green-400 border-green-600' : 'bg-yellow-900/30 text-yellow-400 border-yellow-600'}`}>{data.status === 'confirmed' ? 'Onaylandı' : 'Taslak'}</span></div></div>
            <div><span className="text-gray-400 text-sm">Toplam</span><div className="text-white font-bold">{fmt(data.total_amount)}</div></div>
          </div>
          {data.notes && <p className="mt-4 text-gray-400 text-sm">{data.notes}</p>}
          {data.status === 'draft' && (
            <div className="mt-4">
              <Button variant="solid" color="primary" onClick={handleConfirm} disabled={confirming}>
                <CheckCircle className="w-4 h-4 mr-2" />{confirming ? 'Onaylanıyor...' : 'Onayla (stok girişi + cari mahsup)'}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Kalemler" />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="py-2 px-2">Ürün</th>
                  <th className="py-2 px-2 text-right">Miktar</th>
                  <th className="py-2 px-2 text-right">Birim fiyat</th>
                  <th className="py-2 px-2 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-800">
                    <td className="py-2 px-2 text-white">{item.product_name || '-'}</td>
                    <td className="py-2 px-2 text-right text-gray-300">{item.quantity}</td>
                    <td className="py-2 px-2 text-right text-gray-300">{fmt(item.unit_price)}</td>
                    <td className="py-2 px-2 text-right text-white">{fmt(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </AppDashboardLayout>
  )
}
