'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'

const apiMap: Record<string, Array<{ method: string; path: string; desc: string }>> = {
  accounting: [
    { method: 'GET', path: '/api/accounting/accounts', desc: 'Cari hesaplar' },
    { method: 'GET', path: '/api/accounting/accounts/{id}', desc: 'Cari hesap detayı' },
    { method: 'GET', path: '/api/accounting/accounts/{id}/transactions', desc: 'Cari hareketler' },
    { method: 'GET', path: '/api/accounting/invoices', desc: 'Faturalar' },
    { method: 'GET', path: '/api/accounting/invoices/{id}', desc: 'Fatura detayı' },
    { method: 'GET', path: '/api/accounting/payments', desc: 'Tahsilat/Ödeme' },
    { method: 'GET', path: '/api/accounting/journal-entries', desc: 'Yevmiye fişleri' },
    { method: 'GET', path: '/api/accounting/journal-entries/{id}', desc: 'Yevmiye fişi detayı' },
    { method: 'GET', path: '/api/accounting/chart-of-accounts', desc: 'Hesap planı' },
    { method: 'GET', path: '/api/accounting/general-ledger', desc: 'Büyük defter' },
    { method: 'GET', path: '/api/accounting/finance/fire-analysis', desc: 'Fire analizi' },
    { method: 'GET', path: '/api/accounting/e-invoice/config', desc: 'E-fatura ayarları' },
    { method: 'GET', path: '/api/accounting/e-invoice/send', desc: 'E-fatura gönderim' },
    { method: 'GET', path: '/api/accounting/e-invoice/logs', desc: 'E-fatura logları' },
  ],
  sales: [
    { method: 'GET', path: '/api/orders', desc: 'Siparişler' },
    { method: 'GET', path: '/api/sales-orders', desc: 'Satış siparişleri' },
  ],
  procurement: [
    { method: 'GET', path: '/api/purchase-requests', desc: 'Satın alma talepleri' },
    { method: 'GET', path: '/api/purchase-orders', desc: 'Satın alma siparişleri' },
  ],
  inventory: [
    { method: 'GET', path: '/api/products', desc: 'Ürünler' },
    { method: 'GET', path: '/api/materials', desc: 'Malzemeler' },
    { method: 'GET', path: '/api/warehouses', desc: 'Depolar' },
  ],
  production: [
    { method: 'GET', path: '/api/production', desc: 'Üretim emirleri' },
    { method: 'GET', path: '/api/work-orders', desc: 'İş emirleri' },
    { method: 'GET', path: '/api/operations', desc: 'Operasyonlar' },
  ],
}

const titles: Record<string, string> = {
  accounting: 'Muhasebe API',
  sales: 'Satış API',
  procurement: 'Satın Alma API',
  inventory: 'Stok API',
  production: 'Üretim API',
}

export default function ApiCatalogCategoryPage() {
  const params = useParams() as { category?: string }
  const category = params?.category || 'accounting'
  const items = apiMap[category] || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{titles[category] || 'API'}</h1>
        <Link href="/api-catalog" className="text-sm text-blue-400">Geri</Link>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="text-gray-400">
            <tr>
              <th className="text-left py-2 px-3">Metod</th>
              <th className="text-left py-2 px-3">Endpoint</th>
              <th className="text-left py-2 px-3">Açıklama</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {items.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-gray-400 py-6">Kayıt yok.</td></tr>
            ) : items.map((item, index) => (
              <tr key={`${item.path}-${index}`} className="border-t border-gray-800">
                <td className="py-2 px-3">{item.method}</td>
                <td className="py-2 px-3">{item.path}</td>
                <td className="py-2 px-3">{item.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
