'use client'

import { useEffect, useState, Fragment } from 'react'
import Link from 'next/link'
import { Calculator, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi } from '@/lib/api/client'
import type { ProductUnitCostItem } from '@/app/api/reports/product-unit-cost/route'

export default function ProductUnitCostReportPage() {
  const [rows, setRows] = useState<ProductUnitCostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await fetchApi<ProductUnitCostItem[] | { data: ProductUnitCostItem[] }>('/api/reports/product-unit-cost')
      const list = Array.isArray(data) ? data : (data as { data?: ProductUnitCostItem[] })?.data ?? []
      setRows(list)
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (n: number) => `₺${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const totalUnitCost = rows.reduce((s, r) => s + r.unit_total_cost, 0)
  const avgMargin = rows.length ? rows.reduce((s, r) => s + r.profit_margin_pct, 0) / rows.length : 0

  return (
    <AppDashboardLayout
      title="Ürün birim maliyeti"
      subtitle="BOM ve hammadde fiyatlarına göre detaylı birim maliyet analizi"
      icon={Calculator}
    >
      <div className="mb-4">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" /> Raporlara dön
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Ürün sayısı</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{rows.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Ort. kar marjı %</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">%{avgMargin.toFixed(1)}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Birim maliyet detayı" />
        <CardBody className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Yükleniyor…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Ürün veya BOM bulunamadı.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>SKU</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead className="text-right">Birim malzeme</TableHead>
                  <TableHead className="text-right">Birim işçilik</TableHead>
                  <TableHead className="text-right">Birim toplam</TableHead>
                  <TableHead className="text-right">Satış fiyatı</TableHead>
                  <TableHead className="text-right">Birim kar</TableHead>
                  <TableHead className="text-right">Marj %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <Fragment key={r.product_id}>
                    <TableRow
                      key={r.product_id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      onClick={() => setExpandedId(expandedId === r.product_id ? null : r.product_id)}
                    >
                      <TableCell className="w-8">
                        {r.material_breakdown.length > 0 ? (
                          expandedId === r.product_id ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{r.product_sku}</TableCell>
                      <TableCell>{r.product_name}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.unit_material_cost)}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.unit_labor_cost)}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(r.unit_total_cost)}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.selling_price)}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.unit_profit)}</TableCell>
                      <TableCell className="text-right">%{r.profit_margin_pct.toFixed(1)}</TableCell>
                    </TableRow>
                    {expandedId === r.product_id && r.material_breakdown.length > 0 && (
                      <TableRow key={`${r.product_id}-detail`} className="bg-gray-50/80 dark:bg-slate-800/30">
                        <TableCell colSpan={9} className="p-4">
                          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Malzeme detayı (BOM)</p>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Malzeme</TableHead>
                                <TableHead>Birim</TableHead>
                                <TableHead className="text-right">Miktar/birim</TableHead>
                                <TableHead className="text-right">Fire %</TableHead>
                                <TableHead className="text-right">Birim fiyat</TableHead>
                                <TableHead className="text-right">Satır maliyeti</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {r.material_breakdown.map((m) => (
                                <TableRow key={m.material_id}>
                                  <TableCell>{m.material_name}</TableCell>
                                  <TableCell>{m.material_unit ?? '-'}</TableCell>
                                  <TableCell className="text-right">{m.quantity_per_unit.toFixed(4)}</TableCell>
                                  <TableCell className="text-right">%{m.fire_percentage}</TableCell>
                                  <TableCell className="text-right">{formatMoney(m.unit_price)}</TableCell>
                                  <TableCell className="text-right">{formatMoney(m.line_cost_per_unit)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </AppDashboardLayout>
  )
}
