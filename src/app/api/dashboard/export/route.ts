import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import * as XLSX from 'xlsx'

const DEFAULT_COMPANY_ID = 'company_default'
const DEFAULT_BRANCH_ID = 'branch_default'

export const GET = withAuth(async (_request) => {
  const db = getDatabase()

  const materials = db.prepare(`
    SELECT stock_amount, min_stock_level, COALESCE(unit_price, 0) as unit_price
    FROM materials WHERE deleted_at IS NULL
  `).all() as { stock_amount: number | null; min_stock_level: number | null; unit_price: number }[]
  const totalStockValue = materials.reduce((sum, m) => sum + (m.stock_amount || 0) * (m.unit_price ?? 0), 0)

  const pendingProduction = db.prepare(`
    SELECT COUNT(*) as count FROM production_orders WHERE status IN ('pending', 'in_progress')
  `).get() as { count: number }
  const criticalStock = db.prepare(`
    SELECT COUNT(*) as count FROM materials
    WHERE deleted_at IS NULL AND min_stock_level IS NOT NULL AND (stock_amount IS NULL OR stock_amount < min_stock_level)
  `).get() as { count: number }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const productionTrend = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count, SUM(quantity) as total_quantity
    FROM production_orders WHERE date(created_at) >= date(?)
    GROUP BY date(created_at) ORDER BY date(created_at) ASC
  `).all(sevenDaysAgo.toISOString().split('T')[0]) as { date: string; count: number; total_quantity: number }[]

  const ordersCount = db.prepare(`
    SELECT status, COUNT(*) as count FROM active_orders
    WHERE company_id = ? AND branch_id = ? AND deleted_at IS NULL
    GROUP BY status
  `).all(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as { status: string; count: number }[]

  const wb = XLSX.utils.book_new()

  const statusLabel: Record<string, string> = {
    pending: 'Beklemede',
    in_production: 'Üretimde',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
  }
  const summaryData = [
    { Metrik: 'Toplam Stok Değeri (₺)', Değer: totalStockValue.toLocaleString('tr-TR') },
    { Metrik: 'Bekleyen Üretim Emri', Değer: pendingProduction?.count ?? 0 },
    { Metrik: 'Kritik Stok Uyarısı', Değer: criticalStock?.count ?? 0 },
    { Metrik: 'Son 7 Gün Toplam Üretim', Değer: productionTrend.reduce((s, r) => s + (r.total_quantity || 0), 0) },
    ...ordersCount.map((o) => ({ Metrik: `Sipariş - ${statusLabel[o.status] ?? o.status}`, Değer: o.count })),
  ]
  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Özet')

  const trendData = productionTrend.map((r) => ({
    Tarih: r.date,
    'Üretim Emri Sayısı': r.count,
    'Toplam Miktar': r.total_quantity ?? 0,
  }))
  if (trendData.length) {
    const trendSheet = XLSX.utils.json_to_sheet(trendData)
    trendSheet['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, trendSheet, 'Üretim Trendi')
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `Dashboard_Ozet_${new Date().toISOString().split('T')[0]}.xlsx`
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
