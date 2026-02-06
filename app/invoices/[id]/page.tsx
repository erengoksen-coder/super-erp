'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, ArrowLeft, Trash2 } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { formatDate } from '@/lib/utils/dateFormat'

type InvoiceItem = {
  id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number
  total_price: number
  bom_unit_price?: number
  bom_total_price?: number
  notes?: string | null
}

type InvoiceDetail = {
  id: string
  invoice_number: string
  invoice_date: string
  type: string
  status: string
  customer_name: string
  customer_code: string
  shipment_number?: string | null
  total_amount: number
  discount_rate?: number
  discount_amount?: number
  tax_rate: number
  tax_amount: number
  final_amount: number
  notes?: string | null
  end_customer_name?: string | null
  items: InvoiceItem[]
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const id = params?.id as string
    if (id && id !== 'undefined') {
      loadInvoice(id)
    }
  }, [params?.id])

  async function loadInvoice(id: string) {
    setLoading(true)
    try {
      const data = await fetchApi<InvoiceDetail>(`/api/invoices/${id}`)
      setInvoice(data)
    } catch (error: any) {
      alert('Fatura yüklenemedi: ' + error.message)
      router.push('/invoices')
    } finally {
      setLoading(false)
    }
  }

  async function cancelInvoice() {
    if (!invoice) return
    if (!confirm('Bu faturayı iptal etmek istediğinize emin misiniz?')) {
      return
    }
    setCanceling(true)
    try {
      await fetchApi(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
      alert('Fatura iptal edildi')
      router.push('/invoices')
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setCanceling(false)
    }
  }

  async function sendEinvoice() {
    if (!invoice) return
    setSending(true)
    try {
      await fetchApi('/api/e-invoice/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoice.id })
      })
      alert('E-fatura kuyruğa alındı')
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">Yükleniyor...</div>
      </div>
    )
  }

  if (!invoice) {
    return null
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/invoices" className="text-blue-400 hover:text-blue-300 inline-flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" /> Geri Dön
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={sendEinvoice}
            className="inline-flex items-center px-3 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-60"
            type="button"
            disabled={sending || invoice.status === 'cancelled'}
          >
            {sending ? 'Gönderiliyor...' : 'E-Fatura Gönder'}
          </button>
          <button
            onClick={cancelInvoice}
            className="inline-flex items-center px-3 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60"
            type="button"
            disabled={canceling || invoice.status === 'cancelled'}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {invoice.status === 'cancelled' ? 'İptal Edildi' : (canceling ? 'İptal Ediliyor...' : 'Faturayı İptal Et')}
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
        <div className="flex items-center space-x-2 text-white mb-4">
          <FileText className="w-5 h-5" />
          <h1 className="text-xl font-bold">{invoice.invoice_number}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Müşteri</div>
            <div className="text-white">{invoice.customer_name} ({invoice.customer_code})</div>
          </div>
          <div>
            <div className="text-gray-400">Tarih</div>
            <div className="text-white">{formatDate(invoice.invoice_date)}</div>
          </div>
          <div>
            <div className="text-gray-400">İrsaliye</div>
            <div className="text-white">{invoice.shipment_number || '-'}</div>
          </div>
          <div>
            <div className="text-gray-400">Tip</div>
            <div className="text-white">{invoice.type === 'sale' ? 'Satış' : 'Alış'}</div>
          </div>
          <div>
            <div className="text-gray-400">Durum</div>
            <div className="text-white">{invoice.status === 'cancelled' ? 'İptal' : 'Kesildi'}</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-x-auto mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 px-3 text-xs text-gray-400">Ürün</th>
              <th className="text-right py-2 px-3 text-xs text-gray-400">Adet</th>
              <th className="text-right py-2 px-3 text-xs text-gray-400">Birim Fiyat</th>
              <th className="text-right py-2 px-3 text-xs text-gray-400">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-800">
                <td className="py-2 px-3 text-xs text-gray-300">
                  <div>
                    {item.product_name} {item.product_sku ? (
                      <span className="text-yellow-400">({item.product_sku})</span>
                    ) : ''}
                  </div>
                  {(invoice.end_customer_name || invoice.customer_name) && (
                    <div className="text-yellow-400 text-xs mt-1">
                      Müşteri: {invoice.end_customer_name || invoice.customer_name}
                    </div>
                  )}
                </td>
                <td className="py-2 px-3 text-xs text-gray-300 text-right">{item.quantity}</td>
                <td className="py-2 px-3 text-xs text-gray-300 text-right">
                  {item.bom_unit_price && item.bom_unit_price !== item.unit_price ? (
                    <div>
                      <div className="text-lime-400">BOM: {item.bom_unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                      <div className="text-gray-400 text-[10px]">İskonto sonrası: {item.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                    </div>
                  ) : (
                    <div>{(item.unit_price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                  )}
                </td>
                <td className="py-2 px-3 text-xs text-gray-300 text-right">
                  {item.bom_total_price && item.bom_total_price !== item.total_price ? (
                    <div>
                      <div className="text-lime-400">BOM: {item.bom_total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                      <div className="text-gray-400 text-[10px]">İskonto sonrası: {item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                    </div>
                  ) : (
                    <div>{(item.total_price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 text-sm text-right text-white">
        <div>Ara Toplam: {invoice.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
        {(() => {
          // İskonto bilgisini göster (eğer varsa)
          const discountRate = invoice.discount_rate || 0
          const discountAmount = invoice.discount_amount || 0
          
          // Eğer iskonto bilgisi yoksa ama total_amount ve final_amount farklıysa, hesapla
          let finalDiscountRate = discountRate
          let finalDiscountAmount = discountAmount
          
          if (discountRate === 0 || discountAmount === 0) {
            const calculatedDiscount = invoice.total_amount - (invoice.final_amount - (invoice.tax_amount || 0))
            if (calculatedDiscount > 0 && invoice.total_amount > 0) {
              const calculatedRate = (calculatedDiscount / invoice.total_amount) * 100
              if (calculatedRate > 0 && calculatedRate < 100) {
                finalDiscountRate = calculatedRate
                finalDiscountAmount = calculatedDiscount
              }
            }
          }
          
          if (finalDiscountRate > 0 && finalDiscountAmount > 0) {
            const discountedTotal = invoice.total_amount - finalDiscountAmount
            return (
              <div className="text-yellow-400">
                <div>İskonto (%{finalDiscountRate.toFixed(2)}): -{finalDiscountAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                <div className="text-white text-sm mt-1">İskontolu Tutar: {discountedTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
              </div>
            )
          }
          
          return null
        })()}
        <div>KDV: {invoice.tax_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
        <div className="text-lg font-semibold">Genel Toplam: {invoice.final_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
      </div>
    </div>
  )
}
