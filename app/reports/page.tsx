'use client'

import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useApi } from '@/lib/api/client'
import { LogoWithBackground } from '@/components/Logo'
import { formatDate } from '@/lib/utils/dateFormat'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

type StockSummary = {
  summary: {
    materials_total: number
    materials_critical: number
    products_total: number
    products_critical: number
  }
  materials: Array<{
    id: string
    code: string | null
    name: string
    unit: string | null
    stock_amount: number | null
    min_stock_level: number | null
  }>
  products: Array<{
    id: string
    sku: string
    name: string
    stock_amount: number | null
    min_stock_level: number | null
  }>
}

export default function ReportsPage() {
  const { data, isLoading } = useApi<StockSummary>('/api/reports/stock-summary')

  const criticalMaterials = useMemo(() => {
    return (data?.materials ?? []).filter((m) => (m.stock_amount ?? 0) < (m.min_stock_level ?? 0))
  }, [data])

  const criticalProducts = useMemo(() => {
    return (data?.products ?? []).filter((p) => (p.stock_amount ?? 0) < (p.min_stock_level ?? 0))
  }, [data])

  const summaryChartData = useMemo(() => ([
    {
      name: 'Malzeme',
      toplam: data?.summary.materials_total ?? 0,
      kritik: data?.summary.materials_critical ?? 0,
    },
    {
      name: 'Ürün',
      toplam: data?.summary.products_total ?? 0,
      kritik: data?.summary.products_critical ?? 0,
    },
  ]), [data])

  async function downloadExcel() {
    const response = await fetch('/api/reports/stock-summary/export')
    if (!response.ok) {
      alert('Excel oluşturulamadı')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `stok_raporu_${new Date().toISOString().split('T')[0]}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  }

  function downloadPdf() {
    if (!data) {
      alert('Rapor verisi bulunamadı')
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Stok Ozet Raporu', 14, 16)

    doc.setFontSize(10)
    doc.text(`Tarih: ${formatDate(new Date())}`, 14, 24)
    doc.text(`Malzeme Toplam: ${data.summary.materials_total}`, 14, 32)
    doc.text(`Malzeme Kritik: ${data.summary.materials_critical}`, 14, 38)
    doc.text(`Urun Toplam: ${data.summary.products_total}`, 14, 46)
    doc.text(`Urun Kritik: ${data.summary.products_critical}`, 14, 52)

    let y = 64
    doc.setFontSize(11)
    doc.text('Kritik Malzemeler (ilk 20)', 14, y)
    y += 6
    doc.setFontSize(9)
    criticalMaterials.slice(0, 20).forEach((item) => {
      doc.text(`${item.name} - ${item.stock_amount ?? 0}/${item.min_stock_level ?? 0}`, 14, y)
      y += 5
      if (y > 270) {
        doc.addPage()
        y = 16
      }
    })

    if (y > 230) {
      doc.addPage()
      y = 16
    }

    y += 6
    doc.setFontSize(11)
    doc.text('Kritik Urunler (ilk 20)', 14, y)
    y += 6
    doc.setFontSize(9)
    criticalProducts.slice(0, 20).forEach((item) => {
      doc.text(`${item.name} - ${item.stock_amount ?? 0}/${item.min_stock_level ?? 0}`, 14, y)
      y += 5
      if (y > 270) {
        doc.addPage()
        y = 16
      }
    })

    doc.save(`stok_raporu_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Raporlar</h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-gray-400 mt-1">Stok özet raporu</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadPdf}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition inline-flex items-center space-x-2"
            type="button"
          >
            <Download size={18} />
            <span>PDF</span>
          </button>
          <button
            onClick={downloadExcel}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
            type="button"
          >
            <Download size={18} />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Malzeme Toplam</p>
              <p className="text-white text-2xl font-semibold">{data?.summary.materials_total ?? 0}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Malzeme Kritik</p>
              <p className="text-red-400 text-2xl font-semibold">{data?.summary.materials_critical ?? 0}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Urun Toplam</p>
              <p className="text-white text-2xl font-semibold">{data?.summary.products_total ?? 0}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Urun Kritik</p>
              <p className="text-red-400 text-2xl font-semibold">{data?.summary.products_critical ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h2 className="text-white font-semibold mb-3">Stok Özeti</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summaryChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
                    <Legend />
                    <Bar dataKey="toplam" fill="#60a5fa" name="Toplam" />
                    <Bar dataKey="kritik" fill="#f87171" name="Kritik" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h2 className="text-white font-semibold mb-3">Kritik Malzemeler</h2>
              {criticalMaterials.length === 0 ? (
                <p className="text-gray-500 text-sm">Kritik malzeme bulunamadı.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {criticalMaterials.slice(0, 10).map((item) => (
                    <li key={item.id} className="flex justify-between text-gray-300">
                      <span>{item.name}</span>
                      <span>{item.stock_amount ?? 0}/{item.min_stock_level ?? 0}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h2 className="text-white font-semibold mb-3">Kritik Urunler</h2>
              {criticalProducts.length === 0 ? (
                <p className="text-gray-500 text-sm">Kritik urun bulunamadı.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {criticalProducts.slice(0, 10).map((item) => (
                    <li key={item.id} className="flex justify-between text-gray-300">
                      <span>{item.name}</span>
                      <span>{item.stock_amount ?? 0}/{item.min_stock_level ?? 0}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


